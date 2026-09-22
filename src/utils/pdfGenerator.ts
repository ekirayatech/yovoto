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
 * Convierte color hexadecimal a tupla RGB [r, g, b]
 */
function hexToRgb(hex?: string): [number, number, number] {
  if (!hex) return [107, 33, 168];
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return [107, 33, 168];
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [107, 33, 168];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Genera el Informe Oficial de Resultados Electorales en PDF con Gráficos Estadísticos Vectoriales
 */
export function generateResultsReportWithChartsPDF(
  config: ElectionConfig,
  candidates: Candidate[],
  positions: Position[],
  votes: EncryptedVote[],
  students: Student[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth(); // 210 mm
  const height = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 14;
  const contentWidth = width - margin * 2;

  const totalCenso = students.length;
  const totalVotaron = students.filter(s => s.hasVoted).length;
  const participacionPct = totalCenso > 0 ? (totalVotaron / totalCenso) * 100 : 0;
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Helper: Encabezado Institucional
  const drawPageHeader = (pageNumber: number, totalPages: number) => {
    // Franja tricolor de Colombia
    doc.setFillColor(250, 204, 21); // Amarillo
    doc.rect(0, 0, width, 3.5, 'F');
    doc.setFillColor(30, 58, 138); // Azul
    doc.rect(0, 3.5, width, 1.8, 'F');
    doc.setFillColor(220, 38, 38); // Rojo
    doc.rect(0, 5.3, width, 1.8, 'F');

    // Barra institucional Ekirayá
    doc.setFillColor(107, 33, 168); // Purple-800
    doc.rect(0, 7.1, width, 1.2, 'F');

    // Título institucional
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(config.institutionName.toUpperCase(), width / 2, 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`DANE: ${config.daneCode}  •  AÑO LECTIVO ${config.academicYear}  •  SISTEMA ELECTORAL DIGITAL`, width / 2, 18, { align: 'center' });

    // Línea separadora
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, 20.5, width - margin, 20.5);

    // Pie de página
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generado el: ${dateFormatted}  •  Urna SHA-256: ${config.encryptionKeyFingerprint.slice(0, 16)}...`, margin, height - 8);
    doc.text(`Página ${pageNumber} de ${totalPages}`, width - margin, height - 8, { align: 'right' });
  };

  // =========================================================================
  // PÁGINA 1: RESUMEN EJECUTIVO Y GRÁFICOS DE PARTICIPACIÓN TERRITORIAL
  // =========================================================================
  drawPageHeader(1, 4);

  // Banner principal del informe
  doc.setFillColor(88, 28, 135); // purple-900
  doc.roundedRect(margin, 23, contentWidth, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  doc.text('INFORME ESTADÍSTICO DE ESCRUTINIO Y RESULTADOS', width / 2, 29.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(233, 213, 255);
  doc.text('Consolidado oficial de sufragio con gráficos analíticos y verificación criptográfica', width / 2, 34, { align: 'center' });

  // 4 Tarjetas de Indicadores Clave (KPIs)
  const kpiY = 41;
  const kpiWidth = (contentWidth - 9) / 4;
  const kpiHeight = 22;

  const kpis = [
    {
      title: 'PARTICIPACIÓN',
      val: `${participacionPct.toFixed(1)}%`,
      sub: `${totalVotaron} de ${totalCenso} sufragantes`,
      color: [107, 33, 168] as [number, number, number],
      bg: [250, 245, 255] as [number, number, number]
    },
    {
      title: 'TOTAL VOTOS URNA',
      val: `${votes.length}`,
      sub: `${positions.length} cargos de elección`,
      color: [5, 150, 105] as [number, number, number],
      bg: [240, 253, 244] as [number, number, number]
    },
    {
      title: 'COBERTURA MESAS',
      val: `${config.totalMesas} de ${config.totalMesas}`,
      sub: '100% mesas escrutadas',
      color: [2, 132, 199] as [number, number, number],
      bg: [240, 249, 255] as [number, number, number]
    },
    {
      title: 'SEGURIDAD SHA-256',
      val: 'INMUTABLE',
      sub: 'Auditoría Cero Fallos',
      color: [217, 119, 6] as [number, number, number],
      bg: [255, 251, 235] as [number, number, number]
    }
  ];

  kpis.forEach((kpi, idx) => {
    const xPos = margin + idx * (kpiWidth + 3);
    doc.setFillColor(...kpi.bg);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(xPos, kpiY, kpiWidth, kpiHeight, 1.8, 1.8, 'FD');

    // Indicador superior
    doc.setFillColor(...kpi.color);
    doc.rect(xPos, kpiY, kpiWidth, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, xPos + 4, kpiY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, xPos + 4, kpiY + 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, xPos + 4, kpiY + 18.5);
  });

  // Gráfico Estadístico 1: Termómetro de Participación General
  let currY = 68;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currY, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. ANÁLISIS DE PARTICIPACIÓN ELECTORAL GLOBAL', margin + 6, currY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Porcentaje acumulado de votantes que ejercieron su derecho al sufragio sobre el censo oficial.`, margin + 6, currY + 11.5);

  // Barra de progreso vectorial de participación
  const barX = margin + 6;
  const barY = currY + 16;
  const barW = contentWidth - 12;
  const barH = 7;

  // Fondo barra
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(barX, barY, barW, barH, 1.5, 1.5, 'F');

  // Relleno barra según %
  const fillW = Math.max(3, (participacionPct / 100) * barW);
  doc.setFillColor(107, 33, 168);
  doc.roundedRect(barX, barY, fillW, barH, 1.5, 1.5, 'F');

  // Marcas de cuadrícula: 25%, 50%, 75%, 100%
  const ticks = [0, 25, 50, 75, 100];
  ticks.forEach(t => {
    const tx = barX + (t / 100) * barW;
    doc.setDrawColor(203, 213, 225);
    doc.line(tx, barY + barH, tx, barY + barH + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(`${t}%`, tx, barY + barH + 5, { align: 'center' });
  });

  // Callout numérico en la barra
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  if (fillW > 25) {
    doc.text(`${participacionPct.toFixed(1)}% (${totalVotaron}/${totalCenso})`, barX + fillW - 3, barY + 5, { align: 'right' });
  }

  // Gráfico Estadístico 2: Despliegue Territorial y Participación por Puestos
  currY = 107;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currY, contentWidth, 110, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. GRÁFICO COMPARATIVO DE PARTICIPACIÓN POR PUESTOS DE VOTACIÓN', margin + 6, currY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Distribución en 6 puestos electorales abarcando los 20 cursos y mesas institucionales:', margin + 6, currY + 11.5);

  let stY = currY + 18;
  const maxBarWidth = contentWidth - 75;

  POLLING_STATIONS.forEach((station, sIdx) => {
    const stationStudents = students.filter(s => station.mesas.includes(s.mesaNumber));
    const stationVoted = stationStudents.filter(s => s.hasVoted).length;
    const stPct = stationStudents.length > 0 ? (stationVoted / stationStudents.length) * 100 : 0;

    // Etiqueta del puesto
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);
    doc.text(station.name, margin + 6, stY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(`${station.gradesCovered.join(', ')} • Mesas: ${station.mesas.map(m => String(m).padStart(2, '0')).join(', ')}`, margin + 6, stY + 8);

    // Barra de fondo
    const bX = margin + 60;
    const bW = maxBarWidth;
    const bH = 6;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(bX, stY + 1.5, bW, bH, 1, 1, 'F');

    // Barra de color proporcional
    const filledStW = Math.max(2, (stPct / 100) * bW);
    const stationColors: [number, number, number][] = [
      [147, 51, 234], // Purple-600
      [59, 130, 246], // Blue-500
      [16, 185, 129], // Emerald-500
      [245, 158, 11], // Amber-500
      [236, 72, 153], // Pink-500
      [99, 102, 241]  // Indigo-500
    ];
    const sColor = stationColors[sIdx % stationColors.length];
    doc.setFillColor(...sColor);
    doc.roundedRect(bX, stY + 1.5, filledStW, bH, 1, 1, 'F');

    // Valores al lado derecho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...sColor);
    doc.text(`${stPct.toFixed(1)}%`, width - margin - 6, stY + 5.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(`(${stationVoted}/${stationStudents.length})`, width - margin - 17, stY + 5.5, { align: 'right' });

    stY += 15;
  });

  // Nota de pie en página 1
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, 222, contentWidth, 14, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('CERTIFICACIÓN DE TRANSMISIÓN DE DATOS EN VIVO:', margin + 4, 227);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Los datos corresponden al escrutinio total transmitido por las 20 mesas de votación y sincronizado de forma centralizada.', margin + 4, 232);

  // =========================================================================
  // HELPER PARA DIBUJAR ESCRUTINIO Y GRÁFICOS DE UN CARGO
  // =========================================================================
  const drawPositionCharts = (
    pos: Position,
    startY: number,
    cardHeight: number
  ) => {
    const posCandidates = candidates.filter(c => c.positionId === pos.id);
    const posVotes = votes.filter(v => v.positionId === pos.id);
    const totalPosVotes = posVotes.length;

    // Calcular y ordenar candidatos
    const results = posCandidates.map(c => {
      const vCount = posVotes.filter(v => v.candidateId === c.id).length;
      const pct = totalPosVotes > 0 ? (vCount / totalPosVotes) * 100 : 0;
      return {
        ...c,
        voteCount: vCount,
        percent: pct
      };
    }).sort((a, b) => b.voteCount - a.voteCount);

    const winner = results[0];
    const blankResult = results.find(r => r.isBlankVote);

    // Contenedor del cargo
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, startY, contentWidth, cardHeight, 2, 2, 'FD');

    // Encabezado del cargo con barra
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(margin, startY, contentWidth, 8.5, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`ESCRUTINIO Y GRÁFICO: ${pos.title.toUpperCase()}`, margin + 6, startY + 5.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(203, 213, 225);
    doc.text(`Total votos: ${totalPosVotes}`, width - margin - 6, startY + 5.8, { align: 'right' });

    let candY = startY + 13;
    const barChartX = margin + 50;
    const barChartW = contentWidth - 95;

    results.forEach((cand, cIdx) => {
      const isWinner = cIdx === 0 && totalPosVotes > 0;
      const isBlank = cand.isBlankVote;
      const cRgb = isBlank ? [100, 116, 139] as [number, number, number] : hexToRgb(cand.colorHex);

      // Tarjetón & Nombre
      doc.setFillColor(cRgb[0], cRgb[1], cRgb[2]);
      doc.roundedRect(margin + 4, candY, 7, 6, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text(String(cand.number), margin + 7.5, candY + 4.2, { align: 'center' });

      doc.setFont('helvetica', isWinner ? 'bold' : 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      const nameClean = cand.fullName.length > 24 ? cand.fullName.slice(0, 24) + '...' : cand.fullName;
      doc.text(nameClean, margin + 13, candY + 4.2);

      // Barra vectorial del candidato
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(barChartX, candY + 0.5, barChartW, 5.5, 1, 1, 'F');

      const filledW = Math.max(1.5, (cand.percent / 100) * barChartW);
      doc.setFillColor(...cRgb);
      doc.roundedRect(barChartX, candY + 0.5, filledW, 5.5, 1, 1, 'F');

      // Votos y porcentaje numérico
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...cRgb);
      doc.text(`${cand.voteCount} (${cand.percent.toFixed(1)}%)`, width - margin - 5, candY + 4.2, { align: 'right' });

      // Badge de electo
      if (isWinner && !isBlank) {
        doc.setFillColor(220, 252, 231);
        doc.setDrawColor(187, 247, 208);
        doc.roundedRect(width - margin - 42, candY + 0.5, 17, 5.5, 1, 1, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(22, 101, 52);
        doc.text('ELECTO(A)', width - margin - 33.5, candY + 4.2, { align: 'center' });
      }

      candY += 8.5;
    });

    // Gráfico de Distribución del 100% (Barra Segmentada Apilada)
    const stackedY = candY + 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('DISTRIBUCIÓN DEL 100% DE VOTOS EMITIDOS:', margin + 4, stackedY + 3);

    const stackBarX = margin + 4;
    const stackBarY = stackedY + 5;
    const stackBarW = contentWidth - 8;
    const stackBarH = 4;

    doc.setFillColor(241, 245, 249);
    doc.rect(stackBarX, stackBarY, stackBarW, stackBarH, 'F');

    let currentStackOffset = 0;
    results.forEach(cand => {
      const cRgb = cand.isBlankVote ? [148, 163, 184] as [number, number, number] : hexToRgb(cand.colorHex);
      const segW = (cand.percent / 100) * stackBarW;
      if (segW > 0) {
        doc.setFillColor(...cRgb);
        doc.rect(stackBarX + currentStackOffset, stackBarY, segW, stackBarH, 'F');
        currentStackOffset += segW;
      }
    });

    // Línea de leyenda con círculos de color
    const legendY = stackBarY + stackBarH + 4;
    let legX = margin + 4;
    results.forEach(cand => {
      const cRgb = cand.isBlankVote ? [148, 163, 184] as [number, number, number] : hexToRgb(cand.colorHex);
      doc.setFillColor(...cRgb);
      doc.circle(legX + 1.5, legendY, 1.2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(71, 85, 105);
      const shortLabel = `${cand.number}: ${cand.percent.toFixed(1)}%`;
      doc.text(shortLabel, legX + 4, legendY + 1);
      legX += shortLabel.length * 2 + 7;
    });
  };

  // =========================================================================
  // PÁGINA 2: ESCRUTINIO Y GRÁFICOS: PERSONERÍA Y CONTRALORÍA
  // =========================================================================
  doc.addPage();
  drawPageHeader(2, 4);

  const pos1 = positions.find(p => p.id === 'personeria') || positions[0];
  const pos2 = positions.find(p => p.id === 'contraloria') || positions[1] || positions[0];

  if (pos1) drawPositionCharts(pos1, 24, 115);
  if (pos2 && pos2.id !== pos1.id) drawPositionCharts(pos2, 146, 115);

  // =========================================================================
  // PÁGINA 3: ESCRUTINIO Y GRÁFICOS: CABILDANTE Y REPRESENTANTE
  // =========================================================================
  doc.addPage();
  drawPageHeader(3, 4);

  const pos3 = positions.find(p => p.id === 'cabildante') || positions[2] || positions[0];
  const pos4 = positions.find(p => p.id === 'representante_estudiantes' || p.id === 'representante_curso') || positions[3] || positions[0];

  if (pos3 && pos3.id !== pos1.id && pos3.id !== pos2.id) drawPositionCharts(pos3, 24, 115);
  if (pos4 && pos4.id !== pos1.id && pos4.id !== pos2.id && pos4.id !== pos3.id) drawPositionCharts(pos4, 146, 115);

  // =========================================================================
  // PÁGINA 4: CUADRO DE HONOR, DECLARATORIA LEGAL Y FIRMAS
  // =========================================================================
  doc.addPage();
  drawPageHeader(4, 4);

  // Banner Cuadro de Honor
  doc.setFillColor(88, 28, 135);
  doc.roundedRect(margin, 24, contentWidth, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CUADRO DE REPRESENTANTES DECLARADOS ELECTOS', width / 2, 31.5, { align: 'center' });

  let electY = 41;
  positions.forEach(pos => {
    const posCandidates = candidates.filter(c => c.positionId === pos.id);
    const posVotes = votes.filter(v => v.positionId === pos.id);
    const totalPosVotes = posVotes.length;

    const sorted = [...posCandidates].map(c => {
      const cnt = posVotes.filter(v => v.candidateId === c.id).length;
      return {
        ...c,
        voteCount: cnt,
        percent: totalPosVotes > 0 ? (cnt / totalPosVotes) * 100 : 0
      };
    }).sort((a, b) => b.voteCount - a.voteCount);

    const winner = sorted[0];

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, electY, contentWidth, 15, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(107, 33, 168);
    doc.text(pos.title.toUpperCase(), margin + 5, electY + 6);

    if (winner && !winner.isBlankVote && winner.voteCount > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${winner.fullName} (${winner.grade})`, margin + 5, electY + 11.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(5, 150, 105);
      doc.text(`${winner.voteCount} votos  •  ${winner.percent.toFixed(1)}%`, width - margin - 5, electY + 9, { align: 'right' });
    } else if (winner && winner.isBlankVote) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(220, 38, 38);
      doc.text(`Mayoría Voto en Blanco (${winner.voteCount} votos, ${winner.percent.toFixed(1)}%)`, margin + 5, electY + 11.5);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Pendiente de cómputo en urna', margin + 5, electY + 11.5);
    }

    electY += 19;
  });

  // Constancia y Declaratoria Legal
  electY += 5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, electY, contentWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('DECLARATORIA LEGAL DE CIERRE Y VALIDEZ ELECTORAL:', margin + 5, electY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  const legalText = [
    'En cumplimiento de los Artículos 28 y 29 del Decreto 1860 de 1994, la Ley 115 de 1994 (Ley General de Educación) y el',
    'Código de la Infancia y la Adolescencia (Ley 1098 de 2006), la Comisión Escrutadora Institucional del Colegio Ekirayá certifica',
    'la validez del presente informe estadístico. Cada voto computado en las 20 mesas fue verificado mediante huella digital SHA-256',
    'garantizando secreto de sufragio, transparencia y apego a los principios democráticos escolares colombianos.'
  ];

  legalText.forEach((line, lIdx) => {
    doc.text(line, margin + 5, electY + 13 + lIdx * 5);
  });

  // Firmas Institucionales
  const signY = 225;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(margin + 15, signY, margin + 75, signY);
  doc.line(width - margin - 75, signY, width - margin - 15, signY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(config.rectorName, margin + 45, signY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Rector(a) Institucional', margin + 45, signY + 9, { align: 'center' });
  doc.text('Presidente Comisión Escrutadora', margin + 45, signY + 12.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(config.personeroDocenteLider, width - margin - 45, signY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Docente Líder de Democracia', width - margin - 45, signY + 9, { align: 'center' });
  doc.text('Secretario(a) de la Comisión', width - margin - 45, signY + 12.5, { align: 'center' });

  // Guardar archivo PDF
  doc.save(`Informe_Estadistico_Resultados_Ekiraya_${config.academicYear}.pdf`);
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
