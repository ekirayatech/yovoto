import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle,
  Database,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Lock,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Scale,
  Settings,
  ShieldCheck,
  UserCheck,
  Users
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { ElectionStatus } from '../../types/election';
import { AdminsManagerTab } from './AdminsManagerTab';
import { AuditLogsTab } from './AuditLogsTab';
import { CandidateManagerTab } from './CandidateManagerTab';
import { CensusManagerTab } from './CensusManagerTab';
import { IntegrationsTab } from './IntegrationsTab';
import { JuradosManagerTab } from './JuradosManagerTab';
import { LiveResultsTab } from './LiveResultsTab';
import { OfficialActasTab } from './OfficialActasTab';

type AdminTab = 'results' | 'actas' | 'census' | 'candidates' | 'jurados' | 'admins' | 'audit' | 'integrations';

export const AdminDashboard: React.FC = () => {
  const { config, updateElectionStatus, resetElectionData, students, votes } = useElection();
  const [currentTab, setCurrentTab] = useState<AdminTab>('results');

  const handleStatusChange = (newStatus: ElectionStatus) => {
    if (newStatus === 'CERRADA' && !confirm('¿Está seguro de cerrar las urnas? Los estudiantes ya no podrán emitir más votos.')) {
      return;
    }
    if (newStatus === 'ESCRUTADA' && !confirm('¿Desea dar por finalizado el escrutinio oficial del Gobierno Escolar 2026?')) {
      return;
    }
    updateElectionStatus(newStatus);
  };

  const handleReset = () => {
    if (confirm('¿ATENCIÓN: Desea reiniciar la urna digital a cero y restablecer el censo? Esta acción borrará los votos de prueba actuales.')) {
      resetElectionData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Top Electoral Authority Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-900 text-white">
                Comisión Electoral Institucional
              </span>
              <span className="text-xs text-slate-500 font-medium">Ley 115 de 1994</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Panel Administrativo de Gobierno Escolar
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión de escrutinio, actas oficiales, censo, auditoría criptográfica e integraciones en la nube.
            </p>
          </div>

          {/* Urna State Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {config.status === 'ABIERTA' && (
              <button
                id="btn-close-urnas"
                onClick={() => handleStatusChange('CERRADA')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Cerrar Urnas</span>
              </button>
            )}

            {config.status === 'CERRADA' && (
              <>
                <button
                  onClick={() => handleStatusChange('ABIERTA')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Reabrir Urnas</span>
                </button>
                <button
                  onClick={() => handleStatusChange('ESCRUTADA')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Declarar Escrutinio Final</span>
                </button>
              </>
            )}

            {config.status === 'ESCRUTADA' && (
              <button
                onClick={() => handleStatusChange('ABIERTA')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reabrir Proceso</span>
              </button>
            )}

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold border border-red-200 transition-colors"
              title="Restablecer censo y urnas a cero"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Poner Urna en Cero</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Strip */}
        <div className="flex items-center gap-1.5 mt-6 pt-5 border-t border-slate-100 overflow-x-auto pb-1">
          {[
            { id: 'results', label: 'Resultados en Vivo', icon: BarChart3 },
            { id: 'actas', label: 'Actas Oficiales (E-14 / E-24)', icon: FileText },
            { id: 'census', label: 'Censo Estudiantil', icon: Users },
            { id: 'candidates', label: 'Candidatos & Tarjetón', icon: Award },
            { id: 'jurados', label: 'Jurados & Mesas', icon: UserCheck },
            { id: 'admins', label: 'Administradores', icon: KeyRound },
            { id: 'audit', label: 'Auditoría & Logs Cripto', icon: ShieldCheck },
            { id: 'integrations', label: 'Sheets & Supabase', icon: FileSpreadsheet }
          ].map(tab => {
            const Icon = tab.icon;
            const isCurrent = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`admin-tab-${tab.id}`}
                onClick={() => setCurrentTab(tab.id as AdminTab)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isCurrent
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab View */}
      {currentTab === 'results' && <LiveResultsTab />}
      {currentTab === 'actas' && <OfficialActasTab />}
      {currentTab === 'census' && <CensusManagerTab />}
      {currentTab === 'candidates' && <CandidateManagerTab />}
      {currentTab === 'jurados' && <JuradosManagerTab />}
      {currentTab === 'admins' && <AdminsManagerTab />}
      {currentTab === 'audit' && <AuditLogsTab />}
      {currentTab === 'integrations' && <IntegrationsTab />}
    </div>
  );
};
