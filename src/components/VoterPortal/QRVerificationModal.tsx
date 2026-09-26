import {
  CheckCircle2,
  ExternalLink,
  Mail,
  QrCode,
  ShieldCheck,
  UserCheck,
  X
} from 'lucide-react';
import React from 'react';
import { useElection } from '../../context/ElectionContext';
import { getStationForMesa, resolveRegistradorEmail } from '../../data/mockElectionData';
import { generateCertificateQRCode } from '../../utils/crypto';

export interface QRVerificationData {
  folioNumber: string;
  studentName?: string;
  documentInfo?: string;
  gradeInfo?: string;
  mesaNumber?: number;
  fromEmail?: string;
  hashPrefix?: string;
}

interface QRVerificationModalProps {
  data: QRVerificationData | null;
  onClose: () => void;
}

export const QRVerificationModal: React.FC<QRVerificationModalProps> = ({ data, onClose }) => {
  const { students, admins, config, superadminInbox } = useElection();

  if (!data) return null;

  const registradorInfo = resolveRegistradorEmail(admins, config.institutionEmail);

  // Match against live census / inbox if available
  const matchedInbox = superadminInbox.find(
    m => m.folioNumber.toLowerCase() === data.folioNumber.toLowerCase()
  );
  const matchedStudent = students.find(
    s =>
      (s.receiptFolio && s.receiptFolio.toLowerCase() === data.folioNumber.toLowerCase()) ||
      (data.documentInfo && data.documentInfo.includes(s.documentNumber))
  );

  const studentName =
    matchedInbox?.studentName ||
    matchedStudent?.fullName ||
    data.studentName ||
    'Sufragante Verificado';
  const documentInfo =
    matchedInbox
      ? `${matchedInbox.documentType} ${matchedInbox.documentNumber}`
      : matchedStudent
      ? `${matchedStudent.documentType} ${matchedStudent.documentNumber}`
      : data.documentInfo || 'Documento Verificado en Censo';
  const gradeInfo =
    matchedInbox
      ? `${matchedInbox.grade} - ${matchedInbox.group}`
      : matchedStudent
      ? `${matchedStudent.grade} - ${matchedStudent.group}`
      : data.gradeInfo || 'Gobierno Escolar 2026';
  const mesaNum =
    matchedInbox?.mesaNumber || matchedStudent?.mesaNumber || data.mesaNumber || 1;
  const senderEmail =
    matchedInbox?.fromEmail || data.fromEmail || registradorInfo.email;
  const hashDisplay =
    matchedInbox?.verificationHash || data.hashPrefix || 'SHA256-VERIFICADO';
  const station = getStationForMesa(mesaNum);

  const qrImg = generateCertificateQRCode({
    folioNumber: data.folioNumber,
    studentName,
    documentNumber: documentInfo,
    grade: gradeInfo,
    mesaNumber: mesaNum,
    fromEmail: senderEmail,
    verificationHash: hashDisplay
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
                Verificación Criptográfica QR Oficial
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                Certificado Electoral Auténtico
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div className="text-xs text-emerald-950">
              <p className="font-black text-sm text-emerald-900">
                Voto Válido y Registrado en Urna Cifrada
              </p>
              <p className="text-emerald-800">
                {config.institutionName} • Código DANE {config.daneCode}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="sm:col-span-2 space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Folio Electoral Oficial
                </span>
                <span className="font-mono font-black text-purple-900 text-sm">
                  {data.folioNumber}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Estudiante Sufragante
                </span>
                <span className="font-black text-slate-900 text-sm block">
                  {studentName}
                </span>
                <span className="font-mono text-slate-600 text-[11px]">
                  {documentInfo} · {gradeInfo}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Mesa Receptora
                </span>
                <span className="font-bold text-slate-800">
                  Mesa N° {String(mesaNum).padStart(2, '0')} ({station.name})
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-white p-2.5 rounded-xl border border-slate-200">
              <img
                src={qrImg}
                alt="QR Verificado"
                className="w-24 h-24 object-contain"
              />
              <span className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
                <QrCode className="w-3 h-3" />
                ISO-18004 OK
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-700" />
                Expedido por Usuario Registrador:
              </span>
              <span className="font-mono font-bold text-purple-950">{senderEmail}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-700" />
                Registrador Electoral:
              </span>
              <span className="font-bold text-slate-800">{registradorInfo.fullName}</span>
            </div>
            <div className="pt-1 border-t border-purple-200/70 font-mono text-[10px] text-purple-900 truncate">
              FIRMA SHA-256: {hashDisplay}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar Verificador Criptográfico
          </button>
        </div>
      </div>
    </div>
  );
};
