import {
  AlertCircle,
  AlertTriangle,
  Check,
  Download,
  Edit3,
  FileSpreadsheet,
  Info,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { Candidate } from '../../types/election';

export const CandidateManagerTab: React.FC = () => {
  const {
    positions,
    candidates,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    loadTableFromSheets,
    syncTableToSheets
  } = useElection();

  const [selectedPosId, setSelectedPosId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Candidate Form State (Fórmula Electoral)
  const [candNumber, setCandNumber] = useState<string>('03');
  const [newCandPosId, setNewCandPosId] = useState<string>(positions[0]?.id || 'personeria');
  const [principalName, setPrincipalName] = useState<string>('');
  const [principalGrade, setPrincipalGrade] = useState<string>('11°');
  const [principalGroup, setPrincipalGroup] = useState<string>('11-A');
  const [principalPhotoUrl, setPrincipalPhotoUrl] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80');

  const [suplenteName, setSuplenteName] = useState<string>('');
  const [suplenteGrade, setSuplenteGrade] = useState<string>('11°');
  const [suplenteGroup, setSuplenteGroup] = useState<string>('11-A');
  const [suplentePhotoUrl, setSuplentePhotoUrl] = useState<string>('https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=320&q=80');

  const [slogan, setSlogan] = useState<string>('');
  const [proposalsText, setProposalsText] = useState<string>('');
  const [colorHex, setColorHex] = useState<string>('#7e22ce');

  // Edit Candidate Form State (Fórmula Electoral)
  const [editNumber, setEditNumber] = useState<string>('');
  const [editPositionId, setEditPositionId] = useState<string>('personeria');
  const [editPrincipalName, setEditPrincipalName] = useState<string>('');
  const [editPrincipalGrade, setEditPrincipalGrade] = useState<string>('11°');
  const [editPrincipalGroup, setEditPrincipalGroup] = useState<string>('11-A');
  const [editPrincipalPhotoUrl, setEditPrincipalPhotoUrl] = useState<string>('');

  const [editSuplenteName, setEditSuplenteName] = useState<string>('');
  const [editSuplenteGrade, setEditSuplenteGrade] = useState<string>('11°');
  const [editSuplenteGroup, setEditSuplenteGroup] = useState<string>('11-A');
  const [editSuplentePhotoUrl, setEditSuplentePhotoUrl] = useState<string>('');

  const [editSlogan, setEditSlogan] = useState<string>('');
  const [editProposalsText, setEditProposalsText] = useState<string>('');
  const [editColorHex, setEditColorHex] = useState<string>('#7e22ce');

  const filteredCandidates = candidates.filter(cand => {
    const matchesPos = selectedPosId === 'all' || cand.positionId === selectedPosId;
    const matchesSearch =
      !searchTerm.trim() ||
      cand.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.number.includes(searchTerm) ||
      (cand.slogan || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPos && matchesSearch;
  });

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotificationMsg({ type, text });
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  const handleSyncFromSheets = async () => {
    setIsSyncing(true);
    showNotification('success', 'Importando candidatos desde Google Sheets (con o sin encabezados)...');
    try {
      const res = await loadTableFromSheets('candidates');
      if (res.success) {
        showNotification('success', res.message || 'Candidatos sincronizados con éxito desde Google Sheets.');
      } else {
        showNotification('error', res.message || 'No se pudieron importar los candidatos.');
      }
    } catch {
      showNotification('error', 'Error al consultar Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncToSheets = async () => {
    setIsSyncing(true);
    showNotification('success', 'Guardando candidatos en Google Sheets...');
    try {
      const res = await syncTableToSheets('candidates');
      if (res.success) {
        showNotification('success', res.message || 'Candidatos guardados exitosamente en Google Sheets.');
      } else {
        showNotification('error', res.message || 'Error al guardar candidatos en Google Sheets.');
      }
    } catch {
      showNotification('error', 'Error de conexión con Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalName.trim() || !candNumber.trim()) return;

    const proposalsArray = proposalsText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const sName = suplenteName.trim() || 'Suplente de Fórmula';
    const comboFullName = `${principalName.trim()} & ${sName}`;

    addCandidate({
      number: candNumber.trim(),
      positionId: newCandPosId || (selectedPosId !== 'all' ? selectedPosId : positions[0]?.id || 'personeria'),
      fullName: comboFullName,
      principalName: principalName.trim(),
      principalGrade,
      principalGroup,
      principalPhotoUrl: principalPhotoUrl.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
      suplenteName: sName,
      suplenteGrade,
      suplenteGroup,
      suplentePhotoUrl: suplentePhotoUrl.trim() || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=320&q=80',
      grade: principalGrade,
      group: principalGroup,
      photoUrl: principalPhotoUrl.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
      slogan: slogan.trim() || 'Compromiso y liderazgo para toda la comunidad escolar.',
      proposals: proposalsArray.length > 0 ? proposalsArray : ['Participación activa y defensa de los derechos estudiantiles.'],
      colorHex
    });

    setIsAddModalOpen(false);
    setPrincipalName('');
    setSuplenteName('');
    setSlogan('');
    setProposalsText('');
    showNotification('success', `Fórmula ${comboFullName} registrada en el tarjetón con éxito.`);
  };

  const startEditCandidate = (cand: Candidate) => {
    setEditingCandidate(cand);
    setEditNumber(cand.number);
    setEditPositionId(cand.positionId);
    setEditPrincipalName(cand.principalName || (cand.fullName.includes('&') ? cand.fullName.split('&')[0].trim() : cand.fullName));
    setEditPrincipalGrade(cand.principalGrade || cand.grade || '11°');
    setEditPrincipalGroup(cand.principalGroup || cand.group || '11-A');
    setEditPrincipalPhotoUrl(cand.principalPhotoUrl || cand.photoUrl || '');

    setEditSuplenteName(cand.suplenteName || (cand.fullName.includes('&') ? cand.fullName.split('&')[1].trim() : ''));
    setEditSuplenteGrade(cand.suplenteGrade || cand.grade || '11°');
    setEditSuplenteGroup(cand.suplenteGroup || cand.group || '11-A');
    setEditSuplentePhotoUrl(cand.suplentePhotoUrl || '');

    setEditSlogan(cand.slogan || '');
    setEditProposalsText((cand.proposals || []).join('\n'));
    setEditColorHex(cand.colorHex || '#7e22ce');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate || !editPrincipalName.trim() || !editNumber.trim()) return;

    const proposalsArray = editProposalsText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const sName = editSuplenteName.trim() || (editingCandidate.isBlankVote ? '' : 'Suplente de Fórmula');
    const comboFullName = editingCandidate.isBlankVote
      ? 'Voto en Blanco'
      : (sName ? `${editPrincipalName.trim()} & ${sName}` : editPrincipalName.trim());

    const updated: Candidate = {
      ...editingCandidate,
      number: editNumber.trim(),
      positionId: editPositionId,
      fullName: comboFullName,
      principalName: editPrincipalName.trim(),
      principalGrade: editPrincipalGrade,
      principalGroup: editPrincipalGroup,
      principalPhotoUrl: editPrincipalPhotoUrl.trim() || editingCandidate.principalPhotoUrl || editingCandidate.photoUrl,
      suplenteName: sName,
      suplenteGrade: editSuplenteGrade,
      suplenteGroup: editSuplenteGroup,
      suplentePhotoUrl: editSuplentePhotoUrl.trim() || editingCandidate.suplentePhotoUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=320&q=80',
      grade: editPrincipalGrade,
      group: editPrincipalGroup,
      photoUrl: editPrincipalPhotoUrl.trim() || editingCandidate.photoUrl,
      slogan: editSlogan.trim() || editingCandidate.slogan,
      proposals: proposalsArray,
      colorHex: editColorHex
    };

    updateCandidate(updated);
    setEditingCandidate(null);
    showNotification('success', `Fórmula de ${comboFullName} actualizada correctamente.`);
  };

  const handleConfirmDelete = () => {
    if (!candidateToDelete) return;
    const res = deleteCandidate(candidateToDelete.id);
    if (res.success) {
      showNotification('success', `Candidato ${candidateToDelete.fullName} eliminado del tarjetón.`);
    } else {
      showNotification('error', res.error || 'No se pudo eliminar el candidato.');
    }
    setCandidateToDelete(null);
  };

  const getPositionTitle = (posId: string) => {
    return positions.find(p => p.id === posId)?.title || posId;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              Elecciones 2026
            </span>
            <span className="text-xs text-slate-500 font-medium">Art. 28 Dec. 1860/94</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            Candidaturas y Configuración del Tarjetón
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión completa de candidatos con edición, eliminación y sincronización con Google Sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={handleSyncFromSheets}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            title="Importar candidatos desde la hoja de Google Sheets"
          >
            <Download className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>Cargar desde Sheets</span>
          </button>

          <button
            onClick={handleSyncToSheets}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            title="Guardar lista de candidatos actual en Google Sheets"
          >
            <Upload className="w-3.5 h-3.5 text-purple-600" />
            <span>Guardar en Sheets</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer ml-auto lg:ml-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Inscribir Nuevo Candidato</span>
          </button>
        </div>
      </div>

      {/* Info Callout for Edit / Delete */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
        <div className="p-2 rounded-xl bg-purple-600 text-white shrink-0 mt-0.5 shadow-xs">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-700 space-y-1">
          <p className="font-bold text-slate-900">
            ¿Dónde editar o eliminar candidatos?
          </p>
          <p className="leading-relaxed text-slate-600">
            Cada candidato dispone de botones directos de <strong className="text-purple-800">Editar (✏️)</strong> y <strong className="text-red-700">Eliminar (🗑️)</strong> en la esquina y base de su tarjeta, así como en la columna de acciones de la <strong>Vista Tabla</strong>.
            Puede usar los botones de arriba para cargar o respaldar automáticamente en su Google Sheets (con o sin encabezados).
          </p>
        </div>
      </div>

      {/* Notification Banner */}
      {notificationMsg && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center gap-2 text-xs font-bold animate-fadeIn ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notificationMsg.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* Filters and View Mode Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Position tabs including "Todos los Cargos" */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedPosId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedPosId === 'all'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos los Cargos ({candidates.length})
          </button>

          {positions.map(pos => {
            const count = candidates.filter(c => c.positionId === pos.id).length;
            return (
              <button
                key={pos.id}
                onClick={() => setSelectedPosId(pos.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedPosId === pos.id
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pos.shortTitle} ({count})
              </button>
            );
          })}
        </div>

        {/* Search & View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar candidato..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-600 outline-hidden"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Vista en Tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Vista en Tabla Administrativa"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Mode */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.map(cand => (
            <div
              key={cand.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between hover:border-purple-300 transition-all group"
            >
              <div
                className="h-2 w-full"
                style={{ backgroundColor: cand.isBlankVote ? '#64748b' : cand.colorHex }}
              />

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg border shadow-xs"
                        style={{
                          backgroundColor: cand.isBlankVote ? '#f1f5f9' : `${cand.colorHex}15`,
                          color: cand.isBlankVote ? '#475569' : cand.colorHex,
                          borderColor: cand.isBlankVote ? '#cbd5e1' : `${cand.colorHex}40`
                        }}
                      >
                        {cand.number}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 block w-fit">
                          {getPositionTitle(cand.positionId)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">
                          {cand.isBlankVote ? 'Voto en Blanco' : `Tarjetón #${cand.number}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditCandidate(cand)}
                        className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-colors cursor-pointer"
                        title="Editar candidato"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {!cand.isBlankVote && (
                        <button
                          type="button"
                          onClick={() => setCandidateToDelete(cand)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-colors cursor-pointer"
                          title="Eliminar candidato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Formula presentation */}
                  {cand.isBlankVote ? (
                    <div className="flex items-center gap-3 mb-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-12 h-12 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-500 shrink-0 font-black text-xs">
                        VB
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-900 leading-tight">
                          Voto en Blanco
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                          Opción Constitucional
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      {/* Principal */}
                      <div className="flex flex-col items-center text-center">
                        <div className="relative mb-1.5">
                          {cand.principalPhotoUrl || cand.photoUrl ? (
                            <img
                              src={cand.principalPhotoUrl || cand.photoUrl}
                              alt={cand.principalName || cand.fullName}
                              className="w-14 h-14 rounded-xl object-cover border-2 border-purple-300 shadow-2xs"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-purple-100 border-2 border-purple-300 flex items-center justify-center text-purple-700 font-bold text-sm">
                              {(cand.principalName || cand.fullName).charAt(0)}
                            </div>
                          )}
                          <span className="absolute -bottom-1 inset-x-0 mx-auto w-max px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider bg-purple-700 text-white">
                            Principal
                          </span>
                        </div>
                        <h5 className="text-xs font-black text-slate-900 leading-tight line-clamp-1 mt-0.5">
                          {cand.principalName || (cand.fullName.includes('&') ? cand.fullName.split('&')[0].trim() : cand.fullName)}
                        </h5>
                        <p className="text-[10px] font-semibold text-purple-700 mt-0.5">
                          Grado {cand.principalGrade || cand.grade} ({cand.principalGroup || cand.group})
                        </p>
                      </div>

                      {/* Suplente */}
                      <div className="flex flex-col items-center text-center border-l border-slate-200/80 pl-2">
                        <div className="relative mb-1.5">
                          {cand.suplentePhotoUrl ? (
                            <img
                              src={cand.suplentePhotoUrl}
                              alt={cand.suplenteName || 'Suplente'}
                              className="w-14 h-14 rounded-xl object-cover border-2 border-indigo-300 shadow-2xs"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-indigo-100 border-2 border-indigo-300 flex items-center justify-center text-indigo-700 font-bold text-sm">
                              {(cand.suplenteName || 'S').charAt(0)}
                            </div>
                          )}
                          <span className="absolute -bottom-1 inset-x-0 mx-auto w-max px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider bg-indigo-700 text-white">
                            Suplente
                          </span>
                        </div>
                        <h5 className="text-xs font-black text-slate-900 leading-tight line-clamp-1 mt-0.5">
                          {cand.suplenteName || (cand.fullName.includes('&') ? cand.fullName.split('&')[1].trim() : 'Suplente')}
                        </h5>
                        <p className="text-[10px] font-semibold text-indigo-700 mt-0.5">
                          Grado {cand.suplenteGrade || cand.grade} ({cand.suplenteGroup || cand.group})
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                    "{cand.slogan}"
                  </p>

                  {cand.proposals.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 mb-4">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Propuestas Clave:
                      </span>
                      {cand.proposals.map((prop, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                          <span className="text-[11px] leading-relaxed line-clamp-2">{prop}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                  <button
                    type="button"
                    onClick={() => startEditCandidate(cand)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer"
                    title="Editar datos de candidatura"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar Fórmula</span>
                  </button>

                  {cand.isBlankVote ? (
                    <span
                      className="flex-1 text-center py-2 px-2 text-[10px] font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100"
                      title="El voto en blanco es una opción obligatoria por ley"
                    >
                      Obligatorio Ley
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCandidateToDelete(cand)}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                      title="Eliminar candidatura del tarjetón"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table Mode */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4"># Tarjetón</th>
                  <th className="py-3 px-4">Fórmula (Fotos)</th>
                  <th className="py-3 px-4">Candidato Principal y Suplente</th>
                  <th className="py-3 px-4">Cargo Electoral</th>
                  <th className="py-3 px-4">Grado / Grupo</th>
                  <th className="py-3 px-4">Lema de Campaña</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.map(cand => (
                  <tr key={cand.id} className="hover:bg-purple-50/40 transition-colors">
                    <td className="py-3 px-4">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border"
                        style={{
                          backgroundColor: cand.isBlankVote ? '#f1f5f9' : `${cand.colorHex}15`,
                          color: cand.isBlankVote ? '#475569' : cand.colorHex,
                          borderColor: cand.isBlankVote ? '#cbd5e1' : `${cand.colorHex}40`
                        }}
                      >
                        {cand.number}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {!cand.isBlankVote ? (
                        <div className="flex items-center -space-x-2">
                          <img
                            src={cand.principalPhotoUrl || cand.photoUrl}
                            alt="Principal"
                            className="w-9 h-9 rounded-lg object-cover border-2 border-purple-400 z-10"
                            title={`Principal: ${cand.principalName || cand.fullName}`}
                          />
                          <img
                            src={cand.suplentePhotoUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=320&q=80'}
                            alt="Suplente"
                            className="w-9 h-9 rounded-lg object-cover border-2 border-indigo-400"
                            title={`Suplente: ${cand.suplenteName || 'Suplente'}`}
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">
                          VB
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {cand.isBlankVote ? (
                        <span className="font-bold text-slate-900">Voto en Blanco</span>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase px-1 rounded bg-purple-100 text-purple-800">P</span>
                            <span>{cand.principalName || (cand.fullName.includes('&') ? cand.fullName.split('&')[0].trim() : cand.fullName)}</span>
                          </div>
                          <div className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                            <span className="text-[9px] font-black uppercase px-1 rounded bg-indigo-100 text-indigo-800">S</span>
                            <span>{cand.suplenteName || (cand.fullName.includes('&') ? cand.fullName.split('&')[1].trim() : 'Suplente')}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] font-semibold">
                        {getPositionTitle(cand.positionId)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {!cand.isBlankVote ? `${cand.principalGrade || cand.grade} (${cand.principalGroup || cand.group})` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 italic max-w-xs truncate">
                      "{cand.slogan}"
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEditCandidate(cand)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer"
                          title="Editar candidato"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Editar</span>
                        </button>

                        {cand.isBlankVote ? (
                          <span className="px-2 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
                            Obligatorio
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCandidateToDelete(cand)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                            title="Eliminar candidato"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Candidate Modal */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-5 bg-gradient-to-r from-purple-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-purple-300" />
                  <span>Editar Candidatura Oficial</span>
                </h3>
                <p className="text-xs text-purple-200">
                  Cargo: {getPositionTitle(editPositionId)}
                </p>
              </div>
              <button
                onClick={() => setEditingCandidate(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cargo Electoral</label>
                <select
                  value={editPositionId}
                  onChange={e => setEditPositionId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white"
                >
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número en Tarjetón</label>
                  <input
                    type="text"
                    value={editNumber}
                    onChange={e => setEditNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Color Distintivo</label>
                  <input
                    type="color"
                    value={editColorHex}
                    onChange={e => setEditColorHex(e.target.value)}
                    className="w-full h-10 p-1 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              {editingCandidate.isBlankVote ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre de la Opción</label>
                  <input
                    type="text"
                    value={editPrincipalName}
                    onChange={e => setEditPrincipalName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  {/* Candidato Principal */}
                  <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200/70 space-y-3">
                    <div className="flex items-center gap-2 text-purple-900 font-bold">
                      <span className="w-5 h-5 rounded-full bg-purple-700 text-white text-[10px] flex items-center justify-center">1</span>
                      <span>Candidato Principal</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nombre Completo del Principal</label>
                      <input
                        type="text"
                        value={editPrincipalName}
                        onChange={e => setEditPrincipalName(e.target.value)}
                        placeholder="Ej: Daniel Moreno Castro"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:border-purple-400"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Grado Principal</label>
                        <select
                          value={editPrincipalGrade}
                          onChange={e => setEditPrincipalGrade(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-purple-400"
                        >
                          {['11°', '10°', '9°', '8°', '7°', '6°', '5°', '4°', '3°', '2°', '1°'].map(g => (
                            <option key={g} value={g}>Grado {g}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Grupo Principal</label>
                        <input
                          type="text"
                          value={editPrincipalGroup}
                          onChange={e => setEditPrincipalGroup(e.target.value)}
                          placeholder="11-A"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-purple-400"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">URL Fotografía Principal</label>
                      <input
                        type="url"
                        value={editPrincipalPhotoUrl}
                        onChange={e => setEditPrincipalPhotoUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-purple-400"
                      />
                    </div>
                  </div>

                  {/* Candidato Suplente */}
                  <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200/70 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold">
                      <span className="w-5 h-5 rounded-full bg-indigo-700 text-white text-[10px] flex items-center justify-center">2</span>
                      <span>Candidato Suplente (Fórmula)</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nombre Completo del Suplente</label>
                      <input
                        type="text"
                        value={editSuplenteName}
                        onChange={e => setEditSuplenteName(e.target.value)}
                        placeholder="Ej: Mariana Torres Ríos"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:border-indigo-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Grado Suplente</label>
                        <select
                          value={editSuplenteGrade}
                          onChange={e => setEditSuplenteGrade(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                        >
                          {['11°', '10°', '9°', '8°', '7°', '6°', '5°', '4°', '3°', '2°', '1°'].map(g => (
                            <option key={g} value={g}>Grado {g}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Grupo Suplente</label>
                        <input
                          type="text"
                          value={editSuplenteGroup}
                          onChange={e => setEditSuplenteGroup(e.target.value)}
                          placeholder="11-A"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">URL Fotografía Suplente</label>
                      <input
                        type="url"
                        value={editSuplentePhotoUrl}
                        onChange={e => setEditSuplentePhotoUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lema de Campaña</label>
                <input
                  type="text"
                  value={editSlogan}
                  onChange={e => setEditSlogan(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Propuestas (Una por línea)</label>
                <textarea
                  rows={4}
                  value={editProposalsText}
                  onChange={e => setEditProposalsText(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-1">
              ¿Eliminar Candidato del Tarjetón?
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Está a punto de retirar la candidatura de{' '}
              <strong className="text-slate-900 font-bold">{candidateToDelete.fullName}</strong> (Tarjetón #{candidateToDelete.number}) para el cargo de{' '}
              <strong className="text-purple-700 font-bold">{getPositionTitle(candidateToDelete.positionId)}</strong>.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 mb-4 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Esta acción se registrará en los libros de auditoría criptográfica del comité electoral.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCandidateToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Inscribir Candidatura en Tarjetón</h3>
                <p className="text-xs text-slate-300">Cargo: {getPositionTitle(newCandPosId)}</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-3.5 text-xs max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cargo Electoral</label>
                <select
                  value={newCandPosId}
                  onChange={e => setNewCandPosId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white"
                >
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número en Tarjetón</label>
                  <input
                    type="text"
                    value={candNumber}
                    onChange={e => setCandNumber(e.target.value)}
                    placeholder="03"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Color Distintivo</label>
                  <input
                    type="color"
                    value={colorHex}
                    onChange={e => setColorHex(e.target.value)}
                    className="w-full h-10 p-1 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-1">
                {/* Candidato Principal */}
                <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200/70 space-y-3">
                  <div className="flex items-center gap-2 text-purple-900 font-bold">
                    <span className="w-5 h-5 rounded-full bg-purple-700 text-white text-[10px] flex items-center justify-center">1</span>
                    <span>Candidato Principal</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nombre Completo del Principal</label>
                    <input
                      type="text"
                      value={principalName}
                      onChange={e => setPrincipalName(e.target.value)}
                      placeholder="Ej: Daniel Moreno Castro"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:border-purple-400"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Grado Principal</label>
                      <select
                        value={principalGrade}
                        onChange={e => setPrincipalGrade(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-purple-400"
                      >
                        {['11°', '10°', '9°', '8°', '7°', '6°', '5°', '4°', '3°', '2°', '1°'].map(g => (
                          <option key={g} value={g}>Grado {g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Grupo Principal</label>
                      <input
                        type="text"
                        value={principalGroup}
                        onChange={e => setPrincipalGroup(e.target.value)}
                        placeholder="11-A"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-purple-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">URL Fotografía Principal</label>
                    <input
                      type="url"
                      value={principalPhotoUrl}
                      onChange={e => setPrincipalPhotoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-purple-400"
                    />
                  </div>
                </div>

                {/* Candidato Suplente */}
                <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200/70 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold">
                    <span className="w-5 h-5 rounded-full bg-indigo-700 text-white text-[10px] flex items-center justify-center">2</span>
                    <span>Candidato Suplente (Fórmula)</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nombre Completo del Suplente</label>
                    <input
                      type="text"
                      value={suplenteName}
                      onChange={e => setSuplenteName(e.target.value)}
                      placeholder="Ej: Mariana Torres Ríos"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:border-indigo-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Grado Suplente</label>
                      <select
                        value={suplenteGrade}
                        onChange={e => setSuplenteGrade(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                      >
                        {['11°', '10°', '9°', '8°', '7°', '6°', '5°', '4°', '3°', '2°', '1°'].map(g => (
                          <option key={g} value={g}>Grado {g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Grupo Suplente</label>
                      <input
                        type="text"
                        value={suplenteGroup}
                        onChange={e => setSuplenteGroup(e.target.value)}
                        placeholder="11-A"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">URL Fotografía Suplente</label>
                    <input
                      type="url"
                      value={suplentePhotoUrl}
                      onChange={e => setSuplentePhotoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lema de Campaña</label>
                <input
                  type="text"
                  value={slogan}
                  onChange={e => setSlogan(e.target.value)}
                  placeholder="Ej: Liderazgo que une y transforma nuestro colegio."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Propuestas (Una por línea)</label>
                <textarea
                  rows={3}
                  value={proposalsText}
                  onChange={e => setProposalsText(e.target.value)}
                  placeholder="Propuesta 1&#10;Propuesta 2&#10;Propuesta 3"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  Guardar Candidato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
