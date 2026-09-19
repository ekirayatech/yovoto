import {
  AlertCircle,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Fingerprint,
  HelpCircle,
  KeyRound,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserCheck
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { getStationForMesa, POLLING_STATIONS } from '../../data/mockElectionData';
import { DocumentType, Student } from '../../types/election';

export const VoterAuth: React.FC = () => {
  const { authenticateStudent, students, config } = useElection();
  const [docType, setDocType] = useState<DocumentType>('TI');
  const [docNumber, setDocNumber] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [alreadyVotedStudent, setAlreadyVotedStudent] = useState<Student | null>(null);
  const [showStationsGuide, setShowStationsGuide] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setAlreadyVotedStudent(null);

    if (!docNumber.trim()) {
      setErrorMsg('Por favor ingrese el número de documento.');
      return;
    }

    const result = authenticateStudent(docType, docNumber.trim());
    if (!result.success) {
      setErrorMsg(result.error || 'No fue posible autenticar el documento.');
      if (result.student && result.student.hasVoted) {
        setAlreadyVotedStudent(result.student);
      }
    }
  };

  const handleQuickSelect = (student: Student) => {
    setDocType(student.documentType);
    setDocNumber(student.documentNumber);
    setErrorMsg(null);
    setAlreadyVotedStudent(null);
  };

  // Diverse unvoted students for quick testing across all school levels
  const unvotedStudents = [
    students.find(s => !s.hasVoted && (s.grade === 'Transición' || s.grade === 'Jardín')),
    students.find(s => !s.hasVoted && (s.grade === '2°' || s.grade === '3°')),
    students.find(s => !s.hasVoted && (s.grade === '5°' || s.grade === '4°')),
    students.find(s => !s.hasVoted && (s.grade === '7°' || s.grade === '6°')),
    students.find(s => !s.hasVoted && (s.grade === '9°' || s.grade === '8°')),
    students.find(s => !s.hasVoted && (s.grade === '11°' || s.grade === '10°'))
  ].filter(Boolean) as Student[];

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      {/* Security & Secrecy Guarantee Card */}
      <div className="bg-linear-to-br from-purple-900 via-purple-800 to-indigo-950 text-white rounded-2xl p-6 shadow-xl mb-6 relative overflow-hidden border border-purple-700/30">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-purple-600/30 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-white text-purple-900 shadow-sm flex items-center justify-center font-bold">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-purple-200 tracking-wider uppercase">
              Cabina Electoral Digital
            </span>
            <h2 className="text-lg font-black leading-tight">Autenticación de Sufragante</h2>
          </div>
        </div>

        <p className="text-xs text-purple-100/90 leading-relaxed mt-1">
          Ingrese su documento de identidad registrado en el censo del <strong>Colegio Bilingüe Ekirayá</strong>. El sistema verificará su habilitación en mesa y garantizará el <strong>secreto constitucional e inviolabilidad</strong> de su sufragio.
        </p>

        <div className="mt-4 pt-3 border-t border-purple-700/60 flex items-center justify-between text-[11px] text-purple-200">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Cifrado E2E SHA-256
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-purple-200" />
            Voto Ciego y Desvinculado
          </span>
        </div>
      </div>

      {/* Main Auth Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Document Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tipo de Documento
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: 'TI', label: 'T.I.', desc: 'Tarjeta Identidad' },
                { type: 'RC', label: 'R.C.', desc: 'Registro Civil' },
                { type: 'CE', label: 'C.E.', desc: 'Cédula Extranjería' },
                { type: 'COD', label: 'CÓD', desc: 'Código Escolar' }
              ].map(item => (
                <button
                  type="button"
                  key={item.type}
                  id={`btn-doc-type-${item.type.toLowerCase()}`}
                  onClick={() => setDocType(item.type as DocumentType)}
                  className={`py-2.5 px-2 rounded-xl text-center border transition-all ${
                    docType === item.type
                      ? 'bg-purple-50 border-purple-600 text-purple-900 font-extrabold shadow-xs ring-2 ring-purple-500/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 font-medium'
                  }`}
                >
                  <div className="text-sm font-bold">{item.label}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Document Number Input */}
          <div>
            <label htmlFor="doc-number-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Número de Documento / Identificación
            </label>
            <div className="relative">
              <input
                id="doc-number-input"
                type="text"
                value={docNumber}
                onChange={e => setDocNumber(e.target.value.replace(/[^0-9a-zA-Z-]/g, ''))}
                placeholder="Ejemplo: 1023456784"
                className="w-full pl-4 pr-12 py-3.5 text-base sm:text-lg font-mono font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                autoComplete="off"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <KeyRound className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              Ingrese el número sin puntos, comas ni espacios.
            </p>
          </div>

          {/* Error / Alert notification */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                {errorMsg}
                {alreadyVotedStudent && alreadyVotedStudent.receiptFolio && (
                  <div className="mt-2 pt-2 border-t border-red-200/80 font-mono text-[11px]">
                    Certificado emitido con Folio: <strong>{alreadyVotedStudent.receiptFolio}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="btn-submit-voter-auth"
            type="submit"
            disabled={config.status !== 'ABIERTA'}
            className={`w-full py-4 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all ${
              config.status === 'ABIERTA'
                ? 'bg-linear-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-indigo-950 text-white active:scale-[0.99] shadow-purple-900/20'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>Ingresar a Cabina y Votar</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </form>

        {/* Quick Testing Demo Shortcuts */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Estudiantes Habilitados para Prueba Rápida
            </span>
            <span className="text-[11px] text-slate-400">Clic para autocompletar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {unvotedStudents.map(student => {
              const station = getStationForMesa(student.mesaNumber);
              return (
                <button
                  type="button"
                  key={student.id}
                  onClick={() => handleQuickSelect(student)}
                  className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-xs group"
                >
                  <div className="font-bold text-slate-800 group-hover:text-purple-700 truncate">
                    {student.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between gap-1.5 mt-0.5 font-mono">
                    <span>{student.documentType}: {student.documentNumber}</span>
                    <span className="text-purple-700 font-semibold">
                      Mesa {String(student.mesaNumber).padStart(2, '0')} ({station.shortName})
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Directory of Polling Stations (Preescolar a Grado 11°) */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowStationsGuide(prev => !prev)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4 text-purple-700" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Directorio Oficial de Puestos de Votación
              </h4>
              <p className="text-[11px] text-slate-500">
                20 Mesas habilitadas desde Preescolar hasta Grado 11°
              </p>
            </div>
          </div>
          {showStationsGuide ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showStationsGuide && (
          <div className="p-4 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {POLLING_STATIONS.map(st => (
              <div key={st.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>{st.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                    {st.category}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Grados: <strong className="text-slate-700">{st.gradesCovered.join(', ')}</strong>
                </div>
                <div className="text-[10px] font-mono text-purple-700 font-bold mt-1">
                  Mesas {String(st.mesas[0]).padStart(2, '0')} a {String(st.mesas[st.mesas.length - 1]).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
