import {
  Activity,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PieChart as PieChartIcon,
  Radio,
  RefreshCw,
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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useElection } from '../../context/ElectionContext';
import { ALL_GRADES, POLLING_STATIONS } from '../../data/mockElectionData';

interface RealtimeDataVisualizationPanelProps {
  selectedPositionProp?: string;
  onSelectPositionProp?: (posId: string) => void;
}

export const RealtimeDataVisualizationPanel: React.FC<RealtimeDataVisualizationPanelProps> = ({
  selectedPositionProp,
  onSelectPositionProp
}) => {
  const {
    config,
    positions,
    candidates,
    students,
    votes,
    lastSyncTimestamp,
    sheetsSyncInfo
  } = useElection();

  const [internalPosId, setInternalPosId] = useState<string>(positions[0]?.id || 'personeria');
  const activePositionId = selectedPositionProp || internalPosId;

  const handlePositionChange = (posId: string) => {
    setInternalPosId(posId);
    if (onSelectPositionProp) {
      onSelectPositionProp(posId);
    }
  };

  const [selectedGrade, setSelectedGrade] = useState<string>('TODOS');
  const [candidateChartMode, setCandidateChartMode] = useState<'vertical' | 'horizontal' | 'donut'>('vertical');
  const [participationViewMode, setParticipationViewMode] = useState<'stations' | 'grades'>('stations');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const currentPosition = positions.find(p => p.id === activePositionId) || positions[0];

  // ============================================================================
  // 1. DATOS DE CONTEO DE VOTOS POR CANDIDATO (TIEMPO REAL)
  // ============================================================================
  const candidateChartData = useMemo(() => {
    if (!currentPosition) return [];

    let posCands = candidates.filter(c => c.positionId === currentPosition.id);
    if (currentPosition.id === 'representante_curso' && selectedGrade !== 'TODOS') {
      posCands = posCands.filter(c => c.isBlankVote || c.grade === selectedGrade);
    }

    const validIds = new Set(posCands.map(c => c.id));
    const posVotes = votes.filter(
      v =>
        v.positionId === currentPosition.id &&
        (currentPosition.id !== 'representante_curso' ||
          selectedGrade === 'TODOS' ||
          validIds.has(v.candidateId) ||
          (v.grade && v.grade === selectedGrade))
    );

    const totalCargoVotes = posVotes.length;

    return posCands
      .map(cand => {
        const count = posVotes.filter(v => v.candidateId === cand.id).length;
        const pct = totalCargoVotes > 0 ? Number(((count / totalCargoVotes) * 100).toFixed(1)) : 0;
        const shortLabel = cand.isBlankVote
          ? 'Voto en Blanco'
          : `#${cand.number} ${cand.fullName.split(' ').slice(0, 2).join(' ')}`;

        return {
          id: cand.id,
          number: cand.number,
          name: cand.fullName,
          shortName: shortLabel,
          grade: cand.grade,
          group: cand.group,
          votos: count,
          porcentaje: pct,
          color: cand.isBlankVote ? '#64748b' : cand.colorHex || '#7e22ce',
          isBlankVote: !!cand.isBlankVote
        };
      })
      .sort((a, b) => b.votos - a.votos);
  }, [candidates, votes, currentPosition, selectedGrade]);

  // ============================================================================
  // 2. DATOS DE PARTICIPACIÓN ELECTORAL EN TIEMPO REAL
  // ============================================================================
  const participationSummary = useMemo(() => {
    const total = students.length;
    const votaron = students.filter(s => s.hasVoted).length;
    const habilitadosEnCabina = students.filter(s => !s.hasVoted && s.isVerifiedByJurado).length;
    const pendientes = Math.max(0, total - votaron - habilitadosEnCabina);
    const pct = total > 0 ? Number(((votaron / total) * 100).toFixed(1)) : 0;

    const donutData = [
      { name: 'Ya Votaron', value: votaron, color: '#059669' },
      ...(habilitadosEnCabina > 0
        ? [{ name: 'Habilitados en Mesa', value: habilitadosEnCabina, color: '#7e22ce' }]
        : []),
      { name: 'Pendientes por Votar', value: pendientes, color: '#cbd5e1' }
    ];

    return {
      total,
      votaron,
      habilitadosEnCabina,
      pendientes,
      pct,
      donutData
    };
  }, [students]);

  const stationParticipationData = useMemo(() => {
    return POLLING_STATIONS.map(st => {
      const stStudents = students.filter(s => st.mesas.includes(s.mesaNumber));
      const votaron = stStudents.filter(s => s.hasVoted).length;
      const pendientes = Math.max(0, stStudents.length - votaron);
      const pct = stStudents.length > 0 ? Number(((votaron / stStudents.length) * 100).toFixed(1)) : 0;

      return {
        name: st.name.replace('Puesto ', 'P.'),
        fullName: st.name,
        category: st.category,
        Votaron: votaron,
        Pendientes: pendientes,
        Total: stStudents.length,
        porcentaje: pct
      };
    });
  }, [students]);

  const gradeParticipationData = useMemo(() => {
    return ALL_GRADES.map(grade => {
      const grStudents = students.filter(s => s.grade === grade);
      const votaron = grStudents.filter(s => s.hasVoted).length;
      const pendientes = Math.max(0, grStudents.length - votaron);
      const pct = grStudents.length > 0 ? Number(((votaron / grStudents.length) * 100).toFixed(1)) : 0;

      return {
        name: grade,
        fullName: `Grado ${grade}`,
        Votaron: votaron,
        Pendientes: pendientes,
        Total: grStudents.length,
        porcentaje: pct
      };
    }).filter(g => g.Total > 0);
  }, [students]);

  const formattedLastSync = useMemo(() => {
    try {
      const ts = sheetsSyncInfo.lastSyncTime || lastSyncTimestamp;
      return new Date(ts).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'En vivo';
    }
  }, [sheetsSyncInfo.lastSyncTime, lastSyncTimestamp]);

  const leaderCandidate = candidateChartData[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center text-purple-200 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-purple-200">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                Sincronización Google Sheets (2s)
              </span>
              <span aria-hidden="true">·</span>
              <span>Actualizado: {formattedLastSync}</span>
              <span aria-hidden="true">·</span>
              <span>Urna {config.status}</span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
              Panel de Visualización de Datos en Tiempo Real
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setIsCollapsed(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            {isCollapsed ? (
              <>
                <span>Expandir Gráficos</span>
                <ChevronDown className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Compactar</span>
                <ChevronUp className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-6 space-y-6">
          {/* Top Controls: Position Selector + Grade Filter */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1">Cargo a visualizar:</span>
              {positions.map(pos => {
                const isSelected = pos.id === activePositionId;
                const posVoteCount = votes.filter(v => v.positionId === pos.id).length;
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => {
                      handlePositionChange(pos.id);
                      if (pos.id !== 'representante_curso') setSelectedGrade('TODOS');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {pos.shortTitle} ({posVoteCount})
                  </button>
                );
              })}
            </div>

            {activePositionId === 'representante_curso' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-500">Grado:</span>
                {['TODOS', ...ALL_GRADES].map(gr => (
                  <button
                    key={gr}
                    type="button"
                    onClick={() => setSelectedGrade(gr)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      selectedGrade === gr
                        ? 'bg-purple-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {gr}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main 2-Column Recharts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN (7 cols): CONTEO DE VOTOS POR CANDIDATO */}
            <div className="lg:col-span-7 bg-slate-50/70 rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-bold text-purple-800 uppercase tracking-wider">
                      Conteo de Votos por Candidato
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{currentPosition?.title}</span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 mt-0.5">
                    {leaderCandidate && leaderCandidate.votos > 0
                      ? `Lidera: ${leaderCandidate.name} (${leaderCandidate.votos} votos · ${leaderCandidate.porcentaje}%)`
                      : 'Esperando emisión de votos en urna...'}
                  </h4>
                </div>

                {/* Chart Mode Switcher */}
                <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCandidateChartMode('vertical')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      candidateChartMode === 'vertical'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Columnas
                  </button>
                  <button
                    type="button"
                    onClick={() => setCandidateChartMode('horizontal')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      candidateChartMode === 'horizontal'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Barras
                  </button>
                  <button
                    type="button"
                    onClick={() => setCandidateChartMode('donut')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      candidateChartMode === 'donut'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Anillo %
                  </button>
                </div>
              </div>

              {/* Recharts Container for Candidate Votes */}
              <div className="h-72 w-full">
                {candidateChartMode === 'vertical' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={candidateChartData}
                      margin={{ top: 12, right: 16, left: -10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fontSize: 11, fill: '#334155', fontWeight: 700 }}
                        interval={0}
                        angle={candidateChartData.length > 4 ? -15 : 0}
                        textAnchor={candidateChartData.length > 4 ? 'end' : 'middle'}
                        height={45}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <Tooltip
                        cursor={{ fill: '#f1f5f9' }}
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1">
                              <p className="font-black text-white">
                                {item.isBlankVote ? 'Voto en Blanco' : `#${item.number} · ${item.name}`}
                              </p>
                              {!item.isBlankVote && (
                                <p className="text-slate-300">
                                  Grado {item.grade} · Grupo {item.group}
                                </p>
                              )}
                              <p className="text-emerald-300 font-bold pt-1">
                                {item.votos} votos ({item.porcentaje}%)
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="votos" name="Votos Computados" radius={[8, 8, 0, 0]} maxBarSize={56}>
                        {candidateChartData.map(entry => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {candidateChartMode === 'horizontal' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={candidateChartData}
                      margin={{ top: 8, right: 24, left: 10, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis
                        type="category"
                        dataKey="shortName"
                        width={125}
                        tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 700 }}
                      />
                      <Tooltip
                        cursor={{ fill: '#f1f5f9' }}
                        formatter={(value: any, _name: any, props: any) => [
                          `${value} votos (${props.payload.porcentaje}%)`,
                          props.payload.name
                        ]}
                      />
                      <Bar dataKey="votos" name="Votos" radius={[0, 8, 8, 0]} barSize={24}>
                        {candidateChartData.map(entry => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {candidateChartMode === 'donut' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={candidateChartData}
                        dataKey="votos"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={95}
                        paddingAngle={3}
                        label={({ shortName, porcentaje }) =>
                          porcentaje > 0 ? `${shortName}: ${porcentaje}%` : ''
                        }
                      >
                        {candidateChartData.map(entry => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, _name: any, props: any) => [
                          `${value} votos (${props.payload.porcentaje}%)`,
                          props.payload.name
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Compact Footer Legend for Candidates */}
              <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-3">
                  {candidateChartData.map(c => (
                    <span key={c.id} className="inline-flex items-center gap-1.5 font-medium">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-slate-800 font-bold">{c.shortName}:</span>
                      <span>{c.votos} ({c.porcentaje}%)</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (5 cols): PARTICIPACIÓN ELECTORAL EN TIEMPO REAL */}
            <div className="lg:col-span-5 bg-slate-50/70 rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-bold text-emerald-800 uppercase tracking-wider">
                      Participación Electoral en Vivo
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Censo: {participationSummary.total}</span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 mt-0.5">
                    {participationSummary.votaron} sufragantes ({participationSummary.pct}%)
                  </h4>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setParticipationViewMode('stations')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      participationViewMode === 'stations'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Por Puestos
                  </button>
                  <button
                    type="button"
                    onClick={() => setParticipationViewMode('grades')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      participationViewMode === 'grades'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Por Grados
                  </button>
                </div>
              </div>

              {/* Top Mini Donut + KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-white p-3.5 rounded-xl border border-slate-200/80">
                <div className="h-32 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={participationSummary.donutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={34}
                        outerRadius={54}
                        paddingAngle={2}
                      >
                        {participationSummary.donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, name: any) => [`${value} estudiantes`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-black text-slate-900">
                      {participationSummary.pct}%
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">Votaron</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
                      Ya Votaron
                    </span>
                    <span className="font-black text-slate-900">{participationSummary.votaron}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-sm bg-purple-700" />
                      En Cabina / Mesa
                    </span>
                    <span className="font-black text-slate-900">{participationSummary.habilitadosEnCabina}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
                      Pendientes
                    </span>
                    <span className="font-black text-slate-900">{participationSummary.pendientes}</span>
                  </div>
                </div>
              </div>

              {/* Stacked BarChart: Participation by Polling Stations or School Grades */}
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      participationViewMode === 'stations'
                        ? stationParticipationData
                        : gradeParticipationData
                    }
                    margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#334155', fontWeight: 700 }}
                      interval={0}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const row = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1">
                            <p className="font-black">{row.fullName}</p>
                            <p className="text-emerald-300 font-semibold">
                              Sufragaron: {row.Votaron} de {row.Total} ({row.porcentaje}%)
                            </p>
                            <p className="text-slate-300">Pendientes: {row.Pendientes}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="Votaron" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Pendientes" stackId="a" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
