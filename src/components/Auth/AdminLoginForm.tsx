import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';

interface AdminLoginFormProps {
  onCancel: () => void;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({ onCancel }) => {
  const { config, loginAdmin } = useElection();
  const [username, setUsername] = useState<string>('admin@ekiraya.edu.co');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const res = loginAdmin(password, username);
      if (!res.success) {
        setErrorMsg(res.error || 'Clave de administrador incorrecta. Verifique sus credenciales.');
        setIsSubmitting(false);
      }
    }, 300);
  };

  const handleFillDemo = () => {
    setUsername('admin@ekiraya.edu.co');
    setPassword('admin2026');
    setErrorMsg(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header decoration */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 text-white p-6 sm:p-7 relative">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Cabina</span>
            </button>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Lock className="w-3 h-3" />
              Acceso Restringido
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
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">
            Autenticación de Administrador
          </h2>
          <p className="text-xs text-purple-200/80 mt-1">
            {config.institutionName} • Comité Electoral Central
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Acceso Denegado</p>
                <p className="text-[11px] mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Usuario o Correo Institucional
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin@ekiraya.edu.co"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Clave Maestra de Seguridad
              </label>
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-purple-600" />
                Usar clave demo (admin2026)
              </button>
            </div>
            
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Ingrese contraseña de administrador..."
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Credential Hint Box */}
          <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-[11px] text-purple-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-purple-700 shrink-0" />
              <span>Contraseña por defecto: <strong>admin2026</strong></span>
            </span>
            <button
              type="button"
              onClick={handleFillDemo}
              className="px-2 py-1 bg-purple-200 hover:bg-purple-300 text-purple-900 rounded-lg text-[10px] font-black transition-colors"
            >
              Autocompletar
            </button>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting || !password}
              className="w-full py-3 bg-slate-900 hover:bg-purple-900 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Verificando credenciales...' : 'Ingresar al Panel Administrativo'}</span>
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

        {/* Security Footer */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-100 text-center text-[11px] text-slate-500">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            Acceso auditado y registrado bajo protocolo SHA-256
          </p>
        </div>
      </div>
    </div>
  );
};
