import {
  Clock,
  Cloud,
  HelpCircle,
  Laptop,
  Lock,
  LogOut,
  Radio,
  Scale,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  Vote
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useElection } from '../context/ElectionContext';
import { AppRole } from '../types/election';

interface HeaderProps {
  onOpenNormative: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNormative }) => {
  const {
    config,
    currentRole,
    setCurrentRole,
    activeVoter,
    setActiveVoter,
    juradoMesa,
    setJuradoMesa,
    isAdminAuthenticated,
    isJuradoAuthenticated,
    logoutAdmin,
    logoutJurado,
    juradoName,
    connectedComputersCount,
    isMultiComputerLive,
    setIsMultiDeviceModalOpen,
    setIsCloudBackupModalOpen,
    sheetsSyncInfo
  } = useElection();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-CO', {
          timeZone: 'America/Bogota',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRoleChange = (role: AppRole) => {
    if (activeVoter && role !== 'VOTANTE') {
      if (confirm('Hay una sesión de votación en curso. ¿Desea salir de la cabina?')) {
        setActiveVoter(null);
        setCurrentRole(role);
      }
    } else {
      setCurrentRole(role);
    }
  };

  const getStatusBadge = () => {
    switch (config.status) {
      case 'ABIERTA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            URNA ABIERTA
          </span>
        );
      case 'CERRADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            URNA CERRADA
          </span>
        );
      case 'ESCRUTADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            ESCRUTINIO FINALIZADO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            CONFIGURACIÓN
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Colombian Flag Tri-Color accent bar */}
      <div className="h-1.5 w-full flex">
        <div className="h-full w-1/2 bg-amber-400" />
        <div className="h-full w-1/4 bg-blue-700" />
        <div className="h-full w-1/4 bg-red-600" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          {/* Institution Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-auto max-w-[170px] bg-white rounded-xl p-1 shadow-xs border border-slate-200/80 flex items-center justify-center shrink-0">
              <img
                src={config.logoUrl || 'https://colegioekiraya.edu.co/wp-content/uploads/2024/09/LOGO-CEM-COLOR-02.png'}
                alt="Colegio Ekirayá - CEM"
                className="h-10 w-auto object-contain max-w-[150px]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight tracking-tight">
                  {config.institutionName}
                </h1>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span>DANE: {config.daneCode}</span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {currentTime} COT
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1 text-purple-700 font-medium">
                  <Lock className="w-3 h-3" />
                  Cifrado E2E Activo
                </span>
              </div>
            </div>
          </div>

          {/* Role Navigation & Utility Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end overflow-x-auto pb-1 md:pb-0">
            {/* Multi-Device Terminals Live Button */}
            <button
              id="btn-multi-terminal"
              onClick={() => setIsMultiDeviceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors shrink-0 shadow-2xs cursor-pointer"
              title="Equipos conectados en red en tiempo real"
            >
              <Laptop className="w-3.5 h-3.5 text-purple-700" />
              <span>{connectedComputersCount} {connectedComputersCount === 1 ? 'Equipo' : 'Equipos'}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isMultiComputerLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            </button>

            {/* Cloud Backup & Google Sheets Button - Exclusivo para Administrador */}
            {isAdminAuthenticated && (
              <button
                id="btn-cloud-backup"
                onClick={() => setIsCloudBackupModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors shrink-0 shadow-2xs cursor-pointer"
                title="Respaldo en la nube y sincronización con Google Sheets (Acceso Administrativo)"
              >
                <Cloud className="w-3.5 h-3.5 text-sky-700" />
                <span className="hidden sm:inline">Nube & Sheets</span>
                {sheetsSyncInfo.status === 'success' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
            )}

            {/* Normative Button */}
            <button
              id="btn-open-normative"
              onClick={onOpenNormative}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0 cursor-pointer"
              title="Ver Normativa Colombiana"
            >
              <Scale className="w-3.5 h-3.5 text-purple-700" />
              <span className="hidden sm:inline">Ley 115</span>
            </button>

            {/* Role Switcher Pill Group */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
              <button
                id="role-btn-consulta"
                onClick={() => handleRoleChange('CONSULTA')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentRole === 'CONSULTA'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Consultar Lugar y Mesa de Votación del Estudiante"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Consultar Puesto</span>
              </button>

              <button
                id="role-btn-votante"
                onClick={() => handleRoleChange('VOTANTE')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentRole === 'VOTANTE'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Vote className="w-3.5 h-3.5" />
                <span>Votante</span>
              </button>

              <button
                id="role-btn-jurado"
                onClick={() => handleRoleChange('JURADO')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentRole === 'JURADO'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Mesa Jurado</span>
                {isJuradoAuthenticated && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Sesión activa" />
                )}
              </button>

              <button
                id="role-btn-admin"
                onClick={() => handleRoleChange('ADMIN')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentRole === 'ADMIN'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Administrador</span>
                {isAdminAuthenticated && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" title="Sesión activa" />
                )}
              </button>
            </div>

            {/* Logout button for authenticated Jurado */}
            {currentRole === 'JURADO' && isJuradoAuthenticated && (
              <button
                onClick={() => {
                  if (confirm('¿Desea cerrar la sesión de Jurado de Votación?')) {
                    logoutJurado();
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                title="Cerrar sesión de Jurado"
              >
                <LogOut className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            )}

            {/* Logout button for authenticated Admin */}
            {currentRole === 'ADMIN' && isAdminAuthenticated && (
              <button
                onClick={() => {
                  if (confirm('¿Desea cerrar la sesión de Administrador?')) {
                    logoutAdmin();
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Cerrar sesión de Administrador"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            )}

            {/* Active voter logout helper if in booth */}
            {activeVoter && currentRole === 'VOTANTE' && (
              <button
                id="btn-exit-voting-booth"
                onClick={() => {
                  if (confirm('¿Desea salir de la cabina de votación? El proceso actual se cancelará.')) {
                    setActiveVoter(null);
                  }
                }}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Salir de Cabina"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Active Voter Notification Banner if student authenticated */}
        {activeVoter && currentRole === 'VOTANTE' && (
          <div className="mt-2.5 p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between text-xs text-purple-950">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-700 shrink-0" />
              <span>
                Sufragante habilitado:{' '}
                <strong className="font-semibold text-purple-950">{activeVoter.fullName}</strong> ({activeVoter.grade} - {activeVoter.group})
                • Asignado a <strong>Mesa 0{activeVoter.mesaNumber}</strong>
              </span>
            </div>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-purple-200/60 text-[11px] font-semibold text-purple-900">
              Voto Secreto Garantizado
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
