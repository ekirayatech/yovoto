import { Info, Plus, UserPlus, Users, X } from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { Candidate } from '../../types/election';

export const CandidateManagerTab: React.FC = () => {
  const { positions, candidates, addCandidate } = useElection();
  const [selectedPosId, setSelectedPosId] = useState<string>(positions[0]?.id || 'personeria');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New Candidate Form State
  const [candNumber, setCandNumber] = useState<string>('03');
  const [fullName, setFullName] = useState<string>('');
  const [grade, setGrade] = useState<string>('11°');
  const [group, setGroup] = useState<string>('11-C');
  const [photoUrl, setPhotoUrl] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80');
  const [slogan, setSlogan] = useState<string>('');
  const [proposalsText, setProposalsText] = useState<string>('');
  const [colorHex, setColorHex] = useState<string>('#7e22ce');

  const currentPos = positions.find(p => p.id === selectedPosId) || positions[0];
  const posCandidates = candidates.filter(c => c.positionId === currentPos.id);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !candNumber.trim()) return;

    const proposalsArray = proposalsText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    addCandidate({
      number: candNumber.trim(),
      positionId: selectedPosId,
      fullName: fullName.trim(),
      grade,
      group,
      photoUrl: photoUrl.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
      slogan: slogan.trim() || 'Compromiso y liderazgo para toda la comunidad escolar.',
      proposals: proposalsArray.length > 0 ? proposalsArray : ['Participación activa y defensa de los derechos estudiantiles.'],
      colorHex
    });

    setIsAddModalOpen(false);
    setFullName('');
    setSlogan('');
    setProposalsText('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900">
            Candidaturas y Configuración del Tarjetón
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tarjetón oficial conforme al Art. 28 del Decreto 1860 de 1994 y Ley 2195 de 2022.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Inscribir Candidato</span>
        </button>
      </div>

      {/* Position selector tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {positions.map(pos => (
          <button
            key={pos.id}
            onClick={() => setSelectedPosId(pos.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedPosId === pos.id
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {pos.shortTitle}
          </button>
        ))}
      </div>

      {/* Candidate Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posCandidates.map(cand => (
          <div
            key={cand.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
          >
            <div
              className="h-2 w-full"
              style={{ backgroundColor: cand.isBlankVote ? '#64748b' : cand.colorHex }}
            />

            <div className="p-5 flex-1">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border"
                  style={{
                    backgroundColor: cand.isBlankVote ? '#f1f5f9' : `${cand.colorHex}20`,
                    color: cand.isBlankVote ? '#475569' : cand.colorHex,
                    borderColor: cand.isBlankVote ? '#cbd5e1' : `${cand.colorHex}40`
                  }}
                >
                  {cand.number}
                </div>

                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {cand.isBlankVote ? 'Voto en Blanco' : `Tarjetón #${cand.number}`}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                {!cand.isBlankVote && (
                  <img
                    src={cand.photoUrl}
                    alt={cand.fullName}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                )}
                <div>
                  <h4 className="text-base font-black text-slate-900 leading-tight">
                    {cand.fullName}
                  </h4>
                  <p className="text-xs font-semibold text-purple-700 mt-0.5">
                    {!cand.isBlankVote ? `Grado ${cand.grade} • Grupo ${cand.group}` : 'Opción Constitucional'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                "{cand.slogan}"
              </p>

              {cand.proposals.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Propuestas Clave:
                  </span>
                  {cand.proposals.map((prop, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                      <span className="text-[11px] leading-relaxed">{prop}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Candidate Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Inscribir Candidatura en Tarjetón</h3>
                <p className="text-xs text-slate-300">Cargo: {currentPos.title}</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-3.5 text-xs max-h-[70vh] overflow-y-auto">
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo del Candidato</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Ej: Daniel Moreno Castro"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Grado</label>
                  <select
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {['11°', '10°', '9°', '8°', '7°', '6°'].map(g => (
                      <option key={g} value={g}>Grado {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Grupo</label>
                  <input
                    type="text"
                    value={group}
                    onChange={e => setGroup(e.target.value)}
                    placeholder="11-A"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL de Fotografía Oficial</label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
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
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold"
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
