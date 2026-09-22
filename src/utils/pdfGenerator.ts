import jsPDF from 'jspdf';
import { getStationForMesa, POLLING_STATIONS } from '../data/mockElectionData';
import { Candidate, ElectionConfig, EncryptedVote, Position, Student, VotingCertificate } from '../types/election';
import { generateCertificateQRCode, getQRCodeMatrix } from './crypto';

/**
 * Renders a crisp, native vector QR Code directly inside jsPDF with zero dependencies or external assets
 */
function drawVectorQRCode(doc: jsPDF, hash: string, x: number, y: number, sizeMm: number) {
  const matrix = getQRCodeMatrix(hash);
  const n = matrix.length; // 21
  const cell = sizeMm / n;

  // Background white box
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, sizeMm, sizeMm, 'F');

  // Draw cells
  doc.setFillColor(15, 23, 42); // slate-900
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        doc.rect(x + c * cell, y + r * cell, cell + 0.05, cell + 0.05, 'F');
      }
    }
  }

  // Small center verification shield in purple & white
  const centerSize = cell * 3.5;
  const cx = x + sizeMm / 2 - centerSize / 2;
  const cy = y + sizeMm / 2 - centerSize / 2;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cx, cy, centerSize, centerSize, 0.5, 0.5, 'F');
  doc.setFillColor(126, 34, 206);
  doc.roundedRect(cx + 0.35, cy + 0.35, centerSize - 0.7, centerSize - 0.7, 0.35, 0.35, 'F');
}

/**
 * Downloads official Certificate of Voting PDF with mathematically calibrated coordinates,
 * ensuring no overlapping text or collisions with inner/outer frames.
 */
export function generateCertificatePDF(cert: VotingCertificate, institutionalEmail?: string, superadminEmail?: string) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a5'
  });

  const width = doc.internal.pageSize.getWidth(); // 210 mm
  const height = doc.internal.pageSize.getHeight(); // 148 mm

  // 1. Base clean white canvas
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');

  // 2. Outer decorative double frames with generous margins
  // Outer frame: 6 mm from edge
  doc.setDrawColor(107, 33, 168); // Purple-800
  doc.setLineWidth(0.9);
  doc.roundedRect(6, 6, 198, 136, 2.5, 2.5, 'D');

  // Inner frame: 8.5 mm from edge (leaving 2.5 mm gap between frames)
  doc.setDrawColor(216, 180, 254); // Purple-300
  doc.setLineWidth(0.35);
  doc.roundedRect(8.5, 8.5, 193, 131, 1.8, 1.8, 'D');

  // 3. Colombian & Ekirayá Institutional Top Ribbon (stays strictly inside inner frame)
  // Gold (Yellow)
  doc.setFillColor(245, 158, 11);
  doc.rect(8.5, 8.5, 193, 1.8, 'F');
  // Ekirayá Purple
  doc.setFillColor(126, 34, 206);
  doc.rect(8.5, 10.3, 193, 1.1, 'F');
  // Red
  doc.setFillColor(220, 38, 38);
  doc.rect(8.5, 11.4, 193, 1.0, 'F');

  // 4. Header: Institution & Electoral Authority (y = 17 to 36)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text((cert.schoolName || 'COLEGIO EKIRAYÁ - CEM').toUpperCase(), 105, 17.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`CÓDIGO DANE: ${cert.daneCode}  •  REPÚBLICA DE COLOMBIA  •  SECRETARÍA DE EDUCACIÓN`, 105, 21.5, { align: 'center' });

  // Central Banner Pill
  doc.setFillColor(88, 28, 135); // purple-900
  doc.roundedRect(36, 23.8, 138, 7.2, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CERTIFICADO ELECTORAL DIGITAL DE SUFRAGIO', 105, 28.8, { align: 'center' });

  // Subtitle / Legal citation
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.3);
  doc.setTextColor(71, 85, 105);
  doc.text('Gobierno Escolar 2026  •  Leyes 115/1994 y 1098/2006  •  Decreto 1860/1994 (Arts. 28 y 29)', 105, 34.8, { align: 'center' });

  // 5. Central Panels (y = 37.5 to 85.5 -> Height: 48 mm)
  // Left Panel: Datos del Sufragante y Mesa
  // x = 11, y = 37.5, w = 142, h = 48
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(11, 37.5, 142, 48, 1.8, 1.8, 'FD');

  // Header band inside left panel
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(11, 37.5, 142, 6.2, 1.8, 1.8, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(11, 43.7, 153, 43.7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text('CONSTANCIA DE IDENTIFICACIÓN Y DERECHO AL VOTO', 15, 41.8);

  // Rows of student information
  const xLabel = 15;
  const xVal = 50;
  const maxValWidth = 98;

  // Station info
  const station = getStationForMesa(cert.mesaNumber);
  const stationCleanName = station ? station.shortName || station.name : `Puesto Mesa 0${cert.mesaNumber}`;

  // Institutional email & Superadmin notification
  const fromEmailStr = cert.fromEmail || institutionalEmail || 'rectoria@ekiraya.edu.co';
  const superadminEmailStr = superadminEmail || 'rectoria@ekiraya.edu.co';

  // Helper row drawer to avoid any overlap
  const drawRow = (yPos: number, label: string, val: string, isAccent = false, isSuccess = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(label, xLabel, yPos);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    if (isSuccess) {
      doc.setTextColor(4, 120, 87); // emerald-700
    } else if (isAccent) {
      doc.setTextColor(107, 33, 168); // purple-800
    } else {
      doc.setTextColor(15, 23, 42);
    }
    const lines = doc.splitTextToSize(val, maxValWidth);
    doc.text(lines[0] || val, xVal, yPos);
  };

  drawRow(48.8, 'Sufragante:', cert.studentName);
  drawRow(54.2, 'Documento:', `${cert.documentType} N° ${cert.documentNumber}`);
  drawRow(59.6, 'Grado y Grupo:', `Grado ${cert.grade}   •   Grupo ${cert.group}`);
  drawRow(65.0, 'Mesa Asignada:', `Mesa N° ${String(cert.mesaNumber).padStart(2, '0')} — ${stationCleanName}`);
  drawRow(70.4, 'Buzón Alumno:', cert.studentEmail ? cert.studentEmail : 'No asignado (registro presencial en censo)');
  drawRow(75.8, 'Despacho Institucional:', `Enviado desde ${fromEmailStr} a Bandeja Superadmin (${superadminEmailStr})`, true);
  drawRow(81.2, 'Estado de Urna:', 'Sufragio Emitido y Sellado Criptográficamente en Urna Central', false, true);

  // Right Panel: Auditoría Criptográfica QR
  // x = 156, y = 37.5, w = 43, h = 48
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(156, 37.5, 43, 48, 1.8, 1.8, 'FD');

  // Header band inside right panel
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(156, 37.5, 43, 6.2, 1.8, 1.8, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(156, 43.7, 199, 43.7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text('AUDITORÍA QR', 177.5, 41.8, { align: 'center' });

  // Native Vector QR Code (25mm x 25mm)
  drawVectorQRCode(doc, cert.verificationHash, 165, 46.5, 25);

  // QR Validation Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.6);
  doc.setTextColor(100, 116, 139);
  doc.text('ESCANEAR PARA VALIDAR', 177.5, 75.5, { align: 'center' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(5.6);
  doc.setTextColor(107, 33, 168);
  doc.text('BLOCKCHAIN CEM-2026', 177.5, 78.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.0);
  doc.setTextColor(148, 163, 184);
  doc.text('Autenticidad Criptográfica', 177.5, 82.0, { align: 'center' });

  // 6. Cryptographic Folio Strip (y = 87.5 to 98.5 -> Height: 11 mm)
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(11, 87.5, 188, 11, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(15, 23, 42);
  doc.text('FOLIO ELECTORAL:', 14, 91.8);

  doc.setTextColor(107, 33, 168);
  doc.text(cert.folioNumber, 44, 91.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.0);
  doc.setTextColor(4, 120, 87);
  doc.text('DOCUMENTO OFICIAL VÁLIDO PARA BENEFICIOS ACADÉMICOS Y CÍVICOS', 195, 91.8, { align: 'right' });

  doc.setFont('courier', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`HASH SHA-256: ${cert.verificationHash}`, 14, 95.8);

  // 7. Official Legal Timestamp (y = 102.5)
  const formattedDate = new Date(cert.timestamp).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'medium'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha y Hora de Emisión Legal: ${formattedDate} (Hora Legal Colombiana - UTC-5)  •  Sincronización Autorizada`, 12, 102.5);

  // 8. Signatures Section (y = 106 to 132.5)
  // Inner frame bottom: y = 139.5. Outer frame bottom: y = 142.
  // Left: Rector(a)
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(22, 119.5, 82, 119.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(15, 23, 42);
  doc.text(cert.rectorName || 'Dra. Patricia Elena Montoya Gómez', 52, 123.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Rector(a) y Presidente Claveros', 52, 126.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(148, 163, 184);
  doc.text('Colegio Ekirayá - CEM', 52, 129.8, { align: 'center' });

  // Center: Institutional Stamp
  doc.setDrawColor(216, 180, 254);
  doc.setFillColor(250, 245, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(93, 113.5, 24, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.4);
  doc.setTextColor(107, 33, 168);
  doc.text('SELLO OFICIAL', 105, 118.0, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(51, 65, 85);
  doc.text('GOBIERNO ESCOLAR', 105, 121.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.0);
  doc.setTextColor(126, 34, 206);
  doc.text('CEM 2026', 105, 125.0, { align: 'center' });

  // Right: Jurado de Mesa
  doc.line(128, 119.5, 188, 119.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(15, 23, 42);
  doc.text(`JURADO DE MESA N° ${String(cert.mesaNumber).padStart(2, '0')}`, 158, 123.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Comité de Democracia y Veeduría Estudiantil', 158, 126.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(148, 163, 184);
  doc.text('Voto Secreto, Personal y Universal', 158, 129.8, { align: 'center' });

  doc.save(`Certificado_Votacion_${cert.documentNumber}_${cert.grade}.pdf`);
  return doc;
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
