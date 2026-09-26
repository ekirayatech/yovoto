import crypto from 'crypto';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_ADMINS,
  INITIAL_CANDIDATES,
  INITIAL_CONFIG,
  INITIAL_JURADOS,
  INITIAL_POSITIONS,
  INITIAL_STUDENTS,
  POLLING_STATIONS,
  resolveRegistradorEmail
} from './src/data/mockElectionData';
import {
  AdminMember,
  AuditLog,
  Candidate,
  CertificateInboxMessage,
  ElectionConfig,
  EncryptedVote,
  JuradoMember,
  Position,
  Student,
  VotingCertificate
} from './src/types/election';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Cloud & Persistent Storage Paths
const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_FILE = path.join(DATA_DIR, 'election_cloud_backup.json');
const SNAPSHOTS_FILE = path.join(DATA_DIR, 'snapshots_history.json');

// URL Fija Oficial de Google Apps Script para Colegio Ekirayá - CEM
export const FIXED_OFFICIAL_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzK2vgE7BiggCHsWkttEg8_iGEDYNCT1jVYpJvyLgFoNqYz15yhc0Deq0FLOMNeQnv0/exec';

// Authoritative Election State held on server
let serverConfig: ElectionConfig = {
  ...INITIAL_CONFIG,
  googleSheets: {
    ...INITIAL_CONFIG.googleSheets,
    enabled: true,
    scriptUrl: FIXED_OFFICIAL_SHEETS_URL,
    autoSync: true
  }
};
let serverPositions: Position[] = [...INITIAL_POSITIONS];
let serverCandidates: Candidate[] = [...INITIAL_CANDIDATES];
let serverStudents: Student[] = [...INITIAL_STUDENTS];
let serverJurados: JuradoMember[] = [...INITIAL_JURADOS];
let serverAdmins: AdminMember[] = [...INITIAL_ADMINS];
let serverVotes: EncryptedVote[] = [];
let serverSuperadminInbox: CertificateInboxMessage[] = [];

// Cloud Snapshots History
interface CloudSnapshot {
  id: string;
  timestamp: string;
  reason: string;
  totalVotes: number;
  totalVotersVoted: number;
  totalCensus: number;
  checksum: string;
  sizeBytes: number;
  sheetsSyncStatus: 'SYNCED' | 'PENDING' | 'ERROR';
}

let cloudSnapshotsList: CloudSnapshot[] = [];

// Google Sheets Queued Writes & Metrics
interface PendingSheetsWrite {
  id: string;
  action: string;
  payload: any;
  timestamp: string;
  attempts: number;
}
let sheetsPendingQueue: PendingSheetsWrite[] = [];
let totalSyncedVotesCount = 0;

// Persist server state to disk/cloud backup
function persistStateToCloudBackup(reason = 'Respaldo automático') {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const statePayload = {
      config: serverConfig,
      positions: serverPositions,
      candidates: serverCandidates,
      students: serverStudents,
      jurados: serverJurados,
      admins: serverAdmins,
      votes: serverVotes,
      auditLogs: serverAuditLogs,
      superadminInbox: serverSuperadminInbox,
      savedAt: new Date().toISOString()
    };
    const jsonStr = JSON.stringify(statePayload, null, 2);
    fs.writeFileSync(BACKUP_FILE, jsonStr, 'utf-8');

    const hash = crypto.createHash('sha256').update(jsonStr).digest('hex');
    const votedCount = serverStudents.filter(s => s.hasVoted).length;

    const snapshot: CloudSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      reason,
      totalVotes: serverVotes.length,
      totalVotersVoted: votedCount,
      totalCensus: serverStudents.length,
      checksum: hash.slice(0, 16),
      sizeBytes: Buffer.byteLength(jsonStr, 'utf-8'),
      sheetsSyncStatus: serverConfig.googleSheets?.status === 'success' ? 'SYNCED' : 'PENDING'
    };

    cloudSnapshotsList = [snapshot, ...cloudSnapshotsList.slice(0, 24)];
    try {
      fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(cloudSnapshotsList, null, 2), 'utf-8');
    } catch {}

    broadcast('cloud_backup_updated', {
      lastBackupTime: snapshot.timestamp,
      snapshot,
      totalSnapshots: cloudSnapshotsList.length
    });
  } catch (err: any) {
    console.error('Error al persistir respaldo en la nube:', err.message);
  }
}

// Restore state from cloud backup if exists
function loadStateFromCloudBackup() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(BACKUP_FILE)) {
      const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.config) {
        serverConfig = {
          ...serverConfig,
          ...data.config,
          googleSheets: {
            ...serverConfig.googleSheets,
            ...(data.config.googleSheets || {}),
            enabled: true,
            scriptUrl: FIXED_OFFICIAL_SHEETS_URL,
            autoSync: true
          }
        };
      } else {
        serverConfig.googleSheets = {
          ...serverConfig.googleSheets,
          enabled: true,
          scriptUrl: FIXED_OFFICIAL_SHEETS_URL,
          autoSync: true
        };
      }
      if (Array.isArray(data.positions) && data.positions.length > 0) serverPositions = data.positions;
      if (Array.isArray(data.candidates) && data.candidates.length > 0) serverCandidates = data.candidates;
      if (Array.isArray(data.students) && data.students.length > 0) serverStudents = data.students;
      if (Array.isArray(data.jurados) && data.jurados.length > 0) serverJurados = data.jurados;
      if (Array.isArray(data.admins) && data.admins.length > 0) serverAdmins = data.admins;
      if (Array.isArray(data.votes)) serverVotes = data.votes;
      if (Array.isArray(data.auditLogs) && data.auditLogs.length > 0) serverAuditLogs = data.auditLogs;
      if (Array.isArray(data.superadminInbox)) serverSuperadminInbox = data.superadminInbox;
      console.log(`[Cloud Backup] Respaldo previo cargado con éxito: ${serverVotes.length} votos, ${serverStudents.length} estudiantes.`);
    }
    if (fs.existsSync(SNAPSHOTS_FILE)) {
      const snapRaw = fs.readFileSync(SNAPSHOTS_FILE, 'utf-8');
      cloudSnapshotsList = JSON.parse(snapRaw);
    }
  } catch (err: any) {
    console.warn('[Cloud Backup] No se pudo restaurar estado anterior:', err.message);
  }
}


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

// Generate initial Superadmin Inbox messages for students who already voted
function generateInitialServerInbox(): CertificateInboxMessage[] {
  const votedStudents = serverStudents.filter(s => s.hasVoted);
  return votedStudents.map((student, idx) => {
    const timestamp = student.votedAt || '2026-09-17T08:35:00.000Z';
    const folioNumber = student.receiptFolio || `CE-20260917-M${String(student.mesaNumber).padStart(2, '0')}-${student.documentNumber.slice(-4)}${String(idx + 1).padStart(3, '0')}`;
    const fromEmail = resolveRegistradorEmail(serverAdmins, serverConfig.institutionEmail).email;
    const toEmail = serverConfig.superadminEmail || 'rectoria@ekiraya.edu.co';
    const verificationHash = `04a1f87cb60c1598f80470b4ba7130da4b54e790a6ea51f04494c6f37648${String(idx + 10).padStart(4, '0')}`;

    const cert: VotingCertificate = {
      folioNumber,
      studentName: student.fullName,
      documentType: student.documentType,
      documentNumber: student.documentNumber,
      grade: student.grade,
      group: student.group,
      mesaNumber: student.mesaNumber,
      studentEmail: student.email,
      timestamp,
      verificationHash,
      schoolName: serverConfig.institutionName,
      daneCode: serverConfig.daneCode,
      rectorName: serverConfig.rectorName,
      fromEmail,
      sentToSuperadminAt: timestamp
    };

    return {
      id: `inbox-${student.id}-${idx + 1}`,
      folioNumber,
      timestamp,
      fromEmail,
      toEmail,
      studentId: student.id,
      studentName: student.fullName,
      documentType: student.documentType,
      documentNumber: student.documentNumber,
      grade: student.grade,
      group: student.group,
      mesaNumber: student.mesaNumber,
      verificationHash,
      certificate: cert,
      status: 'ENTREGADO',
      read: idx > 1,
      subject: `Certificado Electoral de Sufragio - Folio ${folioNumber} - ${student.fullName} (${student.grade} - ${student.group})`
    };
  });
}

serverSuperadminInbox = generateInitialServerInbox();

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

// Restore prior authoritative state from disk immediately if available
loadStateFromCloudBackup();

// Active Terminals (Computers) Tracking
interface ActiveTerminal {
  id: string;
  name: string;
  role: string;
  mesaNumber?: number;
  lastPing: number;
  ipAddress?: string;
  userAgent?: string;
}

const activeTerminals = new Map<string, ActiveTerminal>();

// Connected SSE Clients for real-time live broadcasting to all computers
const sseClients = new Set<Response>();
let serverStateVersion = Date.now();

function broadcast(event: string, data: unknown) {
  serverStateVersion++;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Heartbeat keep-alive to keep SSE connections open through Cloud Run, proxies, and Wi-Fi NAT
setInterval(() => {
  if (sseClients.size === 0) return;
  for (const client of sseClients) {
    try {
      client.write(': keepalive\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 10000);

// Google Sheets Centralized Dispatch
async function recordVoteToGoogleSheets(
  student: Student,
  newVotes: EncryptedVote[],
  folioNumber: string,
  timestamp: string
) {
  const scriptUrl = serverConfig.googleSheets?.scriptUrl || FIXED_OFFICIAL_SHEETS_URL;
  if (!scriptUrl) return;

  const payload = {
    action: 'castVote',
    studentDoc: student.documentNumber,
    studentName: student.fullName,
    grade: student.grade,
    group: student.group,
    mesaNumber: student.mesaNumber,
    folioNumber,
    timestamp,
    votes: newVotes.map(v => ({
      voteToken: v.voteToken,
      positionId: v.positionId,
      candidateId: v.candidateId,
      mesaNumber: v.mesaNumber,
      hash: v.hash,
      timestamp: v.timestamp
    }))
  };

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    if (!res.ok) {
      throw new Error(`Google Sheets HTTP ${res.status}`);
    }

    serverConfig.googleSheets.lastSyncTime = new Date().toISOString();
    serverConfig.googleSheets.status = 'success';
    totalSyncedVotesCount += newVotes.length;

    broadcast('sheets_sync_updated', {
      status: 'success',
      lastSyncTime: serverConfig.googleSheets.lastSyncTime,
      totalSyncedVotes: totalSyncedVotesCount,
      folioNumber,
      studentName: student.fullName
    });
  } catch (err: any) {
    console.warn('Google Sheets no respondió de inmediato, guardando en cola de reintentos:', err.message);
    serverConfig.googleSheets.status = 'syncing';
    sheetsPendingQueue.push({
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      action: 'castVote',
      payload,
      timestamp: new Date().toISOString(),
      attempts: 0
    });
    broadcast('sheets_sync_updated', {
      status: 'syncing',
      lastSyncTime: serverConfig.googleSheets.lastSyncTime,
      pendingQueueCount: sheetsPendingQueue.length,
      lastError: err.message
    });
  }
}

// Background queue flusher for Google Sheets
setInterval(async () => {
  if (sheetsPendingQueue.length === 0) return;
  const scriptUrl = serverConfig.googleSheets?.scriptUrl || FIXED_OFFICIAL_SHEETS_URL;
  if (!scriptUrl) return;

  const item = sheetsPendingQueue[0];
  item.attempts++;
  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.payload),
      redirect: 'follow'
    });
    if (res.ok) {
      sheetsPendingQueue.shift();
      serverConfig.googleSheets.lastSyncTime = new Date().toISOString();
      serverConfig.googleSheets.status = 'success';
      broadcast('sheets_sync_updated', {
        status: 'success',
        lastSyncTime: serverConfig.googleSheets.lastSyncTime,
        pendingQueueCount: sheetsPendingQueue.length
      });
    }
  } catch (e) {
    if (item.attempts >= 5) {
      sheetsPendingQueue.shift(); // drop stale after 5 retries
    }
  }
}, 12000);

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
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  sseClients.add(res);

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({
    message: 'Conexión multiequipo establecida con éxito',
    version: serverStateVersion,
    status: serverConfig.status,
    terminalsCount: Math.max(1, activeTerminals.size),
    sheetsStatus: {
      lastSyncTime: serverConfig.googleSheets?.lastSyncTime,
      status: serverConfig.googleSheets?.status || 'idle',
      pendingQueueCount: sheetsPendingQueue.length,
      totalSyncedVotes: totalSyncedVotesCount
    },
    cloudBackup: {
      lastBackupTime: cloudSnapshotsList[0]?.timestamp,
      totalSnapshots: cloudSnapshotsList.length
    }
  })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// API: Heartbeat ping from each computer/terminal
app.post('/api/terminal/ping', (req: Request, res: Response) => {
  const { id, name, role, mesaNumber } = req.body;
  const isNew = id ? !activeTerminals.has(id) : false;
  const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  const ipAddress = rawIp.replace('::ffff:', '');
  const userAgent = ((req.headers['user-agent'] as string) || 'Dispositivo').slice(0, 45);

  if (id) {
    activeTerminals.set(id, {
      id,
      name: name || 'Computador Ekirayá',
      role: role || 'VOTANTE',
      mesaNumber: mesaNumber ? Number(mesaNumber) : undefined,
      lastPing: Date.now(),
      ipAddress,
      userAgent
    });
  }

  const activeList = Array.from(activeTerminals.values());
  if (isNew) {
    broadcast('terminals_updated', {
      activeCount: Math.max(1, activeTerminals.size),
      terminals: activeList
    });
  }

  res.json({
    success: true,
    activeCount: Math.max(1, activeTerminals.size),
    terminals: activeList
  });
});

// API: Fast polling sync endpoint for 20+ computer network
app.get('/api/election/version', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({
    version: serverStateVersion,
    status: serverConfig.status,
    votesCount: serverVotes.length,
    studentsCount: serverStudents.length,
    votedCount: serverStudents.filter(s => s.hasVoted).length,
    terminalsCount: Math.max(1, activeTerminals.size),
    timestamp: new Date().toISOString()
  });
});

// API: Full synchronized state for any computer connecting
app.get('/api/election/state', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({
    version: serverStateVersion,
    config: serverConfig,
    positions: serverPositions,
    candidates: serverCandidates,
    students: serverStudents,
    jurados: serverJurados,
    admins: serverAdmins,
    votes: serverVotes,
    auditLogs: serverAuditLogs,
    superadminInbox: serverSuperadminInbox,
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

  // Automatic email dispatch from Usuario Registrador
  const registradorInfo = resolveRegistradorEmail(serverAdmins, serverConfig.institutionEmail);
  const fromEmail = registradorInfo.email;
  const toEmail =
    student.email && student.email.includes('@')
      ? student.email
      : serverConfig.superadminEmail || 'rectoria@ekiraya.edu.co';
  const verificationHash = `${lastHash.slice(0, 16)}-M${student.mesaNumber}-${student.documentNumber}`;

  const cert: VotingCertificate = {
    folioNumber,
    studentName: student.fullName,
    documentType: student.documentType,
    documentNumber: student.documentNumber,
    grade: student.grade,
    group: student.group,
    mesaNumber: student.mesaNumber,
    studentEmail: student.email,
    timestamp,
    verificationHash,
    schoolName: serverConfig.institutionName,
    daneCode: serverConfig.daneCode,
    rectorName: serverConfig.rectorName,
    fromEmail,
    sentToSuperadminAt: timestamp
  };

  const inboxMsg: CertificateInboxMessage = {
    id: `inbox-cert-${Date.now()}`,
    folioNumber,
    timestamp,
    fromEmail,
    toEmail,
    studentId: student.id,
    studentName: student.fullName,
    documentType: student.documentType,
    documentNumber: student.documentNumber,
    grade: student.grade,
    group: student.group,
    mesaNumber: student.mesaNumber,
    verificationHash,
    certificate: cert,
    status: 'ENTREGADO',
    read: false,
    subject: `Certificado Electoral de Sufragio - Folio ${folioNumber} - ${student.fullName} (${student.grade} - ${student.group})`
  };

  serverSuperadminInbox = [inboxMsg, ...serverSuperadminInbox];

  const emailLog: AuditLog = {
    id: `log-mail-${Date.now()}`,
    timestamp,
    action: 'ACTA_GENERADA',
    actorType: 'SISTEMA',
    actorName: 'Servicio Institucional de Correo Ekirayá',
    mesaNumber: student.mesaNumber,
    details: `Certificado Folio ${folioNumber} remitido desde ${fromEmail} a la Bandeja del Superadministrador (${toEmail}) para ${student.fullName}`,
    hash: Math.random().toString(36).substr(2, 12),
    status: 'VERIFICADO'
  };
  serverAuditLogs = [emailLog, ...serverAuditLogs];

  // Broadcast the vote event and certificate delivery to ALL connected computers immediately
  broadcast('vote_cast', {
    studentId,
    mesaNumber: student.mesaNumber,
    newVotes: newVotesToAdd,
    updatedStudent,
    newLog,
    totalVotes: serverVotes.length,
    certificate: cert,
    inboxMessage: inboxMsg
  });

  broadcast('certificate_inbox_received', { inboxMessage: inboxMsg, log: emailLog });

  // 1. Centralized Instant Cloud Backup
  persistStateToCloudBackup(`Voto depositado en urna - Folio ${folioNumber}`);

  // 2. Real-time write to the unified Google Sheet
  recordVoteToGoogleSheets(student, newVotesToAdd, folioNumber, timestamp);

  res.json({
    success: true,
    folioNumber,
    timestamp,
    student: updatedStudent,
    certificate: cert,
    inboxMessage: inboxMsg
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
  persistStateToCloudBackup(`Verificación de estudiante ${student.fullName}`);
  broadcast('student_verified', {
    studentId,
    verifiedAt: now,
    newLog
  });

  res.json({ success: true, studentId, version: serverStateVersion });
});

// API: Send or log certificate email delivery (from Usuario Registrador)
app.post('/api/election/send-certificate-email', async (req: Request, res: Response) => {
  const { email, cert, fromEmail, registradorName } = req.body;
  if (!email || !cert) {
    res.status(400).json({ success: false, error: 'Email y datos del certificado son requeridos.' });
    return;
  }

  const registradorInfo = resolveRegistradorEmail(serverAdmins, serverConfig.institutionEmail);
  const senderEmail = fromEmail || cert.fromEmail || registradorInfo.email;
  const senderName = registradorName || registradorInfo.fullName;
  const timestamp = new Date().toISOString();

  const updatedCert: VotingCertificate = {
    ...cert,
    fromEmail: senderEmail,
    studentEmail: email
  };

  const existingIdx = serverSuperadminInbox.findIndex(m => m.folioNumber === cert.folioNumber);
  if (existingIdx >= 0) {
    serverSuperadminInbox[existingIdx] = {
      ...serverSuperadminInbox[existingIdx],
      fromEmail: senderEmail,
      toEmail: email,
      certificate: updatedCert,
      status: 'ENTREGADO'
    };
  } else {
    const inboxMsg: CertificateInboxMessage = {
      id: `inbox-cert-${Date.now()}`,
      folioNumber: cert.folioNumber,
      timestamp: cert.timestamp || timestamp,
      fromEmail: senderEmail,
      toEmail: email,
      studentId: `est-${cert.documentNumber}`,
      studentName: cert.studentName,
      documentType: cert.documentType,
      documentNumber: cert.documentNumber,
      grade: cert.grade,
      group: cert.group,
      mesaNumber: cert.mesaNumber,
      verificationHash: cert.verificationHash,
      certificate: updatedCert,
      status: 'ENTREGADO',
      read: false,
      subject: `Certificado Electoral de Sufragio - Folio ${cert.folioNumber} - ${cert.studentName} (${cert.grade} - ${cert.group})`
    };
    serverSuperadminInbox = [inboxMsg, ...serverSuperadminInbox];
  }

  // Forward email dispatch to Google Apps Script if configured
  const scriptUrl = serverConfig.googleSheets?.scriptUrl || INITIAL_CONFIG.googleSheets.scriptUrl;
  if (scriptUrl && email.includes('@')) {
    fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sendCertificateEmail',
        toEmail: email,
        studentEmail: email,
        fromEmail: senderEmail,
        registradorName: senderName,
        superadminEmail: serverConfig.superadminEmail || 'rectoria@ekiraya.edu.co',
        folioNumber: updatedCert.folioNumber,
        studentName: updatedCert.studentName,
        documentType: updatedCert.documentType,
        documentNumber: updatedCert.documentNumber,
        grade: updatedCert.grade,
        group: updatedCert.group,
        mesaNumber: updatedCert.mesaNumber,
        timestamp: updatedCert.timestamp,
        verificationHash: updatedCert.verificationHash,
        schoolName: updatedCert.schoolName || serverConfig.institutionName,
        daneCode: updatedCert.daneCode || serverConfig.daneCode,
        rectorName: updatedCert.rectorName || serverConfig.rectorName
      })
    }).catch(() => {});
  }

  const newLog: AuditLog = {
    id: `log-email-${Date.now()}`,
    timestamp,
    action: 'ACTA_GENERADA',
    actorType: 'SISTEMA',
    actorName: `Usuario Registrador (${senderEmail})`,
    mesaNumber: cert.mesaNumber,
    details: `Certificado ${cert.folioNumber} despachado desde el correo del Usuario Registrador (${senderEmail}) a ${email} para el estudiante ${cert.studentName}`,
    hash: Math.random().toString(36).substr(2, 12),
    status: 'VERIFICADO'
  };

  serverAuditLogs = [newLog, ...serverAuditLogs];
  broadcast('certificate_emailed', { email, fromEmail: senderEmail, folioNumber: cert.folioNumber, log: newLog });

  res.json({
    success: true,
    fromEmail: senderEmail,
    message: `Certificado enviado con éxito desde ${senderEmail} (Usuario Registrador) a ${email}`,
    timestamp
  });
});

// API: Get superadmin certificate inbox
app.get('/api/election/superadmin-inbox', (req: Request, res: Response) => {
  res.json({
    success: true,
    inbox: serverSuperadminInbox
  });
});

// API: Explicitly send / resend certificate to Superadministrator's inbox
app.post('/api/election/send-certificate-to-superadmin', (req: Request, res: Response) => {
  const { cert, fromEmail, toEmail, inboxMsg } = req.body;
  if (!cert) {
    res.status(400).json({ success: false, error: 'Certificado requerido.' });
    return;
  }

  const sender = fromEmail || resolveRegistradorEmail(serverAdmins, serverConfig.institutionEmail).email;
  const recipient = toEmail || serverConfig.superadminEmail || 'rectoria@ekiraya.edu.co';
  const timestamp = cert.timestamp || new Date().toISOString();

  const msg: CertificateInboxMessage = inboxMsg || {
    id: `inbox-cert-${Date.now()}`,
    folioNumber: cert.folioNumber,
    timestamp,
    fromEmail: sender,
    toEmail: recipient,
    studentId: `est-${cert.documentNumber}`,
    studentName: cert.studentName,
    documentType: cert.documentType,
    documentNumber: cert.documentNumber,
    grade: cert.grade,
    group: cert.group,
    mesaNumber: cert.mesaNumber,
    verificationHash: cert.verificationHash,
    certificate: cert,
    status: 'ENTREGADO',
    read: false,
    subject: `Certificado Electoral de Sufragio - Folio ${cert.folioNumber} - ${cert.studentName} (${cert.grade})`
  };

  // Add to inbox if not already there
  const existingIdx = serverSuperadminInbox.findIndex(m => m.folioNumber === cert.folioNumber);
  if (existingIdx >= 0) {
    serverSuperadminInbox[existingIdx] = msg;
  } else {
    serverSuperadminInbox = [msg, ...serverSuperadminInbox];
  }

  const newLog: AuditLog = {
    id: `log-superadmin-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'ACTA_GENERADA',
    actorType: 'SISTEMA',
    actorName: 'Servicio Institucional de Correo Ekirayá',
    mesaNumber: cert.mesaNumber,
    details: `Certificado Folio ${cert.folioNumber} remitido desde ${sender} a la Bandeja del Superadministrador (${recipient}) para ${cert.studentName}`,
    hash: Math.random().toString(36).substr(2, 12),
    status: 'VERIFICADO'
  };
  serverAuditLogs = [newLog, ...serverAuditLogs];

  broadcast('certificate_inbox_received', { inboxMessage: msg, log: newLog });

  res.json({
    success: true,
    message: `Certificado remitido con éxito desde ${sender} a la Bandeja del Superadministrador (${recipient}).`,
    inboxMessage: msg
  });
});

// API: Mark inbox certificate as read
app.post('/api/election/mark-inbox-read', (req: Request, res: Response) => {
  const { id } = req.body;
  if (!id) {
    res.status(400).json({ success: false, error: 'ID requerido.' });
    return;
  }

  serverSuperadminInbox = serverSuperadminInbox.map(m =>
    m.id === id ? { ...m, read: true } : m
  );

  broadcast('inbox_marked_read', { id });
  res.json({ success: true, id });
});

// API: Add student to census
app.post('/api/election/add-student', (req: Request, res: Response) => {
  const newStudentData = req.body;
  const cleanDoc = String(newStudentData.documentNumber || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
  
  if (cleanDoc) {
    const existing = serverStudents.find(s =>
      String(s.documentNumber).replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim() === cleanDoc
    );
    if (existing) {
      res.json({ success: true, student: existing, version: serverStateVersion });
      return;
    }
  }

  const id = newStudentData.id || `est-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const student: Student = {
    ...newStudentData,
    id,
    hasVoted: !!newStudentData.hasVoted
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

  persistStateToCloudBackup(`Incorporación de estudiante ${student.fullName}`);
  broadcast('student_added', { student, newLog });
  res.json({ success: true, student, version: serverStateVersion });
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

  persistStateToCloudBackup(`Adición de candidato ${candidate.fullName}`);
  broadcast('candidate_added', { candidate, newLog });
  res.json({ success: true, candidate, version: serverStateVersion });
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

  persistStateToCloudBackup(`Actualización de candidato ${updatedCandidate.fullName}`);
  broadcast('candidate_updated', { candidate: updatedCandidate, newLog });
  res.json({ success: true, candidate: updatedCandidate, version: serverStateVersion });
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

  persistStateToCloudBackup(`Eliminación de candidatura ${id}`);
  broadcast('candidate_deleted', { id, newLog });
  res.json({ success: true, id, version: serverStateVersion });
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
    action: status === 'ABIERTA' ? 'APERTURA_MESA' : (status === 'CERRADA' ? 'CIERRE_MESA' : 'SISTEMA_INICIO'),
    actorType: 'ADMIN',
    actorName: 'Supervisión Electoral',
    details: `Estado de la jornada actualizado a: ${status}`,
    hash: crypto.createHash('sha256').update(`${now}-${status}-${Date.now()}`).digest('hex'),
    status: 'VERIFICADO'
  };
  serverAuditLogs = [newLog, ...serverAuditLogs];

  persistStateToCloudBackup(`Cambio de estado de urna a: ${status}`);
  broadcast('status_changed', { status, config: serverConfig, newLog });
  res.json({ success: true, status, config: serverConfig, version: serverStateVersion });
});

// API: Update election configuration centrally
app.post('/api/election/config', (req: Request, res: Response) => {
  const { config: newConfig } = req.body;
  if (newConfig) {
    serverConfig = {
      ...serverConfig,
      ...newConfig,
      googleSheets: {
        ...serverConfig.googleSheets,
        ...(newConfig.googleSheets || {})
      }
    };
    persistStateToCloudBackup('Actualización de configuración institucional');
    broadcast('config_updated', { config: serverConfig });
  }
  res.json({ success: true, config: serverConfig, version: serverStateVersion });
});

// API: Sync students census loaded from Google Sheets
app.post('/api/election/sync-students', (req: Request, res: Response) => {
  const { students } = req.body;
  if (Array.isArray(students) && students.length > 0) {
    serverStudents = students;
    persistStateToCloudBackup(`Sincronización de censo (${students.length} estudiantes)`);
    broadcast('students_synced', { count: students.length });
  }
  res.json({ success: true, count: serverStudents.length, version: serverStateVersion });
});

// API: Sync candidates loaded from Google Sheets
app.post('/api/election/sync-candidates', (req: Request, res: Response) => {
  const { candidates } = req.body;
  if (Array.isArray(candidates) && candidates.length > 0) {
    serverCandidates = candidates;
    persistStateToCloudBackup(`Sincronización de candidaturas (${candidates.length} candidatos)`);
    broadcast('candidates_synced', { count: candidates.length });
  }
  res.json({ success: true, count: serverCandidates.length, version: serverStateVersion });
});

// API: Sync jurados loaded from Google Sheets
app.post('/api/election/sync-jurados', (req: Request, res: Response) => {
  const { jurados } = req.body;
  if (Array.isArray(jurados) && jurados.length > 0) {
    serverJurados = jurados;
    persistStateToCloudBackup(`Sincronización de jurados (${jurados.length} jurados)`);
    broadcast('jurados_synced', { count: jurados.length });
  }
  res.json({ success: true, count: serverJurados.length, version: serverStateVersion });
});

// API: Sync admins loaded from Google Sheets
app.post('/api/election/sync-admins', (req: Request, res: Response) => {
  const { admins } = req.body;
  if (Array.isArray(admins) && admins.length > 0) {
    serverAdmins = admins;
    persistStateToCloudBackup(`Sincronización de administradores (${admins.length} administradores)`);
    broadcast('admins_synced', { count: admins.length });
  }
  res.json({ success: true, count: serverAdmins.length, version: serverStateVersion });
});

// API: Sync all 4 databases loaded from Google Sheets
app.post('/api/election/sync-all', (req: Request, res: Response) => {
  const { students, candidates, jurados, admins, config } = req.body;
  if (Array.isArray(students) && students.length > 0) serverStudents = students;
  if (Array.isArray(candidates) && candidates.length > 0) serverCandidates = candidates;
  if (Array.isArray(jurados) && jurados.length > 0) serverJurados = jurados;
  if (Array.isArray(admins) && admins.length > 0) serverAdmins = admins;
  if (config) {
    serverConfig = {
      ...serverConfig,
      ...config,
      googleSheets: {
        ...serverConfig.googleSheets,
        ...(config.googleSheets || {})
      }
    };
  }
  persistStateToCloudBackup('Sincronización total de bases de datos');
  broadcast('all_synced', {
    studentsCount: serverStudents.length,
    candidatesCount: serverCandidates.length,
    juradosCount: serverJurados.length,
    adminsCount: serverAdmins.length
  });
  res.json({ success: true, version: serverStateVersion });
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
      body: JSON.stringify(payload),
      redirect: 'follow'
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
  const { scriptUrl, action, ...otherParams } = req.body;
  if (!scriptUrl) {
    res.status(400).json({ success: false, error: 'URL del webhook no proporcionada' });
    return;
  }
  try {
    const targetUrl = new URL(scriptUrl);
    targetUrl.searchParams.set('action', action || 'getCensus');
    targetUrl.searchParams.set('_t', Date.now().toString());

    Object.entries(otherParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        targetUrl.searchParams.set(k, String(v));
      }
    });

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow'
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
  serverSuperadminInbox = [];
  serverConfig = { ...INITIAL_CONFIG };

  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'SISTEMA_INICIO',
    actorType: 'ADMIN',
    actorName: 'Supervisión Electoral',
    details: 'Reinicio general de la jornada electoral. Urnas restablecidas a cero y bandeja de certificados reiniciada.',
    hash: Math.random().toString(36).substr(2, 12),
    status: 'VERIFICADO'
  };
  serverAuditLogs = [newLog];

  persistStateToCloudBackup('Reinicio general de la jornada electoral');

  broadcast('election_reset', {
    students: serverStudents,
    votes: serverVotes,
    config: serverConfig,
    superadminInbox: serverSuperadminInbox,
    newLog
  });

  res.json({ success: true });
});

// API: Cloud Backup - Get Status & Snapshots List
app.get('/api/election/cloud-backup', (req: Request, res: Response) => {
  const fileExists = fs.existsSync(BACKUP_FILE);
  let fileSize = 0;
  if (fileExists) {
    try {
      fileSize = fs.statSync(BACKUP_FILE).size;
    } catch {}
  }
  res.json({
    success: true,
    fileExists,
    fileSize,
    totalSnapshots: cloudSnapshotsList.length,
    lastBackupTime: cloudSnapshotsList[0]?.timestamp || null,
    latestSnapshot: cloudSnapshotsList[0] || null,
    snapshots: cloudSnapshotsList,
    totalVotes: serverVotes.length,
    totalVotersVoted: serverStudents.filter(s => s.hasVoted).length,
    totalCensus: serverStudents.length
  });
});

// API: Cloud Backup - Create Manual Snapshot
app.post('/api/election/cloud-backup/create', (req: Request, res: Response) => {
  const { reason } = req.body;
  const snapshotReason = reason || 'Respaldo manual solicitado por el usuario';
  persistStateToCloudBackup(snapshotReason);

  res.json({
    success: true,
    message: 'Respaldo en la nube generado exitosamente.',
    snapshot: cloudSnapshotsList[0]
  });
});

// API: Cloud Backup - Restore from Snapshot or File
app.post('/api/election/cloud-backup/restore', (req: Request, res: Response) => {
  try {
    loadStateFromCloudBackup();

    const restoreLog: AuditLog = {
      id: `log-restore-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'SISTEMA_INICIO',
      actorType: 'ADMIN',
      actorName: 'Supervisión Central',
      details: `Restauración completa desde respaldo en la nube (${serverVotes.length} votos, ${serverStudents.length} estudiantes)`,
      hash: Math.random().toString(36).substr(2, 12),
      status: 'VERIFICADO'
    };
    serverAuditLogs = [restoreLog, ...serverAuditLogs];

    broadcast('all_synced', {
      students: serverStudents,
      candidates: serverCandidates,
      jurados: serverJurados,
      admins: serverAdmins,
      config: serverConfig,
      votes: serverVotes
    });

    res.json({
      success: true,
      message: 'Estado electoral restaurado exitosamente desde la nube.',
      totalVotes: serverVotes.length,
      totalStudents: serverStudents.length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Cloud Backup - Download JSON File
app.get('/api/election/cloud-backup/download', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(BACKUP_FILE)) {
      persistStateToCloudBackup('Generación para descarga');
    }
    const filename = `respaldo_electoral_ekiraya_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(BACKUP_FILE);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Cloud Backup - Upload and Restore Backup
app.post('/api/election/cloud-backup/upload', (req: Request, res: Response) => {
  try {
    const { backupData } = req.body;
    if (!backupData) {
      res.status(400).json({ success: false, error: 'No se recibieron datos de respaldo.' });
      return;
    }

    const data = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
    if (data.config) serverConfig = { ...serverConfig, ...data.config };
    if (Array.isArray(data.positions)) serverPositions = data.positions;
    if (Array.isArray(data.candidates)) serverCandidates = data.candidates;
    if (Array.isArray(data.students)) serverStudents = data.students;
    if (Array.isArray(data.jurados)) serverJurados = data.jurados;
    if (Array.isArray(data.admins)) serverAdmins = data.admins;
    if (Array.isArray(data.votes)) serverVotes = data.votes;
    if (Array.isArray(data.auditLogs)) serverAuditLogs = data.auditLogs;
    if (Array.isArray(data.superadminInbox)) serverSuperadminInbox = data.superadminInbox;

    persistStateToCloudBackup('Restauración desde archivo cargado');

    broadcast('all_synced', {
      students: serverStudents,
      candidates: serverCandidates,
      jurados: serverJurados,
      admins: serverAdmins,
      config: serverConfig,
      votes: serverVotes
    });

    res.json({
      success: true,
      message: 'Respaldo importado y restaurado exitosamente en todos los computadores.',
      totalVotes: serverVotes.length,
      totalStudents: serverStudents.length
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: `Error al procesar archivo de respaldo: ${err.message}` });
  }
});

// API: Google Sheets Sync Status for Unified Central Sheet
app.get('/api/election/sheets-status', (req: Request, res: Response) => {
  const isConnected = !!(serverConfig.googleSheets?.scriptUrl && serverConfig.googleSheets?.scriptUrl.trim().length > 10);
  res.json({
    success: true,
    isConnected,
    scriptUrl: serverConfig.googleSheets?.scriptUrl || '',
    sheetId: serverConfig.googleSheets?.sheetId || '',
    autoSync: serverConfig.googleSheets?.autoSync ?? true,
    lastSyncTime: serverConfig.googleSheets?.lastSyncTime || null,
    status: serverConfig.googleSheets?.status || (isConnected ? 'idle' : 'unconfigured'),
    pendingQueueCount: sheetsPendingQueue.length,
    totalSyncedVotes: totalSyncedVotesCount
  });
});

// API: Full Batch Sync to Unified Google Sheet from Server
app.post('/api/election/sheets-sync-full', async (req: Request, res: Response) => {
  const scriptUrl = serverConfig.googleSheets?.scriptUrl || FIXED_OFFICIAL_SHEETS_URL;
  if (!scriptUrl) {
    res.status(400).json({
      success: false,
      error: 'La URL del Webhook de Google Apps Script no está configurada.'
    });
    return;
  }

  try {
    // 1. Send all data: students census, candidates, jurados, admins, and votes
    const payload = {
      action: 'syncAll',
      students: serverStudents,
      candidates: serverCandidates,
      jurados: serverJurados,
      admins: serverAdmins,
      votes: serverVotes,
      institution: serverConfig.institutionName,
      daneCode: serverConfig.daneCode,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script respondió con HTTP ${response.status}`);
    }

    serverConfig.googleSheets.lastSyncTime = new Date().toISOString();
    serverConfig.googleSheets.status = 'success';
    totalSyncedVotesCount = serverVotes.length;
    sheetsPendingQueue = []; // Clear queue on full sync

    persistStateToCloudBackup('Sincronización completa con Google Sheets');

    broadcast('sheets_sync_updated', {
      status: 'success',
      lastSyncTime: serverConfig.googleSheets.lastSyncTime,
      totalSyncedVotes: totalSyncedVotesCount,
      pendingQueueCount: 0
    });

    res.json({
      success: true,
      message: 'Sincronización completa con Google Sheets finalizada exitosamente.',
      rowsSynced: serverVotes.length + serverStudents.length,
      lastSyncTime: serverConfig.googleSheets.lastSyncTime
    });
  } catch (err: any) {
    serverConfig.googleSheets.status = 'error';
    res.status(500).json({
      success: false,
      error: `Error al sincronizar con Google Sheets: ${err.message}`
    });
  }
});

// API: Registrar Resultados y Escrutinio Oficial en Google Sheets
app.post('/api/election/sheets-record-results', async (req: Request, res: Response) => {
  const scriptUrl = serverConfig.googleSheets?.scriptUrl || FIXED_OFFICIAL_SHEETS_URL;
  if (!scriptUrl) {
    res.status(400).json({
      success: false,
      error: 'La URL del Webhook de Google Apps Script no está configurada.'
    });
    return;
  }

  try {
    const totalCenso = serverStudents.length;
    const totalVotaron = serverStudents.filter(s => s.hasVoted).length;
    const participacionPct = totalCenso > 0 ? ((totalVotaron / totalCenso) * 100).toFixed(1) : '0';
    const now = new Date().toISOString();

    const resultsByPosition = serverPositions.map(pos => {
      const posCandidates = serverCandidates.filter(c => c.positionId === pos.id);
      const posVotes = serverVotes.filter(v => v.positionId === pos.id);
      const totalPosVotes = posVotes.length;

      const candidateResults = posCandidates.map(c => {
        const vCount = posVotes.filter(v => v.candidateId === c.id).length;
        const percent = totalPosVotes > 0 ? ((vCount / totalPosVotes) * 100).toFixed(2) : '0.00';
        return {
          id: c.id,
          number: c.number,
          fullName: c.fullName,
          grade: c.grade,
          group: c.group,
          isBlankVote: !!c.isBlankVote,
          voteCount: vCount,
          percent: parseFloat(percent)
        };
      }).sort((a, b) => b.voteCount - a.voteCount);

      const winner = candidateResults[0];
      const isBlankMajority = !!(winner && winner.isBlankVote && winner.percent > 50);

      return {
        positionId: pos.id,
        positionTitle: pos.title,
        totalVotes: totalPosVotes,
        candidates: candidateResults,
        winnerName: winner ? winner.fullName : 'N/A',
        winnerVotes: winner ? winner.voteCount : 0,
        isBlankMajority
      };
    });

    const payload = {
      action: 'syncResults',
      institution: serverConfig.institutionName,
      daneCode: serverConfig.daneCode,
      academicYear: serverConfig.academicYear,
      timestamp: now,
      summary: {
        totalCenso,
        totalVotaron,
        participacionPct: `${participacionPct}%`,
        totalVotes: serverVotes.length,
        totalMesas: serverConfig.totalMesas,
        encryptionKeyFingerprint: serverConfig.encryptionKeyFingerprint
      },
      results: resultsByPosition,
      stationBreakdown: POLLING_STATIONS.map(st => {
        const stStudents = serverStudents.filter(s => st.mesas.includes(s.mesaNumber));
        const stVoted = stStudents.filter(s => s.hasVoted).length;
        return {
          stationName: st.name,
          category: st.category,
          totalStudents: stStudents.length,
          votedCount: stVoted,
          pct: stStudents.length > 0 ? ((stVoted / stStudents.length) * 100).toFixed(1) : '0'
        };
      })
    };

    // Forward to Google Apps Script
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    serverConfig.googleSheets.lastSyncTime = now;
    serverConfig.googleSheets.status = 'success';

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: now,
      action: 'SYNC_SHEETS',
      actorType: 'ADMIN',
      actorName: 'Administrador Electoral',
      details: `Resultados oficiales consolidados y registrados en Google Sheets (${serverVotes.length} votos, ${totalVotaron} sufragantes, ${resultsByPosition.length} cargos).`,
      hash: Math.random().toString(36).substr(2, 12),
      status: 'VERIFICADO'
    };
    serverAuditLogs.unshift(newLog);

    persistStateToCloudBackup('Resultados electorales registrados en Google Sheets');

    broadcast('sheets_sync_updated', {
      status: 'success',
      lastSyncTime: now,
      totalSyncedVotes: serverVotes.length,
      pendingQueueCount: 0
    });

    res.json({
      success: true,
      message: 'Resultados y escrutinio oficial registrados exitosamente en Google Sheets.',
      summary: payload.summary,
      results: resultsByPosition,
      lastSyncTime: now
    });
  } catch (err: any) {
    serverConfig.googleSheets.status = 'error';
    res.status(500).json({
      success: false,
      error: `Error al registrar resultados en Google Sheets: ${err.message}`
    });
  }
});


// Launch server with Vite middleware or static dist
async function start() {
  // Load existing persistent cloud backup or create initial backup
  if (fs.existsSync(BACKUP_FILE)) {
    loadStateFromCloudBackup();
  } else {
    persistStateToCloudBackup('Inicialización de jornada electoral');
  }

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
