import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Sparkles,
  UserCheck,
  Users
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';

interface JuradoLoginFormProps {
  onCancel: () => void;
}

export const JuradoLoginForm: React.FC<JuradoLoginFormProps> = ({ onCancel }) => {
  const { config, loginJurado, juradoMesa } = useElection();
  const [selectedMesa, setSelectedMesa] = useState<number>(juradoMesa || 1);
  const [juradoName, setJuradoName] = useState<string>('Prof. Carlos Mendoza (Delegado)');
  const [juradoDoc, setJuradoDoc] = useState<string>('79450123');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const totalMesas = config.totalMesas || 6;
  const mesasList = Array.from({ length: totalMesas }, (_, i) => i + 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!juradoName.trim()) {
      setErrorMsg('Por favor ingrese el nombre del jurado.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const res = loginJurado(selectedMesa, juradoName.trim(), pin);
      if (!res.success) {
        setErrorMsg(res.error || 'PIN o clave de mesa incorrecta.');
        setIsSubmitting(false);
      }
    }, 300);
  };

  const handleFillDemo = () => {
    setSelectedMesa(1);
    setJuradoName('Prof. Carlos Mendoza (Delegado)');
    setJuradoDoc('79450123');
    setPin('jurado2026');
    setErrorMsg(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header decoration */}
        <div className="bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 text-white p-6 sm:p-7 relative">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Cabina</span>
            </button>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
              <Users className="w-3 h-3" />
              Formato E-11 Oficial
            </span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white rounded-xl p-1.5 shadow-xs border border-white/20 inline-flex items-center justify-center">
              <img
                src={config.logoUrl || 'https://colegioekiraya.edu.co/wp-content/uploads/2024/09/LOGO-CEM-COLOR-02.png'}
                alt="Colegio Ekirayá - CEM"
                className="h-10 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">
            Acreditación de Jurado de Mesa
          </h2>
          <p className="text-xs text-emerald-200/80 mt-1">
            {config.institutionName} • Control y Habilitación de Votantes
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error de Acreditación</p>
                <p className="text-[11px] mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Mesa Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mesa de Votación a Instalar
            </label>
            <select
              value={selectedMesa}
              onChange={e => setSelectedMesa(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
            >
              {mesasList.map(m => (
                <option key={m} value={m}>
                  Mesa 0{m} — Aula {100 + m} (Capacidad oficial)
                </option>
              ))}
            </select>
          </div>

          {/* Juror Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nombre Completo del Jurado
            </label>
            <input
              type="text"
              value={juradoName}
              onChange={e => setJuradoName(e.target.value)}
              placeholder="Ej: Prof. Carlos Mendoza"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
              required
            />
          </div>

          {/* Juror Document */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Documento de Identidad del Jurado
            </label>
            <input
              type="text"
              value={juradoDoc}
              onChange={e => setJuradoDoc(e.target.value)}
              placeholder="Ej: 79450123"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
            />
          </div>

          {/* Security PIN */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                PIN de Activación de Mesa
              </label>
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Usar PIN demo (jurado2026)
              </button>
            </div>

            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => {
                  setPin(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Ingrese PIN de jurado..."
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Credential Hint Box */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>PIN por defecto: <strong>jurado2026</strong></span>
            </span>
            <button
              type="button"
              onClick={handleFillDemo}
              className="px-2 py-1 bg-emerald-200 hover:bg-emerald-300 text-emerald-900 rounded-lg text-[10px] font-black transition-colors"
            >
              Autocompletar
            </button>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting || !pin}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Acreditando jurado...' : `Instalar y Abrir Mesa 0${selectedMesa}`}</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-xs font-bold rounded-xl transition-colors"
            >
              Cancelar y Regresar
            </button>
          </div>
        </form>

        {/* Legal badge */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-100 text-center text-[11px] text-slate-500">
          <p>
            Decreto 1860 de 1994 • Los jurados son custodios del secreto del voto
          </p>
        </div>
      </div>
    </div>
  );
};
