import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Code2,
  Copy,
  Database,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Github,
  Globe,
  HelpCircle,
  Key,
  Laptop,
  Layers,
  Lock,
  Play,
  RefreshCw,
  Send,
  Server,
  Shield,
  ShieldCheck,
  Terminal,
  UploadCloud,
  UserCheck,
  Users,
  Zap
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useElection } from '../../context/ElectionContext';
import {
  diagnoseScriptUrl,
  normalizeScriptUrl,
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
} from '../../utils/googleSheetsService';
import { UnifiedSheetsImportModal } from './UnifiedSheetsImportModal';

export const IntegrationsTab: React.FC = () => {
  const {
    config,
    updateInstitutionConfig,
    syncWithGoogleSheets,
    votes,
    students,
    candidates,
    jurados,
    admins,
    loadTableFromSheets,
    syncTableToSheets,
    setIsMultiDeviceModalOpen,
    setIsCloudBackupModalOpen,
    connectedComputersCount,
    sheetsSyncInfo
  } = useElection();

  const [activeSubTab, setActiveSubTab] = useState<'sheets' | 'github' | 'vercel' | 'supabase'>('sheets');
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState<boolean>(false);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Google Sheets Local Form
  const [scriptUrl, setScriptUrl] = useState<string>(config.googleSheets.scriptUrl);
  const [sheetId, setSheetId] = useState<string>(config.googleSheets.sheetId);
  const [autoSync, setAutoSync] = useState<boolean>(config.googleSheets.autoSync);

  useEffect(() => {
    if (config.googleSheets?.scriptUrl) {
      setScriptUrl(config.googleSheets.scriptUrl);
    }
    if (config.googleSheets?.sheetId) {
      setSheetId(config.googleSheets.sheetId);
    }
    if (config.googleSheets?.autoSync !== undefined) {
      setAutoSync(config.googleSheets.autoSync);
    }
  }, [config.googleSheets?.scriptUrl, config.googleSheets?.sheetId, config.googleSheets?.autoSync]);

  // 4 Databases Verification & Interactive Testing state
  const [loadingTable, setLoadingTable] = useState<string | null>(null);
  const [activeInspectorTable, setActiveInspectorTable] = useState<'voters' | 'candidates' | 'jurados' | 'admins'>('voters');
  const [verificationFeedback, setVerificationFeedback] = useState<Record<string, { status: 'idle' | 'success' | 'error'; message: string; timestamp?: string }>>({
    voters: { status: 'idle', message: 'Listo para verificar lectura y registro' },
    candidates: { status: 'idle', message: 'Listo para verificar lectura y registro' },
    jurados: { status: 'idle', message: 'Listo para verificar lectura y registro' },
    admins: { status: 'idle', message: 'Listo para verificar lectura y registro' }
  });

  const [testResult, setTestResult] = useState<{
    type: 'read' | 'write';
    table?: string;
    status: 'loading' | 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  // Supabase Local Form
  const [supaUrl, setSupaUrl] = useState<string>(config.supabase.projectUrl);
  const [supaKey, setSupaKey] = useState<string>(config.supabase.anonKey);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    try {
      const res = await syncWithGoogleSheets();
      if (res.success) {
        setSyncSuccessMsg(`Sincronización exitosa: ${res.rowsSynced} votos y ${students.filter(s => s.hasVoted).length} sufragantes registrados en Google Sheets.`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSheetsConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateInstitutionConfig({
      googleSheets: {
        ...config.googleSheets,
        scriptUrl,
        sheetId,
        autoSync
      }
    });
    setSyncSuccessMsg('Configuración de Google Sheets guardada correctamente.');
    setTimeout(() => setSyncSuccessMsg(null), 4000);
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateInstitutionConfig({
      supabase: {
        ...config.supabase,
        projectUrl: supaUrl,
        anonKey: supaKey
      }
    });
    alert('Configuración de Supabase actualizada.');
  };

  // VERIFICAR LECTURA (GET) DE UNA TABLA ESPECÍFICA O TODAS
  const handleVerifyRead = async (table: 'voters' | 'candidates' | 'jurados' | 'admins' | 'all') => {
    const diag = diagnoseScriptUrl(scriptUrl);
    if (!diag.valid) {
      alert(diag.warning || 'Por favor ingrese la URL del Webhook de Google Apps Script primero.');
      return;
    }

    setLoadingTable(`read-${table}`);
    setTestResult({
      type: 'read',
      table,
      status: 'loading',
      message: `Leyendo base de datos de ${table.toUpperCase()} desde Google Sheets (GET)...`
    });

    try {
      const res = await loadTableFromSheets(table);
      if (res.success) {
        const time = new Date().toLocaleTimeString();
        if (table !== 'all') {
          setVerificationFeedback(prev => ({
            ...prev,
            [table]: {
              status: 'success',
              message: `Leído exitosamente (${res.count ?? 'OK'} registros)`,
              timestamp: time
            }
          }));
        } else {
          setVerificationFeedback({
            voters: { status: 'success', message: 'Lectura integral OK', timestamp: time },
            candidates: { status: 'success', message: 'Lectura integral OK', timestamp: time },
            jurados: { status: 'success', message: 'Lectura integral OK', timestamp: time },
            admins: { status: 'success', message: 'Lectura integral OK', timestamp: time }
          });
        }

        setTestResult({
          type: 'read',
          table,
          status: 'success',
          message: res.message,
          details: res.data ? JSON.stringify(res.data, null, 2) : undefined
        });
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      if (table !== 'all') {
        setVerificationFeedback(prev => ({
          ...prev,
          [table]: {
            status: 'error',
            message: err.message || 'Error en lectura',
            timestamp: new Date().toLocaleTimeString()
          }
        }));
      }
      setTestResult({
        type: 'read',
        table,
        status: 'error',
        message: err.message || `No se pudo leer la tabla ${table} desde Google Sheets.`,
        details: 'Asegúrese de haber implementado el código en Google Apps Script con acceso para "Cualquiera" (Anyone) y que la URL termine en /exec.'
      });
    } finally {
      setLoadingTable(null);
    }
  };

  // VERIFICAR REGISTRO / ESCRITURA (POST) DE UNA TABLA ESPECÍFICA O TODAS
  const handleVerifyWrite = async (table: 'voters' | 'candidates' | 'jurados' | 'admins' | 'all') => {
    const diag = diagnoseScriptUrl(scriptUrl);
    if (!diag.valid) {
      alert(diag.warning || 'Por favor ingrese la URL del Webhook de Google Apps Script primero.');
      return;
    }

    setLoadingTable(`write-${table}`);
    setTestResult({
      type: 'write',
      table,
      status: 'loading',
      message: `Registrando base de datos de ${table.toUpperCase()} en Google Sheets (POST)...`
    });

    try {
      const res = await syncTableToSheets(table);
      if (res.success) {
        const time = new Date().toLocaleTimeString();
        if (table !== 'all') {
          setVerificationFeedback(prev => ({
            ...prev,
            [table]: {
              status: 'success',
              message: `Registrado exitosamente en Google Sheets`,
              timestamp: time
            }
          }));
        } else {
          setVerificationFeedback({
            voters: { status: 'success', message: 'Registrado en Sheets', timestamp: time },
            candidates: { status: 'success', message: 'Registrado en Sheets', timestamp: time },
            jurados: { status: 'success', message: 'Registrado en Sheets', timestamp: time },
            admins: { status: 'success', message: 'Registrado en Sheets', timestamp: time }
          });
        }

        setTestResult({
          type: 'write',
          table,
          status: 'success',
          message: res.message,
          details: `Operación POST confirmada por Google Apps Script. Hojas sincronizadas en Google Drive.`
        });
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      if (table !== 'all') {
        setVerificationFeedback(prev => ({
          ...prev,
          [table]: {
            status: 'error',
            message: err.message || 'Error en registro',
            timestamp: new Date().toLocaleTimeString()
          }
        }));
      }
      setTestResult({
        type: 'write',
        table,
        status: 'error',
        message: err.message || `No se pudo registrar la tabla ${table} en Google Sheets.`,
        details: 'Verifique que la URL termine en /exec y que los permisos permitan peticiones de "Cualquiera" (Anyone).'
      });
    } finally {
      setLoadingTable(null);
    }
  };

  // Complete Google Apps Script supporting the 4 Databases
  const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * SISTEMA DE VOTACIÓN ESTUDIANTIL COLEGIO EKIRAYÁ
 * Conector de 4 Bases de Datos (Lectura y Escritura) en Google Sheets:
 * 1. Votantes (Censo Estudiantil)
 * 2. Candidatos (Tarjetón Electoral)
 * 3. Jurados (Acreditación y Mesas)
 * 4. Administradores (Supervisores)
 * + Urna Cifrada (Depósito Seguro de Votos)
 * =========================================================================
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Cree una hoja de cálculo en Google Sheets (ej: "BD Electoral Ekiraya 2026").
 * 2. Vaya a: Extensiones > Apps Script.
 * 3. Reemplace TODO el contenido con este código y guarde (Ctrl+S).
 * 4. Haga clic en: Implementar > Nueva implementación.
 * 5. Tipo de implementación: "Aplicación web".
 * 6. Ejecutar como: "Yo" (su correo de Google).
 * 7. Quién tiene acceso: "Cualquiera" (Anyone - Requisito fundamental).
 * 8. Copie la URL generada (terminada en /exec) y péguela en el sistema.
 */

// -------------------------------------------------------------------------
// UTILITARIOS DE BÚSQUEDA Y PARSEO INTELIGENTE DE HOJAS Y COLUMNAS
// -------------------------------------------------------------------------
function findSheet(ss, names) {
  for (var i = 0; i < names.length; i++) {
    var s = ss.getSheetByName(names[i]);
    if (s && s.getLastRow() > 0) return s;
  }
  var allSheets = ss.getSheets();
  for (var i = 0; i < names.length; i++) {
    var target = names[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    for (var j = 0; j < allSheets.length; j++) {
      var sName = allSheets[j].getName().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (sName === target && allSheets[j].getLastRow() > 0) {
        return allSheets[j];
      }
    }
  }
  for (var i = 0; i < names.length; i++) {
    var target = names[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (target.length < 3) continue;
    for (var j = 0; j < allSheets.length; j++) {
      var sName = allSheets[j].getName().toLowerCase().replace(/[^a-z0-9]/g, '');
      if ((sName.indexOf(target) !== -1 || target.indexOf(sName) !== -1) && allSheets[j].getLastRow() > 0) {
        return allSheets[j];
      }
    }
  }
  var firstNamed = ss.getSheetByName(names[0]);
  if (firstNamed) return firstNamed;
  for (var k = 0; k < allSheets.length; k++) {
    if (allSheets[k].getLastRow() > 0) return allSheets[k];
  }
  return allSheets[0] || ss.insertSheet(names[0]);
}

function parseVoterRows(rows) {
  if (!rows || rows.length === 0) return [];
  var firstRowStr = (rows[0] || []).join(' ').toLowerCase();
  var isHeader = /nombre|documento|tarjeta|cedula|identif|estudiante|alumno|grado|curso|mesa|email|correo/.test(firstRowStr);
  var startIndex = isHeader ? 1 : 0;

  var colDoc = -1, colType = -1, colName = -1, colGrade = -1, colGroup = -1, colMesa = -1, colEmail = -1, colVoted = -1, colDate = -1, colFolio = -1;

  if (isHeader) {
    var headers = rows[0].map(function(h) {
      return String(h || '').toLowerCase().trim().replace(/[^a-z0-9áéíóúüñ]/g, '');
    });
    for (var c = 0; c < headers.length; c++) {
      var h = headers[c];
      if (colDoc === -1 && (h.indexOf('documento') !== -1 || h.indexOf('identif') !== -1 || h.indexOf('tarjeta') !== -1 || h.indexOf('cedula') !== -1 || h.indexOf('numero') !== -1 || h === 'doc' || h === 'ti' || h === 'cc' || h === 'id' || h === 'codigo')) {
        colDoc = c;
      } else if (colType === -1 && (h.indexOf('tipo') !== -1 || h === 'td')) {
        colType = c;
      } else if (colName === -1 && (h.indexOf('nombre') !== -1 || h.indexOf('estudiante') !== -1 || h.indexOf('alumno') !== -1 || h.indexOf('apellido') !== -1)) {
        colName = c;
      } else if (colGrade === -1 && (h.indexOf('grado') !== -1 || h.indexOf('curso') !== -1 || h.indexOf('nivel') !== -1 || h === 'grade')) {
        colGrade = c;
      } else if (colGroup === -1 && (h.indexOf('grupo') !== -1 || h.indexOf('seccion') !== -1 || h.indexOf('salon') !== -1)) {
        colGroup = c;
      } else if (colMesa === -1 && (h.indexOf('mesa') !== -1 || h.indexOf('puesto') !== -1)) {
        colMesa = c;
      } else if (colEmail === -1 && (h.indexOf('correo') !== -1 || h.indexOf('email') !== -1 || h.indexOf('mail') !== -1)) {
        colEmail = c;
      } else if (colVoted === -1 && (h.indexOf('vota') !== -1 || h.indexOf('sufrag') !== -1 || h.indexOf('estado') !== -1)) {
        colVoted = c;
      } else if (colDate === -1 && (h.indexOf('fecha') !== -1 || h.indexOf('hora') !== -1)) {
        colDate = c;
      } else if (colFolio === -1 && (h.indexOf('folio') !== -1 || h.indexOf('certif') !== -1)) {
        colFolio = c;
      }
    }
  }

  var sampleRow = rows[startIndex] || [];
  if (colDoc === -1) {
    for (var c = 0; c < sampleRow.length; c++) {
      var val = String(sampleRow[c] || '').trim();
      if (/^\d{5,15}$/.test(val)) { colDoc = c; break; }
    }
    if (colDoc === -1) colDoc = 0;
  }
  if (colName === -1) {
    for (var c = 0; c < sampleRow.length; c++) {
      if (c !== colDoc && typeof sampleRow[c] === 'string' && sampleRow[c].trim().length > 3 && sampleRow[c].indexOf('@') === -1) {
        colName = c; break;
      }
    }
    if (colName === -1) colName = (colDoc === 0 ? 1 : 0);
  }

  var students = [];
  for (var i = startIndex; i < rows.length; i++) {
    var r = rows[i];
    if (!r || r.length === 0) continue;
    var rawDoc = colDoc !== -1 ? r[colDoc] : r[0];
    if (rawDoc === '' || rawDoc === null || rawDoc === undefined) continue;
    var docStr = String(rawDoc).trim().replace(/\.0$/, '');
    if (!docStr) continue;

    var rawVoted = colVoted !== -1 ? r[colVoted] : false;
    var hasVoted = rawVoted === true || String(rawVoted).toUpperCase() === 'SI' || String(rawVoted).toUpperCase() === 'TRUE' || String(rawVoted).toUpperCase() === 'VOTÓ' || String(rawVoted).toUpperCase() === 'VOTO';

    students.push({
      id: 'est-' + (i + 1),
      documentType: colType !== -1 && r[colType] ? String(r[colType]).toUpperCase().trim() : 'TI',
      documentNumber: docStr,
      fullName: colName !== -1 && r[colName] ? String(r[colName]).trim() : 'Estudiante ' + docStr,
      grade: colGrade !== -1 && r[colGrade] ? String(r[colGrade]).trim() : '',
      group: colGroup !== -1 && r[colGroup] ? String(r[colGroup]).trim() : '',
      mesaNumber: colMesa !== -1 && Number(r[colMesa]) ? Number(r[colMesa]) : 1,
      email: colEmail !== -1 && r[colEmail] ? String(r[colEmail]).trim() : '',
      hasVoted: hasVoted,
      votedAt: colDate !== -1 && r[colDate] ? String(r[colDate]) : '',
      receiptFolio: colFolio !== -1 && r[colFolio] ? String(r[colFolio]) : ''
    });
  }
  return students;
}

function parseCandidateRows(rows) {
  if (!rows || rows.length === 0) return [];
  var firstRowStr = (rows[0] || []).join(' ').toLowerCase();
  var isHeader = /nombre|candidato|cargo|position|numero|tarjeton|lema|propuesta|foto|color/.test(firstRowStr);
  var startIndex = isHeader ? 1 : 0;

  var candidates = [];
  for (var i = startIndex; i < rows.length; i++) {
    var r = rows[i];
    if (!r || r.length === 0) continue;
    var nonEmpties = r.filter(function(v) { return v !== '' && v !== null && v !== undefined; });
    if (nonEmpties.length === 0) continue;

    var num = '', name = '', posId = 'personeria', gr = '', gp = '', lem = '', col = '#7e22ce', pho = '', props = [];
    var isBlank = false;

    for (var c = 0; c < r.length; c++) {
      var val = String(r[c] || '').trim();
      var valLower = val.toLowerCase();
      if (!val) continue;

      if (valLower.indexOf('blanco') !== -1) {
        isBlank = true;
        name = 'Voto en Blanco';
      } else if (!num && (/^\d{1,3}$/.test(val) || /^#\d+/.test(val))) {
        num = val.replace('#', '');
      } else if (valLower.indexOf('person') !== -1) {
        posId = 'personeria';
      } else if (valLower.indexOf('contra') !== -1) {
        posId = 'contraloria';
      } else if (valLower.indexOf('cabil') !== -1) {
        posId = 'cabildante';
      } else if (valLower.indexOf('comis') !== -1 || valLower.indexOf('conviv') !== -1) {
        posId = 'comisario';
      } else if (valLower.indexOf('http') === 0) {
        pho = val;
      } else if (/^#[0-9a-f]{6}$/i.test(val)) {
        col = val;
      } else if (val.indexOf(';') !== -1 || val.indexOf('|') !== -1) {
        props = val.split(/[;|]/).map(function(p) { return p.trim(); }).filter(function(p) { return p.length > 0; });
      } else if (/^\d{1,2}[°o]?$/.test(val) || /grado/i.test(val)) {
        gr = val;
      } else if (/^\d{1,2}-[a-zA-Z]$/.test(val) || /^[a-zA-Z]$/.test(val)) {
        gp = val;
      } else if (!name && val.length > 2 && !/^\d+$/.test(val)) {
        name = val;
      } else if (!lem && val.length > 8) {
        lem = val;
      }
    }

    if (!name && !num) continue;

    candidates.push({
      id: 'cand-' + (i + 1),
      positionId: posId,
      fullName: name || ('Candidato #' + (num || i + 1)),
      number: num ? (num.length === 1 ? '0' + num : num) : (i < 9 ? '0' + (i + 1) : String(i + 1)),
      grade: gr || '11°',
      group: gp || '11-A',
      slogan: lem || 'Liderazgo, transparencia y compromiso escolar.',
      colorHex: col,
      photoUrl: pho || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
      proposals: props.length > 0 ? props : ['Participación democrática estudiantil', 'Bienestar y convivencia escolar'],
      isBlankVote: isBlank
    });
  }
  return candidates;
}

function parseJuradoRows(rows) {
  if (!rows || rows.length === 0) return [];
  var firstRowStr = (rows[0] || []).join(' ').toLowerCase();
  var isHeader = /nombre|jurado|mesa|rol|role|pin|clave|password|estado|status/.test(firstRowStr);
  var startIndex = isHeader ? 1 : 0;

  var jurados = [];
  for (var i = startIndex; i < rows.length; i++) {
    var r = rows[i];
    if (!r || r.length === 0) continue;
    var nonEmpties = r.filter(function(v) { return v !== '' && v !== null && v !== undefined; });
    if (nonEmpties.length === 0) continue;

    var mesa = 1, name = '', role = 'PRESIDENTE_MESA', pin = '', st = 'ACTIVO';

    for (var c = 0; c < r.length; c++) {
      var val = String(r[c] || '').trim();
      var valLower = val.toLowerCase();
      if (!val) continue;

      if (/^\d{1,2}$/.test(val) && Number(val) >= 1 && Number(val) <= 40) {
        mesa = Number(val);
      } else if (valLower.indexOf('presid') !== -1) {
        role = 'PRESIDENTE_MESA';
      } else if (valLower.indexOf('vocal') !== -1) {
        role = 'VOCAL_MESA';
      } else if (valLower.indexOf('secre') !== -1) {
        role = 'SECRETARIO_MESA';
      } else if (valLower === 'inactivo' || valLower === 'bloqueado' || valLower === 'false') {
        st = 'INACTIVO';
      } else if (valLower === 'activo' || valLower === 'true') {
        st = 'ACTIVO';
      } else if (!pin && (/^[a-zA-Z0-9_-]{4,15}$/.test(val) && (/\d/.test(val) || valLower.indexOf('jur') !== -1))) {
        pin = val;
      } else if (!name && val.length > 2 && isNaN(Number(val))) {
        name = val;
      }
    }

    if (!name) continue;

    jurados.push({
      id: 'jur-' + (i + 1),
      mesaNumber: mesa,
      fullName: name,
      role: role,
      pin: pin || ('jurado' + (i + 1)),
      status: st
    });
  }
  return jurados;
}

function parseAdminRows(rows) {
  if (!rows || rows.length === 0) return [];
  var firstRowStr = (rows[0] || []).join(' ').toLowerCase();
  var isHeader = /nombre|admin|usuario|username|correo|email|pin|clave|password|rol|role|cargo/.test(firstRowStr);
  var startIndex = isHeader ? 1 : 0;

  var admins = [];
  for (var i = startIndex; i < rows.length; i++) {
    var r = rows[i];
    if (!r || r.length === 0) continue;
    var nonEmpties = r.filter(function(v) { return v !== '' && v !== null && v !== undefined; });
    if (nonEmpties.length === 0) continue;

    var name = '', user = '', pin = '', role = 'SUPER_ADMIN', st = 'ACTIVO';

    for (var c = 0; c < r.length; c++) {
      var val = String(r[c] || '').trim();
      var valLower = val.toLowerCase();
      if (!val) continue;

      if (val.indexOf('@') !== -1) {
        user = val;
        if (!name) name = val.split('@')[0];
      } else if (valLower.indexOf('super') !== -1) {
        role = 'SUPER_ADMIN';
      } else if (valLower.indexOf('auditor') !== -1 || valLower.indexOf('veed') !== -1) {
        role = 'AUDITOR_SISTEMA';
      } else if (valLower.indexOf('rector') !== -1 || valLower.indexOf('direct') !== -1) {
        role = 'RECTOR';
      } else if (valLower.indexOf('coord') !== -1) {
        role = 'COORDINADOR_DEMOCRACIA';
      } else if (valLower === 'inactivo' || valLower === 'bloqueado' || valLower === 'false') {
        st = 'INACTIVO';
      } else if (valLower === 'activo' || valLower === 'true') {
        st = 'ACTIVO';
      } else if (!pin && /^[a-zA-Z0-9_\-.]{4,20}$/.test(val) && (/\d/.test(val) || valLower.indexOf('admin') !== -1 || valLower.indexOf('pass') !== -1)) {
        pin = val;
      } else if (!user && /^[a-z0-9_.\-]{3,25}$/i.test(val) && isNaN(Number(val))) {
        user = val;
      } else if (!name && val.length > 2 && isNaN(Number(val))) {
        name = val;
      }
    }

    if (!name && !user) continue;

    admins.push({
      id: 'adm-' + (i + 1),
      fullName: name || user,
      username: user || (name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@ekiraya.edu.co'),
      pin: pin || 'admin2026',
      role: role,
      status: st
    });
  }
  return admins;
}

// -------------------------------------------------------------------------
// 1. LECTURA DESDE LA BASE DE DATOS (GET)
// -------------------------------------------------------------------------
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "health";
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // A.1 CONSULTA ESPECÍFICA DE UN VOTANTE (Búsqueda en caliente por documento)
  if (action === "getVoter") {
    var searchDoc = (e.parameter.documentNumber || e.parameter.rawDoc || "").toString().replace(/[^a-zA-Z0-9]/g, "").toLowerCase().trim();
    var sheet = findSheet(ss, ["Votantes", "Censo_Estudiantil", "Censo Estudiantil", "Censo", "Estudiantes", "Alumnos", "Sheet1", "Hoja 1"]);
    var rows = sheet.getDataRange().getValues();
    var students = parseVoterRows(rows);
    var matched = null;
    for (var k = 0; k < students.length; k++) {
      var sClean = String(students[k].documentNumber).replace(/[^a-zA-Z0-9]/g, "").toLowerCase().trim();
      if (sClean === searchDoc) {
        matched = students[k];
        break;
      }
    }
    if (matched) {
      return respondJSON({ success: true, found: true, student: matched });
    }
    return respondJSON({ success: true, found: false, message: "El documento no se encuentra en el censo oficial de Google Sheets.", totalInSheet: students.length });
  }

  // A.2 LECTURA COMPLETA: Base de Datos de Votantes (Censo)
  if (action === "getVoters" || action === "getCensus") {
    var sheet = findSheet(ss, ["Votantes", "Censo_Estudiantil", "Censo Estudiantil", "Censo", "Estudiantes", "Alumnos", "Sheet1", "Hoja 1"]);
    var rows = sheet.getDataRange().getValues();
    var students = parseVoterRows(rows);
    return respondJSON({ success: true, count: students.length, students: students });
  }

  // B. LECTURA: Base de Datos de Candidatos
  if (action === "getCandidates") {
    var sheet = findSheet(ss, ["Candidatos", "Candidates", "Tarjeton", "Tarjetón", "Aspirantes"]);
    var rows = sheet.getDataRange().getValues();
    var candidates = parseCandidateRows(rows);
    return respondJSON({ success: true, count: candidates.length, candidates: candidates });
  }

  // C. LECTURA: Base de Datos de Jurados
  if (action === "getJurados") {
    var sheet = findSheet(ss, ["Jurados", "Jurados_Votacion", "Mesas", "Jurado"]);
    var rows = sheet.getDataRange().getValues();
    var jurados = parseJuradoRows(rows);
    return respondJSON({ success: true, count: jurados.length, jurados: jurados });
  }

  // D. LECTURA: Base de Datos de Administradores
  if (action === "getAdmins") {
    var sheet = findSheet(ss, ["Administradores", "Admins", "Supervisores", "Admin", "Docentes"]);
    var rows = sheet.getDataRange().getValues();
    var admins = parseAdminRows(rows);
    return respondJSON({ success: true, count: admins.length, admins: admins });
  }

  // E. LECTURA INTEGRAL DE TODAS LAS 4 BASES DE DATOS
  if (action === "getAllData") {
    var vSheet = findSheet(ss, ["Votantes", "Censo_Estudiantil", "Censo Estudiantil", "Censo", "Estudiantes"]);
    var cSheet = findSheet(ss, ["Candidatos", "Candidates", "Tarjeton"]);
    var jSheet = findSheet(ss, ["Jurados", "Jurados_Votacion", "Mesas"]);
    var aSheet = findSheet(ss, ["Administradores", "Admins", "Supervisores"]);

    var vRows = vSheet ? vSheet.getDataRange().getValues() : [];
    var cRows = cSheet ? cSheet.getDataRange().getValues() : [];
    var jRows = jSheet ? jSheet.getDataRange().getValues() : [];
    var aRows = aSheet ? aSheet.getDataRange().getValues() : [];

    var voters = parseVoterRows(vRows);
    var candidates = parseCandidateRows(cRows);
    var jurados = parseJuradoRows(jRows);
    var admins = parseAdminRows(aRows);

    return respondJSON({
      success: true,
      institution: "Colegio Bilingüe Ekirayá",
      counts: {
        voters: voters.length,
        candidates: candidates.length,
        jurados: jurados.length,
        admins: admins.length
      },
      voters: voters,
      candidates: candidates,
      jurados: jurados,
      admins: admins,
      timestamp: new Date().toISOString()
    });
  }

  // Ping de Conectividad
  return respondJSON({
    status: "SUCCESS",
    institution: "Colegio Bilingüe Ekirayá",
    message: "Conexión activa con Google Sheets como Base de Datos Electoral de 4 Módulos",
    timestamp: new Date().toISOString()
  });
}

// -------------------------------------------------------------------------
// 2. ESCRITURA Y REGISTRO EN LA BASE DE DATOS (POST)
// -------------------------------------------------------------------------
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetVotantes = findSheet(ss, ["Votantes", "Censo_Estudiantil", "Censo Estudiantil", "Censo", "Estudiantes"]);
    var sheetCandidatos = findSheet(ss, ["Candidatos", "Candidates", "Tarjeton"]);
    var sheetJurados = findSheet(ss, ["Jurados", "Jurados_Votacion", "Mesas"]);
    var sheetAdmins = findSheet(ss, ["Administradores", "Admins", "Supervisores"]);
    var sheetUrna = ss.getSheetByName("Urna_Cifrada") || ss.insertSheet("Urna_Cifrada");

    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var now = new Date();

    // 1. REGISTRAR: Votantes
    if (data.action === "syncVoters" || data.action === "syncCensus") {
      var students = data.students || data.items || [];
      sheetVotantes.clearContents();
      sheetVotantes.appendRow(["Tipo Doc", "Número Documento", "Nombre Completo", "Grado", "Grupo", "Mesa", "Email", "Ha Votado", "Fecha Voto", "Folio Certificado"]);
      var rows = [];
      students.forEach(function(s) {
        rows.push([
          s.documentType || "TI",
          String(s.documentNumber),
          s.fullName,
          s.grade,
          s.group,
          s.mesaNumber || 1,
          s.email || "",
          s.hasVoted ? true : false,
          s.votedAt || "",
          s.receiptFolio || ""
        ]);
      });
      if (rows.length > 0) {
        sheetVotantes.getRange(2, 1, rows.length, 10).setValues(rows);
      }
      return respondJSON({ status: "SUCCESS", message: "Base de Datos de Votantes registrada con " + rows.length + " estudiantes." });
    }

    // 2. REGISTRAR: Candidatos
    if (data.action === "syncCandidates") {
      var candidates = data.candidates || data.items || [];
      sheetCandidatos.clearContents();
      sheetCandidatos.appendRow(["ID", "Cargo", "Nombre Completo", "Número Tarjetón", "Grado", "Grupo", "Lema de Campaña", "Color Hex", "Foto URL", "Propuestas", "Voto en Blanco"]);
      var rows = [];
      candidates.forEach(function(c) {
        rows.push([
          c.id,
          c.positionId,
          c.fullName,
          c.number || 0,
          c.grade || "",
          c.group || "",
          c.lema || "",
          c.color || "#1e3a8a",
          c.photoUrl || "",
          (c.proposals || []).join(";"),
          c.isBlankVote ? true : false
        ]);
      });
      if (rows.length > 0) {
        sheetCandidatos.getRange(2, 1, rows.length, 11).setValues(rows);
      }
      return respondJSON({ status: "SUCCESS", message: "Base de Datos de Candidatos registrada con " + rows.length + " candidatos." });
    }

    // 3. REGISTRAR: Jurados
    if (data.action === "syncJurados") {
      var jurados = data.jurados || data.items || [];
      sheetJurados.clearContents();
      sheetJurados.appendRow(["ID", "Mesa", "Nombre Completo", "Rol", "PIN de Acceso", "Estado"]);
      var rows = [];
      jurados.forEach(function(j) {
        rows.push([
          j.id,
          j.mesaNumber || 1,
          j.fullName,
          j.role || "PRESIDENTE_MESA",
          j.pin || "jurado2026",
          j.status || "ACTIVO"
        ]);
      });
      if (rows.length > 0) {
        sheetJurados.getRange(2, 1, rows.length, 6).setValues(rows);
      }
      return respondJSON({ status: "SUCCESS", message: "Base de Datos de Jurados registrada con " + rows.length + " jurados." });
    }

    // 4. REGISTRAR: Administradores
    if (data.action === "syncAdmins") {
      var admins = data.admins || data.items || [];
      sheetAdmins.clearContents();
      sheetAdmins.appendRow(["ID", "Nombre Completo", "Usuario", "PIN de Acceso", "Rol", "Estado"]);
      var rows = [];
      admins.forEach(function(a) {
        rows.push([
          a.id,
          a.fullName,
          a.username,
          a.pin || "admin2026",
          a.role || "SUPERADMIN",
          a.status || "ACTIVO"
        ]);
      });
      if (rows.length > 0) {
        sheetAdmins.getRange(2, 1, rows.length, 6).setValues(rows);
      }
      return respondJSON({ status: "SUCCESS", message: "Base de Datos de Administradores registrada con " + rows.length + " administradores." });
    }

    // 5. REGISTRAR TODO (ALL DATA)
    if (data.action === "syncAll") {
      if (data.students) {
        sheetVotantes.clearContents();
        sheetVotantes.appendRow(["Tipo Doc", "Número Documento", "Nombre Completo", "Grado", "Grupo", "Mesa", "Email", "Ha Votado", "Fecha Voto", "Folio Certificado"]);
        var vRows = data.students.map(function(s) {
          return [s.documentType || "TI", String(s.documentNumber), s.fullName, s.grade, s.group, s.mesaNumber || 1, s.email || "", s.hasVoted ? true : false, s.votedAt || "", s.receiptFolio || ""];
        });
        if (vRows.length > 0) sheetVotantes.getRange(2, 1, vRows.length, 10).setValues(vRows);
      }

      if (data.candidates) {
        sheetCandidatos.clearContents();
        sheetCandidatos.appendRow(["ID", "Cargo", "Nombre Completo", "Número Tarjetón", "Grado", "Grupo", "Lema de Campaña", "Color Hex", "Foto URL", "Propuestas", "Voto en Blanco"]);
        var cRows = data.candidates.map(function(c) {
          return [c.id, c.positionId, c.fullName, c.number || 0, c.grade || "", c.group || "", c.lema || "", c.color || "#1e3a8a", c.photoUrl || "", (c.proposals || []).join(";"), c.isBlankVote ? true : false];
        });
        if (cRows.length > 0) sheetCandidatos.getRange(2, 1, cRows.length, 11).setValues(cRows);
      }

      if (data.jurados) {
        sheetJurados.clearContents();
        sheetJurados.appendRow(["ID", "Mesa", "Nombre Completo", "Rol", "PIN de Acceso", "Estado"]);
        var jRows = data.jurados.map(function(j) {
          return [j.id, j.mesaNumber || 1, j.fullName, j.role || "PRESIDENTE_MESA", j.pin || "jurado2026", j.status || "ACTIVO"];
        });
        if (jRows.length > 0) sheetJurados.getRange(2, 1, jRows.length, 6).setValues(jRows);
      }

      if (data.admins) {
        sheetAdmins.clearContents();
        sheetAdmins.appendRow(["ID", "Nombre Completo", "Usuario", "PIN de Acceso", "Rol", "Estado"]);
        var aRows = data.admins.map(function(a) {
          return [a.id, a.fullName, a.username, a.pin || "admin2026", a.role || "SUPERADMIN", a.status || "ACTIVO"];
        });
        if (aRows.length > 0) sheetAdmins.getRange(2, 1, aRows.length, 6).setValues(aRows);
      }

      return respondJSON({
        status: "SUCCESS",
        message: "Las 4 Bases de Datos fueron registradas y sincronizadas con éxito en Google Sheets."
      });
    }

    // 5.1 REGISTRAR RESULTADOS Y ESCRUTINIO EN HOJA DEDICADA
    if (data.action === "syncResults" || data.action === "recordResults") {
      var sheetRes = ss.getSheetByName("Resultados_Electorales") || ss.insertSheet("Resultados_Electorales");
      sheetRes.clearContents();

      sheetRes.appendRow(["ELECCIONES GOBIERNO ESCOLAR - COLEGIO EKIRAYÁ CEM"]);
      sheetRes.appendRow(["Fecha y Hora de Escrutinio:", data.timestamp || now.toISOString(), "DANE:", data.daneCode || "311001099881", "Año Lectivo:", data.academicYear || "2026"]);
      if (data.summary) {
        sheetRes.appendRow(["Censo Total:", data.summary.totalCenso, "Sufragantes:", data.summary.totalVotaron, "Participación:", data.summary.participacionPct, "Mesas:", data.summary.totalMesas]);
      }
      sheetRes.appendRow([]); // Separador

      sheetRes.appendRow(["Cargo Electoral", "Tarjetón", "Candidato", "Grado", "Votos Obtenidos", "% Porcentaje", "Declaratoria Oficial"]);
      var resRows = [];
      var resultsList = data.results || [];
      resultsList.forEach(function(posItem) {
        var cList = posItem.candidates || [];
        cList.forEach(function(cand, idx) {
          var status = (idx === 0 && cand.voteCount > 0) ? (cand.isBlankVote ? "MAYORÍA EN BLANCO" : "ELECTO(A)") : "NO ELECTO";
          resRows.push([
            posItem.positionTitle || posItem.positionId,
            cand.number || 0,
            cand.fullName,
            cand.grade || "",
            cand.voteCount || 0,
            (cand.percent || 0) + "%",
            status
          ]);
        });
      });

      if (resRows.length > 0) {
        sheetRes.getRange(6, 1, resRows.length, 7).setValues(resRows);
      }

      return respondJSON({
        status: "SUCCESS",
        message: "Resultados oficiales y escrutinio registrados con éxito en la pestaña 'Resultados_Electorales' de Google Sheets.",
        rowsCount: resRows.length
      });
    }

    // 6. DEPÓSITO DE VOTO CON CONTROL DE CONCURRENCIA MULTIEQUIPOS
    if (data.action === "castVote" || data.voteToken) {
      if (sheetUrna.getLastRow() === 0) {
        sheetUrna.appendRow(["Fecha y Hora", "Cargo", "Candidato ID", "Mesa", "Token Voto Cifrado", "Hash SHA-256"]);
      }
      
      var votesList = Array.isArray(data.votes) && data.votes.length > 0 ? data.votes : [data];
      var voteRows = [];
      votesList.forEach(function(v) {
        voteRows.push([
          v.timestamp || now.toISOString(),
          v.positionId || "N/A",
          v.candidateId || "N/A",
          v.mesaNumber || data.mesaNumber || 1,
          v.voteToken || ("TOK-" + now.getTime()),
          v.hash || "SHA256-PENDING"
        ]);
      });
      if (voteRows.length > 0) {
        sheetUrna.getRange(sheetUrna.getLastRow() + 1, 1, voteRows.length, 6).setValues(voteRows);
      }

      if (data.studentDoc) {
        var cleanTarget = String(data.studentDoc).replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
        var cData = sheetVotantes.getDataRange().getValues();
        for (var r = 1; r < cData.length; r++) {
          var matchedRow = false;
          for (var c = 0; c < Math.min(3, cData[r].length); c++) {
            var cellClean = String(cData[r][c]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
            if (cellClean === cleanTarget) {
              matchedRow = true;
              break;
            }
          }
          if (matchedRow) {
            sheetVotantes.getRange(r + 1, 8).setValue(true);
            sheetVotantes.getRange(r + 1, 9).setValue(now.toISOString());
            if (data.folioNumber) sheetVotantes.getRange(r + 1, 10).setValue(data.folioNumber);
            break;
          }
        }
      }

      return respondJSON({ status: "SUCCESS", message: "Votos registrados en Urna_Cifrada de Google Sheets." });
    }

    return respondJSON({ status: "SUCCESS", message: "Operación procesada en Google Sheets." });
  } catch (err) {
    return respondJSON({ status: "ERROR", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function respondJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  return (
    <div className="space-y-6">

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveSubTab('sheets')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeSubTab === 'sheets'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>1. Conexión Google Sheets (BD)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('github')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeSubTab === 'github'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
          }`}
        >
          <Github className="w-4 h-4" />
          <span>2. Publicar en GitHub</span>
        </button>

        <button
          onClick={() => setActiveSubTab('vercel')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeSubTab === 'vercel'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>3. Desplegar en Vercel</span>
        </button>

        <button
          onClick={() => setActiveSubTab('supabase')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeSubTab === 'supabase'
              ? 'bg-purple-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>4. Supabase Vault (Opcional)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. TAB: GOOGLE SHEETS COMO BASE DE DATOS (LECTURA Y ESCRITURA) */}
      {/* ========================================================================= */}
      {activeSubTab === 'sheets' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Multi-computer & Cloud Backup Live Indicator Banner */}
          <div className="p-4 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm border border-purple-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl border border-white/10 shrink-0">
                <Laptop className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold">Red Multicomputador y Respaldo Continuo en la Nube</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-emerald-950">
                    SINCRONIZACIÓN EN VIVO
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {connectedComputersCount} {connectedComputersCount === 1 ? 'computador conectado' : 'computadores conectados'} transmitiendo en tiempo real y registrando simultáneamente en la misma hoja central con control de concurrencia.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsMultiDeviceModalOpen(true)}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Laptop className="w-3.5 h-3.5 text-purple-200" />
                Ver Equipos ({connectedComputersCount})
              </button>
              <button
                type="button"
                onClick={() => setIsCloudBackupModalOpen(true)}
                className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Cloud className="w-3.5 h-3.5 text-slate-950" />
                Panel Nube y Sheets
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Base de Datos en Tiempo Real
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">• Lectura (GET) y Escritura (POST)</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    Google Sheets como Servidor de Base de Datos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Permite leer el censo oficial de estudiantes del Colegio Ekirayá y escribir cada voto de forma anónima y blindada.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => setIsUnifiedModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-purple-200" />
                  <span>⚡ Abrir Importador de 4 Bases</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Todo'}</span>
                </button>
              </div>
            </div>

            {syncSuccessMsg && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncSuccessMsg}</span>
              </div>
            )}

            {/* Config Form */}
            <form onSubmit={handleSaveSheetsConfig} className="space-y-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800">
                      URL de la Aplicación Web (Google Apps Script Webhook)
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Fija en todos los dispositivos
                    </span>
                  </div>
                  <input
                    type="url"
                    value={scriptUrl}
                    onChange={e => setScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    URL oficial configurada para todo el censo. Al abrir la app en cualquier otro computador o dispositivo, cargará de una vez sincronizada con esta hoja central.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    ID de la Hoja de Google Sheets
                  </label>
                  <input
                    type="text"
                    value={sheetId}
                    onChange={e => setSheetId(e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Se encuentra en la URL de su hoja entre <code className="bg-slate-200 px-1 rounded">/d/</code> y <code className="bg-slate-200 px-1 rounded">/edit</code>.
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={e => setAutoSync(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Escritura automática instantánea en Google Sheets con cada sufragio</span>
                </label>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-colors shadow-xs"
                >
                  Guardar Configuración
                </button>
              </div>
            </form>

            {/* 4 DATABASES VERIFICATION STATION */}
            <div className="mt-6 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                      <Database className="w-4 h-4" />
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      Tablero de Verificación: 4 Bases de Datos en Google Sheets
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comprueba en tiempo real que el sistema <strong>lee (GET)</strong> y <strong>registra (POST)</strong> cada una de las 4 entidades requeridas.
                  </p>
                </div>

                {/* Master Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleVerifyRead('all')}
                    disabled={loadingTable !== null}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loadingTable === 'read-all' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-emerald-700" />
                    )}
                    <span>Leer Todo (GET 4 BDs)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerifyWrite('all')}
                    disabled={loadingTable !== null}
                    className="px-3 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {loadingTable === 'write-all' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>Registrar Todo (POST 4 BDs)</span>
                  </button>
                </div>
              </div>

              {/* 4 Interactive Verification Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. VOTANTES */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 rounded-md bg-blue-100 text-blue-800">
                          <Users className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-bold text-xs text-slate-800">1. Votantes</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {students.length} reg
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mb-2">
                      Censo estudiantil: sufragantes, grado, grupo, mesa y estado de voto.
                    </p>

                    <div className="text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 mb-3 space-y-1">
                      <div className="flex justify-between">
                        <span>Han votado:</span>
                        <strong className="text-emerald-600">{students.filter(s => s.hasVoted).length}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Pendientes:</span>
                        <strong className="text-slate-700">{students.filter(s => !s.hasVoted).length}</strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-medium text-slate-500 mb-2 truncate">
                      {verificationFeedback.voters?.status === 'success' && (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 inline" /> {verificationFeedback.voters.message}
                        </span>
                      )}
                      {verificationFeedback.voters?.status === 'error' && (
                        <span className="text-rose-700 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 inline" /> {verificationFeedback.voters.message}
                        </span>
                      )}
                      {verificationFeedback.voters?.status === 'idle' && (
                        <span>Listo para verificar</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleVerifyRead('voters')}
                        disabled={loadingTable !== null}
                        className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 font-bold text-[11px] text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {loadingTable === 'read-voters' ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-slate-700" />
                        ) : (
                          <Play className="w-3 h-3 text-emerald-600" />
                        )}
                        <span>Leer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVerifyWrite('voters')}
                        disabled={loadingTable !== null}
                        className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {loadingTable === 'write-voters' ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-white" />
                        ) : (
                          <Send className="w-3 h-3 text-white" />
                        )}
                        <span>Registrar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. CANDIDATOS */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 rounded-md bg-purple-100 text-purple-800">
                          <Award className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-bold text-xs text-slate-800">2. Candidatos</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        {candidates.length} reg
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mb-2">
                      Tarjetón electoral: cargos (Personero, Contralor), número, propuestas y lema.
                    </p>

                    <div className="text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 mb-3 space-y-1">
                      <div className="flex justify-between">
                        <span>Postulados:</span>
                        <strong className="text-purple-700">{candidates.filter(c => !c.isBlankVote).length}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Votos en blanco:</span>
                        <strong className="text-slate-700">{candidates.filter(c => c.isBlankVote).length}</strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-medium text-slate-500 mb-2 truncate">
                      {verificationFeedback.candidates?.status === 'success' && (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 inline" /> {verificationFeedback.candidates.message}
                        </span>
                      )}
                      {verificationFeedback.candidates?.status === 'error' && (
                        <span className="text-rose-700 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 inline" /> {verificationFeedback.candidates.message}
                        </span>
                      )}
                      {verificationFeedback.candidates?.status === 'idle' && (
                        <span>Listo para verificar</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleVerifyRead('candidates')}
                        disabled={loadingTable !== null}
                        className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 font-bold text-[11px] text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {loadingTable === 'read-candidates' ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-slate-700" />
                        ) : (
                          <Play className="w-3 h-3 text-purple-600" />
                        )}
                        <span>Leer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVerifyWrite('candidates')}
                        disabled={loadingTable !== null}
                        className="py-1.5 px-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {loadingTable === 'write-candidates' ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-white" />
                        ) : (
                          <Send className="w-3 h-3 text-white" />
                        )}
                        <span>Registrar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. JURADOS */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 rounded-md bg-amber-100 text-amber-800">
                          <UserCheck className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-bold text-xs text-slate-800">3. Jurados</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {jurados.length} reg
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mb-2">
                      Acreditación de mesas: nombres, mesa asignada, PIN de acceso y rol.
                    </p>

                    <div className="text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 mb-3 space-y-1">
                      <div className="flex justify-between">
                        <span>Activos:</span>
                        <strong className="text-amber-700">{jurados.filter(j => j.status === 'ACTIVO').length}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Mesas cubiertas:</span>
                        <strong className="text-slate-700">{new Set(jurados.map(j => j.mesaNumber)).size}</strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-medium text-slate-500 mb-2 truncate">
                      {verificationFeedback.jurados?.status === 'success' && (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 inline" /> {verificationFeedback.jurados.message}
                        </span>
                      )}
                      {verificationFeedback.jurados?.status === 'error' && (
                        <span className="text-rose-700 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 inline" /> {verificationFeedback.jurados.message}
                        </span>
                      )}
                      {verificationFeedback.jurados?.status === 'idle' && (
                        <span>Listo para verificar</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleVerifyRead('jurados')}
                        disabled={loadingTable !== null}
                        className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 font-bold text-[11px] text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {loadingTable === 'read-jurados' ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-slate-700" />
                        ) : (
                          <Play className="w-3 h-3 text-amber-600" />
                        )}
                        <span>Leer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVerifyWrite('jurados')}
                        disabled={loadingTable !== null}
                        className="py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {loadingTable === 'write-jurados' ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-white" />
                        ) : (
                          <Send className="w-3 h-3 text-white" />
                        )}
                        <span>Registrar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. ADMINISTRADORES */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 rounded-md bg-indigo-100 text-indigo-800">
                          <Shield className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-bold text-xs text-slate-800">4. Administradores</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        {admins.length} reg
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mb-2">
                      Supervisión electoral: usuario de ingreso, PIN de seguridad y rol directivo.
                    </p>

                    <div className="text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 mb-3 space-y-1">
                      <div className="flex justify-between">
                        <span>Superadmins:</span>
                        <strong className="text-indigo-700">{admins.filter(a => a.role === 'SUPER_ADMIN').length}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Estado:</span>
                        <strong className="text-emerald-600">Habilitados</strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-medium text-slate-500 mb-2 truncate">
                      {verificationFeedback.admins?.status === 'success' && (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 inline" /> {verificationFeedback.admins.message}
                        </span>
                      )}
                      {verificationFeedback.admins?.status === 'error' && (
                        <span className="text-rose-700 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 inline" /> {verificationFeedback.admins.message}
                        </span>
                      )}
                      {verificationFeedback.admins?.status === 'idle' && (
                        <span>Listo para verificar</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleVerifyRead('admins')}
                        disabled={loadingTable !== null}
                        className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 font-bold text-[11px] text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {loadingTable === 'read-admins' ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-slate-700" />
                        ) : (
                          <Play className="w-3 h-3 text-indigo-600" />
                        )}
                        <span>Leer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVerifyWrite('admins')}
                        disabled={loadingTable !== null}
                        className="py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {loadingTable === 'write-admins' ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-white" />
                        ) : (
                          <Send className="w-3 h-3 text-white" />
                        )}
                        <span>Registrar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Output Console */}
              {testResult && (
                <div className={`p-3.5 rounded-xl text-xs font-mono border ${
                  testResult.status === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : testResult.status === 'loading'
                    ? 'bg-slate-50 border-slate-200 text-slate-700 animate-pulse'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {testResult.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {testResult.status === 'loading' && <RefreshCw className="w-4 h-4 animate-spin text-slate-600 shrink-0" />}
                    {testResult.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.details && (
                    <pre className="mt-2 p-2.5 bg-black/5 rounded-lg text-[10px] overflow-x-auto max-h-36">
                      {testResult.details}
                    </pre>
                  )}
                </div>
              )}

              {/* Live Data Inspector: Compare local database with Sheets */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Inspector de Datos en Vivo (Memoria del Sistema):
                    </span>
                  </div>

                  {/* Inspector Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setActiveInspectorTable('voters')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                        activeInspectorTable === 'voters'
                          ? 'bg-white text-blue-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Votantes ({students.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveInspectorTable('candidates')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                        activeInspectorTable === 'candidates'
                          ? 'bg-white text-purple-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Candidatos ({candidates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveInspectorTable('jurados')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                        activeInspectorTable === 'jurados'
                          ? 'bg-white text-amber-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Jurados ({jurados.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveInspectorTable('admins')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                        activeInspectorTable === 'admins'
                          ? 'bg-white text-indigo-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Admins ({admins.length})
                    </button>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-48 text-[11px]">
                  {activeInspectorTable === 'voters' && (
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="p-2">Doc</th>
                          <th className="p-2">Nombre</th>
                          <th className="p-2">Grado/Grupo</th>
                          <th className="p-2">Mesa</th>
                          <th className="p-2">Estado</th>
                          <th className="p-2">Folio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {students.slice(0, 10).map(s => (
                          <tr key={s.documentNumber} className="hover:bg-slate-50">
                            <td className="p-2">{s.documentType} {s.documentNumber}</td>
                            <td className="p-2 font-sans font-medium">{s.fullName}</td>
                            <td className="p-2">{s.grade} - {s.group}</td>
                            <td className="p-2">Mesa {s.mesaNumber}</td>
                            <td className="p-2">
                              {s.hasVoted ? (
                                <span className="text-emerald-700 font-bold">VOTÓ</span>
                              ) : (
                                <span className="text-slate-500">PENDIENTE</span>
                              )}
                            </td>
                            <td className="p-2 text-slate-500">{s.receiptFolio || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeInspectorTable === 'candidates' && (
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="p-2">Cargo</th>
                          <th className="p-2">N° Tarjetón</th>
                          <th className="p-2">Nombre Completo</th>
                          <th className="p-2">Lema de Campaña</th>
                          <th className="p-2">Propuestas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {candidates.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="p-2 font-mono text-purple-800 font-bold uppercase">{c.positionId}</td>
                            <td className="p-2 font-mono font-bold text-center">{c.number}</td>
                            <td className="p-2 font-medium">{c.fullName}</td>
                            <td className="p-2 italic text-slate-600">{c.slogan || '—'}</td>
                            <td className="p-2 text-slate-500">{c.proposals?.length || 0} propuestas</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeInspectorTable === 'jurados' && (
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="p-2">Mesa Asignada</th>
                          <th className="p-2">Nombre Jurado</th>
                          <th className="p-2">Rol Electoral</th>
                          <th className="p-2">PIN Acceso</th>
                          <th className="p-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {jurados.map(j => (
                          <tr key={j.id} className="hover:bg-slate-50 font-mono">
                            <td className="p-2 font-bold text-amber-800">Mesa {j.mesaNumber}</td>
                            <td className="p-2 font-sans font-medium">{j.fullName}</td>
                            <td className="p-2">{j.role}</td>
                            <td className="p-2 text-slate-500">{j.pin}</td>
                            <td className="p-2">
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                {j.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeInspectorTable === 'admins' && (
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="p-2">Nombre Completo</th>
                          <th className="p-2">Usuario</th>
                          <th className="p-2">PIN Acceso</th>
                          <th className="p-2">Rol Asignado</th>
                          <th className="p-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {admins.map(a => (
                          <tr key={a.id} className="hover:bg-slate-50 font-mono">
                            <td className="p-2 font-sans font-medium">{a.fullName}</td>
                            <td className="p-2 font-bold text-indigo-900">{a.username}</td>
                            <td className="p-2 text-slate-500">{a.pin}</td>
                            <td className="p-2 text-slate-700">{a.role}</td>
                            <td className="p-2">
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Guide Step-by-Step for Google Sheets */}
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Paso a Paso para configurar su Hoja de Google Sheets:</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-[11px] mb-1.5">1</span>
                  <p className="font-bold text-slate-800 mb-1">Crear Hoja</p>
                  <p className="text-[11px] text-slate-500">
                    Abra Google Drive y cree una hoja de cálculo en blanco llamada <strong>"Ekirayá Votaciones 2026"</strong>.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-[11px] mb-1.5">2</span>
                  <p className="font-bold text-slate-800 mb-1">Abrir Apps Script</p>
                  <p className="text-[11px] text-slate-500">
                    Haga clic en el menú <strong>Extensiones &gt; Apps Script</strong>. Borre el código de ejemplo.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-[11px] mb-1.5">3</span>
                  <p className="font-bold text-slate-800 mb-1">Pegar el Código</p>
                  <p className="text-[11px] text-slate-500">
                    Copie el código del recuadro inferior, péguelo en el editor y guarde (Ctrl+S).
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-[11px] mb-1.5">4</span>
                  <p className="font-bold text-slate-800 mb-1">Implementar Web App</p>
                  <p className="text-[11px] text-slate-500">
                    <strong>Implementar &gt; Nueva implementación</strong>. Tipo: "Aplicación Web". Acceso: <strong>"Cualquiera" (Anyone)</strong>. Copie la URL.
                  </p>
                </div>
              </div>

              {/* Code Box */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-emerald-600" />
                    <span>Código Completo de Google Apps Script (Lectura y Escritura):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(GOOGLE_APPS_SCRIPT_CODE, 'gas')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    {copiedSection === 'gas' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'gas' ? '¡Código Copiado!' : 'Copiar Código Apps Script'}</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-64 border border-slate-800">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB: PUBLICACIÓN EN GITHUB */}
      {/* ========================================================================= */}
      {activeSubTab === 'github' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-md shrink-0">
                <Github className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  Control de Versiones & Código Fuente
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Cómo Publicar el Proyecto en GitHub
                </h3>
                <p className="text-xs text-slate-500">
                  Guarde el código en un repositorio de GitHub para conectar con Vercel y tener despliegues automáticos.
                </p>
              </div>
            </div>

            {/* Step by step */}
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white inline-flex items-center justify-center text-[10px]">1</span>
                    Descargar el código o Clonar desde AI Studio
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-2">
                  Puede descargar el proyecto en formato ZIP desde el menú superior de AI Studio (ícono de tres puntos o rueda de ajustes &gt; Exportar a ZIP / Export to GitHub), o utilizar la terminal local en su equipo.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white inline-flex items-center justify-center text-[10px]">2</span>
                    Crear Repositorio en GitHub
                  </span>
                  <a
                    href="https://github.com/new"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:underline"
                  >
                    <span>Ir a GitHub &gt; New Repository</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Cree un nuevo repositorio (por ejemplo: <strong className="font-mono text-slate-800">ekiraya-sistema-votacion</strong>). Déjelo en <em>Public</em> o <em>Private</em> sin inicializar README (ya viene incluido).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-purple-300 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Comandos de Consola para Subir el Código:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`git init
git add .
git commit -m "Sistema de Votación estudiantil colegio Ekirayá"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/ekiraya-sistema-votacion.git
git push -u origin main`, 'git-commands')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    {copiedSection === 'git-commands' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'git-commands' ? 'Comandos Copiados' : 'Copiar Comandos'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-black/50 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
{`# 1. En la carpeta del proyecto:
git init
git add .
git commit -m "Sistema de Votación estudiantil colegio Ekirayá"

# 2. Conectar con su repositorio de GitHub:
git branch -M main
git remote add origin https://github.com/TU_USUARIO/ekiraya-sistema-votacion.git

# 3. Subir el proyecto:
git push -u origin main`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: DESPLIEGUE EN VERCEL */}
      {/* ========================================================================= */}
      {activeSubTab === 'vercel' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center font-black shadow-md shrink-0">
                <Zap className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Despliegue en la Nube con SSL Gratuito
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Cómo Desplegar en Vercel
                </h3>
                <p className="text-xs text-slate-500">
                  Vercel compila y publica su aplicación con alta velocidad, certificado HTTPS automático y soporte para React + Vite.
                </p>
              </div>
            </div>

            {/* Vercel Configuration badge */}
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 mb-6 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-black text-emerald-950 text-sm">
                  Archivo de Configuración vercel.json Listo en el Repositorio
                </p>
                <p className="text-emerald-800 mt-1 leading-relaxed">
                  Ya creamos e incluimos el archivo <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-mono font-bold">vercel.json</code> con la regla de redirección SPA hacia <code className="font-mono">/index.html</code>. Esto garantiza que al recargar la página en cualquier ruta no aparezcan errores 404.
                </p>
              </div>
            </div>

            {/* 4 Steps for Vercel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                  <span className="w-6 h-6 rounded-full bg-purple-700 text-white inline-flex items-center justify-center text-xs">1</span>
                  <span>Iniciar sesión en Vercel</span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-3">
                  Ingrese a <a href="https://vercel.com/login" target="_blank" rel="noreferrer" className="text-purple-700 font-bold underline">vercel.com</a> e inicie sesión directamente con su cuenta de <strong>GitHub</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                  <span className="w-6 h-6 rounded-full bg-purple-700 text-white inline-flex items-center justify-center text-xs">2</span>
                  <span>Importar el Repositorio</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Haga clic en el botón <strong>"Add New..." &gt; "Project"</strong>. En la lista de repositorios, busque y seleccione <strong>ekiraya-sistema-votacion</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                  <span className="w-6 h-6 rounded-full bg-purple-700 text-white inline-flex items-center justify-center text-xs">3</span>
                  <span>Verificar Configuración del Build</span>
                </div>
                <ul className="text-slate-600 space-y-1 font-mono text-[11px]">
                  <li>• Framework Preset: <strong>Vite</strong></li>
                  <li>• Root Directory: <strong>./</strong></li>
                  <li>• Build Command: <strong>npm run build</strong></li>
                  <li>• Output Directory: <strong>dist</strong></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                  <span className="w-6 h-6 rounded-full bg-purple-700 text-white inline-flex items-center justify-center text-xs">4</span>
                  <span>Hacer Clic en "Deploy"</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  En aproximadamente 40 segundos, Vercel le entregará una URL de producción (por ejemplo: <strong className="font-mono text-purple-700">https://ekiraya-votacion.vercel.app</strong>).
                </p>
              </div>
            </div>

            {/* vercel.json preview */}
            <div className="mt-5 p-4 rounded-xl bg-slate-900 text-white border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Contenido del archivo vercel.json configurado en su proyecto:</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}`, 'vercel-json')}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  {copiedSection === 'vercel-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSection === 'vercel-json' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <pre className="p-3 bg-black/50 text-emerald-400 rounded-lg font-mono text-[11px]">
{`{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB: SUPABASE (OPCIONAL) */}
      {/* ========================================================================= */}
      {activeSubTab === 'supabase' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center font-black shadow-md shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                  Persistencia Relacional
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Conexión Supabase (PostgreSQL Vault)
                </h3>
                <p className="text-xs text-slate-500">
                  Base de datos relacional opcional para escalabilidad masiva y soporte multi-sede.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={supaUrl}
                    onChange={e => setSupaUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Supabase Anon / Public Key
                  </label>
                  <input
                    type="password"
                    value={supaKey}
                    onChange={e => setSupaKey(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-colors"
                >
                  Guardar Credenciales Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Import Hub Modal */}
      <UnifiedSheetsImportModal
        isOpen={isUnifiedModalOpen}
        onClose={() => setIsUnifiedModalOpen(false)}
      />

    </div>
  );
};
