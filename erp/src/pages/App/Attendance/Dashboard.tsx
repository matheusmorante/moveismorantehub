import React, { useState, useEffect } from 'react';
import { attendanceService } from '../../utils/attendanceService';
import { AttendanceLog } from '../../types/attendance.type';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AttendanceDashboard = () => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const data = await attendanceService.getRecentLogs(50);
    setLogs(data);
    setLoading(false);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positivo':
        return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800';
      case 'negativo':
        return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800';
      default:
        return 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'quente':
        return 'bg-orange-500';
      case 'morno':
        return 'bg-amber-400';
      default:
        return 'bg-slate-300';
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Dashboard Voice BI
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">
            Insights estratégicos extraídos de atendimentos presenciais
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => attendanceService.exportLogsToCSV()}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-sm hover:shadow-md transition-all font-bold text-xs uppercase tracking-widest text-white"
          >
            <i className="bi bi-file-earmark-spreadsheet"></i>
            Exportar NotebookLM
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300"
          >
            <i className="bi bi-arrow-clockwise"></i>
            Atualizar Dados
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Processando Inteligência de Dados...
          </p>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mb-4">
            <i className="bi bi-headset text-3xl text-slate-200 dark:text-slate-800"></i>
          </div>
          <p className="text-slate-400 dark:text-slate-600 font-bold tracking-widest uppercase text-xs">
            Nenhum atendimento registrado ainda
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {logs.map((log) => {
            const data = log.structured_data || {};
            return (
              <div
                key={log.id}
                className="bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-800 flex flex-col gap-6 hover:translate-y-[-4px] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${getPriorityColor(data.priority || '')} animate-pulse shadow-lg`}
                    ></div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-tight">
                        {data.product || 'Produto não identificado'}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                        {log.salesperson_name} •{' '}
                        {format(
                          new Date(log.date || log.created_at || new Date()),
                          "dd 'de' MMMM, HH:mm",
                          { locale: ptBR }
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getSentimentColor(data.sentiment || '')}`}
                  >
                    {data.sentiment || 'Neutro'}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic leading-relaxed mb-4">
                      "{log.transcript}"
                    </p>

                    {log.audio_url && (
                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <i className="bi bi-mic text-blue-500"></i>
                        <audio src={log.audio_url} controls className="h-8 flex-1 custom-audio" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                        Motivo
                      </span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">
                        {data.reason || 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                        Perfil
                      </span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">
                        {data.customer_profile || 'Não identificado'}
                      </p>
                    </div>
                  </div>

                  {(data.objections?.length ?? 0) > 0 && (
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        Objeções
                      </span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {data.objections?.map((obj: string, i: number) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-rose-100 dark:border-rose-900/30"
                          >
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100/50 dark:border-blue-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <i className="bi bi-lightning-charge-fill text-blue-600 text-xs shadow-sm"></i>
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                        Próximo Passo
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
                      {data.next_step}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;
