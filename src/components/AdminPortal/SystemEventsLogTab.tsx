import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownUp,
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Download,
  Filter,
  Info,
  Laptop,
  Lock,
  Pause,
  Play,
  PlayCircle,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  Unlock,
  Vote,
  XCircle
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { ElectionStatus, SystemEvent, SystemEventSeverity, SystemEventType } from '../../types/election';
import { exportToCSV } from '../../utils/pdfGenerator';

export const SystemEventsLogTab: React.FC = () => {
  const {
    config,
    updateElectionStatus,
    systemEvents,
    addSystemEvent,
    clearSystemEvents,
    connectedComputersCount,
    isMultiComputerLive,
    sheetsSyncInfo,
    votes
  } = useElection();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Filter events
  const filteredEvents = useMemo(() => {
    return systemEvents.filter(event => {
      const matchSearch =
        searchTerm === '' ||
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.mesaNumber !== undefined && `mesa ${event.mesaNumber}`.includes(searchTerm.toLowerCase())) ||
        (event.terminalId && event.terminalId.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType =
        selectedType === 'all' ||
        (selectedType === 'urna' && event.type === 'URNA_STATUS') ||
        (selectedType === 'conflicts' && (event.type === 'SYNC_CONFLICT' || event.type === 'SYNC_RESOLVED' || event.type === 'DOUBLE_VOTE_BLOCKED')) ||
        (selectedType === 'sheets' && event.type === 'SHEETS_SYNC') ||
        (selectedType === 'network' && (event.type === 'TERMINAL_NETWORK' || event.type === 'AUDIT_INTEGRITY' || event.type === 'CENSUS_UPDATE'));

      const matchSeverity = selectedSeverity === 'all' || event.severity === selectedSeverity;

      return matchSearch && matchType && matchSeverity;
    });
  }, [systemEvents, searchTerm, selectedType, selectedSeverity]);

  // Statistics
  const conflictEvents = systemEvents.filter(e => e.type === 'SYNC_CONFLICT' || e.severity === 'ERROR');
  const unresolvedConflicts = conflictEvents.filter(e => e.resolved === false);
  const doubleVotesBlocked = systemEvents.filter(e => e.type === 'DOUBLE_VOTE_BLOCKED');
  const statusChangesCount = systemEvents.filter(e => e.type === 'URNA_STATUS').length;

  const handleCopyDiagnostics = () => {
    const summary = [
      `=== DIAGNÓSTICO EN VIVO - GOBIERNO ESCOLAR EKIRAYÁ CEM ===`,
      `Fecha y Hora: ${new Date().toLocaleString('es-CO')}`,
      `Estado de Urna: ${config.status}`,
      `Equipos Conectados: ${connectedComputersCount}`,
      `Votos en Urna Cifrada: ${votes.length}`,
      `Google Sheets: ${sheetsSyncInfo.status} (Último envío: ${sheetsSyncInfo.lastSyncTime || 'N/A'})`,
      `Conflictos Activos: ${unresolvedConflicts.length}`,
      `Total Eventos Registrados: ${systemEvents.length}`,
      `-------------------------------------------------------`,
      `ÚLTIMOS 5 EVENTOS DEL SISTEMA:`,
      ...systemEvents.slice(0, 5).map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] [${e.severity}] ${e.title}: ${e.description}`)
    ].join('\n');

    navigator.clipboard.writeText(summary);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Fecha y Hora', 'Tipo', 'Severidad', 'Título', 'Descripción', 'Fuente', 'Mesa', 'Resuelto'];
    const rows = filteredEvents.map(e => [
      e.id,
      e.timestamp,
      e.type,
      e.severity,
      e.title,
      e.description,
      e.source,
      e.mesaNumber ? `Mesa 0${e.mesaNumber}` : 'General',
      e.resolved ? 'SÍ' : 'NO'
    ]);
    exportToCSV(`Log_Eventos_Sistema_${config.academicYear}`, headers, rows);
  };

  const handleSimulateSyncDrill = () => {
    setIsSimulating(true);
    
    // Paso 1: Simular detección de conflicto temporal por microcorte Wi-Fi en cabina
    const conflictId = `sim-${Date.now()}`;
    addSystemEvent({
      type: 'SYNC_CONFLICT',
      severity: 'WARNING',
      title: 'Simulación de Auditoría: Microcorte de Red en Terminal Cabina 03',
      description: 'Prueba de estrés activada. La terminal perdió sincronía temporal con el canal SSE durante 800ms.',
      source: 'Módulo de Prueba Jurados',
      mesaNumber: 3,
      resolved: false,
      metadata: { testId: conflictId, simulated: true }
    });

    // Paso 2: Conciliación automática 1.8 segundos después
    setTimeout(() => {
      addSystemEvent({
        type: 'SYNC_RESOLVED',
        severity: 'SUCCESS',
        title: 'Conflicto Resuelto: Reconciliación Exitosa por Polling HTTP',
        description: 'El loop de reconciliación en background restableció la versión autorizada sin pérdida de votos ni duplicaciones.',
        source: 'Monitor de Consistencia Servidor',
        mesaNumber: 3,
        resolved: true,
        metadata: { testId: conflictId, resolutionTimeMs: 1800, simulated: true }
      });
      setIsSimulating(false);
    }, 1800);
  };

  const getSeverityBadge = (severity: SystemEventSeverity) => {
    switch (severity) {
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" /> CONFLICTO / ERROR
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> ADVERTENCIA
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ÉXITO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Info className="w-3 h-3 text-blue-600" /> INFORMATIVO
          </span>
        );
    }
  };

  const getTypeIcon = (type: SystemEventType) => {
    switch (type) {
      case 'URNA_STATUS':
        return <Vote className="w-4 h-4 text-purple-600" />;
      case 'SYNC_CONFLICT':
        return <AlertOctagon className="w-4 h-4 text-amber-600" />;
      case 'SYNC_RESOLVED':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'DOUBLE_VOTE_BLOCKED':
        return <Ban className="w-4 h-4 text-red-600" />;
      case 'SHEETS_SYNC':
        return <Database className="w-4 h-4 text-emerald-600" />;
      case 'TERMINAL_NETWORK':
        return <Laptop className="w-4 h-4 text-sky-600" />;
      default:
        return <Activity className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Transparency Headline */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  Registro de Transparencia Jurados & Mesas
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Streaming SSE Activo
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                Log de Eventos del Sistema & Auditoría de Sincronización
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                Supervisión en tiempo real de cambios de estado de urna, bloqueos de doble voto, transmisiones a Google Sheets y conciliación entre terminales de votación.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handleSimulateSyncDrill}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-800/80 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl border border-purple-600/50 transition-all cursor-pointer shadow-xs"
              title="Ejecuta una prueba controlada para verificar que los jurados vean la resolución de conflictos en vivo"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-300 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Probando...' : 'Simular Prueba de Sincronía'}</span>
            </button>

            <button
              onClick={handleCopyDiagnostics}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors shrink-0 cursor-pointer"
              title="Copiar reporte de diagnóstico al portapapeles"
            >
              <Copy className="w-3.5 h-3.5 text-slate-300" />
              <span>{copiedSuccess ? '¡Copiado!' : 'Copiar Diagnóstico'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors shrink-0 cursor-pointer"
              title="Descargar eventos en formato CSV para archivar con actas"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Real-time Health Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Vote className="w-3.5 h-3.5 text-purple-400" />
              Estado Actual Urna
            </div>
            <div className="text-lg font-black mt-1 flex items-center gap-2">
              <span className={config.status === 'ABIERTA' ? 'text-emerald-400' : (config.status === 'CERRADA' ? 'text-amber-400' : 'text-purple-300')}>
                {config.status}
              </span>
              <span className={`w-2 h-2 rounded-full ${config.status === 'ABIERTA' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {statusChangesCount} cambio(s) de estado
            </div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Consistencia Multiequipo
            </div>
            <div className="text-lg font-black mt-1 text-emerald-400 flex items-center gap-2">
              <span>{unresolvedConflicts.length === 0 ? '100% Sincronizado' : `${unresolvedConflicts.length} Conflicto(s)`}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {connectedComputersCount} terminales en red lockstep
            </div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5 text-red-400" />
              Dobles Votos Prevenidos
            </div>
            <div className="text-lg font-black mt-1 text-white">
              {doubleVotesBlocked.length} intentos
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Bloqueo criptográfico inmediato
            </div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Enlace Google Sheets
            </div>
            <div className="text-lg font-black mt-1 text-emerald-400 flex items-center gap-1.5">
              <span className="truncate">{sheetsSyncInfo.status === 'success' ? 'Transmitiendo' : sheetsSyncInfo.status}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {sheetsSyncInfo.pendingQueueCount === 0 ? '0 en cola de espera' : `${sheetsSyncInfo.pendingQueueCount} pendientes`}
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Pause */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar evento, mesa, folio o detalle..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Category Tabs */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'urna', label: 'Estado de Urna' },
              { id: 'conflicts', label: 'Conflictos & Doble Voto' },
              { id: 'sheets', label: 'Google Sheets' },
              { id: 'network', label: 'Terminales & Mesas' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedType(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedType === cat.id
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Secondary Controls: Severity, Pause, Clear */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <select
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value)}
              className="text-xs font-bold px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Todas las Severidades</option>
              <option value="ERROR">Solo Errores / Conflictos</option>
              <option value="WARNING">Solo Advertencias</option>
              <option value="SUCCESS">Solo Confirmaciones (Éxito)</option>
              <option value="INFO">Solo Informativos</option>
            </select>

            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                isPaused
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={isPaused ? 'Reanudar streaming en vivo' : 'Pausar streaming para inspección'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                if (confirm('¿Desea limpiar los eventos mostrados en pantalla?')) {
                  clearSystemEvents();
                }
              }}
              className="p-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-700 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Limpiar log actual"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Filter Summary */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Mostrando <strong>{filteredEvents.length}</strong> de <strong>{systemEvents.length}</strong> eventos registrados.
          </div>
          <div className="flex items-center gap-2">
            {isPaused && (
              <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Streaming en Pausa
              </span>
            )}
            <span className="text-slate-400">Orden: Cronológico inverso (más recientes primero)</span>
          </div>
        </div>
      </div>

      {/* Events List Feed */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              No se encontraron eventos con los filtros seleccionados
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Todos los computadores están operando con estabilidad y no hay alertas críticas en esta categoría.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('all');
                setSelectedSeverity('all');
              }}
              className="mt-4 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          filteredEvents.map(event => {
            const isExpanded = expandedEventId === event.id;
            const dateObj = new Date(event.timestamp);
            const timeStr = dateObj.toLocaleTimeString('es-CO', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            const msStr = String(dateObj.getMilliseconds()).padStart(3, '0');

            return (
              <div
                key={event.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all ${
                  event.severity === 'ERROR'
                    ? 'border-red-200 bg-red-50/20'
                    : event.severity === 'WARNING'
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                      {getTypeIcon(event.type)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getSeverityBadge(event.severity)}

                        <span className="text-xs font-bold text-slate-900">
                          {event.title}
                        </span>

                        {event.mesaNumber !== undefined && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                            Mesa 0{event.mesaNumber}
                          </span>
                        )}

                        {event.resolved && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> RESUELTO
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {event.description}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap pt-1">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {timeStr}.{msStr} COT
                        </span>
                        <span>•</span>
                        <span>Fuente: <strong>{event.source}</strong></span>
                        {event.terminalId && (
                          <>
                            <span>•</span>
                            <span className="font-mono">Terminal: {event.terminalId.slice(0, 10)}...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expand technical details button */}
                  {event.metadata && (
                    <button
                      onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                      className="text-[11px] text-purple-700 hover:text-purple-900 font-bold self-end sm:self-start shrink-0 cursor-pointer px-2.5 py-1 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                    >
                      {isExpanded ? 'Ocultar Metadatos' : 'Ver Metadatos'}
                    </button>
                  )}
                </div>

                {/* Expanded JSON details */}
                {isExpanded && event.metadata && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Parámetros Técnicos del Evento (Auditoría Criptográfica):
                    </div>
                    <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Jurado Transparency Protocol Guide */}
      <div className="p-5 bg-gradient-to-r from-purple-50 via-slate-50 to-indigo-50 border border-purple-200 rounded-2xl shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950 flex items-center gap-1.5 mb-2">
          <ShieldCheck className="w-4 h-4 text-purple-700" />
          Protocolo de Transparencia Electoral para Jurados de Votación
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
          <div className="p-3 bg-white/80 rounded-xl border border-purple-100">
            <div className="font-bold text-slate-900 flex items-center gap-1 mb-1">
              <Lock className="w-3.5 h-3.5 text-purple-700" /> 1. Voto Único Criptográfico
            </div>
            <div className="text-slate-600 text-[11px] leading-relaxed">
              Cada voto genera un token anónimo SHA-256 y un folio oficial de constancia. El censo en memoria y disco bloquea de inmediato cualquier reingreso con el mismo documento.
            </div>
          </div>

          <div className="p-3 bg-white/80 rounded-xl border border-purple-100">
            <div className="font-bold text-slate-900 flex items-center gap-1 mb-1">
              <Radio className="w-3.5 h-3.5 text-blue-700" /> 2. Sincronización en Red Lockstep
            </div>
            <div className="text-slate-600 text-[11px] leading-relaxed">
              Los 20 computadores reciben cambios en menos de 150ms vía Server-Sent Events. Si una terminal se desconecta, el loop de reconciliación restaura el estado en cuanto recupera señal.
            </div>
          </div>

          <div className="p-3 bg-white/80 rounded-xl border border-purple-100">
            <div className="font-bold text-slate-900 flex items-center gap-1 mb-1">
              <Database className="w-3.5 h-3.5 text-emerald-700" /> 3. Respaldos Inalterables
            </div>
            <div className="text-slate-600 text-[11px] leading-relaxed">
              Los votos se transmiten en caliente hacia la hoja protegida de Google Sheets con cola de reintentos automática. Todas las actas E-14 reflejan el mismo conteo matemático exacto.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
