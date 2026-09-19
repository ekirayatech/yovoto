export type DocumentType = 'TI' | 'CC' | 'RC' | 'CE' | 'COD';

export interface Position {
  id: string;
  title: string;
  shortTitle: string;
  legalBasis: string; // e.g., 'Ley 115 de 1994, Art. 142 - Decreto 1860 de 1994, Art. 28'
  description: string;
  eligibleGrades: string[]; // e.g., ['6°', '7°', '8°', '9°', '10°', '11°']
  color: string;
}

export interface Candidate {
  id: string;
  number: string; // Número en el tarjetón, e.g. "01", "02"
  positionId: string;
  fullName: string;
  grade: string;
  group: string;
  photoUrl: string;
  slogan: string;
  proposals: string[];
  colorHex: string;
  isBlankVote?: boolean;
}

export interface Student {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  fullName: string;
  grade: string;
  group: string;
  mesaNumber: number;
  email: string;
  hasVoted: boolean;
  votedAt?: string;
  receiptFolio?: string;
  isVerifiedByJurado?: boolean;
  verifiedAt?: string;
}

export interface EncryptedVote {
  id: string;
  voteToken: string; // Blinded hash separating voter identity from choice
  positionId: string;
  candidateId: string;
  mesaNumber: number;
  grade: string;
  timestamp: string;
  hash: string;
  prevHash: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'SISTEMA_INICIO' | 'APERTURA_MESA' | 'CIERRE_MESA' | 'VOTO_EMITIDO' | 'ESTUDIANTE_HABILITADO' | 'ACTA_GENERADA' | 'SYNC_SHEETS' | 'SEGURIDAD_ALERTA';
  actorType: 'SISTEMA' | 'JURADO' | 'ESTUDIANTE' | 'ADMIN';
  actorName: string;
  mesaNumber?: number;
  details: string;
  hash: string;
  status: 'VERIFICADO' | 'AUDITADO' | 'ALERTA';
}

export interface VotingCertificate {
  folioNumber: string;
  studentName: string;
  documentType: DocumentType;
  documentNumber: string;
  grade: string;
  group: string;
  mesaNumber: number;
  studentEmail?: string;
  timestamp: string;
  verificationHash: string;
  schoolName: string;
  daneCode: string;
  rectorName: string;
}

export type ElectionStatus = 'CONFIGURACION' | 'ABIERTA' | 'CERRADA' | 'ESCRUTADA';

export interface GoogleSheetsConfig {
  enabled: boolean;
  scriptUrl: string;
  sheetId: string;
  autoSync: boolean;
  lastSyncTime: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}

export interface SupabaseConfig {
  enabled: boolean;
  projectUrl: string;
  anonKey: string;
  tableName: string;
  syncStatus: 'disconnected' | 'connected' | 'syncing';
}

export interface PollingStation {
  id: string;
  name: string;
  shortName: string;
  category: 'Preescolar' | 'Primaria' | 'Bachillerato medio' | 'Bachillerato alto';
  gradesCovered: string[];
  mesas: number[];
  description: string;
  location?: string;
}

export interface ElectionConfig {
  institutionName: string;
  daneCode: string;
  nit: string;
  city: string;
  department: string;
  academicYear: number;
  rectorName: string;
  personeroDocenteLider: string;
  status: ElectionStatus;
  openedAt?: string;
  closedAt?: string;
  totalMesas: number;
  pollingStations?: PollingStation[];
  googleSheets: GoogleSheetsConfig;
  supabase: SupabaseConfig;
  encryptionKeyFingerprint: string;
}

export type AppRole = 'VOTANTE' | 'JURADO' | 'ADMIN';

export interface JuradoMember {
  id: string;
  mesaNumber: number;
  fullName: string;
  documentNumber: string;
  role: 'PRESIDENTE_MESA' | 'VOCAL' | 'REMANENTE';
  pin: string;
  email?: string;
  status: 'ACTIVO' | 'INACTIVO';
  openedMesaAt?: string;
}

export interface AdminMember {
  id: string;
  fullName: string;
  documentNumber: string;
  username: string;
  role: 'SUPER_ADMIN' | 'AUDITOR' | 'REGISTRADOR';
  pin: string;
  email?: string;
  status: 'ACTIVO' | 'INACTIVO';
  lastAccessAt?: string;
}
