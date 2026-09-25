import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  Laptop,
  Monitor,
  Network,
  Radio,
  RefreshCw,
  Shield,
  Smartphone,
  Users,
  Vote,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { AppRole } from '../../types/election';

export const MultiDeviceSyncModal: React.FC = () => {
  const {
    isMultiDeviceModalOpen,
    setIsMultiDeviceModalOpen,
    connectedComputersCount,
    isMultiComputerLive,
    terminalsList,
    terminalId,
    terminalName,
    setThisTerminalConfig,
    currentRole,
    juradoMesa,
    refreshServerState,
    votes,
    students,
    config,
    sheetsSyncInfo,
    syncWithGoogleSheets
  } = useElection();

  const [copiedLink, setCopiedLink] = useState(false);
  const [customName, setCustomName] = useState(terminalName);
  const [selectedRole, setSelectedRole] = useState<AppRole>(currentRole);
  const [selectedMesa, setSelectedMesa] = useState<number>(juradoMesa);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSheetsSyncing, setIsSheetsSyncing] = useState(false);
  const [sheetsSyncFeedback, setSheetsSyncFeedback] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isMultiDeviceModalOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ekiraya-elecciones.edu.co';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    setThisTerminalConfig(customName.trim() || 'Terminal Ekirayá', selectedRole, selectedMesa);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshServerState();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const getRoleBadge = (role: string, mesa?: number) => {
    switch (role) {
      case 'VOTANTE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Vote className="w-3 h-3" /> Cabina de Voto
          </span>
        );
      case 'JURADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Users className="w-3 h-3" /> Mesa 0{mesa || 1} Jurados
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-white border border-slate-700">
            <Shield className="w-3 h-3" /> Supervisión Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10">
              <Network className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Red Multiequipos en Tiempo Real</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {isMultiComputerLive ? 'SSE Activo' : 'Conectando'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Varios computadores registran de manera simultánea en la misma base y hoja central.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMultiDeviceModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-center">
              <div className="flex items-center justify-center gap-1.5 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
                <Laptop className="w-3.5 h-3.5" /> Computadores
              </div>
              <div className="text-2xl font-black text-purple-950">{connectedComputersCount}</div>
              <div className="text-[11px] text-purple-600 font-medium">Conectados ahora</div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
                <Vote className="w-3.5 h-3.5" /> Votos en Urna
              </div>
              <div className="text-2xl font-black text-emerald-950">{votes.length}</div>
              <div className="text-[11px] text-emerald-600 font-medium">Sincronizados en red</div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-center">
              <div className="flex items-center justify-center gap-1.5 text-blue-700 text-xs font-bold uppercase tracking-wider mb-1">
                <Radio className="w-3.5 h-3.5" /> Latencia Red
              </div>
              <div className="text-2xl font-black text-blue-950">&lt; 150 ms</div>
              <div className="text-[11px] text-blue-600 font-medium">Eventos en vivo</div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <div className="flex items-center justify-center gap-1.5 text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">
                <Shield className="w-3.5 h-3.5" /> Estado Urna
              </div>
              <div className={`text-xl font-black ${config.status === 'ABIERTA' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {config.status === 'ABIERTA' ? 'ABIERTA' : (config.status === 'CERRADA' ? 'CERRADA' : config.status)}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Unificado en red</div>
            </div>
          </div>

          {/* Configuración de Este Computador */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
              <Monitor className="w-4 h-4 text-purple-700" />
              Configurar este computador en la red
            </h4>

            <form onSubmit={handleSaveTerminal} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre o Identificador del Equipo:
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ej. Cabina 1 - Primaria / Mesa 2 Jurados"
                    className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rol Asignado:
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as AppRole)}
                    className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                  >
                    <option value="VOTANTE">Cabina de Voto</option>
                    <option value="JURADO">Mesa de Jurado</option>
                    <option value="ADMIN">Superadministrador</option>
                  </select>
                </div>
              </div>

              {selectedRole === 'JURADO' && (
                <div className="w-full sm:w-1/3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número de Mesa de Jurado:
                  </label>
                  <select
                    value={selectedMesa}
                    onChange={(e) => setSelectedMesa(Number(e.target.value))}
                    className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                  >
                    <option value={1}>Mesa 01</option>
                    <option value={2}>Mesa 02</option>
                    <option value={3}>Mesa 03</option>
                    <option value={4}>Mesa 04</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  ID Único de Sesión: <code className="font-mono text-purple-700">{terminalId.slice(0, 18)}...</code>
                </span>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" /> Guardado
                    </>
                  ) : (
                    'Guardar Identidad'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Sincronización con Base de Datos Google Sheets */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-700" />
                  Base de Datos Central en Google Sheets
                </h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-emerald-800">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <span className={`w-2 h-2 rounded-full ${sheetsSyncInfo.status === 'success' ? 'bg-emerald-500 animate-pulse' : (sheetsSyncInfo.status === 'syncing' ? 'bg-amber-400 animate-ping' : 'bg-blue-400')}`} />
                    {sheetsSyncInfo.status === 'success' ? 'Sincronización en Tiempo Real Activa' : (sheetsSyncInfo.status === 'syncing' ? 'Transmitiendo a Sheets...' : 'Conectada')}
                  </span>
                  <span>•</span>
                  <span>Último envío: <strong>{sheetsSyncInfo.lastSyncTime ? new Date(sheetsSyncInfo.lastSyncTime).toLocaleTimeString('es-CO') : 'Al depositar voto'}</strong></span>
                  <span>•</span>
                  <span>Votos registrados: <strong>{sheetsSyncInfo.totalSyncedVotes ?? votes.length}</strong></span>
                </div>
                {sheetsSyncFeedback && (
                  <div className="mt-1.5 text-xs text-emerald-900 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded inline-block">
                    {sheetsSyncFeedback}
                  </div>
                )}
              </div>

              <button
                onClick={async () => {
                  setIsSheetsSyncing(true);
                  setSheetsSyncFeedback(null);
                  try {
                    const res = await syncWithGoogleSheets();
                    setSheetsSyncFeedback(res.message || 'Sincronizado con éxito.');
                    setTimeout(() => setSheetsSyncFeedback(null), 4000);
                  } catch (e: any) {
                    setSheetsSyncFeedback('Error al sincronizar: ' + (e.message || 'Fallo de red'));
                  } finally {
                    setIsSheetsSyncing(false);
                  }
                }}
                disabled={isSheetsSyncing}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                title="Transmite inmediatamente los datos y votos más recientes a la hoja oficial de Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSheetsSyncing ? 'animate-spin' : ''}`} />
                {isSheetsSyncing ? 'Sincronizando...' : 'Sincronizar Sheets'}
              </button>
            </div>
          </div>

          {/* List of Connected Terminals */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-purple-700" />
                Terminales activas transmitiendo ({terminalsList.length || 1})
              </h4>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="text-xs text-purple-700 hover:text-purple-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualizar red
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {terminalsList.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        {terminalName}
                        <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                          ESTE EQUIPO
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">Conectado mediante SSE institucional</div>
                    </div>
                  </div>
                  {getRoleBadge(currentRole, juradoMesa)}
                </div>
              ) : (
                terminalsList.map((term) => {
                  const isCurrent = term.id === terminalId;
                  return (
                    <div
                      key={term.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isCurrent
                          ? 'bg-purple-50/60 border-purple-200 ring-1 ring-purple-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {term.name}
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                                ESTE EQUIPO
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>ID: {term.id.slice(0, 10)}...</span>
                            {term.ipAddress && <span>• IP: {term.ipAddress}</span>}
                          </div>
                        </div>
                      </div>
                      <div>{getRoleBadge(term.role, term.mesaNumber)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Compartir URL de la Jornada */}
          <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-purple-950">
                  Enlace para conectar los demás computadores
                </div>
                <div className="text-[11px] text-purple-700 mt-0.5">
                  Abra este enlace en las laptops de jurados o cabinas de votantes.
                </div>
              </div>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar Enlace
                  </>
                )}
              </button>
            </div>
            <div className="mt-2 p-2 bg-white/80 border border-purple-200/80 rounded-lg font-mono text-xs text-purple-900 truncate select-all">
              {currentUrl}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Sincronización en caliente y prevención de doble voto activa.
          </span>
          <button
            onClick={() => setIsMultiDeviceModalOpen(false)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
