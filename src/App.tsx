import {
  CheckCircle2,
  ExternalLink,
  Heart,
  Lock,
  Mail,
  QrCode,
  Scale,
  ShieldCheck,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
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
import { ConsultarPuestoPage } from './components/VoterPortal/ConsultarPuestoPage';
import { ElectionProvider, useElection } from './context/ElectionContext';
import { resolveRegistradorEmail } from './data/mockElectionData';

function MainLayout() {
  const {
    currentRole,
    setCurrentRole,
    activeVoter,
    latestCertificate,
    setLatestCertificate,
    setActiveVoter,
    isAdminAuthenticated,
    isJuradoAuthenticated,
    students,
    superadminInbox,
    admins,
    config
  } = useElection();
  const [isNormativeOpen, setIsNormativeOpen] = useState<boolean>(false);
  const [pendingSelections, setPendingSelections] = useState<Record<string, string> | null>(null);
  const [qrVerificationParams, setQrVerificationParams] = useState<{
    folio: string;
    name?: string;
    doc?: string;
    grade?: string;
    mesa?: string;
    from?: string;
    hash?: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const verifyVal = params.get('verify') || params.get('v');
    if (verifyVal) {
      setQrVerificationParams({
        folio: verifyVal,
        name: params.get('name') || params.get('n') || undefined,
        doc: params.get('doc') || params.get('d') || undefined,
        grade: params.get('grade') || params.get('g') || undefined,
        mesa: params.get('mesa') || params.get('m') || undefined,
        from: params.get('from') || params.get('f') || undefined,
        hash: params.get('hash') || params.get('h') || undefined
      });
    }
  }, []);

  const verifiedCertDetails = React.useMemo(() => {
    if (!qrVerificationParams) return null;
    const registradorInfo = resolveRegistradorEmail(admins, config.institutionEmail);
    const matchedInbox = superadminInbox.find(
      m =>
        m.folioNumber === qrVerificationParams.folio ||
        m.verificationHash.startsWith(qrVerificationParams.folio)
    );
    const matchedStudent = students.find(
      s => s.receiptFolio === qrVerificationParams.folio
    );

    return {
      folio: matchedInbox?.folioNumber || matchedStudent?.receiptFolio || qrVerificationParams.folio,
      studentName:
        matchedInbox?.studentName ||
        matchedStudent?.fullName ||
        qrVerificationParams.name ||
        'Sufragante Verificado en Censo Oficial',
      document:
        matchedInbox
          ? `${matchedInbox.documentType} ${matchedInbox.documentNumber}`
          : matchedStudent
          ? `${matchedStudent.documentType} ${matchedStudent.documentNumber}`
          : qrVerificationParams.doc || 'Validado en Censo Electoral',
      grade:
        matchedInbox
          ? `${matchedInbox.grade} - ${matchedInbox.group}`
          : matchedStudent
          ? `${matchedStudent.grade} - ${matchedStudent.group}`
          : qrVerificationParams.grade || 'Gobierno Escolar 2026',
      mesa:
        matchedInbox?.mesaNumber ||
        matchedStudent?.mesaNumber ||
        qrVerificationParams.mesa ||
        '01',
      fromEmail:
        matchedInbox?.fromEmail ||
        qrVerificationParams.from ||
        registradorInfo.email,
      registradorName: registradorInfo.fullName,
      hash:
        matchedInbox?.verificationHash ||
        qrVerificationParams.hash ||
        qrVerificationParams.folio
    };
  }, [qrVerificationParams, superadminInbox, students, admins, config.institutionEmail]);

  const handleCloseQrVerify = () => {
    setQrVerificationParams(null);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  };

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

        {currentRole === 'CONSULTA' && (
          <ConsultarPuestoPage />
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

      {/* Official QR Code Certificate Verification Modal */}
      {verifiedCertDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-emerald-500 overflow-hidden">
            <div className="bg-emerald-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 block">
                    Verificación Criptográfica QR Exitosa
                  </span>
                  <h3 className="text-base font-black text-white">
                    Certificado Electoral Auténtico y Válido
                  </h3>
                </div>
              </div>
              <button
                onClick={handleCloseQrVerify}
                className="p-2 text-emerald-100 hover:text-white rounded-xl hover:bg-emerald-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                    Folio Oficial Verificado
                  </span>
                  <span className="font-mono font-black text-sm text-emerald-950">
                    {verifiedCertDetails.folio}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase">
                  Sellado en Urna
                </span>
              </div>

              <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between py-1 border-b border-slate-200/70">
                  <span className="text-slate-500 font-semibold">Institución:</span>
                  <span className="font-bold text-slate-900">{config.institutionName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/70">
                  <span className="text-slate-500 font-semibold">Sufragante:</span>
                  <span className="font-black text-slate-900">{verifiedCertDetails.studentName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/70">
                  <span className="text-slate-500 font-semibold">Documento:</span>
                  <span className="font-mono font-bold text-slate-800">{verifiedCertDetails.document}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/70">
                  <span className="text-slate-500 font-semibold">Grado / Curso:</span>
                  <span className="font-bold text-slate-800">{verifiedCertDetails.grade}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/70">
                  <span className="text-slate-500 font-semibold">Mesa Receptora:</span>
                  <span className="font-bold text-purple-800">Mesa N° {String(verifiedCertDetails.mesa).padStart(2, '0')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-semibold">Expedidor (Registrador):</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {verifiedCertDetails.fromEmail}
                  </span>
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-500 bg-slate-100 p-2.5 rounded-xl truncate">
                SHA-256: {verifiedCertDetails.hash}
              </div>

              <button
                onClick={handleCloseQrVerify}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors"
              >
                Cerrar Verificación Oficial
              </button>
            </div>
          </div>
        </div>
      )}

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
