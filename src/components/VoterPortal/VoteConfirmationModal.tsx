import { AlertCircle, CheckCircle2, Lock, ShieldCheck, Vote, X } from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';

interface VoteConfirmationModalProps {
  isOpen: boolean;
  selections: Record<string, string>;
  onClose: () => void;
  onSuccess: () => void;
}

export const VoteConfirmationModal: React.FC<VoteConfirmationModalProps> = ({
  isOpen,
  selections,
  onClose,
  onSuccess
}) => {
  const { positions, candidates, activeVoter, castVote } = useElection();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmAndDeposit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await castVote(selections);
      if (result.success) {
        onSuccess();
      } else {
        setErrorMessage(result.error || 'Ocurrió un error al registrar el voto.');
      }
    } catch (err) {
      setErrorMessage('Error al sellar el voto en la urna criptográfica.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Top Flag stripe */}
        <div className="h-2 w-full bg-linear-to-r from-purple-500 via-white to-purple-700" />

        <div className="p-6 bg-slate-950 text-white flex items-center justify-between border-b border-purple-900/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-900/60 border border-purple-400/40 text-purple-200 flex items-center justify-center font-black shadow-inner">
              <Vote className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                Paso Final • Voto Confiable
              </span>
              <h3 className="text-xl font-black text-white">
                Revisión y Depósito en Urna Digital
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-slate-600">
            Estimado(a) <strong>{activeVoter?.fullName}</strong>, por favor verifique sus opciones marcadas en el tarjetón antes de sellar su sobre electoral.
          </p>

          <div className="space-y-3">
            {positions.map(pos => {
              const candId = selections[pos.id];
              const candidate = candidates.find(c => c.id === candId);

              if (!candidate) return null;

              return (
                <div
                  key={pos.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base border shrink-0"
                      style={{
                        backgroundColor: candidate.isBlankVote ? '#f1f5f9' : `${candidate.colorHex}20`,
                        color: candidate.isBlankVote ? '#475569' : candidate.colorHex,
                        borderColor: candidate.isBlankVote ? '#cbd5e1' : `${candidate.colorHex}40`
                      }}
                    >
                      {candidate.number}
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700">
                        {pos.shortTitle}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 leading-tight">
                        {candidate.fullName}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {candidate.isBlankVote ? 'Voto en Blanco Institucional' : `Grado ${candidate.grade} • Grupo ${candidate.group}`}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Marcado
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-purple-900">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span>Garantías Constitucionales y Criptográficas:</span>
            </div>
            <ul className="text-[11px] text-purple-800 space-y-1 list-disc list-inside">
              <li>El voto se firma con algoritmo <strong>SHA-256</strong> y se separa de su documento.</li>
              <li>Nadie podrá saber en ningún momento cuál fue el sentido de su voto.</li>
              <li>Se emitirá un <strong>Certificado Digital de Votación</strong> con folio único y código QR.</li>
              {activeVoter?.email && (
                <li>
                  El certificado se enviará automáticamente a su correo electrónico: <strong className="underline font-mono">{activeVoter.email}</strong>.
                </li>
              )}
            </ul>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            Modificar Opciones
          </button>
          
          <button
            id="btn-confirm-final-vote"
            type="button"
            onClick={handleConfirmAndDeposit}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white bg-linear-to-r from-purple-700 to-indigo-900 hover:from-purple-800 hover:to-indigo-950 flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 shadow-purple-900/20"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Cifrando y Depositando...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Confirmar y Depositar Voto</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
