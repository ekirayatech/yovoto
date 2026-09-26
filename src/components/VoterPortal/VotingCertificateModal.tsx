import confetti from 'canvas-confetti';
import {
  Check,
  CheckCircle,
  Copy,
  Download,
  Mail,
  Printer,
  QrCode,
  Send,
  ShieldCheck,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { getStationForMesa, resolveRegistradorEmail } from '../../data/mockElectionData';
import { VotingCertificate } from '../../types/election';
import { generateCertificateQRCode } from '../../utils/crypto';
import { generateCertificatePDF } from '../../utils/pdfGenerator';

interface VotingCertificateModalProps {
  certificate: VotingCertificate;
  onClose: () => void;
}

export const VotingCertificateModal: React.FC<VotingCertificateModalProps> = ({
  certificate,
  onClose
}) => {
  const { sendCertificateByEmail, config, admins, activeSenderInfo } = useElection();
  const registradorInfo = activeSenderInfo || resolveRegistradorEmail(admins, config.institutionEmail);
  const senderEmail = registradorInfo.email || certificate.fromEmail;
  const [recipientEmail, setRecipientEmail] = useState<string>(
    certificate.studentEmail || 'estudiante@ekiraya.edu.co'
  );
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copiedFolio, setCopiedFolio] = useState<boolean>(false);

  // Trigger celebration confetti on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignored if canvas not ready
    }
  }, []);

  const certStation = getStationForMesa(certificate.mesaNumber);
  const fullCertForQr: VotingCertificate = { ...certificate, fromEmail: senderEmail };
  const qrUrl = generateCertificateQRCode(fullCertForQr);

  const handleDownloadPDF = () => {
    generateCertificatePDF(fullCertForQr, senderEmail, config.superadminEmail);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) return;

    setIsSendingEmail(true);
    setEmailStatus('idle');

    try {
      const res = await sendCertificateByEmail(recipientEmail, certificate);
      if (res.success) {
        setEmailStatus('success');
      } else {
        setEmailStatus('error');
      }
    } catch {
      setEmailStatus('error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCopyFolio = () => {
    navigator.clipboard.writeText(certificate.folioNumber);
    setCopiedFolio(true);
    setTimeout(() => setCopiedFolio(false), 2000);
  };

  const formattedDate = new Date(certificate.timestamp).toLocaleString('es-CO', {
    dateStyle: 'long',
    timeStyle: 'medium'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center font-bold">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                ¡Voto Registrado con Éxito!
              </span>
              <h3 className="text-lg font-black text-white leading-tight">
                Certificado Electoral Digital
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Automatic Email Notification Banner */}
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start gap-3 shadow-xs no-print">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex-1 text-xs space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-emerald-900 text-sm">
                Certificado remitido automáticamente desde el correo del Usuario Registrador
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                <Mail className="w-3 h-3 text-emerald-800" />
                Remitente: {senderEmail}
              </span>
            </div>
            <p className="text-emerald-800 leading-relaxed">
              El certificado con folio <strong>{certificate.folioNumber}</strong> ha sido enviado desde el correo del <strong>Usuario Registrador ({registradorInfo.fullName})</strong>: <strong className="font-mono text-emerald-950">{senderEmail}</strong> al correo del votante{certificate.studentEmail ? <> (<strong className="font-mono text-emerald-950">{certificate.studentEmail}</strong>)</> : ''} y con copia a la Bandeja del Superadministrador (<span className="font-mono text-emerald-950">{config.superadminEmail || 'rectoria@ekiraya.edu.co'}</span>).
            </p>
          </div>
        </div>

        {/* Printable Document Element */}
        <div id="printable-document" className="p-6 md:p-8 bg-slate-50 border-b border-slate-200">
          <div className="bg-white rounded-2xl border-2 border-purple-700 shadow-md p-6 relative overflow-hidden">
            {/* Purple and white institution accent ribbon */}
            <div className="h-2 w-full bg-linear-to-r from-purple-700 via-white to-purple-900 absolute top-0 left-0" />

            {/* Institution & Title */}
            <div className="text-center pt-2 pb-4 border-b border-slate-200">
              <div className="h-14 mx-auto mb-2 flex items-center justify-center">
                <img
                  src={certificate.schoolLogo || config.logoUrl || 'https://colegioekiraya.edu.co/wp-content/uploads/2024/09/LOGO-CEM-COLOR-02.png'}
                  alt="Colegio Ekirayá - CEM"
                  className="h-12 w-auto object-contain max-w-[180px]"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                {certificate.schoolName}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                CÓDIGO DANE: {certificate.daneCode} • REPÚBLICA DE COLOMBIA
              </p>
              <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-purple-50 text-purple-900 text-[11px] font-extrabold uppercase tracking-wider border border-purple-200">
                Certificado Oficial de Votación • Gobierno Escolar 2026
              </div>
              <p className="text-[10px] text-slate-400 italic mt-1">
                Conforme a la Ley 115 de 1994 y Decreto 1860 de 1994 (Art. 28)
              </p>
            </div>

            {/* Student & Table Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 items-center">
              <div className="md:col-span-2 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Nombre del Sufragante:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{certificate.studentName}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Identificación Oficial:</span>
                  <span className="font-bold text-slate-900 font-mono">{certificate.documentType} N° {certificate.documentNumber}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Grado y Grupo:</span>
                  <span className="font-bold text-slate-900">{certificate.grade} ({certificate.group})</span>
                </div>
                {certificate.studentEmail && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-500">Correo Electrónico:</span>
                    <span className="font-medium text-slate-900 font-mono">{certificate.studentEmail}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Mesa Receptora:</span>
                  <span className="font-bold text-purple-800">
                    Mesa N° {String(certificate.mesaNumber).padStart(2, '0')} - {certStation.name} ({certStation.category})
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Fecha y Hora:</span>
                  <span className="font-medium text-slate-800">{formattedDate}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="font-semibold text-slate-500">Correo Envío (Registrador):</span>
                  <span className="font-medium text-emerald-800 text-[11px] font-mono">
                    De: {senderEmail} ({registradorInfo.fullName})
                  </span>
                </div>
              </div>

              {/* QR Code and verification tag */}
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                <img
                  src={qrUrl}
                  alt="QR Verificación Certificado"
                  className="w-28 h-28 object-contain rounded-lg shadow-xs"
                />
                <span className="text-[10px] font-bold text-slate-600 mt-1 flex items-center gap-1">
                  <QrCode className="w-3 h-3 text-purple-700" />
                  QR Criptográfico
                </span>
                <span className="text-[9px] text-slate-400">Verificable en línea</span>
              </div>
            </div>

            {/* Cryptographic Folio Card */}
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                    Folio Único de Verificación
                  </span>
                  <span className="text-sm font-mono font-black text-purple-950 select-all">
                    {certificate.folioNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyFolio}
                  className="no-print inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white text-purple-700 border border-purple-300 hover:bg-purple-100 transition-colors"
                >
                  {copiedFolio ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedFolio ? 'Copiado' : 'Copiar Folio'}</span>
                </button>
              </div>
              <div className="mt-2 text-[9px] font-mono text-purple-900/80 truncate">
                HASH: {certificate.verificationHash}
              </div>
            </div>

            {/* Signatures */}
            <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-6 text-center text-xs">
              <div>
                <div className="font-cursive text-slate-400 italic text-sm mb-1">
                  {certificate.rectorName}
                </div>
                <div className="w-36 h-0.5 bg-slate-400 mx-auto mb-1" />
                <p className="font-bold text-slate-900">{certificate.rectorName}</p>
                <p className="text-[10px] text-slate-500">Rector(a) y Clavero Institucional</p>
              </div>
              <div>
                <div className="font-cursive text-slate-400 italic text-sm mb-1">
                  Mesa {String(certificate.mesaNumber).padStart(2, '0')} Jurado Principal
                </div>
                <div className="w-36 h-0.5 bg-slate-400 mx-auto mb-1" />
                <p className="font-bold text-slate-900">Jurados de Mesa N° {String(certificate.mesaNumber).padStart(2, '0')}</p>
                <p className="text-[10px] text-slate-500">Comité Electoral de Estudiantes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Sending & Export Actions */}
        <div className="p-6 bg-white space-y-4 no-print">
          {/* Email Dispatch Section */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-700" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Enviar o reenviar certificado al votante por correo
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Remitente (Registrador): <strong className="text-purple-800">{senderEmail}</strong>
              </span>
            </div>

            <form onSubmit={handleSendEmail} className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="estudiante@ekiraya.edu.co"
                className="flex-1 w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                required
              />
              <button
                type="submit"
                disabled={isSendingEmail}
                className="w-full sm:w-auto px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 shadow-xs"
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Reenviar Copia</span>
                  </>
                )}
              </button>
            </form>

            {emailStatus === 'success' && (
              <p className="text-[11px] text-emerald-700 font-medium mt-2 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Certificado digital remitido desde <strong className="font-mono">{senderEmail}</strong> (Usuario Registrador) a <strong>{recipientEmail}</strong>.
              </p>
            )}
            {emailStatus === 'error' && (
              <p className="text-[11px] text-red-600 font-medium mt-2">
                No se pudo remitir el correo en este momento. Puede descargarlo directamente en PDF.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descargar en PDF</span>
              </button>
              
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors"
            >
              Finalizar y Salir de Cabina
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
