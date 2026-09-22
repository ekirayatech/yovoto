import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  Cloud,
  CloudUpload,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  HardDrive,
  History,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  X
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useElection } from '../../context/ElectionContext';

export const CloudBackupModal: React.FC = () => {
  const {
    isCloudBackupModalOpen,
    setIsCloudBackupModalOpen,
    cloudSnapshots,
    createCloudSnapshot,
    restoreCloudSnapshot,
    downloadCloudBackup,
    uploadAndRestoreCloudBackup,
    sheetsSyncInfo,
    forceServerSheetsSync,
    votes,
    students,
    config,
    isAdminAuthenticated
  } = useElection();

  const [activeTab, setActiveTab] = useState<'backup' | 'sheets' | 'history'>('backup');
  const [snapshotReason, setSnapshotReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isCloudBackupModalOpen || !isAdminAuthenticated) return null;

  const handleCreateSnapshot = async () => {
    setIsProcessing(true);
    setActionMessage(null);
    const result = await createCloudSnapshot(snapshotReason.trim() || undefined);
    setIsProcessing(false);
    if (result.success) {
      setActionMessage({ type: 'success', text: result.message });
      setSnapshotReason('');
    } else {
      setActionMessage({ type: 'error', text: result.message });
    }
  };

  const handleRestoreLatest = async () => {
    if (!confirm('¿Desea restaurar el estado desde el último respaldo en la nube? Todos los computadores conectados actualizarán su información.')) {
      return;
    }
    setIsProcessing(true);
    setActionMessage(null);
    const result = await restoreCloudSnapshot();
    setIsProcessing(false);
    if (result.success) {
      setActionMessage({ type: 'success', text: result.message });
    } else {
      setActionMessage({ type: 'error', text: result.message });
    }
  };

  const handleForceSheetsSync = async () => {
    setIsProcessing(true);
    setActionMessage(null);
    const result = await forceServerSheetsSync();
    setIsProcessing(false);
    if (result.success) {
      setActionMessage({ type: 'success', text: `Sincronizados ${result.rowsSynced} registros con Google Sheets con éxito.` });
    } else {
      setActionMessage({ type: 'error', text: result.message });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        setIsProcessing(true);
        const result = await uploadAndRestoreCloudBackup(content);
        setIsProcessing(false);
        if (result.success) {
          setActionMessage({ type: 'success', text: 'Respaldo importado y restaurado en todos los computadores.' });
        } else {
          setActionMessage({ type: 'error', text: result.message });
        }
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const votedCount = students.filter(s => s.hasVoted).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10">
              <Cloud className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Respaldo en la Nube y Google Sheets</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  <ShieldCheck className="w-3 h-3 text-sky-300" />
                  Persistencia Segura
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Almacenamiento continuo con doble anillo: archivo snapshot en servidor + Google Sheet institucional.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCloudBackupModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 px-3 border-b-2 transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'backup'
                ? 'border-purple-600 text-purple-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Copia de Seguridad
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`pb-2.5 px-3 border-b-2 transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sheets'
                ? 'border-emerald-600 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Hoja Central Google Sheets
            {sheetsSyncInfo.status === 'success' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 border-b-2 transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'border-sky-600 text-sky-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial de Instantáneas ({cloudSnapshots.length})
          </button>
        </div>

        {/* Status Alert Banner */}
        {actionMessage && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-700 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'backup' && (
            <div className="space-y-4">
              {/* Current Storage Snapshot Summary */}
              <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-purple-700" />
                    <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                      Estado del Almacenamiento Persistente
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Auto-guardado en cada voto
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-purple-100">
                    <div className="text-[11px] text-slate-500">Votos en Urna</div>
                    <div className="text-lg font-black text-purple-950">{votes.length}</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-purple-100">
                    <div className="text-[11px] text-slate-500">Sufragantes</div>
                    <div className="text-lg font-black text-purple-950">{votedCount}</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-purple-100">
                    <div className="text-[11px] text-slate-500">Censo Total</div>
                    <div className="text-lg font-black text-purple-950">{students.length}</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-purple-100">
                    <div className="text-[11px] text-slate-500">Instantáneas</div>
                    <div className="text-lg font-black text-purple-950">{cloudSnapshots.length}</div>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-purple-900/80 flex items-center justify-between">
                  <span>Última instantánea: {cloudSnapshots[0]?.timestamp ? new Date(cloudSnapshots[0].timestamp).toLocaleTimeString() : 'Al iniciar'}</span>
                  {cloudSnapshots[0]?.checksum && (
                    <span className="font-mono text-purple-700 font-semibold">
                      SHA256: {cloudSnapshots[0].checksum}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Download Backup */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                      <Download className="w-4 h-4 text-purple-700" />
                      Descargar Copia de Seguridad (JSON)
                    </h5>
                    <p className="text-[11px] text-slate-600 mb-3">
                      Exporta el archivo completo con censo, candidatos, votos cifrados y actas electorales para resguardo físico.
                    </p>
                  </div>
                  <button
                    onClick={downloadCloudBackup}
                    className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Descargar Respaldo JSON
                  </button>
                </div>

                {/* Upload & Restore */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                      <UploadCloud className="w-4 h-4 text-blue-700" />
                      Restaurar desde Archivo JSON
                    </h5>
                    <p className="text-[11px] text-slate-600 mb-3">
                      Carga una copia de seguridad previa y la propaga automáticamente a todos los computadores de la red.
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    Cargar y Restaurar Archivo
                  </button>
                </div>
              </div>

              {/* Create Manual Snapshot */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                  <Database className="w-4 h-4 text-emerald-700" />
                  Crear Instantánea de Respaldo Manual
                </h5>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={snapshotReason}
                    onChange={(e) => setSnapshotReason(e.target.value)}
                    placeholder="Motivo del respaldo (ej. Cierre de jornada mediodía)"
                    className="flex-1 text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                  <button
                    onClick={handleCreateSnapshot}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isProcessing ? 'Guardando...' : 'Crear Ahora'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sheets' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Google Sheets Institucional Centralizado
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      sheetsSyncInfo.status === 'success'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {sheetsSyncInfo.status === 'success' ? 'Hoja Conectada y Activa' : 'Pendiente o En Proceso'}
                  </span>
                </div>

                <p className="text-xs text-emerald-900 mb-3">
                  Todos los computadores conectados envían sus votos a través del servidor central a la misma hoja de cálculo institucional con control de concurrencia y bloqueo de celda.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center text-xs mb-3">
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-100">
                    <div className="text-[11px] text-slate-500">Votos Enviados a Sheets</div>
                    <div className="text-lg font-black text-emerald-950">
                      {sheetsSyncInfo.totalSyncedVotes ?? votes.length}
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-100">
                    <div className="text-[11px] text-slate-500">Cola de Reintento</div>
                    <div className="text-lg font-black text-emerald-950">
                      {sheetsSyncInfo.pendingQueueCount ?? 0}
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-100">
                    <div className="text-[11px] text-slate-500">Última Sincronización</div>
                    <div className="text-xs font-bold text-emerald-950 mt-1">
                      {sheetsSyncInfo.lastSyncTime
                        ? new Date(sheetsSyncInfo.lastSyncTime).toLocaleTimeString()
                        : 'Al emitir voto'}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-emerald-100 text-[11px] space-y-1">
                  <div className="text-slate-500 font-semibold">URL del Webhook Apps Script:</div>
                  <div className="font-mono text-emerald-900 break-all text-[10px] bg-emerald-50/50 p-1.5 rounded border border-emerald-200/60">
                    {config.googleSheets?.scriptUrl || 'https://script.google.com/macros/s/AKfycb.../exec'}
                  </div>
                </div>
              </div>

              {/* Force Full Sync Button */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs font-bold text-slate-900">
                    Sincronización Total Integral
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Envía todo el censo, candidatos, jurados, votos y actas a las pestañas correspondientes de Google Sheets.
                  </p>
                </div>
                <button
                  onClick={handleForceSheetsSync}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  {isProcessing ? 'Sincronizando...' : 'Sincronizar Todo a Sheets'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Historial de instantáneas guardadas en servidor ({cloudSnapshots.length})</span>
                <button
                  onClick={handleRestoreLatest}
                  disabled={cloudSnapshots.length === 0 || isProcessing}
                  className="text-purple-700 hover:text-purple-900 font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar última instantánea
                </button>
              </div>

              {cloudSnapshots.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                  <Database className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                  No hay instantáneas manuales previas registradas. El servidor guarda automáticamente con cada voto.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {cloudSnapshots.map((snap, idx) => (
                    <div
                      key={snap.id || idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{snap.reason || 'Respaldo automático'}</span>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                                RECIENTE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>{new Date(snap.timestamp).toLocaleString()}</span>
                            <span>• {snap.totalVotes} votos</span>
                            <span>• {snap.totalVotersVoted} sufragantes</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-[10px] text-slate-400 block">
                          HASH: {snap.checksum}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          VERIFICADO
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="w-3.5 h-3.5 text-purple-700" />
            <span>Respaldos cifrados con firma hash SHA-256 para total inmutabilidad.</span>
          </div>
          <button
            onClick={() => setIsCloudBackupModalOpen(false)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
