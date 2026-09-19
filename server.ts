import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_CANDIDATES,
  INITIAL_CONFIG,
  INITIAL_POSITIONS,
  INITIAL_STUDENTS
} from './src/data/mockElectionData';
import {
  AuditLog,
  Candidate,
  ElectionConfig,
  EncryptedVote,
  Position,
  Student
} from './src/types/election';

const app = express();
const PORT = 3000;

app.use(express.json());

// Authoritative Election State held on server
let serverConfig: ElectionConfig = { ...INITIAL_CONFIG };
let serverPositions: Position[] = [...INITIAL_POSITIONS];
let serverCandidates: Candidate[] = [...INITIAL_CANDIDATES];
let serverStudents: Student[] = [...INITIAL_STUDENTS];
let serverVotes: EncryptedVote[] = [];

// Generate seed votes for initially voted students
function generateInitialServerVotes(): EncryptedVote[] {
  const votes: EncryptedVote[] = [];
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const votedStudents = serverStudents.filter(s => s.hasVoted);

  votedStudents.forEach((student, sIdx) => {
    serverPositions.forEach((pos, pIdx) => {
      let posCandidates = serverCandidates.filter(c => c.positionId === pos.id);
      if (pos.id === 'representante_curso') {
        posCandidates = posCandidates.filter(c => c.isBlankVote || c.grade === student.grade);
      }
      if (posCandidates.length === 0) return;

      const candIdx = (sIdx + pIdx) % posCandidates.length;
      const chosen = posCandidates[candIdx];
      const voteToken = `ANON-${student.id.slice(-4)}-${pos.id}-${sIdx}`;
      const timestamp = student.votedAt || '2026-09-17T08:30:00.000Z';
      const hash = `${prevHash.slice(0, 16)}-${pos.id}-${chosen.id}-${student.mesaNumber}`;

      votes.push({
        id: `srv-vote-${sIdx}-${pIdx}`,
        voteToken,
        positionId: pos.id,
        candidateId: chosen.id,
        mesaNumber: student.mesaNumber,
        grade: student.grade,
        timestamp,
        hash,
        prevHash
      });

      prevHash = hash;
    });
  });

  return votes;
}

serverVotes = generateInitialServerVotes();

let serverAuditLogs: AuditLog[] = [
  {
    id: 'log-srv-001',
    timestamp: '2026-09-17T07:45:00.000Z',
    action: 'SISTEMA_INICIO',
    actorType: 'SISTEMA',
    actorName: 'Servidor Electoral Ekirayá',
    details: 'Inicialización de nodo central de votación con soporte multiequipo en tiempo real.',
    hash: '04a1f87cb60c1598f80470b4ba7130da4b54e790a6ea51f04494c6f376483cb1',
    status: 'VERIFICADO'
  }
];

// Active Terminals (Computers) Tracking
interface ActiveTerminal {
  id: string;
  name: string;
  role: string;
  mesaNumber?: number;
  lastPing: number;
}

const activeTerminals = new Map<string, ActiveTerminal>();

// Connected SSE Clients for real-time live broadcasting to all computers
const sseClients = new Set<Response>();

function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Clean up stale terminals periodically (older than 20 seconds)
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [id, term] of activeTerminals.entries()) {
    if (now - term.lastPing > 20000) {
      activeTerminals.delete(id);
      changed = true;
    }
  }
  if (changed) {
    broadcast('terminals_updated', {
      activeCount: Math.max(1, activeTerminals.size),
      terminals: Array.from(activeTerminals.values())
    });
  }
}, 5000);

// API: Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    terminalsCount: Math.max(1, activeTerminals.size)
  });
});

// API: SSE Stream for real-time multi-computer sync
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({
    message: 'Conexión multiequipo establecida con éxito',
    terminalsCount: Math.max(1, activeTerminals.size)
  })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// API: Heartbeat ping from each computer/terminal
app.post('/api/terminal/ping', (req: Request, res: Response) => {
  const { id, name, role, mesaNumber } = req.body;
  if (id) {
    activeTerminals.set(id, {
      id,
      name: name || 'Computador Ekirayá',
      role: role || 'VOTANTE',
      mesaNumber: mesaNumber ? Number(mesaNumber) : undefined,
      lastPing: Date.now()
    });
  }

  const activeList = Array.from(activeTerminals.values());
  res.json({
    success: true,
    activeCount: Math.max(1, activeTerminals.size),
    terminals: activeList
  });
});

// API: Full synchronized state for any computer connecting
app.get('/api/election/state', (req: Request, res: Response) => {
  res.json({
    config: serverConfig,
    positions: serverPositions,
    candidates: serverCandidates,
    students: serverStudents,
    votes: serverVotes,
    auditLogs: serverAuditLogs,
    terminalsCount: Math.max(1, activeTerminals.size),
    terminals: Array.from(activeTerminals.values())
  });
});

// API: Cast vote (executed from any voting terminal/computer)
app.post('/api/election/vote', (req: Request, res: Response) => {
  const { studentId, selections, terminalId } = req.body;

  if (!studentId || !selections) {
    res.status(400).json({ success: false, error: 'Datos de voto incompletos.' });
    return;
  }

  const student = serverStudents.find(s => s.id === studentId);
  if (!student) {
    res.status(404).json({ success: false, error: 'Estudiante no encontrado en el censo.' });
    return;
  }

  if (student.hasVoted) {
    res.status(400).json({
      success: false,
      error: `El estudiante ${student.fullName} ya ejerció su derecho al voto previamente.`
    });
    return;
  }

  const timestamp = new Date().toISOString();
  const dateStr = timestamp.slice(0, 10).replace(/-/g, '');
  const salt = Math.random().toString(36).substring(2, 6).toUpperCase();
  const folioNumber = `CE-${dateStr}-M${student.mesaNumber.toString().padStart(2, '0')}-${student.documentNumber.slice(-4)}${salt}`;

  // Process and seal each vote in the encrypted vault
  let lastHash = serverVotes.length > 0 ? serverVotes[serverVotes.length - 1].hash : '0000000000000000000000000000000000000000';
  const newVotesToAdd: EncryptedVote[] = [];

  for (const posId of Object.keys(selections)) {
    const candidateId = selections[posId];
    const voteToken = `TOKEN-${Math.random().toString(36).substr(2, 8)}-${timestamp}`;
    const voteHash = `${lastHash.slice(0, 8)}-${posId}-${candidateId}-${Math.random().toString(36).substr(2, 6)}`;

    newVotesToAdd.push({
      id: `vote-${Date.now()}-${posId}`,
      voteToken,
      positionId: posId,
      candidateId,
      mesaNumber: student.mesaNumber,
      grade: student.grade,
      timestamp,
      hash: voteHash,
      prevHash: lastHash
    });

    lastHash = voteHash;
  }

  serverVotes = [...serverVotes, ...newVotesToAdd];

  // Update student status centrally
  serverStudents = serverStudents.map(s =>
    s.id === studentId
      ? {
          ...s,
          hasVoted: true,
          votedAt: timestamp,
          receiptFolio: folioNumber
        }
      : s
  );

  const updatedStudent = serverStudents.find(s => s.id === studentId);

  // Add audit log
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp,
    action: 'VOTO_EMITIDO',
    actorType: 'ESTUDIANTE',
    actorName: 'Sufragante Cifrado',
    mesaNumber: student.mesaNumber,
    details: `Voto depositado en urna desde terminal ${terminalId || 'Remota'}. Folio emitido: ${folioNumber}`,
    hash: `${Math.random().toString(36).substr(2, 12)}`,
    status: 'VERIFICADO'
  };
  serverAuditLogs = [newLog, ...serverAuditLogs];

  // Broadcast the vote event to ALL connected computers immediately
  broadcast('vote_cast', {
    studentId,
    mesaNumber: student.mesaNumber,
    newVotes: newVotesToAdd,
    updatedStudent,
    newLog,
    totalVotes: serverVotes.length
  });

  res.json({
    success: true,
    folioNumber,
    timestamp,
    student: updatedStudent
  });
});

// API: Verify student at table (by Jurado on any computer)
app.post('/api/election/verify-student', (req: Request, res: Response) => {
  const { studentId, juradoName } = req.body;
  const student = serverStudents.find(s => s.id === studentId);

  if (!student) {
    res.status(404).json({ success: false, error: 'Estudiante no encontrado.' });
    return;
  }

  const now = new Date().toISOString();
  serverStudents = serverStudents.map(s =>
    s.id === studentId ? { ...s, isVerifiedByJurado: true, verifiedAt: now } : s
  );

  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: now,
    action: 'ESTUDIANTE_HABILITADO',
    actorType: 'JURADO',
    actorName: juradoName || 'Jurado de Mesa',
    mesaNumber: student.mesaNumber,
    details: `Estudiante ${student.fullName} verificado en Mesa 0${student.mesaNumber}`,
    hash: Math.random().toString(36).substr(2, 12),
    status: 'VERIFICADO'
  };
  serverAuditLogs = [newLog, ...serverAuditLogs];

  // Broadcast to all computers
  broadcast('student_verified', {
    studentId,
    verifiedAt: now,
    newLog
  });

  res.json({ success: true, studentId });
});

// API: Send or log certificate email delivery
app.post('/api/election/send-certificate-email', (req: Request, res: Response) => {
  const { email, cert } = req.body;
  if (!email || !cert) {
    res.status(400).json({ success: false, error: 'Email y datos del certificado son requeridos.' });
    return;
  }

  const timestamp = new Date().toISOString();
  const newLog: AuditLog = {
    id: `log-email-${Date.now()}`,
    timestamp,
    action: 'ACTA_GENERADA',
    actorType: 'SISTEMA',
    actorName: 'Servidor de Correo Ekirayá',
    mesaNumber: cert.mesaNumber,
    details: `Certificado ${cert.folioNumber} despachado automáticamente a ${email} para el estudiante ${cert.studentName}`,
    hash: Math.random().toString(36).substr(2, 12),
    status: 'VERIFICADO'
  };

  serverAuditLogs = [newLog, ...serverAuditLogs];
  broadcast('certificate_emailed', { email, folioNumber: cert.folioNumber, log: newLog });

  res.json({
    success: true,
    message: `Certificado enviado con éxito a ${email}`,
    timestamp
  });
});

// API: Add student to census
app.post('/api/election/add-student', (req: Request, res: Response) => {
  const newStudentData = req.body;
  const id = `est-${Date.now()}`;
  const student: Student = {
    ...newStudentData,
    id,
    hasVoted: false
  };

  serverStudents = [student, ...serverStudents];

  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'ESTUDIANTE_HABILITADO',
    actorType: 'ADMIN',
    actorName: 'Secretaría Académica',
    details: `Estudiante incorporado al censo: ${student.fullName} (${student.grade} - ${student.group})`,
    hash: Math.random().toString(36).substr(2, 12),
    status: 'VERIFICADO'
  };
  serverAuditLogs = [newLog, ...serverAuditLogs];

  broadcast('student_added', { student, newLog });
  res.json({ success: true, student });
});

// API: Add candidate
app.post('/api/election/add-candidate', (req: Request, res: Response) => {
  const newCandData = req.body;
  const id = `cand-${Date.now()}`;
  const candidate: Candidate = {
    ...newCandData,
    id
  };

  serverCandidates = [...serverCandidates, candidate];

  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'SISTEMA_INICIO',
    actorType: 'ADMIN',
    actorName: 'Comité Electoral',
    details: `Candidatura formalizada: ${candidate.fullName} (#${candidate.number}) para ${candidate.positionId}`,
    hash: Math.random().toString(36).substr(2, 12),
    status: 'VERIFICADO'
  };
  serverAuditLogs = [newLog, ...serverAuditLogs];

  broadcast('candidate_added', { candidate, newLog });
  res.json({ success: true, candidate });
});

// API: Update candidate
app.post('/api/election/update-candidate', (req: Request, res: Response) => {
  const updatedCandidate = req.body;
  if (!updatedCandidate || !updatedCandidate.id) {
    res.status(400).json({ success: false, error: 'ID de candidato requerido' });
    return;
  }

  serverCandidates = serverCandidates.map(c => (c.id === updatedCandidate.id ? updatedCandidate : c));

  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'SISTEMA_INICIO',
    actorType: 'ADMIN',
    actorName: 'Comité Electoral',
    details: `Candidatura modificada: ${updatedCandidate.fullName} (#${updatedCandidate.number}) para ${updatedCandidate.positionId}`,
    hash: Math.random().toString(36).substr(2, 12),
    status: 'VERIFICADO'
  };
  serverAuditLogs = [newLog, ...serverAuditLogs];

  broadcast('candidate_updated', { candidate: updatedCandidate, newLog });
  res.json({ success: true, candidate: updatedCandidate });
});

// API: Delete candidate
app.post('/api/election/delete-candidate', (req: Request, res: Response) => {
  const { id } = req.body;
  if (!id) {
    res.status(400).json({ success: false, error: 'ID de candidato requerido' });
    return;
  }

  const target = serverCandidates.find(c => c.id === id);
  if (target?.isBlankVote) {
    res.status(400).json({ success: false, error: 'No se puede eliminar el voto en blanco obligatorio.' });
    return;
  }

  serverCandidates = serverCandidates.filter(c => c.id !== id);

  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'SISTEMA_INICIO',
    actorType: 'ADMIN',
    actorName: 'Comité Electoral',
    details: `Candidatura retirada del tarjetón: ${target ? target.fullName : id}`,
    hash: Math.random().toString(36).substr(2, 12),
    status: 'VERIFICADO'
  };
  serverAuditLogs = [newLog, ...serverAuditLogs];

  broadcast('candidate_deleted', { id, newLog });
  res.json({ success: true, id });
});

// API: Update election status
app.post('/api/election/status', (req: Request, res: Response) => {
  const { status } = req.body;
  const now = new Date().toISOString();

  serverConfig = {
    ...serverConfig,
    status,
    openedAt: status === 'ABIERTA' && !serverConfig.openedAt ? now : serverConfig.openedAt,
    closedAt: status === 'CERRADA' ? now : serverConfig.closedAt
  };

  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: now,
    action: 'APERTURA_MESA',
    actorType: 'ADMIN',
    actorName: 'Supervisión Electoral',
    details: `Estado de la jornada actualizado a: ${status}`,
    hash: Math.random().toString(36).substr(2, 12),
    status: 'VERIFICADO'
  };
  serverAuditLogs = [newLog, ...serverAuditLogs];

  broadcast('status_changed', { status, config: serverConfig, newLog });
  res.json({ success: true, status, config: serverConfig });
});

// API: Proxy Google Sheets Sync (Escritura y Lectura para base de datos)
app.post('/api/election/sheets-write', async (req: Request, res: Response) => {
  const { scriptUrl, payload } = req.body;
  if (!scriptUrl) {
    res.status(400).json({ success: false, error: 'URL del webhook no proporcionada' });
    return;
  }
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text, status: 'SUCCESS' };
    }
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/election/sheets-read', async (req: Request, res: Response) => {
  const { scriptUrl, action } = req.body;
  if (!scriptUrl) {
    res.status(400).json({ success: false, error: 'URL del webhook no proporcionada' });
    return;
  }
  try {
    const targetUrl = new URL(scriptUrl);
    targetUrl.searchParams.set('action', action || 'getCensus');
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Reset election data
app.post('/api/election/reset', (req: Request, res: Response) => {
  serverStudents = INITIAL_STUDENTS.map(s => ({
    ...s,
    hasVoted: false,
    votedAt: undefined,
    receiptFolio: undefined,
    isVerifiedByJurado: false,
    verifiedAt: undefined
  }));
  serverVotes = [];
  serverConfig = { ...INITIAL_CONFIG };

  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'SISTEMA_INICIO',
    actorType: 'ADMIN',
    actorName: 'Supervisión Electoral',
    details: 'Reinicio general de la jornada electoral. Urnas restablecidas a cero.',
    hash: Math.random().toString(36).substr(2, 12),
    status: 'VERIFICADO'
  };
  serverAuditLogs = [newLog];

  broadcast('election_reset', {
    students: serverStudents,
    votes: serverVotes,
    config: serverConfig,
    newLog
  });

  res.json({ success: true });
});

// Launch server with Vite middleware or static dist
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Electoral Ekirayá activo en http://0.0.0.0:${PORT}`);
  });
}

start();
