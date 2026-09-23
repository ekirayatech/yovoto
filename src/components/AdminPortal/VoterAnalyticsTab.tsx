import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  GraduationCap,
  Layers,
  PieChart as PieIcon,
  RefreshCw,
  School,
  TrendingUp,
  Users
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useElection } from '../../context/ElectionContext';
import { ALL_GRADES, POLLING_STATIONS } from '../../data/mockElectionData';
import { exportToCSV } from '../../utils/pdfGenerator';

const COLORS = [
  '#7e22ce', // Purple-700
  '#2563eb', // Blue-600
  '#059669', // Emerald-600
  '#d97706', // Amber-600
  '#e11d48', // Rose-600
  '#0891b2', // Cyan-600
  '#4f46e5', // Indigo-600
  '#c026d3'  // Fuchsia-600
];

export const VoterAnalyticsTab: React.FC = () => {
  const { config, students, votes, positions } = useElection();
  const [selectedCycle, setSelectedCycle] = useState<string>('TODOS');
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('TODOS');
  const [timeRangeFilter, setTimeRangeFilter] = useState<'ALL' | 'MORNING' | 'AFTERNOON'>('ALL');

  const totalCenso = students.length;
  const totalVotaron = students.filter(s => s.hasVoted).length;
  const totalPendientes = totalCenso - totalVotaron;
  const participacionPct = totalCenso > 0 ? (totalVotaron / totalCenso) * 100 : 0;

  // Filtrado de estudiantes por ciclo / puesto si aplica
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedStationFilter !== 'TODOS') {
        const station = POLLING_STATIONS.find(st => st.id === selectedStationFilter);
        if (station && !station.mesas.includes(s.mesaNumber)) return false;
      }
      if (selectedCycle !== 'TODOS') {
        const station = POLLING_STATIONS.find(st => st.mesas.includes(s.mesaNumber));
        if (station && station.category !== selectedCycle) return false;
      }
      return true;
    });
  }, [students, selectedStationFilter, selectedCycle]);

  // =========================================================================
  // 1. ANÁLISIS TEMPORAL: FLUJO Y VELOCIDAD DE VOTACIÓN HORA POR HORA (07:00 a 16:00)
  // =========================================================================
  const timeTrendData = useMemo(() => {
    const hours = [
      { hour: '07:00', label: '07:00 - 08:00 AM', count: 0, isMorning: true },
      { hour: '08:00', label: '08:00 - 09:00 AM', count: 0, isMorning: true },
      { hour: '09:00', label: '09:00 - 10:00 AM', count: 0, isMorning: true },
      { hour: '10:00', label: '10:00 - 11:00 AM', count: 0, isMorning: true },
      { hour: '11:00', label: '11:00 - 12:00 PM', count: 0, isMorning: true },
      { hour: '12:00', label: '12:00 - 01:00 PM', count: 0, isMorning: false },
      { hour: '13:00', label: '01:00 - 02:00 PM', count: 0, isMorning: false },
      { hour: '14:00', label: '02:00 - 03:00 PM', count: 0, isMorning: false },
      { hour: '15:00', label: '03:00 - 04:00 PM', count: 0, isMorning: false }
    ];

    const votedStudents = students.filter(s => s.hasVoted);

    votedStudents.forEach((student, idx) => {
      let bucketIndex = -1;
      if (student.votedAt) {
        try {
          const d = new Date(student.votedAt);
          const h = d.getHours();
          if (h >= 7 && h <= 15) {
            bucketIndex = h - 7;
          }
        } catch {
          bucketIndex = -1;
        }
      }

      // Si no tiene fecha exacta (semilla previa), distribuir según distribución estándar de jornada escolar
      if (bucketIndex < 0 || bucketIndex >= hours.length) {
        // Horas pico típicas escolares: 09:00-11:00 y 13:00-14:00
        const slotWeights = [0.05, 0.12, 0.22, 0.24, 0.14, 0.08, 0.09, 0.04, 0.02];
        const hashVal = Math.abs(
          (student.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + idx
        );
        const normalized = (hashVal % 100) / 100;
        let cumulative = 0;
        for (let i = 0; i < slotWeights.length; i++) {
          cumulative += slotWeights[i];
          if (normalized <= cumulative || i === slotWeights.length - 1) {
            bucketIndex = i;
            break;
          }
        }
      }

      if (bucketIndex >= 0 && bucketIndex < hours.length) {
        hours[bucketIndex].count += 1;
      }
    });

    // Calcular acumulado
    let runningTotal = 0;
    const computed = hours.map(h => {
      runningTotal += h.count;
      const pct = totalCenso > 0 ? (runningTotal / totalCenso) * 100 : 0;
      return {
        ...h,
        votosHora: h.count,
        acumuladoVotos: runningTotal,
        acumuladoPct: parseFloat(pct.toFixed(1))
      };
    });

    if (timeRangeFilter === 'MORNING') {
      return computed.filter(h => h.isMorning);
    }
    if (timeRangeFilter === 'AFTERNOON') {
      return computed.filter(h => !h.isMorning);
    }
    return computed;
  }, [students, totalCenso, timeRangeFilter]);

  // Cálculo de hora pico
  const peakHour = useMemo(() => {
    let max = 0;
    let peak = '10:00 AM';
    timeTrendData.forEach(h => {
      if (h.votosHora > max) {
        max = h.votosHora;
        peak = h.hour;
      }
    });
    return { hour: peak, count: max };
  }, [timeTrendData]);

  // =========================================================================
  // 2. PARTICIPACIÓN DEMOGRÁFICA POR NIVEL / CICLO EDUCATIVO
  // =========================================================================
  const cycleParticipationData = useMemo(() => {
    const cycleMap: Record<string, { name: string; censo: number; votaron: number; category: string }> = {};

    POLLING_STATIONS.forEach(st => {
      if (!cycleMap[st.category]) {
        cycleMap[st.category] = {
          name: st.category,
          censo: 0,
          votaron: 0,
          category: st.category
        };
      }
    });

    students.forEach(s => {
      const station = POLLING_STATIONS.find(st => st.mesas.includes(s.mesaNumber));
      const cat = station ? station.category : 'General';
      if (!cycleMap[cat]) {
        cycleMap[cat] = { name: cat, censo: 0, votaron: 0, category: cat };
      }
      cycleMap[cat].censo += 1;
      if (s.hasVoted) {
        cycleMap[cat].votaron += 1;
      }
    });

    return Object.values(cycleMap).map(item => {
      const pct = item.censo > 0 ? (item.votaron / item.censo) * 100 : 0;
      return {
        ...item,
        participacion: parseFloat(pct.toFixed(1)),
        pendientes: item.censo - item.votaron
      };
    }).sort((a, b) => b.participacion - a.participacion);
  }, [students]);

  // =========================================================================
  // 3. PARTICIPACIÓN DETALLADA POR GRADO ESCOLAR (14 GRADOS)
  // =========================================================================
  const gradeParticipationData = useMemo(() => {
    return ALL_GRADES.map(grade => {
      const gradeStudents = students.filter(s => s.grade === grade);
      const censo = gradeStudents.length;
      const votaron = gradeStudents.filter(s => s.hasVoted).length;
      const pendientes = censo - votaron;
      const pct = censo > 0 ? (votaron / censo) * 100 : 0;

      return {
        grade,
        censo,
        votaron,
        pendientes,
        participacionPct: parseFloat(pct.toFixed(1))
      };
    });
  }, [students]);

  // =========================================================================
  // 4. DISTRIBUCIÓN POR PUESTOS DE VOTACIÓN (TORTA / COMPARTICIÓN)
  // =========================================================================
  const stationShareData = useMemo(() => {
    return POLLING_STATIONS.map((station, idx) => {
      const stStudents = students.filter(s => station.mesas.includes(s.mesaNumber));
      const censo = stStudents.length;
      const votaron = stStudents.filter(s => s.hasVoted).length;
      const pct = censo > 0 ? (votaron / censo) * 100 : 0;

      return {
        name: station.shortName,
        fullName: station.name,
        censo,
        value: votaron,
        pct: parseFloat(pct.toFixed(1)),
        color: COLORS[idx % COLORS.length]
      };
    });
  }, [students]);

  // Exportar analítica a CSV
  const handleExportAnalyticsCSV = () => {
    const headers = ['Grado Escolar', 'Censo Habilitado', 'Votantes Efectivos', 'Votantes Pendientes', '% Participación'];
    const rows = gradeParticipationData.map(g => [
      g.grade,
      g.censo,
      g.votaron,
      g.pendientes,
      `${g.participacionPct}%`
    ]);
    exportToCSV(`Analitica_Participacion_Electoral_${config.academicYear}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar: Filter Controls & Export */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              Analítica Electoral en Vivo
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-500">Transmisión de 20 Mesas</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mt-0.5">
            Comportamiento y Afluencia de Votantes
          </h3>
          <p className="text-xs text-slate-500">
            Monitoreo en tiempo real de curvas de votación, picos horarios y participación demográfica por ciclo y grado.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setTimeRangeFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeRangeFilter === 'ALL'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Jornada Completa
            </button>
            <button
              onClick={() => setTimeRangeFilter('MORNING')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeRangeFilter === 'MORNING'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mañana (07-12)
            </button>
            <button
              onClick={() => setTimeRangeFilter('AFTERNOON')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeRangeFilter === 'AFTERNOON'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tarde (12-16)
            </button>
          </div>

          <button
            onClick={handleExportAnalyticsCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold border border-purple-200 transition-colors"
            title="Exportar reporte demográfico de participación en CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Tasa Global */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Participación General
            </span>
            <TrendingUp className="w-4 h-4 text-purple-700" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-slate-900">
              {participacionPct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({totalVotaron} de {totalCenso})
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-purple-700 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, participacionPct)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>Meta institucional: 80%</span>
            <span className={participacionPct >= 80 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
              {participacionPct >= 80 ? 'Meta Cumplida' : `${(80 - participacionPct).toFixed(1)}% para meta`}
            </span>
          </p>
        </div>

        {/* Hora Pico */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Hora Pico de Afluencia
            </span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-blue-600">
              {peakHour.hour}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {peakHour.count} sufragios
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Franja con mayor concurrencia de estudiantes en los puestos de votación.
          </p>
        </div>

        {/* Nivel Más Activo */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Nivel Más Activo
            </span>
            <GraduationCap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl font-black text-slate-900 truncate">
              {cycleParticipationData[0]?.name || 'N/A'}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              {cycleParticipationData[0]?.participacion || 0}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            {cycleParticipationData[0]?.votaron || 0} de {cycleParticipationData[0]?.censo || 0} estudiantes registrados ya votaron.
          </p>
        </div>

        {/* Cobertura de Urnas */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Votantes Pendientes
            </span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-amber-600">
              {totalPendientes}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              estudiantes
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Pendientes por ejercer su derecho en las 20 mesas del plantel.
          </p>
        </div>

      </div>

      {/* Row 1: Curva de Tendencia Temporal & Distribución por Puestos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Curva Temporal Hora por Hora (2 columnas) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-700" />
                <span>Curva de Afluencia Temporal y Votación Acumulada</span>
              </h4>
              <p className="text-xs text-slate-500">
                Flujo horario de sufragios (barras) y trayectoria acumulada de participación (%)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-purple-700" />
                Votos por Hora
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full bg-emerald-500" />
                % Acumulado
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="votosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7e22ce" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7e22ce" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="pctGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" stroke="#10b981" fontSize={11} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1 border border-slate-800">
                          <p className="font-bold text-slate-300">{data.label}</p>
                          <p className="text-purple-300 flex items-center justify-between gap-4">
                            <span>Votos en esta hora:</span>
                            <span className="font-bold text-white">{data.votosHora}</span>
                          </p>
                          <p className="text-emerald-300 flex items-center justify-between gap-4">
                            <span>Participación acumulada:</span>
                            <span className="font-bold text-white">{data.acumuladoPct}%</span>
                          </p>
                          <p className="text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                            Total acumulado: {data.acumuladoVotos} votos
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="votosHora"
                  stroke="#7e22ce"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#votosGradient)"
                  name="Votos Hora"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="acumuladoPct"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981' }}
                  name="% Acumulado"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Torta de Cuota de Voto por Puesto (1 columna) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-700" />
              <span>Cuota de Voto por Puesto</span>
            </h4>
            <p className="text-xs text-slate-500">
              Distribución de sufragantes entre los 6 puestos electorales
            </p>
          </div>

          <div className="h-56 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stationShareData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stationShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg text-xs border border-slate-800">
                          <p className="font-bold text-slate-200">{data.fullName}</p>
                          <p className="text-emerald-400 font-bold mt-1">
                            {data.value} votos ({data.pct}% afluencia)
                          </p>
                          <p className="text-slate-400 text-[10px]">Censo: {data.censo} estudiantes</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
            {stationShareData.map(st => (
              <div key={st.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                <span className="text-slate-600 truncate">{st.name}:</span>
                <span className="font-bold text-slate-900">{st.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Row 2: Participación Demográfica por Nivel y Grado Escolar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico por Ciclo / Nivel Educativo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <School className="w-4 h-4 text-purple-700" />
                <span>Participación por Nivel / Ciclo Educativo</span>
              </h4>
              <p className="text-xs text-slate-500">
                Comparativa de censo total vs sufragantes por categoría escolar
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cycleParticipationData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 'dataMax + 10']} stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#475569" fontSize={11} width={90} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-slate-200">{d.name}</p>
                          <p className="text-purple-300">Votaron: <span className="font-bold text-white">{d.votaron}</span></p>
                          <p className="text-slate-300">Pendientes: <span className="font-bold text-white">{d.pendientes}</span></p>
                          <p className="text-emerald-400 font-bold border-t border-slate-800 pt-1">
                            Participación: {d.participacion}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="votaron" stackId="a" fill="#7e22ce" radius={[0, 0, 0, 0]} name="Votaron" />
                <Bar dataKey="pendientes" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} name="Pendientes" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-purple-700" />
              Votaron Efectivamente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-200" />
              Pendientes por Votar
            </span>
          </div>
        </div>

        {/* Gráfico Detallado por Grados (14 Cursos) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-700" />
                <span>Porcentaje de Participación por Grado</span>
              </h4>
              <p className="text-xs text-slate-500">
                Tasa porcentual de afluencia alcanzada en cada grado escolar
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={gradeParticipationData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="grade" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 100]} unit="%" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-purple-300">Grado: {d.grade}</p>
                          <p className="text-emerald-400 font-bold">Participación: {d.participacionPct}%</p>
                          <p className="text-slate-300">{d.votaron} de {d.censo} estudiantes</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="participacionPct" radius={[4, 4, 0, 0]}>
                  {gradeParticipationData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.participacionPct >= 80
                          ? '#059669' // Verde óptimo
                          : entry.participacionPct >= 50
                          ? '#7e22ce' // Púrpura estándar
                          : '#d97706'  // Ámbar bajo
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              Óptimo (&gt;80%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-700" />
              Normal (50-80%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
              Bajo (&lt;50%)
            </span>
          </div>
        </div>

      </div>

      {/* Row 3: Tabla Demográfica Consolidada de Auditoría */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-700" />
              <span>Desglose Demográfico Detallado por Curso</span>
            </h4>
            <p className="text-xs text-slate-500">
              Tabla de auditoría para comités de democracia y jurados de mesa
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            14 Grados Escolarizados • 20 Mesas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Grado / Nivel</th>
                <th className="py-3 px-4">Censo Habilitado</th>
                <th className="py-3 px-4">Sufragantes Efectivos</th>
                <th className="py-3 px-4">Pendientes</th>
                <th className="py-3 px-4">Tasa de Participación</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {gradeParticipationData.map((row, idx) => {
                const isOptimal = row.participacionPct >= 80;
                const isMedium = row.participacionPct >= 50 && row.participacionPct < 80;

                return (
                  <tr key={row.grade} className="hover:bg-purple-50/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{row.grade}</span>
                    </td>
                    <td className="py-3 px-4">{row.censo} alumnos</td>
                    <td className="py-3 px-4 font-bold text-purple-900">{row.votaron} votos</td>
                    <td className="py-3 px-4 text-slate-400">{row.pendientes}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-12 font-bold">{row.participacionPct}%</span>
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              isOptimal ? 'bg-emerald-600' : isMedium ? 'bg-purple-700' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, row.participacionPct)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {isOptimal ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Alta Afluencia</span>
                        </span>
                      ) : isMedium ? (
                        <span className="inline-flex items-center gap-1 text-purple-700 font-semibold text-[11px]">
                          <span>En Progreso</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Baja Afluencia</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
