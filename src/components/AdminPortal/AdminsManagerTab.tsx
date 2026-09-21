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
  KeyRound,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { AdminMember } from '../../types/election';

export const AdminsManagerTab: React.FC = () => {
  const { admins, addAdmin, updateAdmin, deleteAdmin, loadTableFromSheets, saveTableToSheets } = useElection();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminMember | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<AdminMember | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Admin Form State
  const [newFullName, setNewFullName] = useState<string>('');
  const [newUsername, setNewUsername] = useState<string>('');
  const [newDocumentNumber, setNewDocumentNumber] = useState<string>('');
  const [newRole, setNewRole] = useState<'SUPER_ADMIN' | 'AUDITOR' | 'REGISTRADOR'>('SUPER_ADMIN');
  const [newPin, setNewPin] = useState<string>('admin2026');
  const [newEmail, setNewEmail] = useState<string>('');

  // Edit Admin Form State
  const [editFullName, setEditFullName] = useState<string>('');
  const [editUsername, setEditUsername] = useState<string>('');
  const [editDocumentNumber, setEditDocumentNumber] = useState<string>('');
  const [editRole, setEditRole] = useState<'SUPER_ADMIN' | 'AUDITOR' | 'REGISTRADOR'>('SUPER_ADMIN');
  const [editPin, setEditPin] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');
  const [editEmail, setEditEmail] = useState<string>('');

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCopyPin = (admin: AdminMember) => {
    navigator.clipboard.writeText(admin.pin);
    setCopiedId(admin.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePinVisibility = (id: string) => {
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEdit = (admin: AdminMember) => {
    setEditingAdmin(admin);
    setEditFullName(admin.fullName);
    setEditUsername(admin.username);
    setEditDocumentNumber(admin.documentNumber || '');
    setEditRole(admin.role);
    setEditPin(admin.pin);
    setEditStatus(admin.status);
    setEditEmail(admin.email || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin || !editFullName.trim() || !editUsername.trim() || !editPin.trim()) return;

    updateAdmin({
      ...editingAdmin,
      fullName: editFullName.trim(),
      username: editUsername.trim().toLowerCase(),
      documentNumber: editDocumentNumber.trim(),
      role: editRole,
      pin: editPin.trim(),
      status: editStatus,
      email: editEmail.trim()
    });

    setEditingAdmin(null);
    showNotification('success', `Administrador ${editFullName.trim()} actualizado correctamente.`);
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newUsername.trim() || !newPin.trim()) return;

    // Check username uniqueness
    const exists = admins.some(a => a.username.toLowerCase() === newUsername.trim().toLowerCase());
    if (exists) {
      showNotification('error', `El nombre de usuario "${newUsername}" ya está registrado.`);
      return;
    }

    addAdmin({
      fullName: newFullName.trim(),
      username: newUsername.trim().toLowerCase(),
      documentNumber: newDocumentNumber.trim() || String(Date.now()).slice(-8),
      role: newRole,
      pin: newPin.trim(),
      status: 'ACTIVO',
      email: newEmail.trim()
    });

    setIsAddModalOpen(false);
    setNewFullName('');
    setNewUsername('');
    setNewDocumentNumber('');
    setNewEmail('');
    setNewPin('admin2026');
    showNotification('success', `Administrador ${newFullName.trim()} registrado exitosamente.`);
  };

  const handleConfirmDelete = () => {
    if (!adminToDelete) return;
    if (admins.length <= 1) {
      showNotification('error', 'No puede eliminar el único administrador del sistema.');
      setAdminToDelete(null);
      return;
    }

    const name = adminToDelete.fullName;
    deleteAdmin(adminToDelete.id);
    setAdminToDelete(null);
    showNotification('success', `Administrador ${name} eliminado con éxito.`);
  };

  const handleSyncFromSheets = async () => {
    setIsSyncing(true);
    try {
      const res = await loadTableFromSheets('admins');
      if (res.success) {
        showNotification('success', `¡Sincronizado! Se cargaron ${res.count ?? admins.length} administradores desde Google Sheets.`);
      } else {
        showNotification('error', res.message || 'No fue posible leer administradores desde Google Sheets.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al conectar con Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportToSheets = async () => {
    setIsSyncing(true);
    try {
      const res = await saveTableToSheets('admins');
      if (res.success) {
        showNotification('success', 'Base de administradores guardada exitosamente en Google Sheets.');
      } else {
        showNotification('error', res.message || 'Error registrando administradores en Google Sheets.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error guardando en Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredAdmins = admins.filter(a =>
    a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    a.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const superAdminsCount = admins.filter(a => a.role === 'SUPER_ADMIN').length;
  const auditoresCount = admins.filter(a => a.role === 'AUDITOR').length;

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

      {/* Header & Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{admins.length}</div>
            <div className="text-xs text-slate-500 font-semibold">Administradores Autorizados</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-700">{superAdminsCount}</div>
            <div className="text-xs text-slate-500 font-semibold">Superadministradores (Control Total)</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700">{auditoresCount}</div>
            <div className="text-xs text-slate-500 font-semibold">Auditores y Registradores</div>
          </div>
        </div>
      </div>

      {/* Controls & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar administrador por nombre, usuario o rol..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleSyncFromSheets}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors disabled:opacity-50 cursor-pointer"
              title="Cargar administradores desde la hoja de Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar Sheets</span>
            </button>

            <button
              onClick={handleExportToSheets}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              title="Guardar administradores actuales en Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Guardar en Sheets</span>
            </button>

            <button
              id="btn-add-admin"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Administrador</span>
            </button>
          </div>
        </div>

        {/* Notice for Sheet Auto-detection without headers */}
        <div className="px-3.5 py-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-start gap-2 text-purple-900 text-xs leading-relaxed">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <span>
            <strong>Lectura Inteligente sin Encabezados:</strong> Google Apps Script reconoce automáticamente las columnas de Administradores (Nombre, Usuario, PIN, Rol) desde la primera fila, incluso si su hoja no tiene títulos de encabezado. Puede editar o revocar credenciales abajo con un solo clic.
          </span>
        </div>
      </div>

      {/* Administrators Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Nombre Completo</th>
                <th className="py-3.5 px-4">Usuario de Acceso</th>
                <th className="py-3.5 px-4">Rol en el Sistema</th>
                <th className="py-3.5 px-4">PIN / Contraseña</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones Directas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No se encontraron administradores con el criterio de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map(admin => {
                  const isPinVisible = visiblePins[admin.id];

                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">{admin.fullName}</div>
                        {admin.email && <div className="text-[10px] text-slate-400">{admin.email}</div>}
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-xs">
                          {admin.username}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            admin.role === 'SUPER_ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : admin.role === 'AUDITOR'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {admin.role === 'SUPER_ADMIN'
                            ? 'Superadministrador'
                            : admin.role === 'AUDITOR'
                            ? 'Auditor Oficial'
                            : 'Registrador'}
                        </span>
                      </td>

                      {/* PIN & Actions */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {isPinVisible ? admin.pin : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePinVisibility(admin.id)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 ml-1"
                            title={isPinVisible ? 'Ocultar PIN' : 'Ver PIN'}
                          >
                            {isPinVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPin(admin)}
                            className="text-slate-400 hover:text-purple-700 p-0.5"
                            title="Copiar PIN"
                          >
                            {copiedId === admin.id ? (
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
                            admin.status === 'ACTIVO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {admin.status}
                        </span>
                      </td>

                      {/* Actions: EDIT & DELETE */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-edit-admin-${admin.id}`}
                            onClick={() => handleStartEdit(admin)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer"
                            title="Editar datos y contraseña del administrador"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Editar</span>
                          </button>

                          <button
                            id={`btn-delete-admin-${admin.id}`}
                            onClick={() => setAdminToDelete(admin)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                            title="Eliminar administrador"
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

      {/* Modal: Crear Administrador */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-700" />
                <h3 className="text-base font-black text-slate-900">Crear Nuevo Administrador</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Alberto Pérez"
                  value={newFullName}
                  onChange={e => {
                    setNewFullName(e.target.value);
                    if (!newUsername) {
                      const suggested = e.target.value.toLowerCase().trim().replace(/\s+/g, '.');
                      setNewUsername(suggested);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Usuario de Acceso *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: carlos.perez"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rol Institucional
                  </label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="SUPER_ADMIN">Superadministrador</option>
                    <option value="AUDITOR">Auditor</option>
                    <option value="REGISTRADOR">Registrador</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  PIN / Clave de Acceso *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ej: admin2026"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold focus:bg-white"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="admin@ekiraya.edu.co"
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
                  Guardar Administrador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Administrador */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-700" />
                <h3 className="text-base font-black text-slate-900">Editar Datos de Administrador</h3>
              </div>
              <button
                onClick={() => setEditingAdmin(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
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
                    Usuario de Acceso *
                  </label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rol Institucional
                  </label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="SUPER_ADMIN">Superadministrador</option>
                    <option value="AUDITOR">Auditor</option>
                    <option value="REGISTRADOR">Registrador</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    PIN / Clave de Acceso *
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
                    Estado de Cuenta
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
                  onClick={() => setEditingAdmin(null)}
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

      {/* Modal: Confirmar Eliminación */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">¿Eliminar Administrador?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Se revocará definitivamente el acceso de <strong>{adminToDelete.fullName}</strong> ({adminToDelete.username}).
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setAdminToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
