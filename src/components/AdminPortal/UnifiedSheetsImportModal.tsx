import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  HelpCircle,
  KeyRound,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserCheck,
  Users,
  X,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { diagnoseScriptUrl, normalizeScriptUrl } from '../../utils/googleSheetsService';

interface UnifiedSheetsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTable?: 'all' | 'voters' | 'candidates' | 'jurados' | 'admins';
}

export const UnifiedSheetsImportModal: React.FC<UnifiedSheetsImportModalProps> = ({
  isOpen,
  onClose,
  defaultTable = 'all'
}) => {
  const {
    config,
    updateInstitutionConfig,
    students,
    candidates,
    jurados,
    admins,
    loadTableFromSheets,
    syncTableToSheets
  } = useElection();

  const [scriptUrl, setScriptUrl] = useState<string>(config.googleSheets.scriptUrl);
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [urlSaveNotice, setUrlSaveNotice] = useState<string | null>(null);

  // Loading states
  const [isLoadingAll, setIsLoadingAll] = useState<boolean>(false);
  const [loadingSpecific, setLoadingSpecific] = useState<string | null>(null);
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);

  // Notification / Feedback states
  const [globalFeedback, setGlobalFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    details?: string;
  } | null>(null);

  const [tableStatus, setTableStatus] = useState<Record<string, { status: 'idle' | 'loading' | 'success' | 'error'; message?: string; count?: number }>>({
    voters: { status: 'idle' },
    candidates: { status: 'idle' },
    jurados: { status: 'idle' },
    admins: { status: 'idle' }
  });

  const [activeGuideTab, setActiveGuideTab] = useState<'voters' | 'candidates' | 'jurados' | 'admins'>('voters');
  const [copiedFormat, setCopiedFormat] = useState<boolean>(false);

  if (!isOpen) return null;

  const urlDiag = diagnoseScriptUrl(scriptUrl);

  const handleSaveUrl = () => {
    updateInstitutionConfig({
      googleSheets: {
        ...config.googleSheets,
        scriptUrl: normalizeScriptUrl(scriptUrl)
      }
    });
    setIsEditingUrl(false);
    setUrlSaveNotice('URL de Webhook actualizada correctamente.');
    setTimeout(() => setUrlSaveNotice(null), 3000);
  };

  const handleImportAll = async () => {
    if (!urlDiag.valid) {
      setGlobalFeedback({
        type: 'error',
        title: 'URL Inválida o Ausente',
        message: urlDiag.warning || 'Por favor ingrese la URL del Webhook de Google Apps Script antes de importar.'
      });
      return;
    }

    setIsLoadingAll(true);
    setGlobalFeedback(null);
    setTableStatus({
      voters: { status: 'loading' },
      candidates: { status: 'loading' },
      jurados: { status: 'loading' },
      admins: { status: 'loading' }
    });

    try {
      const res = await loadTableFromSheets('all');
      if (res.success) {
        setTableStatus({
          voters: { status: 'success', count: students.length },
          candidates: { status: 'success', count: candidates.length },
          jurados: { status: 'success', count: jurados.length },
          admins: { status: 'success', count: admins.length }
        });

        setGlobalFeedback({
          type: 'success',
          title: '¡Importación Integral Exitosa!',
          message: res.message || 'Se han sincronizado correctamente los votantes, candidatos, jurados y administradores desde Google Sheets.'
        });
      } else {
        setGlobalFeedback({
          type: 'error',
          title: 'Error al Importar desde Sheets',
          message: res.message || 'No fue posible leer los datos desde la hoja.',
          details: 'Verifique que la URL termine en /exec y que el Webhook tenga permisos de acceso público ("Cualquiera" / "Anyone").'
        });
        setTableStatus({
          voters: { status: 'idle' },
          candidates: { status: 'idle' },
          jurados: { status: 'idle' },
          admins: { status: 'idle' }
        });
      }
    } catch (err: any) {
      setGlobalFeedback({
        type: 'error',
        title: 'Fallo de Conexión',
        message: err.message || 'Ocurrió un error inesperado de comunicación con Google Sheets.'
      });
    } finally {
      setIsLoadingAll(false);
    }
  };

  const handleImportSingle = async (table: 'voters' | 'candidates' | 'jurados' | 'admins') => {
    if (!urlDiag.valid) {
      setGlobalFeedback({
        type: 'error',
        title: 'URL Inválida',
        message: urlDiag.warning || 'Por favor verifique la URL del Webhook.'
      });
      return;
    }

    setLoadingSpecific(table);
    setTableStatus(prev => ({ ...prev, [table]: { status: 'loading' } }));
    setGlobalFeedback(null);

    try {
      const res = await loadTableFromSheets(table);
      if (res.success) {
        setTableStatus(prev => ({
          ...prev,
          [table]: { status: 'success', message: res.message, count: res.count }
        }));
        setGlobalFeedback({
          type: 'success',
          title: 'Importación Exitosa',
          message: res.message || `Tabla ${table} importada satisfactoriamente.`
        });
      } else {
        setTableStatus(prev => ({
          ...prev,
          [table]: { status: 'error', message: res.message }
        }));
        setGlobalFeedback({
          type: 'error',
          title: `Error en ${table}`,
          message: res.message || 'No se pudieron recuperar los registros.'
        });
      }
    } catch (err: any) {
      setTableStatus(prev => ({
        ...prev,
        [table]: { status: 'error', message: err.message }
      }));
    } finally {
      setLoadingSpecific(null);
    }
  };

  const handleExportAllToSheets = async () => {
    if (!urlDiag.valid) {
      alert('Configure primero una URL de Webhook válida.');
      return;
    }

    if (!confirm('¿Desea enviar la estructura y registros actuales (votantes, candidatos, jurados, admins) a su Google Sheets? Esto creará o actualizará las pestañas automáticamente.')) {
      return;
    }

    setIsExportingAll(true);
    setGlobalFeedback(null);
    try {
      const res = await syncTableToSheets('all');
      if (res.success) {
        setGlobalFeedback({
          type: 'success',
          title: 'Estructura Exportada a Sheets',
          message: 'Se han creado y sincronizado las 4 pestañas en su archivo de Google Sheets.'
        });
      } else {
        setGlobalFeedback({
          type: 'error',
          title: 'Error al Exportar',
          message: res.message || 'No se pudo guardar la información en Google Sheets.'
        });
      }
    } catch (err: any) {
      setGlobalFeedback({
        type: 'error',
        title: 'Error',
        message: err.message || 'Fallo de transmisión hacia Google Sheets.'
      });
    } finally {
      setIsExportingAll(false);
    }
  };

  const copyStructureExample = () => {
    let textToCopy = '';
    if (activeGuideTab === 'voters') {
      textToCopy = `Documento\tNombre Completo\tGrado\tGrupo\tMesa\tCorreo\n1014293841\tAlejandro Morales Restrepo\t11°\t11-A\t18\talejo.morales@ekiraya.edu.co\n1014892341\tSofía Cardona Henao\t10°\t10-B\t17\tsofia.cardona@ekiraya.edu.co`;
    } else if (activeGuideTab === 'candidates') {
      textToCopy = `Cargo\tNumero Tarjeton\tNombre Completo\tGrado\tLema\tPropuestas\nPersonería\t01\tMariana Gómez Restrepo\t11°\tVoz, acción y empatía para transformar\tSalud mental y bienestar; Mesas de diálogo; Presupuesto participativo\nContraloría\t01\tEsteban Jaramillo Duque\t10°\tCuentas claras, comunidad transparente\tAuditoría estudiantil del PAE; Veeduría de infraestructura`;
    } else if (activeGuideTab === 'jurados') {
      textToCopy = `Mesa\tNombre Completo\tDocumento\tCargo Mesa\tPIN\n1\tCarlos Andrés Pardo\t79845120\tPresidente de Mesa\t4591\n1\tLaura Marcela Ríos\t1020349182\tVocal\t7823\n2\tJuan David Beltrán\t80123984\tPresidente de Mesa\t1234`;
    } else if (activeGuideTab === 'admins') {
      textToCopy = `Documento\tNombre Completo\tUsuario\tRol\tPIN\n52849102\tProf. Alejandro Valencia Osorio\tcomision.electoral\tSuper Admin\t2026\n19482019\tDra. Patricia Elena Montoya\tdireccion.rectoria\tDelegado Registraduría\t9021`;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedFormat(true);
    setTimeout(() => setCopiedFormat(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Header with Institution Logo */}
        <div className="bg-linear-to-r from-purple-950 via-purple-900 to-indigo-950 text-white p-5 sm:p-6 relative shrink-0">
          <div className="flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-3.5">
              <div className="bg-white rounded-2xl p-1.5 shadow-md flex items-center justify-center shrink-0 border border-white/20">
                <img
                  src={config.logoUrl || 'https://colegioekiraya.edu.co/wp-content/uploads/2024/09/LOGO-CEM-COLOR-02.png'}
                  alt="Colegio Ekirayá - CEM"
                  className="h-10 sm:h-12 w-auto object-contain max-w-[140px]"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-600/60 text-purple-200 border border-purple-400/30">
                    Google Sheets Sync Hub
                  </span>
                  <span className="text-xs text-purple-300 font-semibold hidden sm:inline">
                    {config.institutionName}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                  Importador Oficial de Google Sheets
                </h2>
                <p className="text-xs text-purple-200/90 leading-snug">
                  Cargue masivamente votantes, candidatos, jurados y administradores con detección automática.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          
          {/* Global Feedback Alert */}
          {globalFeedback && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed animate-in fade-in ${
                globalFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : globalFeedback.type === 'error'
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : 'bg-blue-50 border-blue-300 text-blue-900'
              }`}
            >
              {globalFeedback.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {globalFeedback.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
              {globalFeedback.type === 'info' && <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
              
              <div className="flex-1">
                <p className="font-bold text-sm">{globalFeedback.title}</p>
                <p className="mt-0.5">{globalFeedback.message}</p>
                {globalFeedback.details && (
                  <p className="mt-1 font-mono text-[11px] opacity-80">{globalFeedback.details}</p>
                )}
              </div>

              <button
                onClick={() => setGlobalFeedback(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Webhook Connection Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Conexión con Google Apps Script (Webhook)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {urlDiag.valid ? (
                      <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                        <Check className="w-3 h-3" /> Webhook configurado y listo
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {urlDiag.warning || 'Requiere URL válida'}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditingUrl(!isEditingUrl)}
                className="text-xs font-bold text-purple-700 hover:text-purple-800 underline self-start sm:self-auto"
              >
                {isEditingUrl ? 'Cancelar Edición' : 'Cambiar / Editar URL'}
              </button>
            </div>

            {isEditingUrl ? (
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={scriptUrl}
                    onChange={e => setScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <button
                    onClick={handleSaveUrl}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Asegúrese de que el script termine en <strong className="font-mono">/exec</strong> y que en Apps Script la implementación esté configurada con <em>&quot;Quién tiene acceso: Cualquiera (Anyone)&quot;</em>.
                </p>
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-between text-[11px] font-mono bg-white border border-slate-200/80 rounded-xl px-3 py-1.5 text-slate-600 truncate">
                <span className="truncate">{scriptUrl || 'No configurada'}</span>
                {urlSaveNotice && (
                  <span className="text-emerald-700 font-bold shrink-0 ml-2 font-sans text-xs">
                    {urlSaveNotice}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Master 1-Click Import Action Banner */}
          <div className="bg-linear-to-br from-purple-700 via-indigo-700 to-purple-800 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-wider">
                  <Zap className="w-3 h-3 fill-current" />
                  Acción Rápida Recomendada
                </div>
                <h3 className="text-lg font-black tracking-tight">
                  Importar las 4 Bases de Datos a la Vez
                </h3>
                <p className="text-xs text-purple-100 max-w-xl leading-relaxed">
                  Lee en una sola ejecución el Censo de Votantes, los Candidatos del Tarjetón, los Jurados de Mesa y los Administradores con tolerancia a columnas desordenadas.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={handleImportAll}
                  disabled={isLoadingAll || !urlDiag.valid}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 active:scale-95 text-purple-900 rounded-xl text-xs font-black shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoadingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-purple-700" />
                      <span>Importando las 4 bases...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 text-purple-700" />
                      <span>⚡ Importar Todo Ahora</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleExportAllToSheets}
                  disabled={isExportingAll || !urlDiag.valid}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-3 bg-purple-900/60 hover:bg-purple-900/90 text-purple-100 border border-purple-400/30 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  title="Enviar la estructura y datos actuales a su Google Sheet"
                >
                  {isExportingAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Exportar a Sheets</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 Individual Tables Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-700" />
                <span>Gestión Individual por Base de Datos</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                Puede importar cada tabla por separado
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              {/* 1. Votantes (Censo) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-purple-300 transition-colors shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">1. Censo de Votantes</h5>
                        <p className="text-[10px] text-slate-500">Pestaña sugerida: <code>Votantes</code> o <code>Censo</code></p>
                      </div>
                    </div>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {students.length} censados
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed">
                    Contiene los estudiantes habilitados para sufragar con documento, grado, grupo, mesa asignada y correo.
                  </p>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-mono truncate">
                    {tableStatus.voters.status === 'loading' && 'Leyendo votantes...'}
                    {tableStatus.voters.status === 'success' && '✓ Actualizado'}
                    {tableStatus.voters.status === 'error' && '✕ Error'}
                    {tableStatus.voters.status === 'idle' && `${students.filter(s => s.hasVoted).length} han votado`}
                  </span>

                  <button
                    onClick={() => handleImportSingle('voters')}
                    disabled={loadingSpecific === 'voters' || isLoadingAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                  >
                    {loadingSpecific === 'voters' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Importar Votantes</span>
                  </button>
                </div>
              </div>

              {/* 2. Candidatos */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-purple-300 transition-colors shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">2. Candidaturas & Tarjetón</h5>
                        <p className="text-[10px] text-slate-500">Pestaña sugerida: <code>Candidatos</code> o <code>Tarjeton</code></p>
                      </div>
                    </div>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {candidates.length} inscritos
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed">
                    Candidatos para Personería, Contraloría, Consejo Directivo y Representantes de Curso con fotos, números y propuestas.
                  </p>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-mono truncate">
                    {tableStatus.candidates.status === 'loading' && 'Leyendo candidatos...'}
                    {tableStatus.candidates.status === 'success' && '✓ Actualizado'}
                    {tableStatus.candidates.status === 'error' && '✕ Error'}
                    {tableStatus.candidates.status === 'idle' && `${candidates.filter(c => !c.isBlankVote).length} postulaciones`}
                  </span>

                  <button
                    onClick={() => handleImportSingle('candidates')}
                    disabled={loadingSpecific === 'candidates' || isLoadingAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                  >
                    {loadingSpecific === 'candidates' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Importar Candidatos</span>
                  </button>
                </div>
              </div>

              {/* 3. Jurados */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-purple-300 transition-colors shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">3. Jurados de Votación</h5>
                        <p className="text-[10px] text-slate-500">Pestaña sugerida: <code>Jurados</code> o <code>Mesas</code></p>
                      </div>
                    </div>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {jurados.length} jurados
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed">
                    Nómina de jurados por mesa, roles (Presidente, Vocal) y claves PIN para la habilitación de votantes en cabina.
                  </p>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-mono truncate">
                    {tableStatus.jurados.status === 'loading' && 'Leyendo jurados...'}
                    {tableStatus.jurados.status === 'success' && '✓ Actualizado'}
                    {tableStatus.jurados.status === 'error' && '✕ Error'}
                    {tableStatus.jurados.status === 'idle' && `${config.totalMesas} mesas activas`}
                  </span>

                  <button
                    onClick={() => handleImportSingle('jurados')}
                    disabled={loadingSpecific === 'jurados' || isLoadingAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                  >
                    {loadingSpecific === 'jurados' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Importar Jurados</span>
                  </button>
                </div>
              </div>

              {/* 4. Administradores */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-purple-300 transition-colors shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">4. Administradores & Auditores</h5>
                        <p className="text-[10px] text-slate-500">Pestaña sugerida: <code>Administradores</code> o <code>Admins</code></p>
                      </div>
                    </div>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {admins.length} administradores
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed">
                    Credenciales institucionales, usuarios, roles del Comité Electoral Central y PINs para apertura y cierre de urnas.
                  </p>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-mono truncate">
                    {tableStatus.admins.status === 'loading' && 'Leyendo administradores...'}
                    {tableStatus.admins.status === 'success' && '✓ Actualizado'}
                    {tableStatus.admins.status === 'error' && '✕ Error'}
                    {tableStatus.admins.status === 'idle' && 'Roles configurados'}
                  </span>

                  <button
                    onClick={() => handleImportSingle('admins')}
                    disabled={loadingSpecific === 'admins' || isLoadingAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                  >
                    {loadingSpecific === 'admins' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Importar Admins</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Organizing Google Sheets Guide (Interactive Documentation) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-700" />
                  <span>¿Cómo Organizar su Archivo de Google Sheets?</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Cree una hoja de cálculo con 4 pestañas. El sistema reconoce automáticamente los datos sin importar el orden de columnas.
                </p>
              </div>

              <button
                onClick={copyStructureExample}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
              >
                {copiedFormat ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFormat ? '¡Copiado al Portapapeles!' : 'Copiar Ejemplo de Columnas'}</span>
              </button>
            </div>

            {/* Sub-tab pills for each sheet structure */}
            <div className="flex gap-1 border-b border-slate-200 pb-2 overflow-x-auto">
              {[
                { id: 'voters', label: '1. Pestaña: Votantes' },
                { id: 'candidates', label: '2. Pestaña: Candidatos' },
                { id: 'jurados', label: '3. Pestaña: Jurados' },
                { id: 'admins', label: '4. Pestaña: Administradores' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveGuideTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                    activeGuideTab === t.id
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Guide Details for each table */}
            <div className="mt-3.5 text-xs text-slate-700">
              {activeGuideTab === 'voters' && (
                <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <thead className="bg-slate-100 font-bold text-slate-700 text-left">
                        <tr>
                          <th className="p-2 border-b">Documento</th>
                          <th className="p-2 border-b">Nombre Completo</th>
                          <th className="p-2 border-b">Grado</th>
                          <th className="p-2 border-b">Grupo</th>
                          <th className="p-2 border-b">Mesa</th>
                          <th className="p-2 border-b">Correo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                        <tr>
                          <td className="p-2 text-slate-900 font-bold">1014293841</td>
                          <td className="p-2 font-sans font-medium">Alejandro Morales</td>
                          <td className="p-2">11°</td>
                          <td className="p-2">11-A</td>
                          <td className="p-2">18</td>
                          <td className="p-2">alejo.morales@ekiraya.edu.co</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-slate-900 font-bold">1014892341</td>
                          <td className="p-2 font-sans font-medium">Sofía Cardona</td>
                          <td className="p-2">10°</td>
                          <td className="p-2">10-B</td>
                          <td className="p-2">17</td>
                          <td className="p-2">sofia.cardona@ekiraya.edu.co</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    💡 La pestaña se puede llamar <strong>Votantes</strong>, <strong>Censo</strong>, <strong>Estudiantes</strong> o <strong>Censo_Estudiantil</strong>.
                  </p>
                </div>
              )}

              {activeGuideTab === 'candidates' && (
                <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <thead className="bg-slate-100 font-bold text-slate-700 text-left">
                        <tr>
                          <th className="p-2 border-b">Cargo</th>
                          <th className="p-2 border-b">Tarjetón #</th>
                          <th className="p-2 border-b">Nombre Completo</th>
                          <th className="p-2 border-b">Grado</th>
                          <th className="p-2 border-b">Lema</th>
                          <th className="p-2 border-b">Propuestas (separadas por ;)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                        <tr>
                          <td className="p-2 text-purple-800 font-bold font-sans">Personería</td>
                          <td className="p-2 font-bold">01</td>
                          <td className="p-2 font-sans font-medium">Mariana Gómez Restrepo</td>
                          <td className="p-2">11°</td>
                          <td className="p-2 font-sans italic">&quot;Voz y acción&quot;</td>
                          <td className="p-2 font-sans">Salud mental; Mesas de diálogo</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-purple-800 font-bold font-sans">Contraloría</td>
                          <td className="p-2 font-bold">01</td>
                          <td className="p-2 font-sans font-medium">Esteban Jaramillo</td>
                          <td className="p-2">10°</td>
                          <td className="p-2 font-sans italic">&quot;Cuentas claras&quot;</td>
                          <td className="p-2 font-sans">Veeduría de infraestructura; PAE</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    💡 Cargos reconocidos: <strong>Personería</strong>, <strong>Contraloría</strong>, <strong>Consejo Directivo</strong>, <strong>Representante de Curso</strong> o <strong>Cabildante</strong>.
                  </p>
                </div>
              )}

              {activeGuideTab === 'jurados' && (
                <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <thead className="bg-slate-100 font-bold text-slate-700 text-left">
                        <tr>
                          <th className="p-2 border-b">Mesa</th>
                          <th className="p-2 border-b">Nombre Completo</th>
                          <th className="p-2 border-b">Documento</th>
                          <th className="p-2 border-b">Cargo de Mesa</th>
                          <th className="p-2 border-b">PIN de Desbloqueo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                        <tr>
                          <td className="p-2 font-bold">1</td>
                          <td className="p-2 font-sans font-medium">Carlos Andrés Pardo</td>
                          <td className="p-2">79845120</td>
                          <td className="p-2 font-sans">Presidente de Mesa</td>
                          <td className="p-2 font-bold text-emerald-800">4591</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold">1</td>
                          <td className="p-2 font-sans font-medium">Laura Marcela Ríos</td>
                          <td className="p-2">1020349182</td>
                          <td className="p-2 font-sans">Vocal</td>
                          <td className="p-2 font-bold text-emerald-800">7823</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    💡 El PIN debe ser un código de 4 a 6 dígitos para que el jurado abra la mesa e inicie la jornada electoral.
                  </p>
                </div>
              )}

              {activeGuideTab === 'admins' && (
                <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <thead className="bg-slate-100 font-bold text-slate-700 text-left">
                        <tr>
                          <th className="p-2 border-b">Documento</th>
                          <th className="p-2 border-b">Nombre Completo</th>
                          <th className="p-2 border-b">Usuario</th>
                          <th className="p-2 border-b">Rol Institucional</th>
                          <th className="p-2 border-b">PIN de Acceso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                        <tr>
                          <td className="p-2 font-bold">52849102</td>
                          <td className="p-2 font-sans font-medium">Prof. Alejandro Valencia</td>
                          <td className="p-2">comision.electoral</td>
                          <td className="p-2 font-sans">Super Admin</td>
                          <td className="p-2 font-bold text-amber-800">2026</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold">19482019</td>
                          <td className="p-2 font-sans font-medium">Dra. Patricia Elena Montoya</td>
                          <td className="p-2">direccion.rectoria</td>
                          <td className="p-2 font-sans">Delegado Registraduría</td>
                          <td className="p-2 font-bold text-amber-800">9021</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    💡 Roles válidos: <strong>Super Admin</strong>, <strong>Delegado Registraduría</strong> o <strong>Auditor Consejo Electoral</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-purple-700" />
            <span>Sistema Seguro con Cifrado E2E • Colegio Ekirayá - CEM</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
            >
              Cerrar Asistente
            </button>
            <button
              onClick={handleImportAll}
              disabled={isLoadingAll || !urlDiag.valid}
              className="flex-1 sm:flex-none px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isLoadingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Importar Todo</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
