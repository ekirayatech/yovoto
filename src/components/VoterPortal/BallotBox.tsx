import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  Lock,
  MapPin,
  Scale,
  Shield,
  UserCheck
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { getStationForMesa } from '../../data/mockElectionData';
import { Candidate, Position } from '../../types/election';

interface BallotBoxProps {
  onProceedToConfirm: (selections: Record<string, string>) => void;
}

export const BallotBox: React.FC<BallotBoxProps> = ({ onProceedToConfirm }) => {
  const { positions, candidates, activeVoter } = useElection();
  const [currentPosIndex, setCurrentPosIndex] = useState<number>(0);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [expandedProposals, setExpandedProposals] = useState<Record<string, boolean>>({});

  const activeStation = activeVoter ? getStationForMesa(activeVoter.mesaNumber) : null;

  const currentPosition = positions[currentPosIndex];
  const positionCandidates = candidates.filter(c => {
    if (c.positionId !== currentPosition.id) return false;
    if (currentPosition.id === 'representante_curso' && activeVoter?.grade) {
      return c.isBlankVote || c.grade === activeVoter.grade || c.grade === '-' || !c.grade;
    }
    return true;
  });
  const currentSelection = selectedChoices[currentPosition.id];

  const handleSelectCandidate = (candidateId: string) => {
    setSelectedChoices(prev => ({
      ...prev,
      [currentPosition.id]: candidateId
    }));
  };

  const toggleProposals = (candidateId: string) => {
    setExpandedProposals(prev => ({
      ...prev,
      [candidateId]: !prev[candidateId]
    }));
  };

  const isLastPosition = currentPosIndex === positions.length - 1;
  const allPositionsCompleted = positions.every(p => !!selectedChoices[p.id]);

  const handleNext = () => {
    if (!currentSelection) {
      alert('Por favor seleccione un candidato o la opción de Voto en Blanco para continuar.');
      return;
    }
    if (currentPosIndex < positions.length - 1) {
      setCurrentPosIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onProceedToConfirm(selectedChoices);
    }
  };

  const handlePrev = () => {
    if (currentPosIndex > 0) {
      setCurrentPosIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 px-3 sm:px-6">
      {/* Voter Banner and Top Progress Bar */}
      <div className="mb-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-black shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                <span>Cabina Electoral Activa • Mesa {String(activeVoter?.mesaNumber).padStart(2, '0')}</span>
                {activeStation && (
                  <span className="text-slate-500 font-semibold">
                    • Puesto: {activeStation.name} ({activeStation.category})
                  </span>
                )}
              </div>
              <h2 className="text-base font-extrabold text-slate-900">
                {activeVoter?.fullName} <span className="text-xs font-normal text-slate-500 font-mono">({activeVoter?.documentType} {activeVoter?.documentNumber})</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-purple-800 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
            <Shield className="w-4 h-4 text-purple-700" />
            <span className="font-semibold">Voto Secreto & Anónimo</span>
          </div>
        </div>

        {/* Multi-Position Step Indicator */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            {positions.map((pos, idx) => {
              const isDone = !!selectedChoices[pos.id];
              const isCurrent = idx === currentPosIndex;
              return (
                <button
                  key={pos.id}
                  onClick={() => setCurrentPosIndex(idx)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isCurrent
                      ? 'bg-purple-700 text-white shadow-xs'
                      : isDone
                      ? 'bg-purple-50 text-purple-900 border border-purple-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                    isCurrent ? 'bg-white text-purple-700' : isDone ? 'bg-purple-700 text-white' : 'bg-slate-300 text-slate-700'
                  }`}>
                    {isDone && !isCurrent ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                  </span>
                  <span>{pos.shortTitle}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Position Header Banner */}
      <div className="mb-6 rounded-2xl bg-linear-to-r from-purple-950 via-slate-900 to-purple-950 text-white p-5 sm:p-6 shadow-md border border-purple-900/50 relative overflow-hidden">
        <div className="h-1 w-full bg-linear-to-r from-purple-400 via-white to-purple-600 absolute top-0 left-0" />
        
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-300">
              Tarjetón Oficial de Votación • Cargo {currentPosIndex + 1} de {positions.length}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black mt-1 text-white tracking-tight">
                {currentPosition.title}
              </h3>
              {currentPosition.id === 'representante_curso' && activeVoter?.grade && (
                <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-purple-950 shadow-xs">
                  Grado {activeVoter.grade} ({activeVoter.group})
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {currentPosition.description}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-200 border border-purple-400/30">
              <Scale className="w-3.5 h-3.5 text-purple-300" />
              {currentPosition.legalBasis}
            </span>
          </div>
        </div>
      </div>

      {/* Tarjetón Electoral Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {positionCandidates.map(candidate => {
          const isSelected = currentSelection === candidate.id;
          const isBlank = candidate.isBlankVote;
          const isProposalsExpanded = !!expandedProposals[candidate.id];

          return (
            <div
              key={candidate.id}
              id={`tarjeton-card-${candidate.id}`}
              onClick={() => handleSelectCandidate(candidate.id)}
              className={`group cursor-pointer rounded-2xl transition-all duration-200 border-2 overflow-hidden flex flex-col justify-between relative ${
                isSelected
                  ? 'border-purple-600 bg-purple-50/40 ring-4 ring-purple-500/20 shadow-lg scale-[1.01]'
                  : isBlank
                  ? 'border-slate-300 bg-slate-50 hover:border-slate-400'
                  : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow-md'
              }`}
            >
              {/* Top Accent Strip */}
              <div
                className="h-2 w-full"
                style={{ backgroundColor: isBlank ? '#64748b' : candidate.colorHex }}
              />

              <div className="p-5 flex-1">
                {/* Candidate Tarjetón Number & Selector Checkbox */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-xs border"
                    style={{
                      backgroundColor: isBlank ? '#f1f5f9' : `${candidate.colorHex}15`,
                      color: isBlank ? '#475569' : candidate.colorHex,
                      borderColor: isBlank ? '#cbd5e1' : `${candidate.colorHex}40`
                    }}
                  >
                    {candidate.number}
                  </div>

                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-purple-700 border-purple-700 text-white shadow-xs'
                        : 'border-slate-300 bg-white group-hover:border-purple-400'
                    }`}
                  >
                    {isSelected && <Check className="w-5 h-5 stroke-[3]" />}
                  </div>
                </div>

                {/* Photo and Identity */}
                <div className="flex items-center gap-3.5 mb-3">
                  {isBlank ? (
                    <div className="w-16 h-16 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-500 shrink-0">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                  ) : (
                    <img
                      src={candidate.photoUrl}
                      alt={candidate.fullName}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover border-2 border-slate-200 shrink-0 shadow-xs"
                    />
                  )}
                  <div>
                    <h4 className="text-base font-black text-slate-900 leading-tight">
                      {candidate.fullName}
                    </h4>
                    {!isBlank && (
                      <p className="text-xs font-semibold text-purple-700 mt-0.5">
                        Grado {candidate.grade} • Grupo {candidate.group}
                      </p>
                    )}
                    {isBlank && (
                      <span className="inline-block mt-0.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        Opción Constitucional
                      </span>
                    )}
                  </div>
                </div>

                {/* Slogan */}
                <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2 mb-3">
                  "{candidate.slogan}"
                </p>

                {/* Proposals Dropdown toggle */}
                {candidate.proposals.length > 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProposals(candidate.id);
                      }}
                      className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs font-semibold text-purple-700 hover:bg-purple-50 flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        {isProposalsExpanded ? 'Ocultar Propuestas' : 'Ver Propuestas Clave'}
                      </span>
                      {isProposalsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isProposalsExpanded && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 animate-fadeIn">
                        {candidate.proposals.map((prop, pIdx) => (
                          <div key={pIdx} className="flex items-start gap-2 text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                            <span className="text-[11px] leading-relaxed">{prop}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Select Action Bar */}
              <div className="p-3 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectCandidate(candidate.id);
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Seleccionado</span>
                    </>
                  ) : (
                    <span>Marcar en Tarjetón</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Footer */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPosIndex === 0}
          className={`w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            currentPosIndex === 0
              ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100'
              : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cargo Anterior</span>
        </button>

        <div className="text-center text-xs text-slate-500 font-medium">
          {currentSelection ? (
            <span className="text-purple-700 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-700" />
              Opción seleccionada para {currentPosition.shortTitle}
            </span>
          ) : (
            <span className="text-amber-700 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Seleccione una opción en el tarjetón para avanzar
            </span>
          )}
        </div>

        <button
          id="btn-next-tarjeton-stage"
          type="button"
          onClick={handleNext}
          disabled={!currentSelection}
          className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all ${
            currentSelection
              ? isLastPosition
                ? 'bg-linear-to-r from-purple-700 to-indigo-900 hover:from-purple-800 hover:to-indigo-950 text-white shadow-purple-900/20'
                : 'bg-linear-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-indigo-950 text-white shadow-purple-900/20'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>{isLastPosition ? 'Revisar y Depositar Voto' : 'Siguiente Cargo'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
