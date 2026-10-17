import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import ItemExclusionModal from '../Reports/modals/ItemExclusionModal';
import ProductReferenceModal from '../Reports/modals/ProductReferenceModal';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Bar,
  Cell,
  ScatterChart,
  Scatter,
  ReferenceLine,
  Area,
} from 'recharts';
import { format, parse } from 'date-fns';
import { useSalesReport, ABCResult, SaleItem } from './useSalesReport';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { blingReportEditorFormSchema, salesReportViewFormSchema } from '../../../../../../shared-utils/salesReportFormSchemas';
import ReportConfigModal from '../Reports/modals/ReportConfigModal';
import SupplierPerformanceView from '../Reports/components/SupplierPerformanceView';

const ReportViewBling = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPublicMode = location.pathname.startsWith('/public/');
  const {
    totalProfit,
    setTotalProfit,
    monthCount,
    setMonthCount,
    avgProfitPerItem,
    setAvgProfitPerItem,
    avgTurnoverPerItem,
    setAvgTurnoverPerItem,
    results,
    setResults,
    setRawResults,
    applyFilters,
    loading,
    error,
    sessionKey,
    getReport,
    getProductMappings,
    updateReport,
    fetchFromBling,
    calculateABC,
    reportStartDate,
    reportEndDate,
    setReportStartDate,
    setReportEndDate,
    allProducts,
    setAllProducts,
  } = useSalesReport(id || '', isPublicMode);

  const [reportName, setReportName] = useState('');
  const [viewMode, setViewMode] = useState<'product' | 'supplier'>('product');
  const [reportType, setReportType] = useState<'abc' | 'matrix'>('abc');
  const [showFilters, setShowFilters] = useState(false);
  const [abcBasis, setAbcBasis] = useState<'revenue' | 'profit'>('revenue');
  const [reportSource, setReportSource] = useState<'erp' | 'csv' | 'bling'>('bling');
  const [reportConfig, setReportConfig] = useState<any>(null);

  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [minProfit, setMinProfit] = useState<number>(0);
  const [maxProfit, setMaxProfit] = useState<number>(0);

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'accumulatedPercentage',
    direction: 'asc',
  });
  const [hoveredResult, setHoveredResult] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [productMappings, setProductMappings] = useState<Record<string, string>>({});
  const [isExclusionOpen, setIsExclusionOpen] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);

  const [updating, setUpdating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const updateBusyRef = useRef(false);
  const pendingRefreshRef = useRef<{ key: string; id: string } | null>(null);
  const currentSession = useRef(sessionKey); currentSession.current = sessionKey;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const updateForm = useZodForm(blingReportEditorFormSchema, { id: id || '', name: reportName, source: 'bling', config: reportConfig || {} });
  const viewForm = useZodForm(salesReportViewFormSchema, { suppliers: selectedSuppliers, minProfit, maxProfit, search: searchTerm, reportType, abcBasis, sortConfig });
  const { enqueueAndRun: validateView } = viewForm;
  useEffect(() => {
    const submittedSession = sessionKey;
    void getProductMappings().then(mappings => { if (mappings && mounted.current && currentSession.current === submittedSession) setProductMappings(mappings); });
  }, [getProductMappings, sessionKey]);

  const handleShareWhatsApp = () => {
    const REAL_URL = 'https://morantehub.vercel.app';
    const publicUrl = `${REAL_URL}/public/report/${id}${location.search}`;
    const text = `📊 *Análise Estratégica Bling*\n\nConfira o relatório: *${reportName}*\n\n🔗 Acesse aqui: ${publicUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const sortedResults = useMemo(() => {
    const items = [...results];
    if (sortConfig.key) {
      items.sort((a: any, b: any) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'giroMensal') {
          aVal = a.totalQuantity / (monthCount || 1);
          bVal = b.totalQuantity / (monthCount || 1);
        }
        if (sortConfig.key === 'lucroMensal') {
          aVal = a.totalProfit / (monthCount || 1);
          bVal = b.totalProfit / (monthCount || 1);
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [results, sortConfig, monthCount]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <i className="bi bi-arrow-down-up opacity-20 ml-2"></i>;
    return (
      <i
        className={`bi bi-sort-${sortConfig.direction === 'asc' ? 'down' : 'up'} text-indigo-500 ml-2`}
      ></i>
    );
  };

  const loadReport = useCallback(async (reportId: string) => {
    const submittedSession = sessionKey;
    const data = await getReport(reportId);
    if (!mounted.current || currentSession.current !== submittedSession) return false;
      if (data) {
        setValidationError('');
        const rd = data.report_data;
        setReportName(data.name);
        setReportSource(data.source);
        setReportConfig(data.config);
        const mCount = rd.monthCount || 1;
        const aProfit = rd.avgProfitPerItem || 0;
        const aTurnover = rd.avgTurnoverPerItem || 0;

        const resultsWithMonthly = rd.results.map((r: any) => {
          const mP = r.monthlyProfit ?? r.totalProfit / mCount;
          const mT = r.monthlyTurnover ?? r.totalQuantity / mCount;
          let q: 1 | 2 | 3 | 4 = 4;
          if (mT >= aTurnover && mP >= aProfit) q = 1;
          else if (mT < aTurnover && mP >= aProfit) q = 2;
          else if (mT >= aTurnover && mP < aProfit) q = 3;
          return { ...r, monthlyProfit: mP, monthlyTurnover: mT, quadrant: q };
        });

        setRawResults(resultsWithMonthly);
        setResults(resultsWithMonthly);
        setMonthCount(mCount);
        setAvgProfitPerItem(aProfit);
        setAvgTurnoverPerItem(aTurnover);
        setAllProducts(rd.allProducts || []);
        setTotalProfit(rd.totalProfit);
        setAbcBasis(data.config?.abcBasis || 'revenue');
        if (rd.reportStartDate) setReportStartDate(new Date(rd.reportStartDate));
        if (rd.reportEndDate) setReportEndDate(new Date(rd.reportEndDate));
      }
    return data;
  }, [getReport, sessionKey, setRawResults, setResults, setMonthCount, setAvgProfitPerItem, setAvgTurnoverPerItem, setAllProducts, setTotalProfit, setReportStartDate, setReportEndDate]);
  useEffect(() => { setReportName(''); if (id) void loadReport(id); }, [id, loadReport]);

  const handleUpdateReport = async (newConfig: any) => {
    if (updateBusyRef.current || isPublicMode) return false;
    updateBusyRef.current = true; setUpdating(true); setValidationError('');
    const submittedSession = sessionKey;
    try {
      return await updateForm.validateAndRun({ ...newConfig, id: id || '' }, async parsed => {
        const refreshKey = JSON.stringify([submittedSession, parsed]);
        const finishRefresh = async (reportId: string) => {
          const refreshed = await loadReport(reportId);
          if (!mounted.current || currentSession.current !== submittedSession) return false;
          if (!refreshed) { setValidationError('Relatório salvo, mas a visualização não pôde ser atualizada. Carregue novamente; não é preciso salvar outra vez.'); return false; }
          pendingRefreshRef.current = null; setIsConfigOpen(false); return true;
        };
        if (pendingRefreshRef.current?.key === refreshKey) return finishRefresh(pendingRefreshRef.current.id);
        const range = parsed.config.dateRange;
        const items: SaleItem[] = await fetchFromBling(range?.start, range?.end);
        const mappings = await getProductMappings();
        if (!mounted.current || currentSession.current !== submittedSession || mappings === false) return false;
        const reportData = calculateABC(items, parsed.config.abcBasis, true, parsed.config, mappings, monthCount);
        const saved = await updateReport(parsed.id, parsed.name, parsed.source, parsed.config, reportData);
        if (!mounted.current || currentSession.current !== submittedSession || !saved) return false;
        pendingRefreshRef.current = { key: refreshKey, id: saved.id };
        return finishRefresh(saved.id);
      }, errors => setValidationError(Object.values(flattenFormErrors(errors))[0] || 'Confira a configuração do relatório.'));
    } catch (failure) {
      if (mounted.current && currentSession.current === submittedSession) setValidationError(failure instanceof Error ? failure.message : 'Não foi possível atualizar o relatório.');
      return false;
    } finally { updateBusyRef.current = false; if (mounted.current) setUpdating(false); }
  };

  useEffect(() => {
    let cancelled = false;
    void validateView({ suppliers: selectedSuppliers, minProfit, maxProfit, search: searchTerm, reportType, abcBasis, sortConfig }, values => {
      if (cancelled) return;
      applyFilters(values, reportConfig);
      const params: Record<string, string> = {};
      if (values.reportType !== 'abc') params.type = values.reportType;
      if (values.abcBasis !== 'revenue') params.basis = values.abcBasis;
      if (values.search) params.q = values.search;
      if (values.suppliers.length) params.s = values.suppliers.join(',');
      if (values.minProfit > 0) params.minP = String(values.minProfit);
      if (values.maxProfit > 0) params.maxP = String(values.maxProfit);
      if (values.sortConfig.key !== 'accumulatedPercentage') params.sortK = values.sortConfig.key;
      if (values.sortConfig.direction !== 'desc') params.sortD = values.sortConfig.direction;
      if (new URLSearchParams(params).toString() !== searchParams.toString()) setSearchParams(params, { replace: true });
    }, errors => setValidationError(Object.values(flattenFormErrors(errors))[0] || 'Confira os filtros.'));
    return () => { cancelled = true; };
  }, [selectedSuppliers, minProfit, maxProfit, searchTerm, reportType, abcBasis, sortConfig, reportConfig, setSearchParams, searchParams, validateView, applyFilters]);

  const chartData = useMemo(() => {
    let accValor = 0;
    const totalItems = results.length;
    const divider = monthCount || 1;
    return results.map((i_item, i) => {
      const val = abcBasis === 'revenue' ? i_item.totalRevenue / divider : i_item.monthlyProfit;
      accValor += val;
      return {
        name: i_item.product.substring(0, 20),
        valor: val,
        lucroAcumulado: accValor,
        perc: i_item.accumulatedPercentage,
        class: i_item.classification,
      };
    });
  }, [results, abcBasis, monthCount]);

  if (loading && !reportName) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-6" />
        <p role="status" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Processando Bling API...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm print:hidden">
        <div className="px-6 py-6 pb-2">
          <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              {!isPublicMode && (
                <Link
                  to="/sales-order/reports-bling"
                  className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 dark:border-slate-800"
                >
                  <i className="bi bi-arrow-left text-lg"></i>
                </Link>
              )}
              <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight uppercase">
                  {reportName}{' '}
                  <span className="ml-2 px-2 py-0.5 bg-indigo-600 text-[8px] text-white rounded-full">
                    BETA
                  </span>
                </h1>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    ORIGEM: BLING API
                  </span>
                  <span className="text-sm font-black text-emerald-600">
                    {totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                  <span className="text-xs font-black text-blue-600">
                    {monthCount} {monthCount === 1 ? 'mês' : 'meses'}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-8">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Giro Mensal Médio
                </span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                  {avgTurnoverPerItem.toFixed(1)}{' '}
                  <span className="text-[10px] opacity-40 uppercase ml-1">un/mês</span>
                </span>
              </div>
              <div className="h-8 w-px bg-slate-100 dark:bg-slate-800"></div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Lucro Mensal Médio
                </span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                  {avgProfitPerItem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6">
          <div className="max-w-[1800px] mx-auto flex gap-2">
            <button
              onClick={() => setViewMode('product')}
              className={`px-6 py-4 flex items-center gap-3 relative ${viewMode === 'product' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
            >
              <i className="bi bi-box-seam"></i>{' '}
              <span className="text-[10px] uppercase tracking-widest">Produtos</span>
              {viewMode === 'product' && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setViewMode('supplier')}
              className={`px-6 py-4 flex items-center gap-3 relative ${viewMode === 'supplier' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
            >
              <i className="bi bi-truck"></i>{' '}
              <span className="text-[10px] uppercase tracking-widest">Fornecedores</span>
              {viewMode === 'supplier' && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full"></div>
              )}
            </button>
          </div>
        </div>
      </header>

      {(validationError || error) && <p role="alert" className="px-6 py-3 text-red-600">{validationError || error} <button onClick={() => id && loadReport(id)} disabled={loading || updating}>Carregar novamente</button></p>}
      {(loading || updating) && <p role="status" className="px-6 py-3 text-indigo-600">Consultando e confirmando o relatório...</p>}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-8">
          {viewMode === 'product' ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={8} fontWeight="900" hide />
                    <YAxis
                      yAxisId="left"
                      fontSize={8}
                      fontWeight="900"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="valor" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.class === 'A'
                              ? '#2563eb'
                              : entry.class === 'B'
                                ? '#6366f1'
                                : '#94a3b8'
                          }
                        />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50 dark:border-slate-800">
                      <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Produto
                      </th>
                      <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Classificação
                      </th>
                      <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">
                        Lucro Mensal
                      </th>
                      <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">
                        Giro Mensal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {sortedResults.map((res: any, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <td className="py-4 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                          {res.product}
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[9px] font-black ${res.classification === 'A' ? 'bg-blue-50 text-blue-600' : res.classification === 'B' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}
                          >
                            Classe {res.classification}
                          </span>
                        </td>
                        <td className="py-4 text-[10px] font-black text-right">
                          {res.monthlyProfit.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </td>
                        <td className="py-4 text-[10px] font-black text-right">
                          {res.monthlyTurnover.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <SupplierPerformanceView results={results} monthCount={monthCount} />
          )}
        </div>
      </main>

      {isConfigOpen && (
        <ReportConfigModal
          isOpen={isConfigOpen}
          onClose={() => { if (!updateBusyRef.current) setIsConfigOpen(false); }}
          loading={loading || updating}
          onSave={handleUpdateReport}
          initialName={reportName}
          initialSource={reportSource}
          initialConfig={reportConfig}
        />
      )}
    </div>
  );
};

export default ReportViewBling;
