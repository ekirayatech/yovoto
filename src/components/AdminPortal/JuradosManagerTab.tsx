import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Filter,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { getStationForMesa } from '../../data/mockElectionData';
import { JuradoMember } from '../../types/election';

export const JuradosManagerTab: React.FC = () => {
  const { jurados, addJurado, updateJurado, deleteJurado, loadTableFromSheets, saveTableToSheets, config } = useElection();
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [mesaFilter, setMesaFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingJurado, setEditingJurado] = useState<JuradoMember | null>(null);
  const [juradoToDelete, setJuradoToDelete] = useState<JuradoMember | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Jurado Form State
  const [newMesaNumber, setNewMesaNumber] = useState<number>(1);
  const [newFullName, setNewFullName] = useState<string>('');
  const [newDocumentNumber, setNewDocumentNumber] = useState<string>('');
  const [newRole, setNewRole] = useState<'PRESIDENTE_MESA' | 'VOCAL' | 'REMANENTE'>('PRESIDENTE_MESA');
  const [newPin, setNewPin] = useState<string>('jurado2026');
  const [newEmail, setNewEmail] = useState<string>('');

  // Edit Jurado Form State
  const [editMesaNumber, setEditMesaNumber] = useState<number>(1);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editDocumentNumber, setEditDocumentNumber] = useState<string>('');
  const [editRole, setEditRole] = useState<'PRESIDENTE_MESA' | 'VOCAL' | 'REMANENTE'>('PRESIDENTE_MESA');
  const [editPin, setEditPin] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');
  const [editEmail, setEditEmail] = useState<string>('');

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCopyPin = (jurado: JuradoMember) => {
    navigator.clipboard.writeText(jurado.pin);
    setCopiedId(jurado.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePinVisibility = (id: string) => {
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEdit = (jurado: JuradoMember) => {
    setEditingJurado(jurado);
    setEditMesaNumber(jurado.mesaNumber);
    setEditFullName(jurado.fullName);
    setEditDocumentNumber(jurado.documentNumber || '');
    setEditRole(jurado.role);
    setEditPin(jurado.pin);
    setEditStatus(jurado.status);
    setEditEmail(jurado.email || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJurado || !editFullName.trim() || !editPin.trim()) return;

    updateJurado({
      ...editingJurado,
      mesaNumber: Number(editMesaNumber) || 1,
      fullName: editFullName.trim(),
      documentNumber: editDocumentNumber.trim(),
      role: editRole,
      pin: editPin.trim(),
      status: editStatus,
      email: editEmail.trim()
    });

    setEditingJurado(null);
    showNotification('success', `Jurado ${editFullName.trim()} actualizado correctamente.`);
  };

  const handleCreateJurado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newPin.trim()) return;

    addJurado({
      mesaNumber: Number(newMesaNumber) || 1,
      fullName: newFullName.trim(),
      documentNumber: newDocumentNumber.trim() || String(Date.now()).slice(-8),
      role: newRole,
      pin: newPin.trim(),
      status: 'ACTIVO',
      email: newEmail.trim()
    });

    setIsAddModalOpen(false);
    setNewFullName('');
    setNewDocumentNumber('');
    setNewEmail('');
    setNewPin(`mesa0${newMesaNumber}`);
    showNotification('success', `Jurado acreditado exitosamente para la Mesa 0${newMesaNumber}.`);
  };

  const handleConfirmDelete = () => {
    if (!juradoToDelete) return;
    const name = juradoToDelete.fullName;
    deleteJurado(juradoToDelete.id);
    setJuradoToDelete(null);
    showNotification('success', `Acreditación de ${name} eliminada con éxito.`);
  };

  const handleSyncFromSheets = async () => {
    setIsSyncing(true);
    try {
      const res = await loadTableFromSheets('jurados');
      if (res.success) {
        showNotification('success', `¡Sincronizado! Se cargaron ${res.count ?? jurados.length} jurados desde Google Sheets.`);
      } else {
        showNotification('error', res.message || 'No fue posible leer la base de datos de jurados desde Google Sheets.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error comunicándose con Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportToSheets = async () => {
    setIsSyncing(true);
    try {
      const res = await saveTableToSheets('jurados');
      if (res.success) {
        showNotification('success', 'Base de datos de jurados registrada y guardada exitosamente en Google Sheets.');
      } else {
        showNotification('error', res.message || 'No fue posible registrar jurados en Google Sheets.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error guardando en Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered list
  const filteredJurados = jurados.filter(j => {
    const matchesSearch =
      j.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.documentNumber && j.documentNumber.includes(searchTerm)) ||
      j.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMesa = mesaFilter === 'ALL' || j.mesaNumber === Number(mesaFilter);
    return matchesSearch && matchesMesa;
  });

  const totalActivos = jurados.filter(j => j.status === 'ACTIVO').length;
  const mesasCubiertas = new Set(jurados.filter(j => j.status === 'ACTIVO').map(j => j.mesaNumber)).size;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-lg animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-900/20'
              : 'bg-red-600 text-white shadow-red-900/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{jurados.length}</div>
            <div className="text-xs text-slate-500 font-semibold">Jurados Acreditados</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">{totalActivos}</div>
            <div className="text-xs text-slate-500 font-semibold">Jurados con Credencial Activa</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-blue-700">
              {mesasCubiertas} / {config.totalMesas || 6}
            </div>
            <div className="text-xs text-slate-500 font-semibold">Mesas de Votación Cubiertas</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, documento o rol..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Mesa Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={mesaFilter}
              onChange={e => setMesaFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="ALL">Todas las Mesas ({jurados.length})</option>
              {Array.from({ length: config.totalMesas || 6 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  Mesa 0{m}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleSyncFromSheets}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors disabled:opacity-50 cursor-pointer"
              title="Leer y actualizar jurados desde la hoja de Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar Sheets</span>
            </button>

            <button
              onClick={handleExportToSheets}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              title="Guardar los jurados actuales en la hoja de Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Guardar en Sheets</span>
            </button>

            <button
              id="btn-add-jurado"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Acreditar Jurado</span>
            </button>
          </div>
        </div>

        {/* Notice for Google Sheets auto-detection without headers */}
        <div className="px-3.5 py-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-start gap-2 text-purple-900 text-xs leading-relaxed">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <span>
            <strong>Lectura Inteligente desde Google Sheets:</strong> El sistema reconoce la pestaña de jurados incluso si no tiene encabezados o si las columnas están en cualquier orden. Puede editar o eliminar cualquier jurado directamente desde la tabla a continuación.
          </span>
        </div>
      </div>

      {/* Jurados Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Mesa / Puesto</th>
                <th className="py-3.5 px-4">Nombre Completo</th>
                <th className="py-3.5 px-4">Documento</th>
                <th className="py-3.5 px-4">Rol Electoral</th>
                <th className="py-3.5 px-4">PIN de Acceso</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones Directas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJurados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron jurados acreditados con el filtro aplicado.
                  </td>
                </tr>
              ) : (
                filteredJurados.map(jurado => {
                  const station = getStationForMesa(jurado.mesaNumber);
                  const isPinVisible = visiblePins[jurado.id];

                  return (
                    <tr key={jurado.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Mesa Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-900 font-black text-xs flex items-center justify-center border border-purple-200">
                            0{jurado.mesaNumber}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[120px]">
                            {station?.shortName || `Mesa ${jurado.mesaNumber}`}
                          </span>
                        </div>
                      </td>

                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">{jurado.fullName}</div>
                        {jurado.email && <div className="text-[10px] text-slate-400">{jurado.email}</div>}
                      </td>

                      {/* Document Number */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {jurado.documentNumber || '—'}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            jurado.role === 'PRESIDENTE_MESA'
                              ? 'bg-indigo-100 text-indigo-800'
                              : jurado.role === 'VOCAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {jurado.role === 'PRESIDENTE_MESA'
                            ? 'Presidente'
                            : jurado.role === 'VOCAL'
                            ? 'Vocal de Mesa'
                            : 'Remanente'}
                        </span>
                      </td>

                      {/* PIN & Copy Action */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          <KeyRound className="w-3 h-3 text-slate-500" />
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {isPinVisible ? jurado.pin : '••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePinVisibility(jurado.id)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 ml-1"
                            title={isPinVisible ? 'Ocultar PIN' : 'Ver PIN'}
                          >
                            {isPinVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPin(jurado)}
                            className="text-slate-400 hover:text-purple-700 p-0.5"
                            title="Copiar PIN"
                          >
                            {copiedId === jurado.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            jurado.status === 'ACTIVO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {jurado.status}
                        </span>
                      </td>

                      {/* Actions: EDIT & DELETE */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-edit-jurado-${jurado.id}`}
                            onClick={() => handleStartEdit(jurado)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer"
                            title="Editar datos y PIN del jurado"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Editar</span>
                          </button>

                          <button
                            id={`btn-delete-jurado-${jurado.id}`}
                            onClick={() => setJuradoToDelete(jurado)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                            title="Eliminar acreditación del jurado"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Acreditar Nuevo Jurado */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-700" />
                <h3 className="text-base font-black text-slate-900">Acreditar Nuevo Jurado de Mesa</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJurado} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mesa Asignada *
                </label>
                <select
                  value={newMesaNumber}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setNewMesaNumber(val);
                    setNewPin(`mesa0${val}`);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {Array.from({ length: config.totalMesas || 6 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>
                      Mesa 0{m} — {getStationForMesa(m)?.name || `Mesa ${m}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo del Jurado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Sofía Gómez"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cédula / Documento
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 52148962"
                    value={newDocumentNumber}
                    onChange={e => setNewDocumentNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rol en Mesa
                  </label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="PRESIDENTE_MESA">Presidente de Mesa</option>
                    <option value="VOCAL">Vocal</option>
                    <option value="REMANENTE">Remanente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  PIN de Acceso a la Mesa *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ej: jurado2026 o mesa01"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold focus:bg-white"
                  />
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="jurado@ekiraya.edu.co"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Guardar y Acreditar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Jurado */}
      {editingJurado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-700" />
                <h3 className="text-base font-black text-slate-900">Editar Datos del Jurado</h3>
              </div>
              <button
                onClick={() => setEditingJurado(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mesa Asignada
                </label>
                <select
                  value={editMesaNumber}
                  onChange={e => setEditMesaNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {Array.from({ length: config.totalMesas || 6 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>
                      Mesa 0{m} — {getStationForMesa(m)?.name || `Mesa ${m}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cédula / Documento
                  </label>
                  <input
                    type="text"
                    value={editDocumentNumber}
                    onChange={e => setEditDocumentNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rol en Mesa
                  </label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="PRESIDENTE_MESA">Presidente de Mesa</option>
                    <option value="VOCAL">Vocal</option>
                    <option value="REMANENTE">Remanente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    PIN de Acceso *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPin}
                    onChange={e => setEditPin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estado de Credencial
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="ACTIVO">Activo (Habilitado)</option>
                    <option value="INACTIVO">Inactivo (Suspendido)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingJurado(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación de Jurado */}
      {juradoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">¿Eliminar Acreditación de Jurado?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Se revocará la credencial de <strong>{juradoToDelete.fullName}</strong> para la{' '}
                <strong>Mesa 0{juradoToDelete.mesaNumber}</strong>. El jurado ya no podrá iniciar sesión en la cabina de jurado.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setJuradoToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Sí, Eliminar Jurado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
