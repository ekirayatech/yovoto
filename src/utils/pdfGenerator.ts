import jsPDF from 'jspdf';
import { getStationForMesa, POLLING_STATIONS } from '../data/mockElectionData';
import { Candidate, ElectionConfig, EncryptedVote, Position, Student, VotingCertificate } from '../types/election';
import { generateCertificateQRCode } from './crypto';

/**
 * Downloads official Certificate of Voting PDF
 */
export function generateCertificatePDF(cert: VotingCertificate) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a5'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background frame
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(0, 0, width, height, 'F');

  // Decorative border with purple
  doc.setDrawColor(126, 34, 206); // Purple Ekirayá
  doc.setLineWidth(1.5);
  doc.rect(8, 8, width - 16, height - 16);

  // Colombian Accent ribbon top
  doc.setFillColor(250, 204, 21); // Yellow
  doc.rect(8, 8, width - 16, 4, 'F');
  doc.setFillColor(126, 34, 206); // Purple Ekirayá
  doc.rect(8, 12, width - 16, 2, 'F');
  doc.setFillColor(220, 38, 38); // Red
  doc.rect(8, 14, width - 16, 2, 'F');

  // Institution Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(cert.schoolName.toUpperCase(), width / 2, 24, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`CÓDIGO DANE: ${cert.daneCode}  •  REPÚBLICA DE COLOMBIA`, width / 2, 29, { align: 'center' });
  doc.text(`PROCESO DEMOCRÁTICO DE GOBIERNO ESCOLAR - AÑO LECTIVO 2026`, width / 2, 33, { align: 'center' });

  // Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(126, 34, 206);
  doc.text('CERTIFICADO ELECTORAL DIGITAL', width / 2, 43, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('En cumplimiento de la Ley 115 de 1994 y el Decreto 1860 de 1994 (Art. 28 y 29)', width / 2, 48, { align: 'center' });

  // Student details box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(16, 52, width - 74, 47, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('DATOS DEL SUFRAGANTE:', 20, 58);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Nombre Completo:`, 20, 65);
  doc.setFont('helvetica', 'bold');
  doc.text(`${cert.studentName}`, 55, 65);

  doc.setFont('helvetica', 'normal');
  doc.text(`Identificación:`, 20, 72);
  doc.setFont('helvetica', 'bold');
  doc.text(`${cert.documentType} N° ${cert.documentNumber}`, 55, 72);

  doc.setFont('helvetica', 'normal');
  doc.text(`Grado y Grupo:`, 20, 79);
  doc.setFont('helvetica', 'bold');
  doc.text(`${cert.grade} (${cert.group})`, 55, 79);

  if (cert.studentEmail) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Correo Registrado:`, 20, 86);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cert.studentEmail}`, 55, 86);
  }

  doc.setFont('helvetica', 'normal');
  doc.text(`Mesa de Votación:`, 20, 93);
  doc.setFont('helvetica', 'bold');
  const certStation = getStationForMesa(cert.mesaNumber);
  doc.text(`Mesa N° ${String(cert.mesaNumber).padStart(2, '0')} - ${certStation.name} (${certStation.category})`, 55, 93);

  // QR Code on the right
  const qrSvgUrl = generateCertificateQRCode(cert.verificationHash);
  try {
    doc.addImage(qrSvgUrl, 'SVG', width - 52, 54, 38, 38);
  } catch {
    // If SVG addImage is unavailable in target build, render fallback box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(width - 52, 54, 38, 38, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.text('QR VERIFICACIÓN', width - 33, 73, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Escanear para validar autenticidad', width - 33, 95, { align: 'center' });

  // Cryptographic Folio box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(16, 102, width - 32, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`FOLIO ELECTORAL ÚNICO: ${cert.folioNumber}`, 20, 107);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`HASH SHA-256: ${cert.verificationHash.slice(0, 48)}...`, 20, 111);

  // Signatures
  const formattedDate = new Date(cert.timestamp).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'medium'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha y Hora de Sufragio: ${formattedDate} (Hora Legal Colombiana)`, 16, 120);

  // Signature lines
  doc.setDrawColor(148, 163, 184);
  doc.line(20, 136, 80, 136);
  doc.line(width - 80, 136, width - 20, 136);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cert.rectorName, 50, 140, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Rector(a) y Presidente Claveros', 50, 143, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text('JURADO DE MESA N° 0' + cert.mesaNumber, width - 50, 140, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Comité de Democracia y Votaciones', width - 50, 143, { align: 'center' });

  doc.save(`Certificado_Votacion_${cert.documentNumber}_${cert.grade}.pdf`);
}

/**
 * Generates official Formulario E-14 (Acta de Escrutinio de Mesa)
 */
export function generateActaMesaE14PDF(
  mesaNumber: number,
  config: ElectionConfig,
  candidates: Candidate[],
  positions: Position[],
  votes: EncryptedVote[],
  students: Student[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const width = doc.internal.pageSize.getWidth();
  const mesaVotes = votes.filter(v => v.mesaNumber === mesaNumber);
  const mesaStudents = students.filter(s => s.mesaNumber === mesaNumber);
  const totalCenso = mesaStudents.length;
  const totalVotantes = mesaStudents.filter(s => s.hasVoted).length;

  // Header Box
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, width, 26, 'F');
  doc.setFillColor(250, 204, 21);
  doc.rect(0, 26, width, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('FORMULARIO OFICIAL E-14 (ESCOLAR) - ACTA DE ESCRUTINIO DE MESA', width / 2, 11, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${config.institutionName.toUpperCase()}  |  AÑO LECTIVO ${config.academicYear}`, width / 2, 17, { align: 'center' });
  doc.text(`DANE: ${config.daneCode}  •  ${config.city}, ${config.department}`, width / 2, 22, { align: 'center' });

  let y = 35;

  // Table information summary
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, width - 28, 25, 2, 2, 'FD');

  const station = getStationForMesa(mesaNumber);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`MESA DE VOTACIÓN N° ${String(mesaNumber).padStart(2, '0')}  •  PUESTO: ${station.name.toUpperCase()} (${station.category.toUpperCase()})`, 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Ubicación: ${station.location || station.description}  |  Grados asignados: ${station.gradesCovered.join(', ')}`, 18, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Estudiantes Habilitados en Censo:`, 18, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalCenso}`, 85, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.text(`Total Sufragantes que Votaron:`, 18, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(126, 34, 206);
  doc.text(`${totalVotantes} (${totalCenso > 0 ? Math.round((totalVotantes / totalCenso) * 100) : 0}%)`, 85, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`Fecha y Hora de Escrutinio:`, 120, y + 17);
  doc.text(new Date().toLocaleString('es-CO'), 120, y + 22);

  y += 31;

  // Results for each Position
  positions.forEach(pos => {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(126, 34, 206);
    doc.rect(14, y, width - 28, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`CARGO: ${pos.title.toUpperCase()} (${pos.legalBasis})`, 18, y + 5);

    y += 7;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, width - 28, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('TARJETÓN', 18, y + 4.5);
    doc.text('CANDIDATO / OPCIÓN', 42, y + 4.5);
    doc.text('GRADO', 125, y + 4.5);
    doc.text('VOTOS', 160, y + 4.5);
    doc.text('% MESA', 185, y + 4.5);

    y += 6;

    const posCandidates = candidates.filter(c => c.positionId === pos.id);
    const posVotes = mesaVotes.filter(v => v.positionId === pos.id);
    const totalPosVotes = posVotes.length;

    posCandidates.forEach((cand, idx) => {
      const candVotes = posVotes.filter(v => v.candidateId === cand.id).length;
      const pct = totalPosVotes > 0 ? ((candVotes / totalPosVotes) * 100).toFixed(1) : '0.0';

      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(14, y, width - 28, 6.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 6.5, width - 14, y + 6.5);

      doc.setFont('helvetica', cand.isBlankVote ? 'bold' : 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(cand.number, 18, y + 4.5);
      doc.text(cand.fullName, 42, y + 4.5);
      doc.text(cand.grade, 125, y + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.text(candVotes.toString(), 160, y + 4.5);
      doc.text(`${pct}%`, 185, y + 4.5);

      y += 6.5;
    });

    // Subtotal
    doc.setFillColor(226, 232, 240);
    doc.rect(14, y, width - 28, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TOTAL VOTOS CARGO:', 42, y + 4.5);
    doc.text(totalPosVotes.toString(), 160, y + 4.5);
    doc.text('100%', 185, y + 4.5);

    y += 11;
  });

  // Observations and Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CONSTANCIA DE LOS JURADOS DE VOTACIÓN:', 14, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Los suscritos jurados de votación damos fe de que el proceso transcurrió en estricta normalidad, asegurando el secreto', 14, y);
  y += 3.5;
  doc.text('y transparencia del voto estudiantil conforme a la normativa de la Ley 115 de 1994 y Decreto 1860 de 1994.', 14, y);

  y += 12;

  // 3 Jurados signature blocks
  const colW = (width - 28) / 3;
  for (let i = 0; i < 3; i++) {
    const x = 14 + i * colW;
    doc.setDrawColor(148, 163, 184);
    doc.line(x + 4, y, x + colW - 8, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`JURADO 0${i + 1} DE MESA`, x + colW / 2 - 2, y + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('C.C. / T.I. ____________________', x + colW / 2 - 2, y + 8, { align: 'center' });
  }

  doc.save(`Acta_E14_Mesa_0${mesaNumber}_${config.academicYear}.pdf`);
}

/**
 * Generates official Formulario E-24 (Acta General de Escrutinio y Declaratoria)
 */
export function generateActaGeneralE24PDF(
  config: ElectionConfig,
  candidates: Candidate[],
  positions: Position[],
  votes: EncryptedVote[],
  students: Student[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const width = doc.internal.pageSize.getWidth();
  const totalCenso = students.length;
  const totalVotaron = students.filter(s => s.hasVoted).length;
  const participacion = totalCenso > 0 ? ((totalVotaron / totalCenso) * 100).toFixed(1) : '0';

  // National Flag header line
  doc.setFillColor(250, 204, 21);
  doc.rect(0, 0, width, 4, 'F');
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 4, width, 2, 'F');
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 6, width, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('REPÚBLICA DE COLOMBIA - MINISTERIO DE EDUCACIÓN NACIONAL', width / 2, 16, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(126, 34, 206);
  doc.text('FORMULARIO E-24 ESCOLAR - ACTA GENERAL DE ESCRUTINIO INSTITUCIONAL', width / 2, 22, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`${config.institutionName}  |  DANE: ${config.daneCode}  |  AÑO LECTIVO ${config.academicYear}`, width / 2, 27, { align: 'center' });

  let y = 35;

  // General Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, width - 28, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Censo Electoral Total: ${totalCenso} estudiantes (Preescolar - 11°)`, 20, y + 7);
  doc.text(`Total Sufragantes: ${totalVotaron} votos válidos`, 20, y + 14);
  doc.text(`Porcentaje de Participación: ${participacion}%`, 110, y + 7);
  doc.text(`Despliegue: ${POLLING_STATIONS.length} Puestos / ${config.totalMesas} Mesas Escrutadas`, 110, y + 14);

  y += 24;

  // Polling Stations Summary in E-24
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(126, 34, 206);
  doc.text('COBERTURA DE PUESTOS ELECTORALES:', 14, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Casa de niños (Guardería)  •  Taller 1 y 2 (Primaria)  •  Taller 3 y 4 (Bachillerato medio)  •  Taller 5 (Bachillerato alto)', 14, y + 7);

  y += 12;

  // Winners per Position
  positions.forEach(pos => {
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    const posCandidates = candidates.filter(c => c.positionId === pos.id);
    const posVotes = votes.filter(v => v.positionId === pos.id);
    const totalPosVotes = posVotes.length;

    // Sort descending by votes
    const sorted = [...posCandidates].map(c => {
      const vCount = posVotes.filter(v => v.candidateId === c.id).length;
      return {
        ...c,
        voteCount: vCount,
        percent: totalPosVotes > 0 ? ((vCount / totalPosVotes) * 100).toFixed(1) : '0'
      };
    }).sort((a, b) => b.voteCount - a.voteCount);

    const winner = sorted[0];

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, width - 28, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`ESCRUTINIO FINAL: ${pos.title.toUpperCase()}`, 18, y + 5);

    y += 7;

    sorted.forEach((cand, idx) => {
      doc.setFillColor(idx === 0 ? 240 : 255, idx === 0 ? 253 : 255, idx === 0 ? 244 : 255);
      doc.rect(14, y, width - 28, 6.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 6.5, width - 14, y + 6.5);

      doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`Tarjetón ${cand.number}: ${cand.fullName} (${cand.grade})`, 18, y + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.text(`${cand.voteCount} votos  (${cand.percent}%)`, 150, y + 4.5);

      if (idx === 0 && !cand.isBlankVote) {
        doc.setTextColor(22, 163, 74);
        doc.text('DECLARADO(A) ELECTO(A)', 105, y + 4.5);
      } else if (idx === 0 && cand.isBlankVote) {
        doc.setTextColor(220, 38, 38);
        doc.text('MAYORÍA VOTO EN BLANCO', 105, y + 4.5);
      }

      y += 6.5;
    });

    y += 6;
  });

  // Commission Claveros Declaration
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('DECLARATORIA DE ELECCIÓN Y CIERRE DE ESCRUTINIO:', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('La Comisión Escrutadora Institucional, en ejercicio de las facultades conferidas por el Gobierno Escolar y la normativa', 14, y);
  y += 4;
  doc.text('vigente, certifica que se computaron todos los votos de las mesas sin discrepancias y se declaran formalmente electos.', 14, y);

  y += 18;

  // Signatures of Rector and Democracy Coordinator
  doc.setDrawColor(148, 163, 184);
  doc.line(24, y, 94, y);
  doc.line(width - 94, y, width - 24, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(config.rectorName, 59, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Rector(a) - Presidente Comisión Escrutadora', 59, y + 9, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(config.personeroDocenteLider, width - 59, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Docente Coordinador de Democracia', width - 59, y + 9, { align: 'center' });

  doc.save(`Acta_General_E24_Gobierno_Escolar_${config.academicYear}.pdf`);
}

/**
 * Native UTF-8 CSV Export (Compatible with Excel, Sheets, Supabase)
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const bom = '\uFEFF';
  const csvContent = bom + [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
