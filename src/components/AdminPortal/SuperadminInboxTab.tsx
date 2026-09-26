import {
  Check,
  CheckCheck,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  Filter,
  Inbox,
  Mail,
  MailCheck,
  QrCode,
  RefreshCw,
  Search,
  Send,
  X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { resolveRegistradorEmail } from '../../data/mockElectionData';
import { CertificateInboxMessage, VotingCertificate } from '../../types/election';
import { buildCertificateVerificationUrl, generateCertificateQRCode } from '../../utils/crypto';
import { generateCertificatePDF } from '../../utils/pdfGenerator';

export const SuperadminInboxTab: React.FC = () => {
  const {
    superadminInbox,
    config,
    admins,
    activeSenderInfo,
    markInboxMessageRead,
    refreshServerState,
    sendCertificateByEmail,
    verifyEmailRelayConnection
  } = useElection();

  const [searchQuery, setSearchQuery] = useState('');
  const [mesaFilter, setMesaFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<CertificateInboxMessage | null>(null);
  const [copiedFolio, setCopiedFolio] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sendingMsgId, setSendingMsgId] = useState<string | null>(null);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);
  const [customRecipientEmail, setCustomRecipientEmail] = useState<string>('');

  const registradorInfo = activeSenderInfo || resolveRegistradorEmail(admins, config.institutionEmail);
  const institutionEmail = registradorInfo.email;
  const superadminEmail = config.superadminEmail || 'rectoria@ekiraya.edu.co';

  const unreadCount = useMemo(
    () => superadminInbox.filter(m => !m.read).length,
    [superadminInbox]
  );

  const filteredMessages = useMemo(() => {
    return superadminInbox.filter(msg => {
      const matchesSearch =
        searchQuery === '' ||
        msg.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.documentNumber.includes(searchQuery) ||
        msg.folioNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (msg.certificate?.studentEmail || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMesa =
        mesaFilter === 'all' || String(msg.mesaNumber) === mesaFilter;

      return matchesSearch && matchesMesa;
    });
  }, [superadminInbox, searchQuery, mesaFilter]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFolio(id);
    setTimeout(() => setCopiedFolio(null), 2000);
  };

  const handleOpenCertificate = (msg: CertificateInboxMessage) => {
    setSelectedMessage(msg);
    setCustomRecipientEmail(msg.certificate?.studentEmail || msg.toEmail || '');
    if (!msg.read) {
      markInboxMessageRead(msg.id);
    }
  };

  const handleDownloadPDF = (cert: VotingCertificate) => {
    generateCertificatePDF({ ...cert, fromEmail: institutionEmail }, institutionEmail, superadminEmail);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshServerState();
    const relayCheck = await verifyEmailRelayConnection();
    if (relayCheck.message) {
      setDispatchNotice(relayCheck.message);
      setTimeout(() => setDispatchNotice(null), 4000);
    }
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleDispatchToVoter = async (msg: CertificateInboxMessage, overrideEmail?: string) => {
    const targetEmail = (overrideEmail || msg.certificate?.studentEmail || msg.toEmail || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) return;

    setSendingMsgId(msg.id);
    try {
      const certWithSender: VotingCertificate = {
        ...msg.certificate,
        fromEmail: institutionEmail,
        studentEmail: targetEmail
      };
      await sendCertificateByEmail(targetEmail, certWithSender);
      setDispatchNotice(
        `Certificado ${msg.folioNumber} despachado desde la bandeja del Registrador (${institutionEmail}) hacia ${targetEmail}.`
      );
      setTimeout(() => setDispatchNotice(null), 5000);
    } finally {
      setSendingMsgId(null);
    }
  };

  const buildGmailComposeUrl = (msg: CertificateInboxMessage, overrideEmail?: string) => {
    const targetEmail = (overrideEmail || msg.certificate?.studentEmail || msg.toEmail || '').trim();
    const certWithSender: VotingCertificate = {
      ...msg.certificate,
      fromEmail: institutionEmail,
      studentEmail: targetEmail
    };
    const verifyUrl = buildCertificateVerificationUrl(certWithSender);
    const subject = `Certificado Electoral de Sufragio - Folio ${msg.folioNumber} - ${msg.studentName}`;
    const body = [
      `${config.institutionName} (DANE: ${config.daneCode})`,
      `CERTIFICADO ELECTORAL DIGITAL DE SUFRAGIO - GOBIERNO ESCOLAR 2026`,
      ``,
      `Estimado(a) ${msg.studentName}:`,
      ``,
      `El Usuario Registrador (${registradorInfo.fullName} — ${institutionEmail}) certifica oficialmente su participación en la jornada electoral:`,
      ``,
      `• Folio Único de Verificación: ${msg.folioNumber}`,
      `• Sufragante: ${msg.studentName}`,
      `• Documento: ${msg.documentType} ${msg.documentNumber}`,
      `• Grado y Grupo: ${msg.grade} (${msg.group})`,
      `• Mesa Receptora: Mesa N° 0${msg.mesaNumber}`,
      `• Remitente Oficial (Registrador): ${institutionEmail}`,
      `• Hash Criptográfico SHA-256: ${msg.verificationHash}`,
      ``,
      `Verificar autenticidad del certificado en línea (QR):`,
      verifyUrl
    ].join('\n');

    return `https://mail.google.com/mail/?view=cm&fs=1&authuser=${encodeURIComponent(
      institutionEmail
    )}&to=${encodeURIComponent(targetEmail)}&cc=${encodeURIComponent(
      superadminEmail
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-6">
      {dispatchNotice && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <MailCheck className="w-4 h-4 shrink-0" />
            <span>{dispatchNotice}</span>
          </div>
          <button onClick={() => setDispatchNotice(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner with Registrador & Superadmin Email Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 border border-purple-200">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-900">
                  Bandeja de Certificados del Registrador y Superadministrador
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <MailCheck className="w-3.5 h-3.5" />
                  Despacho Automático al Votante Activo
                </span>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-700 text-white">
                    {unreadCount} sin leer
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Todos los certificados electorales salen desde el correo del <strong>Usuario Registrador ({registradorInfo.fullName} — {institutionEmail})</strong> hacia el correo de cada votante y se archivan en esta bandeja oficial.
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sincronizar Bandeja</span>
          </button>
        </div>

        {/* Email Route Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Bandeja de Salida Registrador (From)
            </span>
            <span className="font-mono font-bold text-emerald-950 truncate block mt-0.5">
              {institutionEmail}
            </span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">
              {registradorInfo.fullName}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Copia Superadministrador (CC)
            </span>
            <span className="font-mono font-bold text-purple-900 truncate block mt-0.5">
              {superadminEmail}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Archivo Electoral Institucional
            </span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
              Total Certificados Emitidos y Enviados
            </span>
            <span className="text-base font-black text-purple-950 block mt-0.5">
              {superadminInbox.length} certificados oficiales
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por votante, correo, folio o documento..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={mesaFilter}
              onChange={e => setMesaFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-700 font-semibold w-full sm:w-auto"
            >
              <option value="all">Todas las Mesas Receptoras</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map(m => (
                <option key={m} value={String(m)}>
                  Mesa N° {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inbox Message List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Bandeja del Registrador — Certificados Emitidos ({filteredMessages.length})
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">
            Remitente activo: <strong className="font-mono text-emerald-800">{institutionEmail}</strong>
          </span>
        </div>

        {filteredMessages.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Inbox className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-700">No hay certificados en la bandeja</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Cuando los estudiantes emitan su voto en el tarjetón, sus certificados saldrán automáticamente desde {institutionEmail} hacia el correo del votante y aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredMessages.map(msg => {
              const formattedDate = new Date(msg.timestamp).toLocaleString('es-CO', {
                dateStyle: 'short',
                timeStyle: 'medium'
              });
              const voterEmail = msg.certificate?.studentEmail || msg.toEmail;
              const senderEmail = msg.fromEmail || institutionEmail;

              return (
                <div
                  key={msg.id}
                  className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    !msg.read ? 'bg-purple-50/30 hover:bg-purple-50/50' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Unread indicator / status icon */}
                    <div className="mt-1 shrink-0">
                      {!msg.read ? (
                        <span title="No leído">
                          <div className="w-2.5 h-2.5 rounded-full bg-purple-600 ring-4 ring-purple-100" />
                        </span>
                      ) : (
                        <span title="Leído / Despachado">
                          <CheckCheck className="w-4 h-4 text-emerald-600" />
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-purple-900 bg-purple-100/70 px-2 py-0.5 rounded-md">
                          {msg.folioNumber}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700">
                          Mesa {String(msg.mesaNumber).padStart(2, '0')}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Check className="w-3 h-3" />
                          DESPACHADO
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-bold text-slate-900 truncate">
                          {msg.studentName}
                        </h5>
                        <span className="text-xs text-slate-500 font-medium">
                          ({msg.grade} - {msg.group})
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
                        <span>
                          Doc: <strong className="font-mono text-slate-700">{msg.documentType} {msg.documentNumber}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          De (Registrador): <strong className="text-emerald-800 font-mono">{senderEmail}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Para (Votante): <strong className="text-purple-800 font-mono">{voterEmail}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0 self-end lg:self-center">
                    <button
                      onClick={() => handleCopy(msg.folioNumber, msg.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                      title="Copiar folio"
                    >
                      {copiedFolio === msg.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDispatchToVoter(msg)}
                      disabled={sendingMsgId === msg.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      title={`Reenviar certificado desde ${senderEmail} a ${voterEmail}`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{sendingMsgId === msg.id ? 'Enviando...' : 'Enviar al Votante'}</span>
                    </button>

                    <a
                      href={buildGmailComposeUrl(msg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition-colors"
                      title={`Abrir en Gmail del Registrador (${senderEmail})`}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-purple-700" />
                      <span>Gmail Registrador</span>
                    </a>

                    <button
                      onClick={() => handleOpenCertificate(msg)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver QR y Certificado</span>
                    </button>

                    <button
                      onClick={() => handleDownloadPDF(msg.certificate)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      title="Descargar PDF con QR escaneable"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Certificate Detailed Modal with Scannable QR & Direct Dispatch */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-400/30 flex items-center justify-center font-bold">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                    Bandeja del Registrador • Despacho Oficial
                  </span>
                  <h3 className="text-base font-black text-white leading-tight">
                    Certificado de Sufragio - Folio {selectedMessage.folioNumber}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedMessage(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Transmission Meta Card */}
            <div className="p-5 bg-purple-50/80 border-b border-purple-200 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">De (Registrador)</span>
                  <span className="font-bold text-emerald-900 font-mono text-[11px] truncate block">
                    {selectedMessage.fromEmail || institutionEmail}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Para (Votante)</span>
                  <span className="font-bold text-purple-900 font-mono text-[11px] truncate block">
                    {selectedMessage.certificate?.studentEmail || selectedMessage.toEmail}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha y Hora</span>
                  <span className="font-bold text-slate-800 text-[11px] truncate block">
                    {new Date(selectedMessage.timestamp).toLocaleTimeString('es-CO')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Estado de Entrega</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800 text-[11px]">
                    <CheckCheck className="w-3.5 h-3.5" />
                    DESPACHADO
                  </span>
                </div>
              </div>
            </div>

            {/* Certificate Preview Card with Real Scannable QR Code */}
            <div className="p-6 bg-slate-50 space-y-4">
              <div className="bg-white p-5 rounded-2xl border-2 border-purple-700 shadow-sm space-y-4">
                <div className="text-center border-b border-slate-100 pb-3">
                  <h4 className="font-black text-slate-900 uppercase text-sm">
                    {selectedMessage.certificate.schoolName}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    CÓDIGO DANE: {selectedMessage.certificate.daneCode} • GOBIERNO ESCOLAR 2026
                  </p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-extrabold uppercase">
                    Certificado Oficial de Votación
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Estudiante</span>
                      <span className="font-extrabold text-slate-900 text-sm">{selectedMessage.studentName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Identificación</span>
                      <span className="font-mono font-bold text-slate-800">
                        {selectedMessage.documentType} {selectedMessage.documentNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Grado y Grupo</span>
                      <span className="font-bold text-slate-800">
                        {selectedMessage.grade} - {selectedMessage.group}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Mesa Asignada</span>
                      <span className="font-bold text-purple-800">
                        Mesa N° {String(selectedMessage.mesaNumber).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Correo Envío (Usuario Registrador)
                      </span>
                      <span className="font-mono font-bold text-emerald-800 text-[11px]">
                        {selectedMessage.fromEmail || institutionEmail} ({registradorInfo.fullName})
                      </span>
                    </div>
                  </div>

                  {/* Scannable ISO/IEC 18004 QR Code */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <img
                      src={generateCertificateQRCode({
                        ...selectedMessage.certificate,
                        fromEmail: selectedMessage.fromEmail || institutionEmail
                      })}
                      alt="QR Verificación Certificado"
                      className="w-28 h-28 object-contain rounded-lg shadow-xs bg-white"
                    />
                    <span className="text-[10px] font-bold text-slate-600 mt-1 flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-purple-700" />
                      QR Criptográfico
                    </span>
                    <span className="text-[9px] text-slate-400">Escaneable con cámara</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-800 block">Folio Criptográfico</span>
                    <span className="font-mono font-black text-slate-900 text-sm">{selectedMessage.folioNumber}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Hash de Verificación</span>
                    <span className="font-mono text-[9px] text-slate-500">
                      {selectedMessage.verificationHash.slice(0, 16)}...
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Voter Email Dispatch Box inside Modal */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Despachar / Reenviar Certificado al Correo del Votante desde {institutionEmail}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={customRecipientEmail}
                    onChange={e => setCustomRecipientEmail(e.target.value)}
                    placeholder="correo.votante@gmail.com"
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleDispatchToVoter(selectedMessage, customRecipientEmail)}
                    disabled={sendingMsgId === selectedMessage.id}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingMsgId === selectedMessage.id ? 'Enviando...' : 'Enviar al Votante'}</span>
                  </button>
                  <a
                    href={buildGmailComposeUrl(selectedMessage, customRecipientEmail)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-purple-700" />
                    <span>Abrir en Gmail</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cerrar
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(selectedMessage.certificate)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Certificado PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
