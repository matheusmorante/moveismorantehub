import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSalesReport } from './hooks/useSalesReport';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { erpReportPrepareFormSchema } from '../../../../../../shared-utils/salesReportFormSchemas';
import { mappedCsvItems } from './utils/reportCsvInput';
import ReportConfigModal from './modals/ReportConfigModal';

const SalesOrderReports = () => {
  const navigate = useNavigate();
  const {
    calculateABC,
    loading,
    error, sessionKey, fetchReportItems,
    savedReports,
    saveReport,
    listSavedReports,
    deleteReport,
  } = useSalesReport();

  const [creating, setCreating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const creatingRef = useRef(false);
  const sessionRef = useRef(sessionKey); sessionRef.current = sessionKey;
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const form = useZodForm(erpReportPrepareFormSchema, { name: '', source: 'erp', config: {}, csvData: [] });
  const busy = loading || creating;
  // UI States
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    void listSavedReports();
  }, [listSavedReports, sessionKey]);

  const handleCreateReport = async (data: any) => {
    if (creatingRef.current) return false;
    creatingRef.current = true; setCreating(true); setValidationError('');
    const submittedSession = sessionKey;
    try {
      return await form.validateAndRun(data, async parsed => {
        const items = parsed.source === 'erp' ? await fetchReportItems(parsed.config) : mappedCsvItems(parsed.csvData, parsed.config);
        if (!mountedRef.current || sessionRef.current !== submittedSession || items === false) return false;
        if (!items.length) { setValidationError('Nenhum dado encontrado. Confira a origem e o mapeamento do relatório.'); return false; }
        const reportData = calculateABC(items, parsed.config.abcBasis, true, parsed.config);
        if (!reportData.results.length) { setValidationError('A análise não encontrou resultados úteis. Confira os valores e o mapeamento.'); return false; }
        const saved = await saveReport(parsed.name, parsed.source, parsed.config, reportData);
        if (!mountedRef.current || sessionRef.current !== submittedSession || !saved) return false;
        setIsConfigModalOpen(false); navigate(`/sales-order/reports/${saved.id}`); return true;
      }, errors => setValidationError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados do relatório.'));
    } catch (failure) {
      if (mountedRef.current && sessionRef.current === submittedSession) setValidationError(failure instanceof Error ? failure.message : 'Não foi possível preparar o relatório.');
      return false;
    } finally { creatingRef.current = false; if (mountedRef.current) setCreating(false); }
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
            Relatório de Vendas CSV
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
            Gestão de Inteligência Strategic Business
          </p>
        </div>

        <button
          onClick={() => setIsConfigModalOpen(true)}
          className="px-8 py-5 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
        >
          <i className="bi bi-plus-circle-fill text-xl"></i>
          <span className="text-[12px] font-black uppercase tracking-widest text-white">
            Criar Nova Análise
          </span>
        </button>
      </header>

      {(validationError || error) && <p role="alert" className="text-red-600">{validationError || error} <button onClick={() => void listSavedReports()} disabled={busy}>Carregar relatórios</button></p>}
      {busy && <p role="status" className="text-indigo-600">Consultando e confirmando o relatório...</p>}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
            <i className="bi bi-collection-fill text-blue-600 text-lg"></i> Relatórios Salvos
          </h2>
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-6"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {savedReports.length > 0 ? (
            savedReports.map((report: any) => (
              <div
                key={report.id}
                className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800 flex flex-col justify-between group h-[260px] transition-all hover:-translate-y-1 hover:shadow-2xl"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-2">
                      <span
                        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${report.source === 'erp' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}
                      >
                        {report.source}
                      </span>
                      <span className="px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                        {report.report_data?.results?.length || 0} itens
                      </span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === report.id ? null : report.id);
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${openMenuId === report.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-indigo-600'}`}
                      >
                        <i className="bi bi-three-dots-vertical"></i>
                      </button>

                      {openMenuId === report.id && (
                        <div
                          className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[50] overflow-hidden animate-fade-in"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => navigate(`/sales-order/reports/${report.id}?print=true`)}
                            className="w-full flex items-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <i className="bi bi-printer-fill text-indigo-500"></i> Imprimir / PDF
                          </button>
                          <div className="h-px bg-slate-50 dark:bg-slate-800"></div>
                          <button
                            disabled={busy}
                            onClick={async () => {
                              if (confirm('Deseja realmente excluir este relatório?') && await deleteReport(report.id)) setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                          >
                            <i className="bi bi-trash3-fill"></i> Lixeira
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight mb-2 uppercase">
                    {report.name}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                    {format(new Date(report.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/sales-order/reports/${report.id}`)}
                  className="w-full py-4 bg-slate-950 dark:bg-slate-800 hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-black/10 group-hover:shadow-indigo-500/20"
                >
                  Abrir
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center shadow-inner">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mb-6">
                <i className="bi bi-archive text-3xl text-slate-200"></i>
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">
                Sem histórico disponível
              </h3>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Gere um novo relatório para começar
              </p>
            </div>
          )}
        </div>
      </section>

      <ReportConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => { if (!creatingRef.current) setIsConfigModalOpen(false); }}
        onSave={handleCreateReport}
        loading={busy}
      />
    </div>
  );
};

export default SalesOrderReports;
