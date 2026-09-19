import {
  AlertCircle,
  Building2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  MapPin,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  Vote
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { getStationForMesa, POLLING_STATIONS } from '../../data/mockElectionData';
import { Student } from '../../types/election';
import { exportToCSV, generateActaMesaE14PDF } from '../../utils/pdfGenerator';

export const JuradoDashboard: React.FC = () => {
  const {
    config,
    positions,
    candidates,
    students,
    votes,
    juradoMesa,
    setJuradoMesa,
    verifyStudentAtMesa
  } = useElection();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'voted' | 'pending'>('all');
  const [juradoName, setJuradoName] = useState<string>('Jurado Principal (Mesa)');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const currentStation = getStationForMesa(juradoMesa);
  const totalMesas = config.totalMesas || 20;

  // Filter students for this mesa
  const mesaStudents = students.filter(s => s.mesaNumber === juradoMesa);
  const totalCensoMesa = mesaStudents.length;
  const votedMesaCount = mesaStudents.filter(s => s.hasVoted).length;
  const pendingMesaCount = totalCensoMesa - votedMesaCount;
  const turnoutPercent = totalCensoMesa > 0 ? Math.round((votedMesaCount / totalCensoMesa) * 100) : 0;

  // Search and filter list
  const filteredStudents = mesaStudents.filter(student => {
    const matchesQuery =
      student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.documentNumber.includes(searchQuery) ||
      student.grade.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesQuery) return false;
    if (filterStatus === 'voted') return student.hasVoted;
    if (filterStatus === 'pending') return !student.hasVoted;
    return true;
  });

  const handleVerifyStudent = (student: Student) => {
    const ok = verifyStudentAtMesa(student.id, juradoName);
    if (ok) {
      setNotificationMsg(`Estudiante ${student.fullName} verificado y habilitado para pasar a la cabina.`);
      setTimeout(() => setNotificationMsg(null), 4000);
    }
  };

  const handleDownloadActaE14 = () => {
    generateActaMesaE14PDF(juradoMesa, config, candidates, positions, votes, students);
  };

  const handleDownloadMesaCSV = () => {
    const headers = ['Mesa', 'Puesto', 'Tipo Doc', 'Documento', 'Nombre Completo', 'Grado', 'Grupo', 'Ha Votado', 'Hora Voto', 'Folio Certificado', 'Verificado Jurado'];
    const rows = mesaStudents.map(s => [
      `Mesa ${String(s.mesaNumber).padStart(2, '0')}`,
      currentStation.name,
      s.documentType,
      s.documentNumber,
      s.fullName,
      s.grade,
      s.group,
      s.hasVoted ? 'SÍ' : 'NO',
      s.votedAt ? new Date(s.votedAt).toLocaleTimeString('es-CO') : '-',
      s.receiptFolio || '-',
      s.isVerifiedByJurado ? 'SÍ' : 'NO'
    ]);
    exportToCSV(`Censo_Mesa_${String(juradoMesa).padStart(2, '0')}_${config.academicYear}`, headers, rows);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Jurado Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-900 border border-purple-200">
                  Panel de Jurados de Votación
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-purple-600" />
                  {currentStation.name}
                </span>
                <span className="text-xs text-slate-500 font-medium">Elecciones Escolares 2026</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                Control de Mesa {String(juradoMesa).padStart(2, '0')} de {totalMesas}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Puesto: <strong className="text-slate-800">{currentStation.name}</strong> • Grados: <span className="font-semibold text-purple-700">{currentStation.gradesCovered.join(', ')}</span>
              </p>
            </div>
          </div>

          {/* Mesa Switcher (20 Mesas organized by Puesto) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setJuradoMesa(Math.max(1, juradoMesa - 1))}
                disabled={juradoMesa <= 1}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Mesa anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                id="select-mesa-jurado"
                value={juradoMesa}
                onChange={(e) => setJuradoMesa(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
              >
                {POLLING_STATIONS.map(st => (
                  <optgroup key={st.id} label={`${st.name} (${st.category})`}>
                    {st.mesas.map(m => (
                      <option key={m} value={m}>
                        Mesa {String(m).padStart(2, '0')} - {st.shortName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <button
                onClick={() => setJuradoMesa(Math.min(totalMesas, juradoMesa + 1))}
                disabled={juradoMesa >= totalMesas}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Siguiente mesa"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Official Formulario E-14 button */}
            <button
              id="btn-generar-acta-e14"
              onClick={handleDownloadActaE14}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Generar Acta E-14 (PDF)</span>
            </button>

            <button
              onClick={handleDownloadMesaCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
              title="Exportar censo de la mesa a CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Censo</span> CSV
            </button>
          </div>
        </div>

        {/* Quick Polling Station Pills */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-purple-600" />
            Puestos:
          </span>
          {POLLING_STATIONS.map(station => {
            const isSelected = station.mesas.includes(juradoMesa);
            return (
              <button
                key={station.id}
                onClick={() => setJuradoMesa(station.mesas[0])}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{station.shortName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-600'
                }`}>
                  Mesas {station.mesas[0]}-{station.mesas[station.mesas.length - 1]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mesa Overview Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500">Censo Habilitado en Mesa</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalCensoMesa}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Estudiantes asignados</p>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100">
            <p className="text-xs font-semibold text-purple-900">Sufragaron (Votos en Urna)</p>
            <p className="text-2xl font-black text-purple-700 mt-1">{votedMesaCount}</p>
            <p className="text-[11px] text-purple-700 mt-0.5">{turnoutPercent}% de participación</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100">
            <p className="text-xs font-semibold text-amber-800">Pendientes por Sufragar</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{pendingMesaCount}</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Aún no registran voto</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800">
            <p className="text-xs font-semibold text-purple-300">Urna Criptográfica</p>
            <p className="text-sm font-black text-white mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Cifrado E2E Activo
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Voto Secreto Garantizado</p>
          </div>
        </div>
      </div>

      {/* Notification Toast if student verified */}
      {notificationMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Search and Voters Roster */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por documento o nombre..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 font-medium"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterStatus === 'all'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Todos ({mesaStudents.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Pendientes ({pendingMesaCount})
            </button>
            <button
              onClick={() => setFilterStatus('voted')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterStatus === 'voted'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Sufragaron ({votedMesaCount})
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Identificación</th>
                <th className="py-3 px-4">Estudiante</th>
                <th className="py-3 px-4">Grado</th>
                <th className="py-3 px-4">Estado Electoral</th>
                <th className="py-3 px-4">Verificación Mesa</th>
                <th className="py-3 px-4 text-right">Acción Jurado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No se encontraron estudiantes para la búsqueda especificada en Mesa 0{juradoMesa}.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <span className="text-slate-400 font-normal mr-1">{student.documentType}</span>
                      {student.documentNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{student.fullName}</div>
                      <div className="text-[11px] text-slate-400 truncate">{student.email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                        {student.grade} - {student.group}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {student.hasVoted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                          <CheckCircle className="w-3 h-3 text-purple-700" />
                          Sufragó ({new Date(student.votedAt || '').toLocaleTimeString('es-CO')})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pendiente de Voto
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {student.isVerifiedByJurado ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700">
                          <UserCheck className="w-3.5 h-3.5" />
                          Habilitado en Mesa
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Sin verificar en lista
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {!student.hasVoted && (
                        <button
                          type="button"
                          onClick={() => handleVerifyStudent(student)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            student.isVerifiedByJurado
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              : 'bg-purple-700 hover:bg-purple-800 text-white shadow-xs'
                          }`}
                        >
                          {student.isVerifiedByJurado ? 'Re-confirmar' : 'Habilitar Voto'}
                        </button>
                      )}
                      {student.hasVoted && (
                        <span className="text-[11px] font-mono text-slate-400">
                          {student.receiptFolio || 'Certificado Emitido'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
