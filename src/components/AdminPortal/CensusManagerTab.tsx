import {
  Building2,
  Check,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Filter,
  MapPin,
  Plus,
  Search,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { ALL_GRADES, getStationForGrade, getStationForMesa, POLLING_STATIONS } from '../../data/mockElectionData';
import { DocumentType, Student } from '../../types/election';
import { exportToCSV } from '../../utils/pdfGenerator';
import { UnifiedSheetsImportModal } from './UnifiedSheetsImportModal';

export const CensusManagerTab: React.FC = () => {
  const { students, addStudent, config } = useElection();
  const [search, setSearch] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedMesa, setSelectedMesa] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);

  // New Student Form State
  const [docType, setDocType] = useState<DocumentType>('TI');
  const [docNumber, setDocNumber] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [grade, setGrade] = useState<string>('10°');
  const [group, setGroup] = useState<string>('10-A');
  const [email, setEmail] = useState<string>('');
  const [mesaNumber, setMesaNumber] = useState<number>(18);

  // Auto assign mesa based on grade and station
  const handleGradeChange = (g: string) => {
    setGrade(g);
    const station = getStationForGrade(g);
    // Assign to first mesa of that station
    setMesaNumber(station.mesas[0]);
  };

  const currentModalStation = getStationForMesa(mesaNumber);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim() || !fullName.trim()) return;

    addStudent({
      documentType: docType,
      documentNumber: docNumber.trim(),
      fullName: fullName.trim(),
      grade,
      group,
      email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, '.')}@ekiraya.edu.co`,
      mesaNumber
    });

    setIsAddModalOpen(false);
    setDocNumber('');
    setFullName('');
    setEmail('');
  };

  const filteredStudents = students.filter(s => {
    const matchSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.documentNumber.includes(search) ||
      s.email.toLowerCase().includes(search.toLowerCase());

    const matchGrade = selectedGrade === 'all' || s.grade === selectedGrade;
    const matchMesa = selectedMesa === 'all' || s.mesaNumber.toString() === selectedMesa;

    return matchSearch && matchGrade && matchMesa;
  });

  const handleExportCensusCSV = () => {
    const headers = ['ID', 'Tipo Doc', 'Documento', 'Nombre', 'Grado', 'Grupo', 'Mesa', 'Puesto de Votación', 'Email', 'Ha Votado', 'Folio Certificado'];
    const rows = students.map(s => [
      s.id,
      s.documentType,
      s.documentNumber,
      s.fullName,
      s.grade,
      s.group,
      `Mesa ${String(s.mesaNumber).padStart(2, '0')}`,
      getStationForMesa(s.mesaNumber).name,
      s.email,
      s.hasVoted ? 'SÍ' : 'NO',
      s.receiptFolio || '-'
    ]);
    exportToCSV(`Censo_Electoral_${config.academicYear}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      
      {/* Top action header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900">
            Censo Electoral Estudiantil
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Total censados: <strong>{students.length}</strong> • Sufragaron: <strong>{students.filter(s => s.hasVoted).length}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar Estudiante</span>
          </button>

          <button
            onClick={() => setIsSheetsModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Importar de Sheets</span>
          </button>

          <button
            onClick={handleExportCensusCSV}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, documento o correo..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Grade filter */}
          <select
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
          >
            <option value="all">Todos los Grados</option>
            {ALL_GRADES.map(g => (
              <option key={g} value={g}>Grado {g}</option>
            ))}
          </select>

          {/* Mesa filter */}
          <select
            value={selectedMesa}
            onChange={e => setSelectedMesa(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
          >
            <option value="all">Todas las Mesas (20)</option>
            {POLLING_STATIONS.map(st => (
              <optgroup key={st.id} label={`${st.name} (${st.category})`}>
                {st.mesas.map(m => (
                  <option key={m} value={m.toString()}>
                    Mesa {String(m).padStart(2, '0')} - {st.shortName}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Doc / Identificación</th>
                <th className="py-3 px-4">Estudiante</th>
                <th className="py-3 px-4">Grado & Grupo</th>
                <th className="py-3 px-4">Mesa</th>
                <th className="py-3 px-4">Estado Voto</th>
                <th className="py-3 px-4">Folio Certificado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No se encontraron estudiantes con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="text-slate-400 font-normal mr-1">{student.documentType}</span>
                      {student.documentNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{student.fullName}</div>
                      <div className="text-[11px] text-slate-400 truncate">{student.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                        {student.grade} - {student.group}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-purple-800">
                        Mesa {String(student.mesaNumber).padStart(2, '0')}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {getStationForMesa(student.mesaNumber).shortName}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {student.hasVoted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Sufragó
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {student.receiptFolio || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Inscribir Estudiante en Censo</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Documento</label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value as DocumentType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="TI">T.I. - Tarjeta de Identidad</option>
                  <option value="RC">R.C. - Registro Civil</option>
                  <option value="CE">C.E. - Cédula de Extranjería</option>
                  <option value="COD">CÓD - Código de Matrícula</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Documento</label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={e => setDocNumber(e.target.value)}
                  placeholder="1023456789"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Ej: Juan Sebastián Ramírez"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Grado</label>
                  <select
                    value={grade}
                    onChange={e => handleGradeChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {ALL_GRADES.map(g => (
                      <option key={g} value={g}>Grado {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Grupo</label>
                  <input
                    type="text"
                    value={group}
                    onChange={e => setGroup(e.target.value)}
                    placeholder="10-A"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Correo Institucional (para certificado)</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="juan.ramirez@ekiraya.edu.co"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="p-3 bg-purple-50 rounded-xl text-purple-900 text-[11px] font-medium space-y-0.5">
                <div>Mesa asignada: <strong>Mesa {String(mesaNumber).padStart(2, '0')}</strong></div>
                <div className="text-purple-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Puesto: <strong>{currentModalStation.name}</strong> ({currentModalStation.category})
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold"
                >
                  Guardar Estudiante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sheets Import Hub */}
      <UnifiedSheetsImportModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        defaultTable="voters"
      />
    </div>
  );
};
