import {
  AlertCircle,
  Award,
  BarChart3,
  Building2,
  CheckCircle,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  PieChart,
  RefreshCw,
  Scale,
  ShieldCheck,
  TrendingUp,
  Users
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { ALL_GRADES, getStationForMesa, POLLING_STATIONS } from '../../data/mockElectionData';
import { Candidate, Position } from '../../types/election';
import { exportToCSV, generateActaGeneralE24PDF, generateResultsReportWithChartsPDF } from '../../utils/pdfGenerator';

export const LiveResultsTab: React.FC = () => {
  const { config, positions, candidates, students, votes, recordResultsToSheets, sheetsSyncInfo } = useElection();
  const [selectedPositionId, setSelectedPositionId] = useState<string>(positions[0]?.id || 'personeria');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('TODOS');
  const [isRecordingSheets, setIsRecordingSheets] = useState(false);
  const [sheetsRecordFeedback, setSheetsRecordFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    timestamp?: string;
  } | null>(null);

  const totalCenso = students.length;
  const totalVotaron = students.filter(s => s.hasVoted).length;
  const participacionPct = totalCenso > 0 ? ((totalVotaron / totalCenso) * 100).toFixed(1) : '0';

  const currentPos = positions.find(p => p.id === selectedPositionId) || positions[0];
  
  // Filter candidates and votes if representante_curso and specific grade selected
  let posCandidates = candidates.filter(c => c.positionId === currentPos.id);
  if (currentPos.id === 'representante_curso' && selectedGradeFilter !== 'TODOS') {
    posCandidates = posCandidates.filter(c => c.isBlankVote || c.grade === selectedGradeFilter);
  }

  const validCandidateIds = new Set(posCandidates.map(c => c.id));
  const posVotes = votes.filter(v => v.positionId === currentPos.id && (currentPos.id !== 'representante_curso' || selectedGradeFilter === 'TODOS' || validCandidateIds.has(v.candidateId) || (v.grade && v.grade === selectedGradeFilter)));
  const totalPosVotes = posVotes.length;

  // Calculate votes per candidate
  const candidateResults = posCandidates.map(cand => {
    const voteCount = posVotes.filter(v => v.candidateId === cand.id).length;
    const percent = totalPosVotes > 0 ? (voteCount / totalPosVotes) * 100 : 0;
    return {
      ...cand,
      voteCount,
      percent
    };
  }).sort((a, b) => b.voteCount - a.voteCount);

  const winner = candidateResults[0];
  const blankVoteResult = candidateResults.find(c => c.isBlankVote);

  // Colombian legal threshold check for Voto en Blanco (Mayoría absoluta > 50%)
  const isBlankVoteMajority = blankVoteResult && blankVoteResult.percent > 50;

  const handleExportResultsCSV = () => {
    const headers = ['Cargo ID', 'Cargo Nombre', 'Tarjetón', 'Candidato', 'Grado', 'Votos Totales', 'Porcentaje'];
    const rows: (string | number)[][] = [];

    positions.forEach(pos => {
      const cands = candidates.filter(c => c.positionId === pos.id);
      const cVotes = votes.filter(v => v.positionId === pos.id);
      const tot = cVotes.length;

      cands.forEach(cand => {
        const cnt = cVotes.filter(v => v.candidateId === cand.id).length;
        const pct = tot > 0 ? ((cnt / tot) * 100).toFixed(2) + '%' : '0%';
        rows.push([pos.id, pos.title, cand.number, cand.fullName, cand.grade, cnt, pct]);
      });
    });

    exportToCSV(`Escrutinio_Resultados_${config.academicYear}`, headers, rows);
  };

  const handleDownloadActaE24 = () => {
    generateActaGeneralE24PDF(config, candidates, positions, votes, students);
  };

  const handleDownloadResultsWithChartsPDF = () => {
    generateResultsReportWithChartsPDF(config, candidates, positions, votes, students);
  };

  const handleRecordResultsInSheets = async () => {
    setIsRecordingSheets(true);
    setSheetsRecordFeedback(null);
    try {
      const res = await recordResultsToSheets();
      if (res.success) {
        setSheetsRecordFeedback({
          type: 'success',
          message: res.message || 'Resultados consolidados registrados exitosamente en Google Sheets.',
          timestamp: new Date().toLocaleTimeString('es-CO')
        });
      } else {
        setSheetsRecordFeedback({
          type: 'error',
          message: res.message || 'Error al registrar resultados en Google Sheets.'
        });
      }
    } catch (err: any) {
      setSheetsRecordFeedback({
        type: 'error',
        message: err.message || 'Error inesperado al conectar con Google Sheets.'
      });
    } finally {
      setIsRecordingSheets(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sheets Sync Feedback Banner */}
      {sheetsRecordFeedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
            sheetsRecordFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-3">
            {sheetsRecordFeedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-bold">
                {sheetsRecordFeedback.type === 'success'
                  ? '¡Resultados Registrados en Google Sheets!'
                  : 'Fallo al Registrar en Google Sheets'}
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                {sheetsRecordFeedback.message}
              </p>
              {sheetsRecordFeedback.timestamp && (
                <p className="text-[11px] font-mono opacity-70 mt-1">
                  Hora de registro: {sheetsRecordFeedback.timestamp} • Pestaña: Resultados_Electorales
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setSheetsRecordFeedback(null)}
            className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Top Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Participación General
            </span>
            <TrendingUp className="w-4 h-4 text-purple-700" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-slate-900">{participacionPct}%</span>
            <span className="text-xs text-slate-500 font-medium">({totalVotaron} de {totalCenso})</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-purple-700 h-2 rounded-full transition-all duration-500"
              style={{ width: `${participacionPct}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Votos en Urna
            </span>
            <BarChart3 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-slate-900">{votes.length}</span>
            <span className="text-xs text-slate-500 ml-1.5 font-medium">votos computados</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Distribuidos en {positions.length} cargos escolares</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Mesas Escrutadas
            </span>
            <CheckCircle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-slate-900">{config.totalMesas} de {config.totalMesas}</span>
            <span className="text-xs text-emerald-700 ml-1.5 font-bold">100% en línea</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Mesas 01, 02 y 03 transmitiendo</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cifrado y Auditoría
            </span>
            <ShieldCheck className="w-4 h-4 text-purple-700" />
          </div>
          <div className="mt-2">
            <span className="text-base font-black text-emerald-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Inmutable SHA-256
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono truncate">
            {config.encryptionKeyFingerprint.slice(0, 24)}...
          </p>
        </div>
      </div>

      {/* Position Selector Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {positions.map(pos => {
            const isSelected = pos.id === selectedPositionId;
            return (
              <button
                key={pos.id}
                onClick={() => {
                  setSelectedPositionId(pos.id);
                  if (pos.id !== 'representante_curso') setSelectedGradeFilter('TODOS');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pos.shortTitle}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={handleRecordResultsInSheets}
            disabled={isRecordingSheets}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            title="Registrar resultados y escrutinio oficial en la hoja de Google Sheets"
          >
            {isRecordingSheets ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span>{isRecordingSheets ? 'Registrando...' : 'Registrar en Sheets'}</span>
          </button>

          <button
            onClick={handleDownloadResultsWithChartsPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            title="Descargar informe oficial en PDF con gráficos estadísticos vectoriales"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>PDF con Gráficos</span>
          </button>

          <button
            onClick={handleDownloadActaE24}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            title="Descargar Formulario E-24 Oficial de Escrutinio Escolar"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Acta E-24</span>
          </button>

          <button
            onClick={handleExportResultsCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
            title="Exportar archivo CSV con los resultados"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Grade / Course Sub-filter for Representante de Curso */}
      {selectedPositionId === 'representante_curso' && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">
              Filtrar por Grado Escolar:
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {['TODOS', ...ALL_GRADES].map(grade => {
              const isGradeActive = selectedGradeFilter === grade;
              return (
                <button
                  key={grade}
                  onClick={() => setSelectedGradeFilter(grade)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isGradeActive
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-white text-purple-900 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  {grade === 'TODOS' ? 'Todos los Grados' : `Grado ${grade}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Voto en Blanco Colombian Law Warning if majority */}
      {isBlankVoteMajority && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3">
          <Scale className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-extrabold uppercase tracking-wide text-amber-900">
              Alerta Normativa: Mayoría Absoluta de Voto en Blanco ({blankVoteResult?.percent.toFixed(1)}%)
            </h4>
            <p>
              Conforme a la jurisprudencia electoral y el Art. 258 de la Constitución Política, cuando el voto en blanco obtiene la mayoría absoluta en una elección uninominal, la jornada electoral debe ser repetida una única vez con nuevos candidatos inscritos.
            </p>
          </div>
        </div>
      )}

      {/* Candidates Live Vote Chart & Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Escrutinio en Tiempo Real: {currentPos.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Total de votos computados para este cargo: <strong>{totalPosVotes}</strong>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {candidateResults.map((cand, idx) => {
            const isWinner = idx === 0 && totalPosVotes > 0;
            const isBlank = cand.isBlankVote;

            return (
              <div
                key={cand.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isWinner && !isBlank
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : isBlank
                    ? 'border-slate-300 bg-slate-50/70'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border shrink-0"
                      style={{
                        backgroundColor: isBlank ? '#f1f5f9' : `${cand.colorHex}20`,
                        color: isBlank ? '#475569' : cand.colorHex,
                        borderColor: isBlank ? '#cbd5e1' : `${cand.colorHex}40`
                      }}
                    >
                      {cand.number}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">
                          {cand.fullName}
                        </h4>
                        {isWinner && !isBlank && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                            <Award className="w-3 h-3" />
                            Lidera Conteo
                          </span>
                        )}
                        {isBlank && (
                          <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 rounded bg-slate-200">
                            Voto en Blanco
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {!isBlank ? `Grado ${cand.grade} • Grupo ${cand.group}` : 'Opción Institucional'}
                      </p>
                    </div>
                  </div>

                  {/* Vote Count & Percent */}
                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-slate-900">
                      {cand.voteCount} <span className="text-xs font-normal text-slate-500">votos</span>
                    </div>
                    <div className="text-xs font-extrabold text-purple-700">
                      {cand.percent.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Horizontal Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mt-2">
                  <div
                    className="h-3 rounded-full transition-all duration-700"
                    style={{
                      width: `${cand.percent}%`,
                      backgroundColor: isBlank ? '#64748b' : cand.colorHex
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mesa-by-Mesa & Polling Station Breakdown (20 Mesas across 6 Puestos) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Despliegue Territorial Electoral
            </span>
            <h3 className="text-base font-black text-slate-900">
              Participación por Puestos y 20 Mesas de Votación
            </h3>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Preescolar hasta Grado 11° • 6 Puestos de Votación
          </div>
        </div>

        <div className="space-y-6">
          {POLLING_STATIONS.map(station => {
            const stationStudents = students.filter(s => station.mesas.includes(s.mesaNumber));
            const stationVoted = stationStudents.filter(s => s.hasVoted).length;
            const stationPct = stationStudents.length > 0 ? Math.round((stationVoted / stationStudents.length) * 100) : 0;

            return (
              <div key={station.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200/70">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900">{station.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold uppercase">
                          {station.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {station.location || station.description} • Grados: <strong className="text-slate-700">{station.gradesCovered.join(', ')}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-600 font-semibold">
                      Sufragaron: <strong className="text-slate-900">{stationVoted}</strong> / {stationStudents.length}
                    </span>
                    <span className="font-black px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 border border-purple-200">
                      {stationPct}%
                    </span>
                  </div>
                </div>

                {/* Individual Mesas inside this Station */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {station.mesas.map(mNum => {
                    const mStudents = students.filter(s => s.mesaNumber === mNum);
                    const mVoted = mStudents.filter(s => s.hasVoted).length;
                    const mPct = mStudents.length > 0 ? Math.round((mVoted / mStudents.length) * 100) : 0;

                    return (
                      <div key={mNum} className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-slate-800">
                            Mesa {String(mNum).padStart(2, '0')}
                          </span>
                          <span className="text-xs font-bold text-purple-700">{mPct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
                          <div
                            className="bg-purple-700 h-1.5 rounded-full transition-all"
                            style={{ width: `${mPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Votos: <strong className="text-slate-800">{mVoted}</strong></span>
                          <span>Censo: <strong className="text-slate-800">{mStudents.length}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
