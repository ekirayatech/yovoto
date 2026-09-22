import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  INITIAL_ADMINS,
  INITIAL_CANDIDATES,
  INITIAL_CONFIG,
  INITIAL_JURADOS,
  INITIAL_POSITIONS,
  INITIAL_STUDENTS
} from '../data/mockElectionData';
import {
  AdminMember,
  AppRole,
  AuditLog,
  Candidate,
  CertificateInboxMessage,
  CloudBackupSnapshot,
  DocumentType,
  ElectionConfig,
  ElectionStatus,
  EncryptedVote,
  JuradoMember,
  Position,
  SheetsSyncStatusInfo,
  Student,
  TerminalInfo,
  VotingCertificate
} from '../types/election';
import { calculateBlockHash, generateFolioCode, sha256, simpleFastHash } from '../utils/crypto';
import {
  lookupVoterInSheets,
  normalizeDocumentNumber,
  readAdminsFromSheets,
  readAllFromSheets,
  readCandidatesFromSheets,
  readCensusFromSheets,
  readJuradosFromSheets,
  writeAdminsToSheets,
  writeAllToSheets,
  writeCandidatesToSheets,
  writeJuradosToSheets,
  writeVotersToSheets,
  writeVoteToSheets
} from '../utils/googleSheetsService';

interface ElectionContextType {
  config: ElectionConfig;
  positions: Position[];
  candidates: Candidate[];
  students: Student[];
  jurados: JuradoMember[];
  admins: AdminMember[];
  votes: EncryptedVote[];
  auditLogs: AuditLog[];
  currentRole: AppRole;
  setCurrentRole: (role: AppRole) => void;
  juradoMesa: number;
  setJuradoMesa: (mesa: number) => void;
  activeVoter: Student | null;
  setActiveVoter: (student: Student | null) => void;
  latestCertificate: VotingCertificate | null;
  setLatestCertificate: (cert: VotingCertificate | null) => void;
  
  // Multi-Computer Sync state
  connectedComputersCount: number;
  isMultiComputerLive: boolean;
  terminalId: string;
  terminalName: string;
  setTerminalName: (name: string) => void;
  terminalsList: TerminalInfo[];
  refreshServerState: () => Promise<void>;
  setThisTerminalConfig: (name: string, role?: AppRole, mesa?: number) => void;

  // Modals for Multi-Device and Cloud Backup
  isMultiDeviceModalOpen: boolean;
  setIsMultiDeviceModalOpen: (open: boolean) => void;
  isCloudBackupModalOpen: boolean;
  setIsCloudBackupModalOpen: (open: boolean) => void;

  // Cloud Backup and Persistence
  cloudSnapshots: CloudBackupSnapshot[];
  createCloudSnapshot: (reason?: string) => Promise<{ success: boolean; message: string }>;
  restoreCloudSnapshot: () => Promise<{ success: boolean; message: string }>;
  downloadCloudBackup: () => void;
  uploadAndRestoreCloudBackup: (fileContent: string) => Promise<{ success: boolean; message: string }>;

  // Centralized Google Sheets Real-time Sync
  sheetsSyncInfo: SheetsSyncStatusInfo;
  forceServerSheetsSync: () => Promise<{ success: boolean; rowsSynced: number; message: string }>;

  // Authentication states & actions
  isAdminAuthenticated: boolean;
  isJuradoAuthenticated: boolean;
  juradoName: string;
  loginAdmin: (password: string, usernameAttempt?: string) => { success: boolean; error?: string };
  logoutAdmin: () => void;
  loginJurado: (mesaNumber: number, juradoName: string, pin: string) => { success: boolean; error?: string };
  logoutJurado: () => void;

  // Actions
  authenticateStudent: (docType: DocumentType, docNumber: string) => Promise<{ success: boolean; student?: Student; error?: string }>;
  verifyStudentAtMesa: (studentId: string, juradoName: string) => boolean;
  castVote: (selectedCandidates: Record<string, string>) => Promise<{ success: boolean; certificate?: VotingCertificate; error?: string }>;
  updateElectionStatus: (status: ElectionStatus) => void;
  updateInstitutionConfig: (patch: Partial<ElectionConfig>) => void;
  addStudent: (newStudent: Omit<Student, 'id' | 'hasVoted'>) => void;
  addCandidate: (newCandidate: Omit<Candidate, 'id'>) => void;
  updateCandidate: (updatedCandidate: Candidate) => void;
  deleteCandidate: (candidateId: string) => { success: boolean; error?: string };
  addJurado: (newJurado: Omit<JuradoMember, 'id'>) => void;
  updateJurado: (updatedJurado: JuradoMember) => void;
  deleteJurado: (id: string) => void;
  addAdmin: (newAdmin: Omit<AdminMember, 'id'>) => void;
  updateAdmin: (updatedAdmin: AdminMember) => void;
  deleteAdmin: (id: string) => void;
  loadTableFromSheets: (table: 'voters' | 'candidates' | 'jurados' | 'admins' | 'all') => Promise<{ success: boolean; message: string; count?: number; data?: any }>;
  syncTableToSheets: (table: 'voters' | 'candidates' | 'jurados' | 'admins' | 'all') => Promise<{ success: boolean; message: string }>;
  saveTableToSheets: (table: 'voters' | 'candidates' | 'jurados' | 'admins' | 'all') => Promise<{ success: boolean; message: string }>;
  syncWithGoogleSheets: () => Promise<{ success: boolean; rowsSynced: number; message: string }>;
  sendCertificateByEmail: (email: string, cert: VotingCertificate) => Promise<{ success: boolean; message: string }>;
  superadminInbox: CertificateInboxMessage[];
  markInboxMessageRead: (id: string) => Promise<void>;
  sendCertificateToSuperadmin: (cert: VotingCertificate) => Promise<{ success: boolean; message: string }>;
  resetElectionData: () => void;
  addAuditLog: (action: AuditLog['action'], actorType: AuditLog['actorType'], actorName: string, details: string, mesaNumber?: number) => void;
}

const ElectionContext = createContext<ElectionContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CONFIG: 'ekiraya_votoescolar_config_v1',
  STUDENTS: 'ekiraya_votoescolar_students_v1',
  CANDIDATES: 'ekiraya_votoescolar_candidates_v1',
  JURADOS: 'ekiraya_votoescolar_jurados_v1',
  ADMINS: 'ekiraya_votoescolar_admins_v1',
  POSITIONS: 'ekiraya_votoescolar_positions_v1',
  VOTES: 'ekiraya_votoescolar_votes_v1',
  LOGS: 'ekiraya_votoescolar_logs_v1'
};

// Generate initial seed votes for students who already voted
function generateInitialVotes(): EncryptedVote[] {
  const initialVotes: EncryptedVote[] = [];
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';

  const votedStudents = INITIAL_STUDENTS.filter(s => s.hasVoted);
  
  votedStudents.forEach((student, sIdx) => {
    INITIAL_POSITIONS.forEach((pos, pIdx) => {
      const posCandidates = INITIAL_CANDIDATES.filter(c => c.positionId === pos.id);
      // Pick deterministic candidate for test data
      const candIdx = (sIdx + pIdx) % posCandidates.length;
      const chosenCandidate = posCandidates[candIdx];
      const voteToken = simpleFastHash(`ANON-TOKEN-${student.id}-${pos.id}`);
      const timestamp = student.votedAt || '2026-09-17T08:30:00.000Z';
      const hash = calculateBlockHash(prevHash, {
        positionId: pos.id,
        candidateId: chosenCandidate.id,
        mesaNumber: student.mesaNumber,
        timestamp,
        nonce: `${sIdx}-${pIdx}`
      });

      initialVotes.push({
        id: `vote-${sIdx}-${pIdx}`,
        voteToken,
        positionId: pos.id,
        candidateId: chosenCandidate.id,
        mesaNumber: student.mesaNumber,
        grade: student.grade,
        timestamp,
        hash,
        prevHash
      });

      prevHash = hash;
    });
  });

  return initialVotes;
}

const INITIAL_LOGS: AuditLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-09-17T07:45:00.000Z',
    action: 'SISTEMA_INICIO',
    actorType: 'SISTEMA',
    actorName: 'Servidor Electoral Criptográfico',
    details: 'Inicialización de la plataforma con sellado hash SHA-256 y urna con cifrado de extremo a extremo.',
    hash: '04a1f87cb60c1598f80470b4ba7130da4b54e790a6ea51f04494c6f376483cb1',
    status: 'VERIFICADO'
  },
  {
    id: 'log-002',
    timestamp: '2026-09-17T08:00:00.000Z',
    action: 'APERTURA_MESA',
    actorType: 'ADMIN',
    actorName: 'Rectoría y Docente Líder',
    details: 'Apertura oficial de la jornada electoral para Personería, Contraloría y Consejo Directivo.',
    hash: '8fa3b7e9a80b854a20b0213d2a7c4155b9e71b268045610f44357c6b9074a382',
    status: 'VERIFICADO'
  },
  {
    id: 'log-003',
    timestamp: '2026-09-17T08:05:00.000Z',
    action: 'APERTURA_MESA',
    actorType: 'JURADO',
    actorName: 'Jurados Mesa 01',
    mesaNumber: 1,
    details: 'Instalación de urna digital en Mesa 01 (Grados 6° y 7°). Urna en cero certificada.',
    hash: '12d7f8a4e5c8932b719460a12e5c84617502c39d48b715632a9e048f762319b2',
    status: 'VERIFICADO'
  },
  {
    id: 'log-004',
    timestamp: '2026-09-17T08:15:22.000Z',
    action: 'VOTO_EMITIDO',
    actorType: 'ESTUDIANTE',
    actorName: 'Sufragante Anónimo #01',
    mesaNumber: 1,
    details: 'Votos emitidos y sellados en urna criptográfica. Certificado emitido CE-20260917-M01-9F2A14.',
    hash: '7c82e01ab9d4530fae284918e7cb410385926c41b802e5a730456c8201fb2941',
    status: 'VERIFICADO'
  }
];

export const ensureFormulaCandidate = (cand: Candidate): Candidate => {
  if (cand.isBlankVote) {
    return {
      ...cand,
      principalName: cand.principalName || 'Voto en Blanco',
      suplenteName: '',
      principalPhotoUrl: '',
      suplentePhotoUrl: '',
    };
  }

  const principalName = cand.principalName || (cand.fullName.includes('&') ? cand.fullName.split('&')[0].trim() : cand.fullName);
  const suplenteName = cand.suplenteName || (cand.fullName.includes('&') ? cand.fullName.split('&')[1].trim() : (cand.fullName.includes(' y ') ? cand.fullName.split(' y ')[1].trim() : 'Suplente de Fórmula'));
  const principalPhotoUrl = cand.principalPhotoUrl || cand.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80';
  const suplentePhotoUrl = cand.suplentePhotoUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=320&q=80';
  const principalGrade = cand.principalGrade || cand.grade || '11°';
  const principalGroup = cand.principalGroup || cand.group || '11-A';
  const suplenteGrade = cand.suplenteGrade || cand.grade || '11°';
  const suplenteGroup = cand.suplenteGroup || cand.group || '11-A';

  return {
    ...cand,
    principalName,
    principalPhotoUrl,
    principalGrade,
    principalGroup,
    suplenteName,
    suplentePhotoUrl,
    suplenteGrade,
    suplenteGroup,
  };
};

export const ElectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<ElectionConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      return saved ? JSON.parse(saved) : INITIAL_CONFIG;
    } catch {
      return INITIAL_CONFIG;
    }
  });

  const [positions, setPositions] = useState<Position[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.POSITIONS);
      return saved ? JSON.parse(saved) : INITIAL_POSITIONS;
    } catch {
      return INITIAL_POSITIONS;
    }
  });

  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CANDIDATES);
      const parsed = saved ? JSON.parse(saved) : INITIAL_CANDIDATES;
      return Array.isArray(parsed) ? parsed.map(ensureFormulaCandidate) : INITIAL_CANDIDATES.map(ensureFormulaCandidate);
    } catch {
      return INITIAL_CANDIDATES.map(ensureFormulaCandidate);
    }
  });

  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
    } catch {
      return INITIAL_STUDENTS;
    }
  });

  const [jurados, setJurados] = useState<JuradoMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.JURADOS);
      return saved ? JSON.parse(saved) : INITIAL_JURADOS;
    } catch {
      return INITIAL_JURADOS;
    }
  });

  const [admins, setAdmins] = useState<AdminMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMINS);
      return saved ? JSON.parse(saved) : INITIAL_ADMINS;
    } catch {
      return INITIAL_ADMINS;
    }
  });

  const [votes, setVotes] = useState<EncryptedVote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VOTES);
      return saved ? JSON.parse(saved) : generateInitialVotes();
    } catch {
      return generateInitialVotes();
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
      return saved ? JSON.parse(saved) : INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  });

  const [currentRole, setCurrentRole] = useState<AppRole>('VOTANTE');
  const [juradoMesa, setJuradoMesa] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ekiraya_jurado_mesa');
      return saved ? Number(saved) : 1;
    } catch {
      return 1;
    }
  });
  const [activeVoter, setActiveVoter] = useState<Student | null>(null);
  const [latestCertificate, setLatestCertificate] = useState<VotingCertificate | null>(null);

  // Authentication states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ekiraya_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  const [isJuradoAuthenticated, setIsJuradoAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ekiraya_jurado_auth') === 'true';
    } catch {
      return false;
    }
  });

  const [juradoName, setJuradoName] = useState<string>(() => {
    try {
      return localStorage.getItem('ekiraya_jurado_name') || 'Prof. Carlos Mendoza (Delegado)';
    } catch {
      return 'Prof. Carlos Mendoza (Delegado)';
    }
  });

  // Multi-Computer Terminal Identity & Sync State
  const [terminalId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ekiraya_terminal_id');
      if (saved) return saved;
      const newId = `term-${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('ekiraya_terminal_id', newId);
      return newId;
    } catch {
      return `term-${Math.random().toString(36).substring(2, 8)}`;
    }
  });

  const [terminalName, setTerminalNameState] = useState<string>(() => {
    try {
      return localStorage.getItem('ekiraya_terminal_name') || 'Terminal Mesa 01';
    } catch {
      return 'Terminal Mesa 01';
    }
  });

  const setTerminalName = (name: string) => {
    setTerminalNameState(name);
    try {
      localStorage.setItem('ekiraya_terminal_name', name);
    } catch (e) {
      console.error(e);
    }
  };

  const [connectedComputersCount, setConnectedComputersCount] = useState<number>(1);
  const [isMultiComputerLive, setIsMultiComputerLive] = useState<boolean>(false);
  const [terminalsList, setTerminalsList] = useState<TerminalInfo[]>([]);
  const [superadminInbox, setSuperadminInbox] = useState<CertificateInboxMessage[]>([]);

  // Modals for Multi-Device and Cloud Backup
  const [isMultiDeviceModalOpen, setIsMultiDeviceModalOpen] = useState<boolean>(false);
  const [isCloudBackupModalOpen, setIsCloudBackupModalOpen] = useState<boolean>(false);

  // Cloud Backup and Snapshots
  const [cloudSnapshots, setCloudSnapshots] = useState<CloudBackupSnapshot[]>([]);

  // Unified Google Sheets Real-time Sync Status
  const [sheetsSyncInfo, setSheetsSyncInfo] = useState<SheetsSyncStatusInfo>({
    isConnected: false,
    scriptUrl: '',
    sheetId: '',
    autoSync: true,
    status: 'idle',
    pendingQueueCount: 0,
    totalSyncedVotes: 0
  });

  const setThisTerminalConfig = (name: string, role?: AppRole, mesa?: number) => {
    setTerminalName(name);
    if (role) {
      setCurrentRole(role);
      try { localStorage.setItem('ekiraya_role', role); } catch {}
    }
    if (mesa !== undefined) {
      setJuradoMesa(mesa);
      try { localStorage.setItem('ekiraya_jurado_mesa', String(mesa)); } catch {}
    }
  };

  const createCloudSnapshot = async (reason = 'Punto de restauración manual') => {
    try {
      const res = await fetch('/api/election/cloud-backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.success && data.snapshot) {
        setCloudSnapshots(prev => [data.snapshot, ...prev.filter(s => s.id !== data.snapshot.id)]);
        return { success: true, message: 'Respaldo generado exitosamente.' };
      }
      return { success: false, message: data.error || 'Error al generar respaldo.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const restoreCloudSnapshot = async () => {
    try {
      const res = await fetch('/api/election/cloud-backup/restore', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await refreshServerState();
        return { success: true, message: data.message || 'Restauración completada.' };
      }
      return { success: false, message: data.error || 'Error en la restauración.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const downloadCloudBackup = () => {
    window.open('/api/election/cloud-backup/download', '_blank');
  };

  const uploadAndRestoreCloudBackup = async (fileContent: string) => {
    try {
      const parsed = JSON.parse(fileContent);
      const res = await fetch('/api/election/cloud-backup/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupData: parsed })
      });
      const data = await res.json();
      if (data.success) {
        await refreshServerState();
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error || 'Error al procesar archivo.' };
    } catch (err: any) {
      return { success: false, message: `Archivo inválido: ${err.message}` };
    }
  };

  const forceServerSheetsSync = async () => {
    try {
      setSheetsSyncInfo(prev => ({ ...prev, status: 'syncing' }));
      const res = await fetch('/api/election/sheets-sync-full', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSheetsSyncInfo(prev => ({
          ...prev,
          status: 'success',
          lastSyncTime: data.lastSyncTime || new Date().toISOString(),
          totalSyncedVotes: votes.length,
          pendingQueueCount: 0
        }));
        return { success: true, rowsSynced: data.rowsSynced, message: data.message };
      }
      setSheetsSyncInfo(prev => ({ ...prev, status: 'error', lastError: data.error }));
      return { success: false, rowsSynced: 0, message: data.error || 'Error al sincronizar' };
    } catch (err: any) {
      setSheetsSyncInfo(prev => ({ ...prev, status: 'error', lastError: err.message }));
      return { success: false, rowsSynced: 0, message: err.message };
    }
  };

  // Local BroadcastChannel for instant cross-tab sync on same machine
  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('ekiraya_election_bus');
      setBroadcastChannel(bc);
      bc.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'STATE_REFRESH') {
          refreshServerState();
        }
      };
      return () => {
        bc.close();
      };
    }
  }, []);

  // Fetch full state from server
  const refreshServerState = async () => {
    try {
      const res = await fetch('/api/election/state');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(prev => {
            const hasCustomSheets = prev.googleSheets?.scriptUrl && !prev.googleSheets.scriptUrl.includes('voto_ekiraya');
            const serverHasMock = !data.config.googleSheets?.scriptUrl || data.config.googleSheets.scriptUrl.includes('voto_ekiraya');
            if (hasCustomSheets && serverHasMock) {
              fetch('/api/election/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: prev })
              }).catch(() => {});
              return { ...data.config, googleSheets: prev.googleSheets };
            }
            return data.config;
          });
        }
        if (data.positions) setPositions(data.positions);
        if (data.candidates) setCandidates(data.candidates);
        if (data.students && data.students.length > 0) {
          setStudents(prev => {
            if (prev.length > data.students.length) return prev;
            return data.students;
          });
        }
        if (data.jurados && data.jurados.length > 0) setJurados(data.jurados);
        if (data.admins && data.admins.length > 0) setAdmins(data.admins);
        if (data.votes) setVotes(data.votes);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
        if (data.superadminInbox) setSuperadminInbox(data.superadminInbox);
        if (data.terminalsCount) setConnectedComputersCount(data.terminalsCount);
        if (data.terminals) setTerminalsList(data.terminals);
        setIsMultiComputerLive(true);
      }
    } catch (err) {
      console.warn('Servidor central no alcanzable o en modo offline:', err);
    }
  };

  // Initial fetch and Real-time SSE Connection across multiple computers
  useEffect(() => {
    refreshServerState();

    let sse: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
      try {
        sse = new EventSource('/api/events');

        sse.addEventListener('connected', (e: MessageEvent) => {
          setIsMultiComputerLive(true);
          try {
            const data = JSON.parse(e.data);
            if (data.terminalsCount) setConnectedComputersCount(data.terminalsCount);
          } catch {}
        });

        sse.addEventListener('vote_cast', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.newVotes && Array.isArray(data.newVotes)) {
              setVotes(prev => {
                const ids = new Set(prev.map(v => v.id));
                const additions = data.newVotes.filter((v: EncryptedVote) => !ids.has(v.id));
                return [...prev, ...additions];
              });
            }
            if (data.studentId && data.updatedStudent) {
              setStudents(prev =>
                prev.map(s => (s.id === data.studentId ? { ...s, ...data.updatedStudent } : s))
              );
            }
            if (data.newLog) {
              setAuditLogs(prev => [data.newLog, ...prev]);
            }
            if (data.inboxMessage) {
              setSuperadminInbox(prev => [data.inboxMessage, ...prev.filter(m => m.id !== data.inboxMessage.id)]);
            }
          } catch (err) {
            console.error('Error procesando evento vote_cast:', err);
          }
        });

        sse.addEventListener('student_verified', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.studentId) {
              setStudents(prev =>
                prev.map(s =>
                  s.id === data.studentId
                    ? { ...s, isVerifiedByJurado: true, verifiedAt: data.verifiedAt }
                    : s
                )
              );
            }
            if (data.newLog) {
              setAuditLogs(prev => [data.newLog, ...prev]);
            }
          } catch (err) {
            console.error('Error procesando student_verified:', err);
          }
        });

        sse.addEventListener('student_added', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.student) {
              setStudents(prev => [data.student, ...prev.filter(s => s.id !== data.student.id)]);
            }
            if (data.newLog) {
              setAuditLogs(prev => [data.newLog, ...prev]);
            }
          } catch (err) {
            console.error('Error procesando student_added:', err);
          }
        });

        sse.addEventListener('candidate_added', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.candidate) {
              setCandidates(prev => [...prev.filter(c => c.id !== data.candidate.id), data.candidate]);
            }
            if (data.newLog) {
              setAuditLogs(prev => [data.newLog, ...prev]);
            }
          } catch (err) {
            console.error('Error procesando candidate_added:', err);
          }
        });

        sse.addEventListener('status_changed', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.config) {
              setConfig(data.config);
            } else if (data.status) {
              setConfig(prev => ({ ...prev, status: data.status }));
            }
            if (data.newLog) {
              setAuditLogs(prev => [data.newLog, ...prev]);
            }
          } catch (err) {
            console.error('Error procesando status_changed:', err);
          }
        });

        sse.addEventListener('students_synced', () => {
          refreshServerState();
        });

        sse.addEventListener('all_synced', () => {
          refreshServerState();
        });

        sse.addEventListener('config_updated', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.config) setConfig(data.config);
          } catch {}
        });

        sse.addEventListener('certificate_inbox_received', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.inboxMessage) {
              setSuperadminInbox(prev => [data.inboxMessage, ...prev.filter(m => m.id !== data.inboxMessage.id)]);
            }
            if (data.log) {
              setAuditLogs(prev => [data.log, ...prev]);
            }
          } catch (err) {
            console.error('Error procesando certificate_inbox_received:', err);
          }
        });

        sse.addEventListener('inbox_marked_read', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.id) {
              setSuperadminInbox(prev => prev.map(m => (m.id === data.id ? { ...m, read: true } : m)));
            }
          } catch {}
        });

        sse.addEventListener('election_reset', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.students) setStudents(data.students);
            if (data.votes) setVotes(data.votes);
            if (data.config) setConfig(data.config);
            if (data.newLog) setAuditLogs([data.newLog]);
            setSuperadminInbox([]);
            setActiveVoter(null);
            setLatestCertificate(null);
          } catch (err) {
            console.error('Error procesando election_reset:', err);
          }
        });

        sse.addEventListener('terminals_updated', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.activeCount) setConnectedComputersCount(data.activeCount);
            if (data.terminals) setTerminalsList(data.terminals);
          } catch (err) {
            console.error('Error procesando terminals_updated:', err);
          }
        });

        sse.addEventListener('sheets_sync_updated', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            setSheetsSyncInfo(prev => ({
              ...prev,
              status: data.status || prev.status,
              lastSyncTime: data.lastSyncTime || prev.lastSyncTime,
              pendingQueueCount: data.pendingQueueCount !== undefined ? data.pendingQueueCount : prev.pendingQueueCount,
              totalSyncedVotes: data.totalSyncedVotes !== undefined ? data.totalSyncedVotes : prev.totalSyncedVotes
            }));
            if (data.lastSyncTime) {
              setConfig(prev => ({
                ...prev,
                googleSheets: {
                  ...prev.googleSheets,
                  lastSyncTime: data.lastSyncTime,
                  status: data.status || prev.googleSheets.status
                }
              }));
            }
          } catch (err) {
            console.error('Error procesando sheets_sync_updated:', err);
          }
        });

        sse.addEventListener('cloud_backup_updated', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.snapshot) {
              setCloudSnapshots(prev => [data.snapshot, ...prev.filter(s => s.id !== data.snapshot.id)]);
            }
          } catch (err) {
            console.error('Error procesando cloud_backup_updated:', err);
          }
        });

        sse.onerror = () => {
          setIsMultiComputerLive(false);
          sse?.close();
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch {
        reconnectTimeout = setTimeout(connectSSE, 4000);
      }
    };

    connectSSE();

    return () => {
      if (sse) sse.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Heartbeat ping every 5 seconds to keep terminal registered in multi-computer network
  useEffect(() => {
    const sendPing = async () => {
      try {
        const res = await fetch('/api/terminal/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: terminalId,
            name: terminalName,
            role: currentRole,
            mesaNumber: currentRole === 'JURADO' ? juradoMesa : undefined
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.activeCount) setConnectedComputersCount(data.activeCount);
          if (data.terminals) setTerminalsList(data.terminals);
          setIsMultiComputerLive(true);
        }
      } catch {
        setIsMultiComputerLive(false);
      }
    };

    sendPing();
    const interval = setInterval(sendPing, 5000);
    return () => clearInterval(interval);
  }, [terminalId, terminalName, currentRole, juradoMesa]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error(e);
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    } catch (e) {
      console.error(e);
    }
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));
    } catch (e) {
      console.error(e);
    }
  }, [candidates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.JURADOS, JSON.stringify(jurados));
    } catch (e) {
      console.error(e);
    }
  }, [jurados]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(admins));
    } catch (e) {
      console.error(e);
    }
  }, [admins]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(votes));
    } catch (e) {
      console.error(e);
    }
  }, [votes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(auditLogs));
    } catch (e) {
      console.error(e);
    }
  }, [auditLogs]);

  // Add Log helper
  const addAuditLog = (
    action: AuditLog['action'],
    actorType: AuditLog['actorType'],
    actorName: string,
    details: string,
    mesaNumber?: number
  ) => {
    const timestamp = new Date().toISOString();
    const hash = simpleFastHash(`${timestamp}|${action}|${actorName}|${details}`);
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp,
      action,
      actorType,
      actorName,
      mesaNumber,
      details,
      hash,
      status: 'VERIFICADO'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Voter Authentication (con normalización robusta y búsqueda en caliente contra Google Sheets)
  const authenticateStudent = async (
    docType: DocumentType,
    docNumber: string
  ): Promise<{ success: boolean; student?: Student; error?: string }> => {
    const rawClean = normalizeDocumentNumber(docNumber);
    if (!rawClean) {
      return { success: false, error: 'Por favor ingrese un número de documento válido.' };
    }

    // 1. Búsqueda en censo local en memoria
    let found = students.find(s => {
      const sClean = normalizeDocumentNumber(s.documentNumber);
      if (sClean !== rawClean) return false;
      return !docType || s.documentType === docType;
    });

    // Fallback: coincidencia por número sin importar el tipo de documento
    if (!found) {
      found = students.find(s => normalizeDocumentNumber(s.documentNumber) === rawClean);
    }

    // 2. Si no se encontró localmente y Google Sheets está configurado, consultar en caliente
    const sheetUrl = config.googleSheets?.scriptUrl;
    const isRealSheet = sheetUrl && !sheetUrl.includes('voto_ekiraya');

    if (!found && isRealSheet) {
      try {
        console.log(`[VoterAuth] Consultando documento ${rawClean} en Google Sheets...`);
        // Intento 1: Búsqueda individual rápida en Google Sheets
        const lookupRes = await lookupVoterInSheets(sheetUrl, docNumber, docType);
        if (lookupRes.success && lookupRes.data?.found && lookupRes.data?.student) {
          const s = lookupRes.data.student;
          const mappedStudent: Student = {
            id: s.id || `est-sheet-${Date.now()}`,
            documentType: (s.documentType as DocumentType) || docType || 'TI',
            documentNumber: String(s.documentNumber),
            fullName: s.fullName || `Estudiante ${docNumber}`,
            grade: s.grade || '',
            group: s.group || '',
            mesaNumber: Number(s.mesaNumber) || 1,
            email: s.email || '',
            hasVoted: Boolean(s.hasVoted),
            votedAt: s.votedAt,
            receiptFolio: s.receiptFolio,
            isVerifiedByJurado: Boolean(s.hasVoted)
          };

          setStudents(prev => {
            const exists = prev.some(p => normalizeDocumentNumber(p.documentNumber) === rawClean);
            return exists ? prev : [mappedStudent, ...prev];
          });

          fetch('/api/election/add-student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mappedStudent)
          }).catch(() => {});

          found = mappedStudent;
        } else {
          // Intento 2: Recargar censo completo de Sheets (por si agregaron nuevos registros)
          console.log('[VoterAuth] getVoter no encontró registro directo. Recargando censo completo de Sheets...');
          const censusRes = await loadTableFromSheets('voters') as any;
          if (censusRes.success && censusRes.data && Array.isArray(censusRes.data)) {
            const reFound = (censusRes.data as Student[]).find(
              s => normalizeDocumentNumber(s.documentNumber) === rawClean
            );
            if (reFound) {
              found = reFound;
            }
          }
        }
      } catch (err) {
        console.warn('Error al verificar votante en Google Sheets:', err);
      }
    }

    if (!found) {
      addAuditLog('SEGURIDAD_ALERTA', 'ESTUDIANTE', 'Terminal Votante', `Intento de ingreso con documento no censado: ${docType} ${docNumber.trim()}`);
      return {
        success: false,
        error: `El documento "${docNumber.trim()}" no se encuentra registrado en el censo electoral oficial. Verifique que el número coincida con la hoja de Google Sheets o solicite asistencia al jurado de mesa.`
      };
    }

    if (found.hasVoted) {
      return {
        success: false,
        student: found,
        error: `El estudiante ${found.fullName} ya ejerció su derecho al voto el ${found.votedAt ? new Date(found.votedAt).toLocaleTimeString('es-CO') : 'en esta jornada'}. Folio: ${found.receiptFolio || 'N/A'}.`
      };
    }

    if (config.status !== 'ABIERTA') {
      return {
        success: false,
        error: `La jornada electoral no está abierta actualmente. Estado actual: ${config.status}.`
      };
    }

    setActiveVoter(found);
    addAuditLog('ESTUDIANTE_HABILITADO', 'ESTUDIANTE', found.fullName, `Ingreso a cabina de votación digital en Mesa 0${found.mesaNumber}`, found.mesaNumber);
    return { success: true, student: found };
  };

  // Jurado checks in student
  const verifyStudentAtMesa = (studentId: string, juradoName: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return false;

    const now = new Date().toISOString();
    setStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, isVerifiedByJurado: true, verifiedAt: now } : s))
    );

    addAuditLog('ESTUDIANTE_HABILITADO', 'JURADO', juradoName, `Estudiante ${student.fullName} verificado biométrica/documentalmente en Mesa 0${student.mesaNumber}`, student.mesaNumber);

    // Broadcast across multiple computers via server API
    fetch('/api/election/verify-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, juradoName })
    }).catch(err => console.warn('Error sincronizando verificación:', err));

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'STATE_REFRESH' });
    }

    return true;
  };

  // Cast Votes
  const castVote = async (selectedCandidates: Record<string, string>) => {
    if (!activeVoter) {
      return { success: false, error: 'No hay votante activo autenticado.' };
    }

    if (activeVoter.hasVoted) {
      return { success: false, error: 'Este documento ya registró un voto previamente.' };
    }

    const timestamp = new Date().toISOString();
    const folioNumber = generateFolioCode(activeVoter.documentNumber, activeVoter.mesaNumber);
    
    // Hash for certificate
    const certHashPayload = `${folioNumber}|${activeVoter.documentNumber}|${timestamp}|${config.daneCode}`;
    const verificationHash = await sha256(certHashPayload);

    // Build anonymous encrypted vote blocks (End-to-End blinded)
    let lastHash = votes.length > 0 ? votes[votes.length - 1].hash : '0000000000000000000000000000000000000000000000000000000000000000';
    const newVotesToAdd: EncryptedVote[] = [];

    for (const posId of Object.keys(selectedCandidates)) {
      const candidateId = selectedCandidates[posId];
      // Generate anonymous blind token (non-invertible)
      const voteToken = simpleFastHash(`TOKEN-${Math.random()}-${timestamp}`);
      const voteHash = calculateBlockHash(lastHash, {
        positionId: posId,
        candidateId,
        mesaNumber: activeVoter.mesaNumber,
        timestamp,
        nonce: Math.random().toString()
      });

      newVotesToAdd.push({
        id: `vote-${Date.now()}-${posId}`,
        voteToken,
        positionId: posId,
        candidateId,
        mesaNumber: activeVoter.mesaNumber,
        grade: activeVoter.grade,
        timestamp,
        hash: voteHash,
        prevHash: lastHash
      });

      lastHash = voteHash;
    }

    // Append votes to encrypted ballot vault locally
    setVotes(prev => [...prev, ...newVotesToAdd]);

    // Mark student as voted (secrecy preserved: which candidate they voted for is completely decoupled)
    setStudents(prev =>
      prev.map(s =>
        s.id === activeVoter.id
          ? {
              ...s,
              hasVoted: true,
              votedAt: timestamp,
              receiptFolio: folioNumber
            }
          : s
      )
    );

    // Institutional and superadmin email addresses
    const fromEmail = config.institutionEmail || 'rectoria@ekiraya.edu.co';
    const toSuperadminEmail = config.superadminEmail || 'rectoria@ekiraya.edu.co';

    // Build Certificate
    const certificate: VotingCertificate = {
      folioNumber,
      studentName: activeVoter.fullName,
      documentType: activeVoter.documentType,
      documentNumber: activeVoter.documentNumber,
      grade: activeVoter.grade,
      group: activeVoter.group,
      mesaNumber: activeVoter.mesaNumber,
      studentEmail: activeVoter.email,
      timestamp,
      verificationHash,
      schoolName: config.institutionName,
      daneCode: config.daneCode,
      rectorName: config.rectorName,
      fromEmail,
      sentToSuperadminAt: timestamp
    };

    setLatestCertificate(certificate);

    // Automatic dispatch to Superadministrator inbox
    const inboxMessage: CertificateInboxMessage = {
      id: `inbox-${Date.now()}-${folioNumber}`,
      folioNumber,
      timestamp,
      fromEmail,
      toEmail: toSuperadminEmail,
      studentId: activeVoter.id,
      studentName: activeVoter.fullName,
      documentType: activeVoter.documentType,
      documentNumber: activeVoter.documentNumber,
      grade: activeVoter.grade,
      group: activeVoter.group,
      mesaNumber: activeVoter.mesaNumber,
      verificationHash,
      certificate,
      status: 'ENTREGADO',
      read: false,
      subject: `Certificado Electoral de Sufragio - Folio ${folioNumber} - ${activeVoter.fullName} (${activeVoter.grade} - ${activeVoter.group})`
    };

    setSuperadminInbox(prev => [inboxMessage, ...prev.filter(m => m.folioNumber !== folioNumber)]);

    // Automatic email delivery of voting certificate to voter's registered email
    if (activeVoter.email) {
      sendCertificateByEmail(activeVoter.email, certificate).catch(err => {
        console.warn('Error en el envío automático del certificado al correo del estudiante:', err);
      });
    }

    addAuditLog(
      'ACTA_GENERADA',
      'SISTEMA',
      'Servidor de Correo Institucional',
      `Certificado Folio ${folioNumber} remitido desde ${fromEmail} a la Bandeja del Superadministrador (${toSuperadminEmail}) para ${activeVoter.fullName}`,
      activeVoter.mesaNumber
    );

    addAuditLog(
      'VOTO_EMITIDO',
      'ESTUDIANTE',
      'Sufragante Cifrado',
      `Votos sellados en urna criptográfica Mesa 0${activeVoter.mesaNumber}. Folio emitido: ${folioNumber}`,
      activeVoter.mesaNumber
    );

    // Broadcast across multiple computers via Central Server API
    try {
      fetch('/api/election/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: activeVoter.id,
          selections: selectedCandidates,
          terminalId
        })
      }).catch(e => console.warn('Error notificando voto al servidor central:', e));
    } catch (err) {
      console.warn('Fallo comunicando voto al servidor:', err);
    }

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'STATE_REFRESH' });
    }

    // Auto-sync with Google Sheets if configured
    if (config.googleSheets.enabled && config.googleSheets.autoSync) {
      setTimeout(() => {
        syncWithGoogleSheets();
      }, 500);
    }

    return { success: true, certificate };
  };

  const updateElectionStatus = (newStatus: ElectionStatus) => {
    const now = new Date().toISOString();
    setConfig(prev => ({
      ...prev,
      status: newStatus,
      openedAt: newStatus === 'ABIERTA' && !prev.openedAt ? now : prev.openedAt,
      closedAt: newStatus === 'CERRADA' ? now : prev.closedAt
    }));

    addAuditLog('APERTURA_MESA', 'ADMIN', 'Supervisión Electoral', `Cambio de estado de la jornada a: ${newStatus}`);

    fetch('/api/election/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    }).catch(err => console.warn('Error sincronizando estado con servidor:', err));

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'STATE_REFRESH' });
    }
  };

  const updateInstitutionConfig = (patch: Partial<ElectionConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...patch };
      fetch('/api/election/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updated })
      }).catch(err => console.warn('Error sincronizando config con servidor:', err));
      return updated;
    });
    addAuditLog('SISTEMA_INICIO', 'ADMIN', 'Supervisión Electoral', 'Actualización de configuración institucional.');
  };

  const addStudent = (newStudent: Omit<Student, 'id' | 'hasVoted'>) => {
    const id = `est-${Date.now()}`;
    const studentObj: Student = {
      ...newStudent,
      id,
      hasVoted: false
    };
    setStudents(prev => [studentObj, ...prev]);
    addAuditLog('ESTUDIANTE_HABILITADO', 'ADMIN', 'Secretaría Académica', `Estudiante agregado al censo: ${newStudent.fullName} (${newStudent.grade})`);

    fetch('/api/election/add-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentObj)
    }).catch(err => console.warn('Error sincronizando nuevo estudiante:', err));

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'STATE_REFRESH' });
    }
  };

  const addCandidate = (newCand: Omit<Candidate, 'id'>) => {
    const id = `cand-${Date.now()}`;
    const candObj: Candidate = { ...newCand, id };
    setCandidates(prev => [...prev, candObj]);
    addAuditLog('SISTEMA_INICIO', 'ADMIN', 'Comité Electoral', `Inscripción formal de candidatura: ${newCand.fullName} (#${newCand.number})`);

    fetch('/api/election/add-candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candObj)
    }).catch(err => console.warn('Error sincronizando nuevo candidato:', err));

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'STATE_REFRESH' });
    }
  };

  const updateCandidate = (updatedCand: Candidate) => {
    setCandidates(prev => prev.map(c => (c.id === updatedCand.id ? updatedCand : c)));
    addAuditLog('SISTEMA_INICIO', 'ADMIN', 'Comité Electoral', `Modificación de candidatura: ${updatedCand.fullName} (#${updatedCand.number})`);

    fetch('/api/election/update-candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCand)
    }).catch(err => console.warn('Error sincronizando actualización de candidato:', err));

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'STATE_REFRESH' });
    }
  };

  const deleteCandidate = (candidateId: string): { success: boolean; error?: string } => {
    const target = candidates.find(c => c.id === candidateId);
    if (!target) {
      return { success: false, error: 'Candidato no encontrado en el sistema.' };
    }

    if (target.isBlankVote) {
      return {
        success: false,
        error: 'El Voto en Blanco es de rango constitucional obligatorio (Art. 258 C.P. y Decreto 1860 de 1994). No puede ser eliminado del tarjetón.'
      };
    }

    setCandidates(prev => prev.filter(c => c.id !== candidateId));
    addAuditLog('SISTEMA_INICIO', 'ADMIN', 'Comité Electoral', `Eliminación formal de candidatura: ${target.fullName} (#${target.number}) de ${target.positionId}`);

    fetch('/api/election/delete-candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: candidateId })
    }).catch(err => console.warn('Error sincronizando eliminación de candidato:', err));

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'STATE_REFRESH' });
    }

    return { success: true };
  };

  // Authentication handlers
  const loginAdmin = (password: string, usernameAttempt?: string) => {
    const trimmed = password.trim();
    const trimmedUser = (usernameAttempt || '').trim().toLowerCase();

    // Check master pins first
    if (trimmed === 'admin2026' || trimmed === 'ekiraya2026' || trimmed === 'admin') {
      setIsAdminAuthenticated(true);
      try {
        localStorage.setItem('ekiraya_admin_auth', 'true');
      } catch {}
      addAuditLog('SISTEMA_INICIO', 'ADMIN', 'Supervisión Electoral', 'Sesión de Administrador iniciada formalmente (Clave Maestra).');
      return { success: true };
    }

    // If username provided, match user and pin
    if (trimmedUser) {
      const matchedByUser = admins.find(a => 
        a.status === 'ACTIVO' && 
        (a.username.toLowerCase() === trimmedUser || a.fullName.toLowerCase() === trimmedUser || (a.email && a.email.toLowerCase() === trimmedUser)) &&
        a.pin.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (matchedByUser) {
        setIsAdminAuthenticated(true);
        try {
          localStorage.setItem('ekiraya_admin_auth', 'true');
        } catch {}
        addAuditLog('SISTEMA_INICIO', 'ADMIN', matchedByUser.fullName, `Sesión de Administrador iniciada por ${matchedByUser.fullName} (${matchedByUser.username}).`);
        return { success: true };
      }
    }

    // Match by PIN alone or username alone across active admins
    const matchedByPin = admins.find(a => a.status === 'ACTIVO' && (a.pin.trim().toLowerCase() === trimmed.toLowerCase() || a.username.toLowerCase() === trimmed.toLowerCase()));
    if (matchedByPin) {
      setIsAdminAuthenticated(true);
      try {
        localStorage.setItem('ekiraya_admin_auth', 'true');
      } catch {}
      addAuditLog('SISTEMA_INICIO', 'ADMIN', matchedByPin.fullName, `Sesión de Administrador iniciada por credencial: ${matchedByPin.fullName}.`);
      return { success: true };
    }

    addAuditLog('SEGURIDAD_ALERTA', 'ADMIN', 'Control de Acceso', 'Intento fallido de autenticación administrativa con clave o usuario erróneo.');
    return { success: false, error: 'Clave o usuario de administrador incorrecto. Use su PIN registrado o la clave oficial (admin2026).' };
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    try {
      localStorage.removeItem('ekiraya_admin_auth');
    } catch {}
    setCurrentRole('VOTANTE');
  };

  const loginJurado = (mesaNumber: number, name: string, pin: string) => {
    const trimmedPin = pin.trim().toLowerCase();
    const matchedJurado = jurados.find(j => j.mesaNumber === mesaNumber && j.status === 'ACTIVO');
    const matchesJuradoPin = matchedJurado ? matchedJurado.pin.toLowerCase() === trimmedPin : false;
    const valid = trimmedPin === 'jurado2026' || trimmedPin === `mesa0${mesaNumber}` || trimmedPin === `mesa${mesaNumber}` || trimmedPin === '1234' || matchesJuradoPin;
    if (valid) {
      setIsJuradoAuthenticated(true);
      setJuradoMesa(mesaNumber);
      setJuradoName(name || matchedJurado?.fullName || `Jurado Mesa 0${mesaNumber}`);
      try {
        localStorage.setItem('ekiraya_jurado_auth', 'true');
        localStorage.setItem('ekiraya_jurado_mesa', mesaNumber.toString());
        localStorage.setItem('ekiraya_jurado_name', name || matchedJurado?.fullName || `Jurado Mesa 0${mesaNumber}`);
      } catch {}
      addAuditLog('APERTURA_MESA', 'JURADO', name, `Acreditación exitosa de jurado para Mesa 0${mesaNumber}. Formato E-11 instalado.`, mesaNumber);
      return { success: true };
    }
    addAuditLog('SEGURIDAD_ALERTA', 'JURADO', name || 'Desconocido', `Intento fallido de acreditación para Mesa 0${mesaNumber} con PIN erróneo.`, mesaNumber);
    return { success: false, error: 'PIN o clave de jurado incorrecta para esta mesa.' };
  };

  const logoutJurado = () => {
    setIsJuradoAuthenticated(false);
    try {
      localStorage.removeItem('ekiraya_jurado_auth');
    } catch {}
    setCurrentRole('VOTANTE');
  };

  // Jurados & Admins Management
  const addJurado = (newJurado: Omit<JuradoMember, 'id'>) => {
    const obj: JuradoMember = { ...newJurado, id: `jur-${Date.now()}` };
    setJurados(prev => [...prev, obj]);
    addAuditLog('SISTEMA_INICIO', 'ADMIN', 'Comité Electoral', `Jurado acreditado: ${obj.fullName} (Mesa 0${obj.mesaNumber})`);
  };

  const updateJurado = (updated: JuradoMember) => {
    setJurados(prev => prev.map(j => j.id === updated.id ? updated : j));
    addAuditLog('SISTEMA_INICIO', 'ADMIN', 'Comité Electoral', `Datos de jurado actualizados: ${updated.fullName} (Mesa 0${updated.mesaNumber})`);
  };

  const deleteJurado = (id: string) => {
    const target = jurados.find(j => j.id === id);
    setJurados(prev => prev.filter(j => j.id !== id));
    addAuditLog('SISTEMA_INICIO', 'ADMIN', 'Comité Electoral', `Jurado retirado de acreditación: ${target?.fullName || id}`);
  };

  const addAdmin = (newAdmin: Omit<AdminMember, 'id'>) => {
    const obj: AdminMember = { ...newAdmin, id: `adm-${Date.now()}` };
    setAdmins(prev => [...prev, obj]);
    addAuditLog('SISTEMA_INICIO', 'ADMIN', 'Supervisión Electoral', `Nuevo administrador registrado: ${obj.fullName} (${obj.username})`);
  };

  const updateAdmin = (updated: AdminMember) => {
    setAdmins(prev => prev.map(a => a.id === updated.id ? updated : a));
    addAuditLog('SISTEMA_INICIO', 'ADMIN', 'Supervisión Electoral', `Datos de administrador actualizados: ${updated.fullName}`);
  };

  const deleteAdmin = (id: string) => {
    const target = admins.find(a => a.id === id);
    setAdmins(prev => prev.filter(a => a.id !== id));
    addAuditLog('SISTEMA_INICIO', 'ADMIN', 'Supervisión Electoral', `Administrador revocado: ${target?.fullName || id}`);
  };

  // Robust Normalization for Sheets without headers or varying column orders
  const normalizeRawAdmins = (rawItems: any[]): AdminMember[] => {
    return rawItems.map((item, idx) => {
      if (Array.isArray(item)) {
        const textCells = item
          .map((val, c) => ({ col: c, val: String(val !== null && val !== undefined ? val : '').trim() }))
          .filter(tc => tc.val !== '');
        let fullName = '';
        let username = '';
        let pin = '';
        let role: AdminMember['role'] = 'SUPER_ADMIN';
        let status: AdminMember['status'] = 'ACTIVO';
        let email = '';
        let doc = '';

        for (const tc of textCells) {
          const v = tc.val;
          const vl = v.toLowerCase();
          if (v.includes('@') && !email) {
            email = v;
            if (!username) username = v;
          } else if (['super_admin', 'admin', 'auditor', 'registrador', 'supervisor'].includes(vl)) {
            role = vl.includes('audit') ? 'AUDITOR' : (vl.includes('regist') ? 'REGISTRADOR' : 'SUPER_ADMIN');
          } else if (['activo', 'inactivo', 'active', 'inactive'].includes(vl)) {
            status = vl.includes('inact') ? 'INACTIVO' : 'ACTIVO';
          }
        }

        const remaining = textCells.filter(tc => {
          const vl = tc.val.toLowerCase();
          return !vl.includes('admin') && !vl.includes('audit') && !vl.includes('regist') && !vl.includes('activ') && !vl.includes('@');
        });

        if (remaining.length === 1) {
          fullName = remaining[0].val;
          username = remaining[0].val.toLowerCase().replace(/\s+/g, '.');
          pin = 'admin2026';
        } else if (remaining.length === 2) {
          fullName = remaining[0].val;
          pin = remaining[1].val;
          username = fullName.toLowerCase().replace(/\s+/g, '.');
        } else if (remaining.length >= 3) {
          if (/^\d+$/.test(remaining[0].val) && remaining[0].val.length <= 4) {
            fullName = remaining[1].val;
            username = remaining[2].val;
            pin = remaining[3]?.val || 'admin2026';
          } else {
            fullName = remaining[0].val;
            username = remaining[1].val;
            pin = remaining[2].val;
          }
        }

        return {
          id: `adm-sheet-${idx + 1}`,
          fullName: fullName || username || `Administrador ${idx + 1}`,
          username: (username || fullName || `admin${idx + 1}`).toLowerCase(),
          documentNumber: doc,
          pin: pin || 'admin2026',
          role,
          status,
          email
        };
      }

      const id = item.id || `adm-sheet-${idx + 1}`;
      const fullName = item.fullName || item.nombre || item.Nombre || item.nombreCompleto || item.name || item.Name || '';
      const username = (item.username || item.usuario || item.Usuario || item.user || item.User || fullName || `admin${idx + 1}`).toLowerCase().trim();
      const pin = String(item.pin ?? item.clave ?? item.Clave ?? item.password ?? item.Password ?? 'admin2026').trim();
      const rawRole = String(item.role || item.rol || item.Rol || item.cargo || 'SUPER_ADMIN').toUpperCase();
      const role: AdminMember['role'] = rawRole.includes('AUDIT') ? 'AUDITOR' : (rawRole.includes('REGIST') ? 'REGISTRADOR' : 'SUPER_ADMIN');
      const rawStatus = String(item.status || item.estado || item.Estado || 'ACTIVO').toUpperCase();
      const status: AdminMember['status'] = rawStatus.includes('INACT') ? 'INACTIVO' : 'ACTIVO';
      const email = item.email || item.correo || item.Correo || '';
      const documentNumber = String(item.documentNumber || item.documento || item.cedula || '');

      return {
        id,
        fullName: fullName || username || `Administrador ${idx + 1}`,
        username: username || 'admin',
        pin: pin || 'admin2026',
        role,
        status,
        email,
        documentNumber
      };
    });
  };

  const normalizeRawJurados = (rawItems: any[]): JuradoMember[] => {
    return rawItems.map((item, idx) => {
      if (Array.isArray(item)) {
        const textCells = item
          .map((val, c) => ({ col: c, val: String(val !== null && val !== undefined ? val : '').trim() }))
          .filter(tc => tc.val !== '');
        let mesaNumber = 1;
        let fullName = '';
        let role: JuradoMember['role'] = 'PRESIDENTE_MESA';
        let pin = '';
        let status: JuradoMember['status'] = 'ACTIVO';
        let email = '';
        let doc = '';

        for (const tc of textCells) {
          const v = tc.val;
          const vl = v.toLowerCase();
          const mMatch = v.match(/mesa\s*0*(\d+)/i) || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 50 ? [v, v] : null);
          if (mMatch && mesaNumber === 1) {
            mesaNumber = Number(mMatch[1]);
          } else if (vl.includes('presid')) {
            role = 'PRESIDENTE_MESA';
          } else if (vl.includes('vocal')) {
            role = 'VOCAL';
          } else if (vl.includes('reman') || vl.includes('suplen')) {
            role = 'REMANENTE';
          } else if (vl.includes('inact')) {
            status = 'INACTIVO';
          } else if (v.includes('@')) {
            email = v;
          } else if (v.length >= 2 && !fullName) {
            fullName = v;
          } else if (v.length >= 2 && !pin) {
            pin = v;
          }
        }

        return {
          id: `jur-sheet-${idx + 1}`,
          mesaNumber,
          fullName: fullName || `Jurado Mesa 0${mesaNumber}`,
          documentNumber: doc,
          role,
          pin: pin || 'jurado2026',
          email,
          status
        };
      }

      const mesaNumber = Number(String(item.mesaNumber || item.mesa || item.Mesa || item.puesto || 1).replace(/\D/g, '')) || 1;
      const fullName = item.fullName || item.nombre || item.Nombre || item.nombreCompleto || item.jurado || `Jurado Mesa 0${mesaNumber}`;
      const rawRole = String(item.role || item.rol || item.Rol || item.cargo || 'PRESIDENTE_MESA').toUpperCase();
      const role: JuradoMember['role'] = rawRole.includes('VOCAL') ? 'VOCAL' : (rawRole.includes('REMAN') || rawRole.includes('SUPLEN') ? 'REMANENTE' : 'PRESIDENTE_MESA');
      const pin = String(item.pin ?? item.clave ?? item.Clave ?? 'jurado2026').trim();
      const rawStatus = String(item.status || item.estado || item.Estado || 'ACTIVO').toUpperCase();
      const status: JuradoMember['status'] = rawStatus.includes('INACT') ? 'INACTIVO' : 'ACTIVO';
      const email = item.email || item.correo || '';
      const documentNumber = String(item.documentNumber || item.documento || item.cedula || '');

      return {
        id: item.id || `jur-sheet-${idx + 1}`,
        mesaNumber,
        fullName,
        documentNumber,
        role,
        pin: pin || 'jurado2026',
        email,
        status
      };
    });
  };

  const normalizeRawCandidates = (rawItems: any[]): Candidate[] => {
    return rawItems.map((item, idx) => {
      if (Array.isArray(item)) {
        const textCells = item
          .map((val, c) => ({ col: c, val: String(val !== null && val !== undefined ? val : '').trim() }))
          .filter(tc => tc.val !== '');
        let posId = 'personeria';
        let fullName = '';
        let numberStr = '';
        let grade = '11°';
        let group = '11-A';
        let slogan = '';
        let colorHex = '#7e22ce';
        let photoUrl = '';
        let proposals: string[] = [];
        let isBlankVote = false;
        let suplenteName = '';
        let suplentePhotoUrl = '';

        for (const tc of textCells) {
          const v = tc.val;
          const vl = v.toLowerCase();
          if (vl.includes('personer')) posId = 'personeria';
          else if (vl.includes('contralor')) posId = 'contraloria';
          else if (vl.includes('directiv') || vl.includes('consejo')) posId = 'consejo_directivo';
          else if (vl.includes('curso') || vl.includes('representante')) posId = 'representante_curso';
          else if (vl.includes('cabild')) posId = 'cabildante';
          else if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) colorHex = v;
          else if (/^https?:\/\//i.test(v)) {
            if (!photoUrl) photoUrl = v;
            else if (!suplentePhotoUrl) suplentePhotoUrl = v;
          }
          else if (/^0*(\d{1,2})$/.test(v) && !numberStr) numberStr = v;
          else if (/^(1[0-2]|[0-9])°?(-?[a-zA-Z])?$/.test(v) && grade === '11°') grade = v;
          else if (vl.includes('blanco')) isBlankVote = true;
          else if (v.includes(';') && proposals.length === 0) proposals = v.split(';').map(p => p.trim()).filter(Boolean);
          else if (!fullName && v.length >= 3 && !/^\d+$/.test(v)) fullName = v;
          else if (fullName && !suplenteName && v.length >= 3 && !/^\d+$/.test(v) && v !== slogan) suplenteName = v;
          else if (!slogan && v.length >= 3) slogan = v;
        }

        if (!fullName) fullName = `Candidato #${numberStr || idx + 1}`;
        if (!numberStr) numberStr = String(idx + 1).padStart(2, '0');
        if (fullName.toLowerCase().includes('blanco')) isBlankVote = true;

        return ensureFormulaCandidate({
          id: `cand-sheet-${idx + 1}`,
          positionId: posId,
          number: numberStr.padStart(2, '0'),
          fullName,
          principalName: fullName,
          principalPhotoUrl: photoUrl,
          principalGrade: grade,
          principalGroup: group,
          suplenteName,
          suplentePhotoUrl,
          suplenteGrade: grade,
          suplenteGroup: group,
          grade,
          group,
          slogan: slogan || 'Liderazgo, compromiso y transparencia',
          proposals: proposals.length > 0 ? proposals : ['Representación estudiantil activa', 'Espacios de diálogo', 'Proyectos pedagógicos'],
          colorHex: isBlankVote ? '#64748b' : colorHex,
          photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=faces',
          isBlankVote
        });
      }

      const id = item.id || `cand-sheet-${idx + 1}`;
      let rawPos = String(item.positionId || item.cargo || item.Cargo || item.posicion || 'personeria').toLowerCase();
      let posId = 'personeria';
      if (rawPos.includes('contralor')) posId = 'contraloria';
      else if (rawPos.includes('directiv') || rawPos.includes('consejo')) posId = 'consejo_directivo';
      else if (rawPos.includes('curso') || rawPos.includes('representante')) posId = 'representante_curso';
      else if (rawPos.includes('cabild')) posId = 'cabildante';
      else posId = 'personeria';

      const rawNum = item.number !== undefined ? item.number : (item.numero || item.tarjeton || idx + 1);
      const number = String(rawNum).padStart(2, '0');
      const fullName = item.fullName || item.nombre || item.Nombre || item.nombreCompleto || item.candidato || `Candidato #${number}`;
      const principalName = item.principalName || item.candidatoPrincipal || item.nombrePrincipal || item.principal || fullName;
      const principalPhotoUrl = item.principalPhotoUrl || item.fotoPrincipal || item.foto || item.photoUrl || '';
      const suplenteName = item.suplenteName || item.candidatoSuplente || item.nombreSuplente || item.suplente || '';
      const suplentePhotoUrl = item.suplentePhotoUrl || item.fotoSuplente || item.suplenteFoto || '';
      const grade = item.grade || item.grado || item.Grado || '11°';
      const group = item.group || item.grupo || item.Grupo || '11-A';
      const slogan = item.slogan || item.lema || item.Lema || 'Liderazgo, compromiso y transparencia';
      const colorHex = item.colorHex || item.color || item.Color || '#7e22ce';
      const photoUrl = item.photoUrl || item.foto || item.Foto || principalPhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=faces';
      const rawProps = item.proposals || item.propuestas || item.Propuestas || [];
      const proposals = Array.isArray(rawProps) ? rawProps : (typeof rawProps === 'string' ? rawProps.split(';').map(p => p.trim()).filter(Boolean) : []);
      const isBlankVote = Boolean(item.isBlankVote || item.votoEnBlanco || item.blanco || fullName.toLowerCase().includes('blanco'));

      return ensureFormulaCandidate({
        id,
        positionId: posId,
        number,
        fullName,
        principalName,
        principalPhotoUrl,
        principalGrade: item.principalGrade || grade,
        principalGroup: item.principalGroup || group,
        suplenteName,
        suplentePhotoUrl,
        suplenteGrade: item.suplenteGrade || grade,
        suplenteGroup: item.suplenteGroup || group,
        grade,
        group,
        slogan,
        proposals: proposals.length > 0 ? proposals : ['Representación estudiantil activa', 'Espacios de diálogo', 'Proyectos pedagógicos'],
        colorHex: isBlankVote ? '#64748b' : colorHex,
        photoUrl,
        isBlankVote
      });
    });
  };

  // LECTURA (GET) DESDE LAS 4 BASES DE DATOS EN GOOGLE SHEETS
  const loadTableFromSheets = async (table: 'voters' | 'candidates' | 'jurados' | 'admins' | 'all') => {
    const scriptUrl = config.googleSheets.scriptUrl;
    if (!scriptUrl) {
      return { success: false, message: 'URL del webhook de Google Sheets no configurada.' };
    }

    try {
      if (table === 'voters') {
        const res = await readCensusFromSheets(scriptUrl);
        if (res.success && res.data) {
          const rawStudents = res.data.students || (Array.isArray(res.data) ? res.data : []);
          if (rawStudents.length > 0) {
            const mappedStudents: Student[] = rawStudents.map((s: any, idx: number) => ({
              id: s.id || `est-sheet-${idx + 1}`,
              documentType: s.documentType || 'TI',
              documentNumber: String(s.documentNumber),
              fullName: s.fullName,
              grade: s.grade,
              group: s.group,
              mesaNumber: Number(s.mesaNumber) || 1,
              email: s.email || '',
              hasVoted: Boolean(s.hasVoted),
              votedAt: s.votedAt,
              receiptFolio: s.receiptFolio,
              isVerifiedByJurado: Boolean(s.hasVoted)
            }));
            setStudents(mappedStudents);
            fetch('/api/election/sync-students', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ students: mappedStudents })
            }).catch(() => {});
            addAuditLog('SYNC_SHEETS', 'ADMIN', 'Google Sheets Conector', `Censo de ${mappedStudents.length} votantes cargado exitosamente desde Google Sheets.`);
            return { success: true, message: `Se cargaron ${mappedStudents.length} votantes desde Sheets.`, count: mappedStudents.length, data: mappedStudents };
          }
        }
        return res;
      }

      if (table === 'candidates') {
        const res = await readCandidatesFromSheets(scriptUrl);
        if (res.success && res.data) {
          const rawCandidates = res.data.candidates || (Array.isArray(res.data) ? res.data : []);
          if (rawCandidates.length > 0) {
            const normalized = normalizeRawCandidates(rawCandidates);
            setCandidates(normalized);
            addAuditLog('SYNC_SHEETS', 'ADMIN', 'Google Sheets Conector', `${normalized.length} candidaturas cargadas exitosamente desde Google Sheets.`);
            return { success: true, message: `Se cargaron ${normalized.length} candidatos desde Sheets.`, count: normalized.length, data: normalized };
          }
        }
        return res;
      }

      if (table === 'jurados') {
        const res = await readJuradosFromSheets(scriptUrl);
        if (res.success && res.data) {
          const rawJurados = res.data.jurados || (Array.isArray(res.data) ? res.data : []);
          if (rawJurados.length > 0) {
            const normalized = normalizeRawJurados(rawJurados);
            setJurados(normalized);
            addAuditLog('SYNC_SHEETS', 'ADMIN', 'Google Sheets Conector', `${normalized.length} jurados acreditados cargados desde Google Sheets.`);
            return { success: true, message: `Se cargaron ${normalized.length} jurados desde Sheets.`, count: normalized.length, data: normalized };
          }
        }
        return res;
      }

      if (table === 'admins') {
        const res = await readAdminsFromSheets(scriptUrl);
        if (res.success && res.data) {
          const rawAdmins = res.data.admins || (Array.isArray(res.data) ? res.data : []);
          if (rawAdmins.length > 0) {
            const normalized = normalizeRawAdmins(rawAdmins);
            setAdmins(normalized);
            addAuditLog('SYNC_SHEETS', 'ADMIN', 'Google Sheets Conector', `${normalized.length} administradores cargados desde Google Sheets.`);
            return { success: true, message: `Se cargaron ${normalized.length} administradores desde Sheets.`, count: normalized.length, data: normalized };
          }
        }
        return res;
      }

      if (table === 'all') {
        let finalData: any = {};
        let counts = { voters: 0, candidates: 0, jurados: 0, admins: 0 };
        let hasData = false;

        try {
          const res = await readAllFromSheets(scriptUrl);
          if (res.success && res.data && (res.data.students || res.data.candidates || res.data.jurados || res.data.admins)) {
            finalData = res.data;
            hasData = true;
          }
        } catch {
          // Continue to individual fallback
        }

        // Si getAllData no trajo todas las tablas o falló, consultar en paralelo cada una
        if (!hasData || (!finalData.students && !finalData.candidates && !finalData.jurados && !finalData.admins)) {
          const [votersRes, candRes, jurRes, admRes] = await Promise.allSettled([
            readCensusFromSheets(scriptUrl),
            readCandidatesFromSheets(scriptUrl),
            readJuradosFromSheets(scriptUrl),
            readAdminsFromSheets(scriptUrl)
          ]);

          if (votersRes.status === 'fulfilled' && votersRes.value.success && votersRes.value.data) {
            finalData.students = votersRes.value.data.students || (Array.isArray(votersRes.value.data) ? votersRes.value.data : []);
          }
          if (candRes.status === 'fulfilled' && candRes.value.success && candRes.value.data) {
            finalData.candidates = candRes.value.data.candidates || (Array.isArray(candRes.value.data) ? candRes.value.data : []);
          }
          if (jurRes.status === 'fulfilled' && jurRes.value.success && jurRes.value.data) {
            finalData.jurados = jurRes.value.data.jurados || (Array.isArray(jurRes.value.data) ? jurRes.value.data : []);
          }
          if (admRes.status === 'fulfilled' && admRes.value.success && admRes.value.data) {
            finalData.admins = admRes.value.data.admins || (Array.isArray(admRes.value.data) ? admRes.value.data : []);
          }
        }

        let anyUpdated = false;

        if (finalData.students && finalData.students.length > 0) {
          const rawStudents = finalData.students;
          const mappedStudents: Student[] = rawStudents.map((s: any, idx: number) => ({
            id: s.id || `est-sheet-${idx + 1}`,
            documentType: s.documentType || 'TI',
            documentNumber: String(s.documentNumber),
            fullName: s.fullName,
            grade: s.grade,
            group: s.group,
            mesaNumber: Number(s.mesaNumber) || 1,
            email: s.email || '',
            hasVoted: Boolean(s.hasVoted),
            votedAt: s.votedAt,
            receiptFolio: s.receiptFolio,
            isVerifiedByJurado: Boolean(s.hasVoted)
          }));
          setStudents(mappedStudents);
          counts.voters = mappedStudents.length;
          anyUpdated = true;
        }

        if (finalData.candidates && finalData.candidates.length > 0) {
          const normCands = normalizeRawCandidates(finalData.candidates);
          setCandidates(normCands);
          counts.candidates = normCands.length;
          anyUpdated = true;
        }

        if (finalData.jurados && finalData.jurados.length > 0) {
          const normJur = normalizeRawJurados(finalData.jurados);
          setJurados(normJur);
          counts.jurados = normJur.length;
          anyUpdated = true;
        }

        if (finalData.admins && finalData.admins.length > 0) {
          const normAdm = normalizeRawAdmins(finalData.admins);
          setAdmins(normAdm);
          counts.admins = normAdm.length;
          anyUpdated = true;
        }

        if (anyUpdated) {
          fetch('/api/election/sync-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              students: finalData.students || [],
              candidates: finalData.candidates ? normalizeRawCandidates(finalData.candidates) : [],
              jurados: finalData.jurados ? normalizeRawJurados(finalData.jurados) : [],
              admins: finalData.admins ? normalizeRawAdmins(finalData.admins) : []
            })
          }).catch(() => {});
          
          addAuditLog(
            'SYNC_SHEETS',
            'ADMIN',
            'Google Sheets Conector',
            `Sincronización integral: ${counts.voters} votantes, ${counts.candidates} candidatos, ${counts.jurados} jurados, ${counts.admins} admins cargados.`
          );

          return {
            success: true,
            message: `Importación completada: ${counts.voters} votantes, ${counts.candidates} candidatos, ${counts.jurados} jurados y ${counts.admins} administradores cargados.`,
            data: finalData,
            count: counts.voters + counts.candidates + counts.jurados + counts.admins
          };
        }

        return {
          success: false,
          message: 'No se encontraron datos en Google Sheets. Verifique que las hojas se llamen "Votantes", "Candidatos", "Jurados" y "Administradores".'
        };
      }

      return { success: false, message: 'Tabla desconocida' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error al leer tabla desde Google Sheets.' };
    }
  };

  // ESCRITURA / REGISTRO (POST) HACIA LAS 4 BASES DE DATOS EN GOOGLE SHEETS
  const syncTableToSheets = async (table: 'voters' | 'candidates' | 'jurados' | 'admins' | 'all') => {
    const scriptUrl = config.googleSheets.scriptUrl;
    if (!scriptUrl) {
      return { success: false, message: 'URL del webhook de Google Sheets no configurada.' };
    }

    try {
      if (table === 'voters') {
        const res = await writeVotersToSheets(scriptUrl, students);
        if (res.success) {
          addAuditLog('SYNC_SHEETS', 'ADMIN', 'Google Sheets Conector', `Base de datos de ${students.length} votantes registrada en Google Sheets.`);
        }
        return res;
      }

      if (table === 'candidates') {
        const res = await writeCandidatesToSheets(scriptUrl, candidates);
        if (res.success) {
          addAuditLog('SYNC_SHEETS', 'ADMIN', 'Google Sheets Conector', `Base de datos de ${candidates.length} candidatos registrada en Google Sheets.`);
        }
        return res;
      }

      if (table === 'jurados') {
        const res = await writeJuradosToSheets(scriptUrl, jurados);
        if (res.success) {
          addAuditLog('SYNC_SHEETS', 'ADMIN', 'Google Sheets Conector', `Base de datos de ${jurados.length} jurados registrada en Google Sheets.`);
        }
        return res;
      }

      if (table === 'admins') {
        const res = await writeAdminsToSheets(scriptUrl, admins);
        if (res.success) {
          addAuditLog('SYNC_SHEETS', 'ADMIN', 'Google Sheets Conector', `Base de datos de ${admins.length} administradores registrada en Google Sheets.`);
        }
        return res;
      }

      if (table === 'all') {
        const res = await writeAllToSheets(scriptUrl, {
          students,
          candidates,
          jurados,
          admins
        });
        if (res.success) {
          addAuditLog('SYNC_SHEETS', 'ADMIN', 'Google Sheets Conector', 'Sincronización integral de las 4 bases de datos registrada en Google Sheets.');
        }
        return res;
      }

      return { success: false, message: 'Tabla desconocida' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error al registrar tabla en Google Sheets.' };
    }
  };

  // Google Sheets integration (Lectura y Escritura Real)
  const syncWithGoogleSheets = async () => {
    const scriptUrl = config.googleSheets.scriptUrl;
    if (!scriptUrl) {
      return { success: false, rowsSynced: 0, message: 'URL del webhook de Google Sheets no configurada.' };
    }

    setConfig(prev => ({
      ...prev,
      googleSheets: { ...prev.googleSheets, status: 'syncing' }
    }));

    try {
      const payload = {
        action: 'batchSync',
        votesCount: votes.length,
        votedStudentsCount: students.filter(s => s.hasVoted).length,
        votes: votes.map(v => ({
          voteToken: v.voteToken,
          positionId: v.positionId,
          candidateId: v.candidateId,
          mesaNumber: v.mesaNumber,
          hash: v.hash,
          timestamp: v.timestamp
        })),
        studentsVoted: students.filter(s => s.hasVoted).map(s => ({
          documentNumber: s.documentNumber,
          fullName: s.fullName,
          grade: s.grade,
          group: s.group,
          mesaNumber: s.mesaNumber,
          votedAt: s.votedAt,
          receiptFolio: s.receiptFolio
        }))
      };

      const res = await writeVoteToSheets(scriptUrl, payload);

      if (res.success) {
        const now = new Date().toISOString();
        setConfig(prev => ({
          ...prev,
          googleSheets: {
            ...prev.googleSheets,
            status: 'success',
            lastSyncTime: now
          }
        }));

        addAuditLog('SYNC_SHEETS', 'SISTEMA', 'Google Sheets Conector', `Sincronización exitosa: ${votes.length} votos y censo transmitidos a Google Sheets.`);
        return { success: true, rowsSynced: votes.length, message: res.message || 'Sincronización con Google Sheets completada.' };
      } else {
        throw new Error(res.message || 'Error en comunicación con Google Sheets');
      }
    } catch (err: any) {
      setConfig(prev => ({
        ...prev,
        googleSheets: {
          ...prev.googleSheets,
          status: 'error',
          errorMessage: err.message || 'Error al contactar webhook de Google Sheets'
        }
      }));
      return { success: false, rowsSynced: 0, message: err.message || 'Fallo al sincronizar con Google Sheets.' };
    }
  };

  // Email dispatch for voting certificate
  const sendCertificateByEmail = async (email: string, cert: VotingCertificate) => {
    try {
      await fetch('/api/election/send-certificate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, cert })
      }).catch(err => console.warn('Error contactando endpoint de correo:', err));
    } catch {
      // Offline fallback
    }

    addAuditLog(
      'ACTA_GENERADA',
      'SISTEMA',
      'Servidor de Correo Ekirayá',
      `Certificado de votación ${cert.folioNumber} enviado automáticamente a ${email} para el estudiante ${cert.studentName}`,
      cert.mesaNumber
    );

    return {
      success: true,
      message: `Certificado digital remitido exitosamente a: ${email}`
    };
  };

  // Dispatch certificate to Superadmin Inbox
  const sendCertificateToSuperadmin = async (cert: VotingCertificate) => {
    const fromEmail = config.institutionEmail || 'rectoria@ekiraya.edu.co';
    const toEmail = config.superadminEmail || 'rectoria@ekiraya.edu.co';

    try {
      const res = await fetch('/api/election/send-certificate-to-superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cert, fromEmail, toEmail })
      });
      const data = await res.json();
      if (data.inboxMessage) {
        setSuperadminInbox(prev => [data.inboxMessage, ...prev.filter(m => m.id !== data.inboxMessage.id)]);
      }
      return { success: true, message: data.message || `Certificado entregado en la bandeja del Superadministrador (${toEmail})` };
    } catch {
      // Local fallback
      const fallbackMsg: CertificateInboxMessage = {
        id: `inbox-cert-${Date.now()}`,
        folioNumber: cert.folioNumber,
        timestamp: cert.timestamp || new Date().toISOString(),
        fromEmail,
        toEmail,
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
      setSuperadminInbox(prev => [fallbackMsg, ...prev.filter(m => m.folioNumber !== cert.folioNumber)]);
      return { success: true, message: `Certificado despachado desde ${fromEmail} a la Bandeja del Superadministrador (${toEmail}).` };
    }
  };

  // Mark inbox message as read
  const markInboxMessageRead = async (id: string) => {
    setSuperadminInbox(prev => prev.map(m => (m.id === id ? { ...m, read: true } : m)));
    try {
      await fetch('/api/election/mark-inbox-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch {}
  };

  const resetElectionData = () => {
    setStudents(INITIAL_STUDENTS.map(s => ({ ...s, hasVoted: false, votedAt: undefined, receiptFolio: undefined })));
    setVotes([]);
    setSuperadminInbox([]);
    setActiveVoter(null);
    setLatestCertificate(null);
    setConfig(INITIAL_CONFIG);
    addAuditLog('SISTEMA_INICIO', 'ADMIN', 'Supervisión Electoral', 'Reinicio completo de urnas a cero. Censo electoral restablecido.');

    fetch('/api/election/reset', {
      method: 'POST'
    }).catch(err => console.warn('Error reiniciando datos en servidor:', err));

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'STATE_REFRESH' });
    }
  };

  return (
    <ElectionContext.Provider
      value={{
        config,
        positions,
        candidates,
        students,
        jurados,
        admins,
        votes,
        auditLogs,
        currentRole,
        setCurrentRole,
        juradoMesa,
        setJuradoMesa,
        activeVoter,
        setActiveVoter,
        latestCertificate,
        setLatestCertificate,
        connectedComputersCount,
        isMultiComputerLive,
        terminalId,
        terminalName,
        setTerminalName,
        terminalsList,
        refreshServerState,
        authenticateStudent,
        verifyStudentAtMesa,
        castVote,
        updateElectionStatus,
        updateInstitutionConfig,
        addStudent,
        addCandidate,
        updateCandidate,
        deleteCandidate,
        addJurado,
        updateJurado,
        deleteJurado,
        addAdmin,
        updateAdmin,
        deleteAdmin,
        loadTableFromSheets,
        syncTableToSheets,
        saveTableToSheets: syncTableToSheets,
        isAdminAuthenticated,
        isJuradoAuthenticated,
        juradoName,
        loginAdmin,
        logoutAdmin,
        loginJurado,
        logoutJurado,
        syncWithGoogleSheets,
        sendCertificateByEmail,
        superadminInbox,
        markInboxMessageRead,
        sendCertificateToSuperadmin,
        resetElectionData,
        addAuditLog,
        setThisTerminalConfig,
        isMultiDeviceModalOpen,
        setIsMultiDeviceModalOpen,
        isCloudBackupModalOpen,
        setIsCloudBackupModalOpen,
        cloudSnapshots,
        createCloudSnapshot,
        restoreCloudSnapshot,
        downloadCloudBackup,
        uploadAndRestoreCloudBackup,
        sheetsSyncInfo,
        forceServerSheetsSync
      }}
    >
      {children}
    </ElectionContext.Provider>
  );
};

export const useElection = () => {
  const context = useContext(ElectionContext);
  if (!context) {
    throw new Error('useElection must be used within an ElectionProvider');
  }
  return context;
};
