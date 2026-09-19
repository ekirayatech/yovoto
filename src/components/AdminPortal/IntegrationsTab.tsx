import {
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Copy,
  Database,
  ExternalLink,
  FileSpreadsheet,
  Github,
  Globe,
  HelpCircle,
  Key,
  Layers,
  Lock,
  Play,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  Terminal,
  UploadCloud,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import {
  diagnoseScriptUrl,
  normalizeScriptUrl,
  readCensusFromSheets,
  writeVoteToSheets
} from '../../utils/googleSheetsService';

export const IntegrationsTab: React.FC = () => {
  const { config, updateInstitutionConfig, syncWithGoogleSheets, votes, students } = useElection();
  const [activeSubTab, setActiveSubTab] = useState<'sheets' | 'github' | 'vercel' | 'supabase'>('sheets');

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Google Sheets Local Form
  const [scriptUrl, setScriptUrl] = useState<string>(config.googleSheets.scriptUrl);
  const [sheetId, setSheetId] = useState<string>(config.googleSheets.sheetId);
  const [autoSync, setAutoSync] = useState<boolean>(config.googleSheets.autoSync);

  // Interactive Testing state
  const [testResult, setTestResult] = useState<{
    type: 'read' | 'write';
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

  // Test Real GET (Reading from Google Sheets)
  const handleTestReadSheets = async () => {
    const diag = diagnoseScriptUrl(scriptUrl);
    if (!diag.valid) {
      alert(diag.warning || 'Por favor ingrese la URL del Webhook de Google Apps Script primero.');
      return;
    }

    setTestResult({
      type: 'read',
      status: 'loading',
      message: 'Consultando base de datos en Google Sheets (GET)...'
    });

    try {
      const res = await readCensusFromSheets(scriptUrl);
      if (res.success) {
        setTestResult({
          type: 'read',
          status: 'success',
          message: res.message,
          details: res.data ? JSON.stringify(res.data, null, 2) : res.details
        });
      } else {
        throw new Error(res.message || 'Error al conectar');
      }
    } catch (err: any) {
      setTestResult({
        type: 'read',
        status: 'error',
        message: err.message || 'No se pudo leer desde el Webhook de Google Sheets.',
        details: 'Asegúrese de que el Apps Script esté implementado como Aplicación Web, con acceso para "Cualquiera" (Anyone).'
      });
    }
  };

  // Test Real POST (Writing to Google Sheets)
  const handleTestWriteSheets = async () => {
    const diag = diagnoseScriptUrl(scriptUrl);
    if (!diag.valid) {
      alert(diag.warning || 'Por favor ingrese la URL del Webhook de Google Apps Script primero.');
      return;
    }

    setTestResult({
      type: 'write',
      status: 'loading',
      message: 'Transmitiendo paquete de prueba a Google Sheets (POST)...'
    });

    try {
      const testPayload = {
        action: 'castVote' as const,
        voteToken: `TEST-${Date.now()}`,
        positionId: 'personero',
        candidateId: 'test-cand',
        mesaNumber: 1,
        studentDoc: 'TEST-001',
        hash: 'sha256-test-hash-ekiraya',
        timestamp: new Date().toISOString()
      };

      const res = await writeVoteToSheets(scriptUrl, testPayload);
      if (res.success) {
        setTestResult({
          type: 'write',
          status: 'success',
          message: res.message,
          details: res.data ? JSON.stringify(res.data, null, 2) : res.details
        });
      } else {
        throw new Error(res.message || 'Error al escribir');
      }
    } catch (err: any) {
      setTestResult({
        type: 'write',
        status: 'error',
        message: err.message || 'No se pudo escribir en el Webhook de Google Sheets.',
        details: 'Verifique que la URL termine en /exec y que los permisos permitan peticiones de "Cualquiera".'
      });
    }
  };

  // Complete Google Apps Script supporting both Reading (doGet) and Writing (doPost)
  const GOOGLE_APPS_SCRIPT_CODE = `/**
 * SISTEMA DE VOTACIÓN ESTUDIANTIL COLEGIO EKIRAYÁ
 * Conector de Base de Datos Bidireccional (Lectura y Escritura) en Google Sheets
 * 
 * INSTRUCCIONES:
 * 1. Cree una hoja de cálculo en Google Sheets (ej: "BD Electoral Ekiraya 2026").
 * 2. Vaya a: Extensiones > Apps Script.
 * 3. Reemplace todo el contenido con este código.
 * 4. Haga clic en: Implementar > Nueva implementación.
 * 5. Tipo: "Aplicación web".
 * 6. Ejecutar como: "Yo" (su correo de Google).
 * 7. Quién tiene acceso: "Cualquiera" (Anyone - Muy importante para permitir peticiones).
 * 8. Copie la URL de la aplicación web y péguela en el sistema electoral.
 */

// 1. LECTURA DESDE LA BASE DE DATOS (GET)
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "health";
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "getCensus") {
    // Lee la hoja Censo_Estudiantil y la entrega en formato JSON
    var sheet = ss.getSheetByName("Censo_Estudiantil") || ss.insertSheet("Censo_Estudiantil");
    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return respondJSON({ success: true, count: 0, students: [] });
    }
    var headers = rows[0];
    var students = [];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      students.push({
        documentType: row[0] || "TI",
        documentNumber: String(row[1]),
        fullName: row[2],
        grade: row[3],
        group: row[4],
        mesaNumber: Number(row[5]) || 1,
        email: row[6] || "",
        hasVoted: row[7] === true || String(row[7]).toUpperCase() === "SI" || String(row[7]).toUpperCase() === "TRUE"
      });
    }
    return respondJSON({ success: true, count: students.length, students: students });
  }

  if (action === "getVotes") {
    // Lee la Urna Cifrada (para auditoría y balance)
    var sheetVotes = ss.getSheetByName("Urna_Cifrada") || ss.insertSheet("Urna_Cifrada");
    var voteRows = sheetVotes.getDataRange().getValues();
    return respondJSON({
      success: true,
      totalVotes: Math.max(0, voteRows.length - 1),
      lastUpdated: new Date().toISOString()
    });
  }

  // Ping de salud por defecto
  return respondJSON({
    status: "SUCCESS",
    institution: "Colegio Bilingüe Ekirayá",
    message: "Conexión activa con Google Sheets como Base de Datos Electoral",
    timestamp: new Date().toISOString()
  });
}

// 2. ESCRITURA EN LA BASE DE DATOS (POST)
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Esperar hasta 15 segundos para asegurar concurrencia sin choques
  lock.tryLock(15000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetVotos = ss.getSheetByName("Urna_Cifrada") || ss.insertSheet("Urna_Cifrada");
    var sheetCenso = ss.getSheetByName("Censo_Estudiantil") || ss.insertSheet("Censo_Estudiantil");
    var sheetAudit = ss.getSheetByName("Auditoria_Logs") || ss.insertSheet("Auditoria_Logs");

    // Inicializar encabezados si las hojas están vacías
    if (sheetVotos.getLastRow() === 0) {
      sheetVotos.appendRow(["Fecha y Hora", "Cargo", "Candidato ID", "Mesa", "Token Voto Cifrado", "Hash SHA-256"]);
    }
    if (sheetCenso.getLastRow() === 0) {
      sheetCenso.appendRow(["Tipo Doc", "Número Documento", "Nombre Completo", "Grado", "Grupo", "Mesa", "Email", "Ha Votado", "Fecha Voto", "Folio Certificado"]);
    }

    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var now = new Date();

    // A. Registrar Voto Cifrado (Urna)
    if (data.action === "castVote" || data.voteToken) {
      sheetVotos.appendRow([
        now,
        data.positionId || "N/A",
        data.candidateId || "N/A",
        data.mesaNumber || 1,
        data.voteToken || ("TOK-" + now.getTime()),
        data.hash || "SHA256-PENDING"
      ]);

      // Si se envía documento del estudiante, marcarlo como sufragado en Censo_Estudiantil
      if (data.studentDoc) {
        var censoData = sheetCenso.getDataRange().getValues();
        for (var r = 1; r < censoData.length; r++) {
          if (String(censoData[r][1]) === String(data.studentDoc)) {
            sheetCenso.getRange(r + 1, 8).setValue(true); // Ha Votado = true
            sheetCenso.getRange(r + 1, 9).setValue(now.toISOString()); // Fecha
            if (data.folioNumber) {
              sheetCenso.getRange(r + 1, 10).setValue(data.folioNumber);
            }
            break;
          }
        }
      }

      return respondJSON({
        status: "SUCCESS",
        message: "Voto registrado y censo actualizado en Google Sheets",
        timestamp: now.toISOString()
      });
    }

    // B. Cargar o Actualizar Censo Masivo
    if (data.action === "syncCensus" && Array.isArray(data.students)) {
      sheetCenso.clearContents();
      sheetCenso.appendRow(["Tipo Doc", "Número Documento", "Nombre Completo", "Grado", "Grupo", "Mesa", "Email", "Ha Votado", "Fecha Voto", "Folio Certificado"]);
      var batch = [];
      data.students.forEach(function(s) {
        batch.push([
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
      if (batch.length > 0) {
        sheetCenso.getRange(2, 1, batch.length, 10).setValues(batch);
      }
      return respondJSON({
        status: "SUCCESS",
        message: "Censo de " + batch.length + " estudiantes sincronizado en Sheets"
      });
    }

    return respondJSON({ status: "SUCCESS", message: "Operación completada" });

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

              <div className="flex items-center gap-2 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="w-full lg:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Todo con Sheets'}</span>
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
                  <label className="block font-bold text-slate-800 mb-1">
                    URL de la Aplicación Web (Google Apps Script Webhook)
                  </label>
                  <input
                    type="url"
                    value={scriptUrl}
                    onChange={e => setScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    URL obtenida al hacer "Nueva implementación" tipo "Aplicación web" con acceso "Cualquiera".
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

            {/* Test Interactive Buttons */}
            <div className="mt-5 p-4 rounded-xl bg-white border border-slate-200">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-3">
                Pruebas de Conexión en Vivo (Lectura y Escritura):
              </span>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleTestReadSheets}
                  className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. Probar Lectura (GET Censo)</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestWriteSheets}
                  className="px-3.5 py-2 bg-purple-50 text-purple-800 border border-purple-300 hover:bg-purple-100 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-purple-600" />
                  <span>2. Probar Escritura (POST Voto)</span>
                </button>
              </div>

              {testResult && (
                <div className={`mt-3 p-3 rounded-xl text-xs font-mono border ${
                  testResult.status === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : testResult.status === 'loading'
                    ? 'bg-slate-50 border-slate-200 text-slate-700 animate-pulse'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {testResult.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {testResult.status === 'loading' && <RefreshCw className="w-4 h-4 animate-spin text-slate-600 shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.details && (
                    <pre className="mt-2 p-2 bg-black/5 rounded-lg text-[10px] overflow-x-auto max-h-32">
                      {testResult.details}
                    </pre>
                  )}
                </div>
              )}
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

    </div>
  );
};
