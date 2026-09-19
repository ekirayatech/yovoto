import { BookOpen, CheckCircle2, ExternalLink, Scale, ShieldCheck, X } from 'lucide-react';
import React from 'react';
import { COLOMBIAN_NORMATIVE } from '../utils/colombianNormative';

interface NormativeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NormativeModal: React.FC<NormativeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div 
        id="normative-modal-card" 
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header with Colombian Flag stripe */}
        <div className="h-2 w-full bg-linear-to-r from-amber-400 via-blue-700 to-red-600" />

        <div className="p-6 md:p-8 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Marco Jurídico Oficial
                </span>
                <span className="text-xs text-slate-400">República de Colombia</span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1">
                Normativa Electoral para el Gobierno Escolar
              </h2>
              <p className="text-slate-300 text-sm mt-0.5">
                Fundamentos legales que rigen la elección de Personero, Contralor y Consejo Directivo.
              </p>
            </div>
          </div>
          <button
            id="btn-close-normative-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Cerrar modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 max-h-[65vh] overflow-y-auto space-y-6 text-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-blue-50/60 border border-blue-100">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase">Voto Secreto y Universal</p>
                <p className="text-xs text-blue-700 mt-0.5">Artículo 258 constitucional. Garantía de anonimato absoluto en urna digital.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-900 uppercase">Plazo de 30 Días</p>
                <p className="text-xs text-emerald-700 mt-0.5">Elección de personero dentro del primer mes calendario de clases.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900 uppercase">Voto en Blanco Vinculante</p>
                <p className="text-xs text-amber-700 mt-0.5">Opción institucional con efectos jurídicos si alcanza mayoría absoluta.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {COLOMBIAN_NORMATIVE.map((item, idx) => (
              <div 
                key={idx} 
                className="p-5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                    {item.code}
                  </span>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {item.entity}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">{item.summary}</p>
                
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Puntos Clave y Aplicación:
                  </p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {item.keyPoints.map((point, pIdx) => (
                      <li key={pIdx} className="text-xs text-slate-600 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Fuente oficial: Ministerio de Educación Nacional de Colombia & Congreso de la República.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://www.mineducacion.gov.co"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              Portal Mineducación <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              id="btn-understand-normative"
              onClick={onClose}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              Entendido y Conforme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
