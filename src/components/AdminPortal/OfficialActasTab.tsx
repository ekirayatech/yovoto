import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Printer,
  Scale,
  ShieldCheck
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { exportToCSV, generateActaGeneralE24PDF, generateActaMesaE14PDF } from '../../utils/pdfGenerator';

export const OfficialActasTab: React.FC = () => {
  const { config, positions, candidates, students, votes } = useElection();
  const [selectedMesaForE14, setSelectedMesaForE14] = useState<number>(1);

  const totalCenso = students.length;
  const totalVotaron = students.filter(s => s.hasVoted).length;

  const handleDownloadE14 = (mesaNum: number) => {
    generateActaMesaE14PDF(mesaNum, config, candidates, positions, votes, students);
  };

  const handleDownloadE24 = () => {
    generateActaGeneralE24PDF(config, candidates, positions, votes, students);
  };

  const handleExportFullReportCSV = () => {
    const headers = ['Mesa', 'Cargo', 'Tarjetón', 'Candidato / Opción', 'Votos Registrados'];
    const rows: (string | number)[][] = [];

    for (let m = 1; m <= config.totalMesas; m++) {
      const mesaVotes = votes.filter(v => v.mesaNumber === m);
      positions.forEach(pos => {
        const cands = candidates.filter(c => c.positionId === pos.id);
        const pVotes = mesaVotes.filter(v => v.positionId === pos.id);
        cands.forEach(cand => {
          const count = pVotes.filter(v => v.candidateId === cand.id).length;
          rows.push([`Mesa 0${m}`, pos.shortTitle, cand.number, cand.fullName, count]);
        });
      });
    }

    exportToCSV(`Consolidado_Oficial_Mesas_${config.academicYear}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      
      {/* Intro Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-purple-900/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-900/60 border border-purple-400/40 text-purple-300 flex items-center justify-center shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Documentos Electorales Legales
              </span>
              <h2 className="text-xl font-black text-white">
                Actas Oficiales de Escrutinio y Elección Escolar
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Generadas conforme a la normativa colombiana de la Registraduría Nacional y el Decreto 1860 de 1994.
              </p>
            </div>
          </div>

          <button
            onClick={handleExportFullReportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Consolidado Completo (CSV)</span>
          </button>
        </div>
      </div>

      {/* Grid of Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Formulario E-14 (Actas de Mesa) Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200">
                <FileText className="w-3.5 h-3.5 text-purple-700" />
                Formulario E-14 Escolar
              </span>
              <span className="text-xs text-slate-400 font-medium">Por Mesa Receptora</span>
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-1">
              Acta de Escrutinio de los Jurados de Votación
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Documento obligatorio diligenciado y firmado por los 3 jurados al cierre de cada mesa. Contiene el total de sufragantes habilitados, votos depositados por candidato, votos en blanco y constancia de normalidad.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 mb-5">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Seleccionar Mesa para Descargar Acta E-14:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedMesaForE14(m)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      selectedMesaForE14 === m
                        ? 'bg-purple-700 border-purple-700 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                    }`}
                  >
                    Mesa N° 0{m}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Mesa N° 0{selectedMesaForE14}:{' '}
                {selectedMesaForE14 === 1 ? 'Grados 6° y 7°' : selectedMesaForE14 === 2 ? 'Grados 8° y 9°' : 'Grados 10° y 11°'}
                {' • '}
                <strong>{students.filter(s => s.mesaNumber === selectedMesaForE14 && s.hasVoted).length} votos registrados</strong>
              </p>
            </div>
          </div>

          <button
            id="btn-download-acta-e14-modal"
            onClick={() => handleDownloadE14(selectedMesaForE14)}
            className="w-full py-3 px-4 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Formulario E-14 Mesa 0{selectedMesaForE14} (PDF)</span>
          </button>
        </div>

        {/* Formulario E-24 (Acta General de Escrutinio) Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <Award className="w-3.5 h-3.5" />
                Formulario E-24 Escolar
              </span>
              <span className="text-xs text-slate-400 font-medium">Comisión Escrutadora</span>
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-1">
              Acta General de Escrutinio y Declaratoria de Elección
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Acta de consolidación institucional suscrita por el Rector y el Docente Líder de Ciencias Sociales. Declara formalmente a los estudiantes electos para Personería, Contraloría y Representación al Consejo Directivo para el año 2026.
            </p>

            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2 mb-5 text-xs text-amber-950">
              <div className="flex items-center justify-between font-bold">
                <span>Censo Total Institucional:</span>
                <span>{totalCenso} estudiantes</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span>Sufragantes Efectivos:</span>
                <span className="text-purple-800">{totalVotaron} votos válidos</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Mesas Computadas:</span>
                <span>{config.totalMesas} de {config.totalMesas} mesas</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-amber-200/80">
                <span>Firma Responsable:</span>
                <span className="font-bold">{config.rectorName}</span>
              </div>
            </div>
          </div>

          <button
            id="btn-download-acta-e24"
            onClick={handleDownloadE24}
            className="w-full py-3 px-4 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Formulario E-24 General (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
