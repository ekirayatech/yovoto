import {
  AlertCircle,
  ArrowRight,
  Award,
  Building2,
  Calendar,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  GraduationCap,
  HelpCircle,
  Info,
  MapPin,
  Printer,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  Users,
  Vote,
  X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { getStationForGrade, getStationForMesa, POLLING_STATIONS } from '../../data/mockElectionData';
import { DocumentType, PollingStation, Student } from '../../types/election';

export const ConsultarPuestoPage: React.FC = () => {
  const {
    students,
    config,
    setCurrentRole,
    authenticateStudent,
    jurados,
    votes
  } = useElection();

  const [docType, setDocType] = useState<DocumentType>('TI');
  const [docNumber, setDocNumber] = useState<string>('');
  const [searched, setSearched] = useState<boolean>(false);
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [stationInfo, setStationInfo] = useState<PollingStation | null>(null);
  const [selectedStationFilter, setSelectedStationFilter] = useState<string | null>(null);
  const [quickFilterGrade, setQuickFilterGrade] = useState<string>('TODOS');
  const [isRedirectingToVote, setIsRedirectingToVote] = useState<boolean>(false);

  // Normalization helper for searching
  const normalize = (val: string) => val.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = normalize(docNumber);
    if (!cleanQuery) return;

    const match = students.find((s) => {
      const matchDoc = normalize(s.documentNumber) === cleanQuery;
      // Also allow matching without document type strictly or if docType matches
      return matchDoc;
    });

    setSearched(true);
    if (match) {
      setFoundStudent(match);
      const st = getStationForMesa(match.mesaNumber || 1);
      setStationInfo(st);
    } else {
      setFoundStudent(null);
      setStationInfo(null);
    }
  };

  const handleQuickSelect = (student: Student) => {
    setDocType(student.documentType);
    setDocNumber(student.documentNumber);
    setFoundStudent(student);
    const st = getStationForMesa(student.mesaNumber || 1);
    setStationInfo(st);
    setSearched(true);
  };

  const handleGoToVote = async (student: Student) => {
    setIsRedirectingToVote(true);
    try {
      const res = await authenticateStudent(student.documentType, student.documentNumber);
      if (res.success) {
        setCurrentRole('VOTANTE');
      } else {
        // Switch to voter role anyway and let voter auth show the state
        setCurrentRole('VOTANTE');
      }
    } catch {
      setCurrentRole('VOTANTE');
    } finally {
      setIsRedirectingToVote(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  // Jurados assigned to this mesa
  const mesaJurados = useMemo(() => {
    if (!foundStudent?.mesaNumber) return [];
    return jurados.filter(j => j.mesaNumber === foundStudent.mesaNumber);
  }, [jurados, foundStudent]);

  // Statistics per station
  const stationStats = useMemo(() => {
    return POLLING_STATIONS.map((station) => {
      const stationStudents = students.filter(s => station.gradesCovered.includes(s.grade));
      const votedStudents = stationStudents.filter(s => s.hasVoted);
      const pct = stationStudents.length > 0 ? Math.round((votedStudents.length / stationStudents.length) * 100) : 0;
      return {
        ...station,
        totalCensus: stationStudents.length,
        totalVoted: votedStudents.length,
        participationPct: pct
      };
    });
  }, [students]);

  // Quick sample students from various grade tiers for instant testing
  const sampleStudents = useMemo(() => {
    const grades = ['Transición', '2°', '4°', '7°', '9°', '11°'];
    return grades.map(g => students.find(s => s.grade === g)).filter(Boolean) as Student[];
  }, [students]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 mb-3 shadow-xs">
            <Search className="w-3.5 h-3.5" />
            Infovotantes Ekirayá 2026
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Consulta tu Puesto y Mesa de Votación
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
            Ingresa tu número de documento para conocer tu mesa asignada, taller o aula de votación, estado en el censo electoral y requisitos para sufragar.
          </p>
        </div>
      </div>

      {/* Main Search Box */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Identificación del Estudiante / Sufragante:
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Document Type */}
            <div className="sm:w-44 shrink-0">
              <select
                id="select-consult-doctype"
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full h-13 text-sm font-semibold px-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-purple-600 focus:bg-white outline-none transition-all cursor-pointer"
              >
                <option value="TI">T.I. - Tarjeta Identidad</option>
                <option value="CC">C.C. - Cédula Ciudadanía</option>
                <option value="RC">R.C. - Registro Civil</option>
                <option value="COD">CÓDIGO Estudiantil</option>
              </select>
            </div>

            {/* Document Number Input */}
            <div className="flex-1 relative">
              <input
                id="input-consult-docnumber"
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="Ingresa tu número de documento o código..."
                className="w-full h-13 text-base font-semibold px-4 pl-11 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-purple-600 focus:bg-white outline-none transition-all"
                autoFocus
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
              {docNumber && (
                <button
                  type="button"
                  onClick={() => {
                    setDocNumber('');
                    setSearched(false);
                    setFoundStudent(null);
                  }}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="btn-submit-consult-puesto"
              type="submit"
              className="h-13 px-7 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0 shadow-md hover:shadow-lg cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Consultar Puesto</span>
            </button>
          </div>

          {/* Quick Examples Chips */}
          <div className="pt-2 flex items-center gap-2 flex-wrap text-xs text-slate-500">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Consultas de prueba rápida:
            </span>
            {sampleStudents.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleQuickSelect(s)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-purple-100 hover:text-purple-900 border border-slate-200 rounded-lg font-medium transition-colors cursor-pointer"
              >
                {s.fullName.split(' ')[0]} ({s.grade})
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* RESULT CARD IF FOUND */}
      {searched && foundStudent && stationInfo && (
        <div className="bg-white rounded-3xl border-2 border-purple-300 shadow-xl overflow-hidden animate-fadeIn">
          {/* Result Card Header */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white font-black text-xl shrink-0">
                {foundStudent.fullName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950">
                    Censo Habilitado
                  </span>
                  <span className="text-xs text-slate-300">
                    {foundStudent.documentType}: {foundStudent.documentNumber}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {foundStudent.fullName}
                </h3>
                <p className="text-xs text-purple-200">
                  Grado <strong>{foundStudent.grade}</strong> • Grupo <strong>{foundStudent.group}</strong> • {config.institutionName}
                </p>
              </div>
            </div>

            {/* Voting Status Badge */}
            <div>
              {foundStudent.hasVoted ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Voto Ejercido</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold">
                  <Clock className="w-4 h-4 text-amber-300" />
                  <span>Pendiente por Votar</span>
                </div>
              )}
            </div>
          </div>

          {/* Result Card Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Prominent Location Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Mesa Assignment Box */}
              <div className="p-5 bg-purple-50 rounded-2xl border border-purple-200 text-center flex flex-col items-center justify-center">
                <div className="text-xs font-black uppercase tracking-wider text-purple-700 mb-1">
                  Tu Mesa de Votación
                </div>
                <div className="text-4xl sm:text-5xl font-black text-purple-950 my-1">
                  Mesa 0{foundStudent.mesaNumber || 1}
                </div>
                <div className="text-xs text-purple-800 font-semibold mt-1">
                  Mesa oficial asignada
                </div>
              </div>

              {/* Polling Station Name */}
              <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-200 md:col-span-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-indigo-700 text-xs font-black uppercase tracking-wider mb-1">
                    <Building2 className="w-4 h-4" /> Puesto y Aula Designada
                  </div>
                  <h4 className="text-lg sm:text-xl font-black text-indigo-950">
                    {stationInfo.name}
                  </h4>
                  <p className="text-xs text-indigo-800 mt-1">
                    {stationInfo.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-200/60 flex items-center justify-between text-xs text-indigo-900 flex-wrap gap-2">
                  <span className="flex items-center gap-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    Ubicación: Edificio Ekirayá • {stationInfo.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-200/70 font-bold text-indigo-950">
                    Mesas del puesto: {stationInfo.mesas.map(m => `0${m}`).join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Voting Details & Jurados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Details of Election & Status */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-purple-700" />
                  Información para el día de votación
                </h5>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span>Estado en Censo:</span>
                    <strong className="text-emerald-700 font-bold">HABILITADO PARA SUFRAGAR</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span>Cargos a elegir:</span>
                    <strong className="text-slate-900">Personero, Contralor y Cabildante</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span>Documento Requerido:</span>
                    <strong className="text-slate-900">Carnet Estudiantil o T.I. física</strong>
                  </div>
                  {foundStudent.hasVoted && (
                    <div className="flex justify-between py-1 bg-emerald-50 p-2 rounded-lg text-emerald-900 font-semibold">
                      <span>Folio de Certificado:</span>
                      <span className="font-mono font-black">{foundStudent.receiptFolio || 'CEM-2026-CERT'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Jurados de la Mesa */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-700" />
                  Jurados de Votación asignados a tu mesa
                </h5>
                {mesaJurados.length > 0 ? (
                  <div className="space-y-1.5">
                    {mesaJurados.map((j) => (
                      <div
                        key={j.id}
                        className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{j.fullName}</div>
                          <div className="text-[10px] text-slate-500">Mesa 0{j.mesaNumber} • {j.role.replace('_', ' ')}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {j.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic py-2">
                    Mesa atendida por docentes y estudiantes jurados de gobierno escolar Ekirayá.
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrintSlip}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Imprimir / Guardar Ficha</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {!foundStudent.hasVoted ? (
                  <button
                    type="button"
                    onClick={() => handleGoToVote(foundStudent)}
                    disabled={isRedirectingToVote}
                    className="w-full sm:w-auto px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
                  >
                    <Vote className="w-4 h-4 text-purple-200" />
                    <span>{isRedirectingToVote ? 'Ingresando a Cabina...' : 'Ir a Cabina y Votar Ahora'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="px-4 py-2 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Ya has ejercido tu derecho al voto</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOT FOUND ALERT */}
      {searched && !foundStudent && (
        <div className="bg-white rounded-3xl border border-rose-200 shadow-sm p-6 sm:p-8 text-center space-y-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">
              Documento No Encontrado en el Censo
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              El número <code className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-900">{docNumber}</code> no figura registrado en el censo electoral oficial de esta jornada.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl max-w-md mx-auto text-left text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-purple-700" />
              ¿Qué puedes hacer?
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Verifica que hayas digitado el número sin puntos ni comas.</li>
              <li>Prueba seleccionando otro tipo de documento (T.I. o Código).</li>
              <li>Acércate a la mesa de Coordinación Electoral con tu documento.</li>
            </ul>
          </div>
        </div>
      )}

      {/* GENERAL DIRECTORY OF POLLING STATIONS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-700" />
              <h3 className="text-lg font-black text-slate-900">
                Directorio General de Puestos y Mesas - Colegio Ekirayá
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribución de los 6 puestos oficiales según los ciclos pedagógicos y grados del colegio.
            </p>
          </div>

          {/* Quick grade selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500">Filtrar:</label>
            <select
              value={quickFilterGrade}
              onChange={(e) => setQuickFilterGrade(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer"
            >
              <option value="TODOS">Todos los puestos</option>
              <option value="Preescolar">Preescolar (Casa de niños)</option>
              <option value="Primaria">Primaria (Talleres 1 y 2)</option>
              <option value="Bachillerato medio">Bachillerato medio (Talleres 3 y 4)</option>
              <option value="Bachillerato alto">Bachillerato alto (Taller 5)</option>
            </select>
          </div>
        </div>

        {/* Stations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stationStats
            .filter(st => quickFilterGrade === 'TODOS' || st.category === quickFilterGrade)
            .map((station) => (
              <div
                key={station.id}
                className="p-5 bg-slate-50/70 hover:bg-purple-50/40 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800">
                      {station.category}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      Mesas: {station.mesas.map(m => `0${m}`).join(', ')}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900">
                    {station.name}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {station.description}
                  </p>

                  {/* Covered Grades Tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {station.gradesCovered.map((g) => (
                      <span
                        key={g}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700"
                      >
                        Grado {g}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Participation Progress */}
                <div className="mt-4 pt-3 border-t border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500 font-medium">Participación actual:</span>
                    <span className="font-black text-purple-950">{station.participationPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${station.participationPct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 text-right">
                    {station.totalVoted} de {station.totalCensus} votos registrados
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
