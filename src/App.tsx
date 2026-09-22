import {
  ExternalLink,
  Heart,
  Lock,
  Scale,
  ShieldCheck
} from 'lucide-react';
import React, { useState } from 'react';
import { AdminDashboard } from './components/AdminPortal/AdminDashboard';
import { AdminLoginForm } from './components/Auth/AdminLoginForm';
import { JuradoLoginForm } from './components/Auth/JuradoLoginForm';
import { Header } from './components/Header';
import { JuradoDashboard } from './components/JuradoPortal/JuradoDashboard';
import { CloudBackupModal } from './components/Modals/CloudBackupModal';
import { MultiDeviceSyncModal } from './components/Modals/MultiDeviceSyncModal';
import { NormativeModal } from './components/NormativeModal';
import { BallotBox } from './components/VoterPortal/BallotBox';
import { VoteConfirmationModal } from './components/VoterPortal/VoteConfirmationModal';
import { VoterAuth } from './components/VoterPortal/VoterAuth';
import { VotingCertificateModal } from './components/VoterPortal/VotingCertificateModal';
import { ElectionProvider, useElection } from './context/ElectionContext';

function MainLayout() {
  const {
    currentRole,
    setCurrentRole,
    activeVoter,
    latestCertificate,
    setLatestCertificate,
    setActiveVoter,
    isAdminAuthenticated,
    isJuradoAuthenticated
  } = useElection();
  const [isNormativeOpen, setIsNormativeOpen] = useState<boolean>(false);
  const [pendingSelections, setPendingSelections] = useState<Record<string, string> | null>(null);

  const handleProceedToConfirm = (selections: Record<string, string>) => {
    setPendingSelections(selections);
  };

  const handleVoteSuccess = () => {
    setPendingSelections(null);
    // latestCertificate is set inside context castVote
  };

  const handleCloseCertificate = () => {
    setLatestCertificate(null);
    setActiveVoter(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Institutional Global Header */}
      <Header onOpenNormative={() => setIsNormativeOpen(true)} />

      {/* Main App Portal View according to Active Role */}
      <main className="flex-1 pb-16">
        {currentRole === 'VOTANTE' && (
          <>
            {!activeVoter ? (
              <VoterAuth />
            ) : (
              <BallotBox onProceedToConfirm={handleProceedToConfirm} />
            )}

            {/* Vote confirmation dialog */}
            {pendingSelections && (
              <VoteConfirmationModal
                isOpen={!!pendingSelections}
                selections={pendingSelections}
                onClose={() => setPendingSelections(null)}
                onSuccess={handleVoteSuccess}
              />
            )}

            {/* Voting Certificate Modal upon successful ballot casting */}
            {latestCertificate && (
              <VotingCertificateModal
                certificate={latestCertificate}
                onClose={handleCloseCertificate}
              />
            )}
          </>
        )}

        {currentRole === 'JURADO' && (
          !isJuradoAuthenticated ? (
            <JuradoLoginForm onCancel={() => setCurrentRole('VOTANTE')} />
          ) : (
            <JuradoDashboard />
          )
        )}

        {currentRole === 'ADMIN' && (
          !isAdminAuthenticated ? (
            <AdminLoginForm onCancel={() => setCurrentRole('VOTANTE')} />
          ) : (
            <AdminDashboard />
          )
        )}
      </main>

      {/* Normative Reference Modal */}
      <NormativeModal
        isOpen={isNormativeOpen}
        onClose={() => setIsNormativeOpen(false)}
      />

      {/* Multi-Device Synchronized Network Modal */}
      <MultiDeviceSyncModal />

      {/* Cloud Backup and Google Sheets Modal */}
      <CloudBackupModal />

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 no-print text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🇨🇴</span>
            <span>
              <strong>Sistema de Votación estudiantil colegio Ekirayá</strong> • Gobierno Escolar 2026
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap justify-center">
            <span className="flex items-center gap-1 text-blue-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Cifrado E2E SHA-256
            </span>
            <span>•</span>
            <button
              onClick={() => setIsNormativeOpen(true)}
              className="hover:text-blue-700 font-medium underline underline-offset-2"
            >
              Ley 115 de 1994 (Art. 142)
            </button>
            <span>•</span>
            <span>Decreto 1860 de 1994 (Art. 28)</span>
            <span>•</span>
            <span>Ley 2195 de 2022 (Contraloría Escolar)</span>
          </div>

          <p className="text-[11px] text-slate-400">
            Urna y Registro Blindado • Anonimato Constitucional
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ElectionProvider>
      <MainLayout />
    </ElectionProvider>
  );
}
