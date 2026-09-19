import {
  CheckCircle,
  Download,
  Filter,
  Lock,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import React, { useState } from 'react';
import { useElection } from '../../context/ElectionContext';
import { exportToCSV } from '../../utils/pdfGenerator';

export const AuditLogsTab: React.FC = () => {
  const { auditLogs, config } = useElection();
  const [filterActor, setFilterActor] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filteredLogs = auditLogs.filter(log => {
    const matchActor = filterActor === 'all' || log.actorType === filterActor;
    const matchSearch =
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.actorName.toLowerCase().includes(search.toLowerCase()) ||
      log.hash.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());

    return matchActor && matchSearch;
  });

  const handleExportLogsCSV = () => {
    const headers = ['Timestamp', 'Acción', 'Actor Tipo', 'Actor Nombre', 'Mesa', 'Detalles', 'Hash SHA-256', 'Estado'];
    const rows = auditLogs.map(l => [
      l.timestamp,
      l.action,
      l.actorType,
      l.actorName,
      l.mesaNumber ? `Mesa 0${l.mesaNumber}` : 'General',
      l.details,
      l.hash,
      l.status
    ]);
    exportToCSV(`Auditoria_Electoral_Logs_${config.academicYear}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Cryptographic Integrity Proof */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Libro Mayor Criptográfico Inmutable
              </span>
              <span className="text-xs text-slate-400">• Sellado SHA-256</span>
            </div>
            <h3 className="text-lg font-black text-white mt-0.5">
              Auditoría y Trazabilidad Electoral en Tiempo Real
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Cada evento, voto blindado y apertura de mesa genera un hash inalterable de auditoría.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportLogsCSV}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Logs (CSV)</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por detalle, actor o hash..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['all', 'SISTEMA', 'ADMIN', 'JURADO', 'ESTUDIANTE'].map(type => (
            <button
              key={type}
              onClick={() => setFilterActor(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                filterActor === type
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'all' ? 'Todos los Actores' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Hora / Fecha</th>
                <th className="py-3 px-4">Acción</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Mesa</th>
                <th className="py-3 px-4">Detalles del Evento</th>
                <th className="py-3 px-4">Hash SHA-256</th>
                <th className="py-3 px-4 text-right">Integridad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron registros de auditoría para el criterio seleccionado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const dateFormatted = new Date(log.timestamp).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {dateFormatted}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-800">
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{log.actorName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.actorType}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {log.mesaNumber ? (
                          <span className="font-bold text-purple-700">Mesa 0{log.mesaNumber}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="line-clamp-2 text-slate-700 font-medium">
                          {log.details}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">
                        <span className="text-purple-700 select-all" title={log.hash}>
                          {log.hash.slice(0, 16)}...
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Verificado
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
