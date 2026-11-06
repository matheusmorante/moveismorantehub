import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReportFiltersSidebar from './ReportFiltersSidebar';
import { useParams, useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import ItemExclusionModal from '../modals/ItemExclusionModal';
import ProductReferenceModal from '../modals/ProductReferenceModal';
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
import { format } from 'date-fns';
import { useSalesReport } from '../hooks/useSalesReport';
import type { ABCResult, SaleItem } from '../utils/salesReportCalculations';
import ReportConfigModal from '../modals/ReportConfigModal';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { salesReportViewFormSchema, erpReportPrepareFormSchema, salesReportSaleItemsSchema } from '../../../../../../../shared-utils/salesReportFormSchemas';
import { mappedCsvItems } from '../utils/reportCsvInput';
import {
  normalizeSavedReportProducts,
  normalizeSavedReportResults,
} from '../utils/savedSalesReportHydration';
import { sortSalesReportResults } from '../utils/sortSalesReportResults';
import SupplierPerformanceView from './SupplierPerformanceView';
import { REPORT_QUADRANTS } from './reportQuadrantPresentation';
import { deriveReportAbcChartData, deriveReportScatterData } from './reportChartData';
import {
  deriveReportRefinementMetrics,
  deriveSalvadosBenchmark,
  deriveSupplierAverages,
} from './reportSupplierMetrics';
import ReportProductDetailModal from './ReportProductDetailModal';
import { ReportQuadrantProductLists } from './ReportQuadrantProductLists';
import { REPORT_PRINT_STYLES } from './reportPrintStyles';

const ReportView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
    rawResults,
    setRawResults,
    applyFilters,
    loading,
    error, sessionKey, getReport, getProductMappings, saveReportConfig, fetchReportItems,
    updateReport,
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
  const [reportSource, setReportSource] = useState<'erp' | 'csv'>('erp');
  const [reportConfig, setReportConfig] = useState<any>(null);

  // Filter local states
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [minProfit, setMinProfit] = useState<number>(0);
  const [maxProfit, setMaxProfit] = useState<number>(0);

  // Modal Config
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'accumulatedPercentage',
    direction: 'asc',
  });
  const [hoveredResult, setHoveredResult] = useState<ABCResult | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [productMappings, setProductMappings] = useState<Record<string, string>>({});
  const [isExclusionOpen, setIsExclusionOpen] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const [updating, setUpdating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [filterSaveError, setFilterSaveError] = useState('');
  const [filterRetry, setFilterRetry] = useState(0);
  const updateBusyRef = useRef(false);
  const currentSession = useRef(sessionKey); currentSession.current = sessionKey;
  const mountedRef = useRef(true);
  const filterJobRef = useRef<Promise<unknown>>(Promise.resolve());
  const configRef = useRef(reportConfig); configRef.current = reportConfig;
  const filterRef = useRef({ suppliers: selectedSuppliers, minProfit, maxProfit, search: searchTerm }); filterRef.current = { suppliers: selectedSuppliers, minProfit, maxProfit, search: searchTerm };
  const confirmedFiltersRef = useRef('');
  const { enqueueAndRun: validateView } = useZodForm(salesReportViewFormSchema, { ...filterRef.current, reportType, abcBasis, sortConfig });
  const updateForm = useZodForm(erpReportPrepareFormSchema, { name: reportName, source: reportSource, config: reportConfig || {}, csvData: [] });
  const urlRef = useRef(searchParams); urlRef.current = searchParams;
  const setSearchRef = useRef(setSearchParams); setSearchRef.current = setSearchParams;
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const fetchProductMappings = useCallback(async () => {
    const submittedSession = sessionKey; const mappings = await getProductMappings();
    if (mappings && mountedRef.current && currentSession.current === submittedSession) setProductMappings(mappings);
    return mappings;
  }, [getProductMappings, sessionKey]);
  useEffect(() => { void fetchProductMappings(); }, [fetchProductMappings]);

  const supplierAverages = useMemo(() => deriveSupplierAverages(results), [results]);
  const salvadosBenchmark = useMemo(
    () => deriveSalvadosBenchmark(rawResults),
    [rawResults],
  );

  const handleRowClick = (res: ABCResult) => {
    setHoveredResult(res);
  };

  const handleCloseModal = () => {
    setHoveredResult(null);
  };

  const handleShareWhatsApp = () => {
    const REAL_URL = 'https://morantehub.vercel.app';
    const publicUrl = `${REAL_URL}/public/report/${id}${location.search}`;
    const text = `📊 *Análise Estratégica MoranteHub*\n\nConfira o relatório: *${reportName}*\n\n🔗 Acesse aqui: ${publicUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const sortedResults = useMemo(
    () => sortSalesReportResults(results, sortConfig, monthCount),
    [results, sortConfig, monthCount],
  );

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('print') === 'true' && !loading && results.length > 0) {
      const timer = setTimeout(() => {
        window.print();
        // Limpar o param pra não imprimir de novo no refresh
        navigate(location.pathname, { replace: true });
      }, 1000); // Dar um tempo pros gráficos renderizarem
      return () => clearTimeout(timer);
    }
  }, [location.search, location.pathname, navigate, loading, results.length]);

  const loadReport = useCallback(async (reportId: string) => {
    const submittedSession = sessionKey;
    const data = await getReport(reportId);
    if (!mountedRef.current || currentSession.current !== submittedSession) return false;
      if (data) {
        const rd = data.report_data;
        setValidationError(''); setFilterSaveError('');
        setReportName(data.name);
        if (data.source === 'erp' || data.source === 'csv') setReportSource(data.source);
        configRef.current = data.config; setReportConfig(data.config);
        const {
          monthCount: mCount,
          avgProfitPerItem: aProfit,
          avgTurnoverPerItem: aTurnover,
          results: resultsWithMonthly,
        } = normalizeSavedReportResults(rd);

        setRawResults(resultsWithMonthly);
        setResults(resultsWithMonthly);
        setMonthCount(mCount);
        setAvgProfitPerItem(aProfit);
        setAvgTurnoverPerItem(aTurnover);

        // Normalizar allProducts para sempre ser um array de objetos enriquecidos
        const enrichedAllProducts = normalizeSavedReportProducts(
          rd.allProducts,
          resultsWithMonthly,
          mCount,
          aProfit,
          aTurnover
        );

        setAllProducts(enrichedAllProducts);
        setTotalProfit(rd.totalProfit);
        setAbcBasis(data.config?.abcBasis || 'revenue');

        const savedFilters = data.config.filters || {};
        const params = urlRef.current;
        const nextFilters = {
          suppliers: params.has('s') ? (params.get('s') || '').split(',').filter(Boolean) : savedFilters.suppliers || Array.from(new Set(resultsWithMonthly.map((row: any) => row.supplier))) as string[],
          minProfit: params.has('minP') ? Number(params.get('minP')) : savedFilters.minProfit ?? 0,
          maxProfit: params.has('maxP') ? Number(params.get('maxP')) : savedFilters.maxProfit ?? 0,
          search: params.has('q') ? params.get('q') || '' : savedFilters.search || '',
        };
        confirmedFiltersRef.current = JSON.stringify({ suppliers: savedFilters.suppliers || nextFilters.suppliers, minProfit: savedFilters.minProfit ?? 0, maxProfit: savedFilters.maxProfit ?? 0, search: savedFilters.search || '' });
        filterRef.current = nextFilters;
        setSelectedSuppliers(nextFilters.suppliers); setMinProfit(nextFilters.minProfit); setMaxProfit(nextFilters.maxProfit); setSearchTerm(nextFilters.search);
        setReportType(params.has('type') ? params.get('type') as 'abc' | 'matrix' : 'abc');
        setAbcBasis(params.has('basis') ? params.get('basis') as 'revenue' | 'profit' : data.config.abcBasis || 'revenue');
        setSortConfig({ key: params.get('sortK') || 'accumulatedPercentage', direction: params.get('sortD') as 'asc' | 'desc' || 'asc' });

        setReportStartDate(rd.reportStartDate ? new Date(rd.reportStartDate) : null);
        setReportEndDate(rd.reportEndDate ? new Date(rd.reportEndDate) : null);
      }
    return data;
  }, [getReport, sessionKey, setRawResults, setResults, setMonthCount, setAvgProfitPerItem, setAvgTurnoverPerItem, setAllProducts, setTotalProfit, setReportStartDate, setReportEndDate]);
  useEffect(() => {
    setReportName(''); setReportConfig(null); setRawResults([]); setResults([]); setAllProducts([]); setTotalProfit(0);
    setIsConfigOpen(false); setIsExclusionOpen(false); setIsReferenceOpen(false);
    if (id) void loadReport(id);
  }, [id, loadReport, setRawResults, setResults, setAllProducts, setTotalProfit]);

  // Garantir recálculo do monthCount se as datas mudarem (correção em tempo real)
  useEffect(() => {
    if (
      reportStartDate &&
      reportEndDate &&
      !isNaN(reportStartDate.getTime()) &&
      !isNaN(reportEndDate.getTime())
    ) {
      const months =
        (reportEndDate.getFullYear() - reportStartDate.getFullYear()) * 12 +
        (reportEndDate.getMonth() - reportStartDate.getMonth()) +
        1;
      if (months !== monthCount && months > 0) {
        setMonthCount(months);
      }
    }
  }, [reportStartDate, reportEndDate, monthCount, setMonthCount]);

  const handleUpdateReport = async (newConfig: any) => {
    if (updateBusyRef.current || isPublicMode || !id) return false;
    updateBusyRef.current = true; setUpdating(true); setValidationError('');
    const submittedSession = sessionKey;
    const isCurrent = () => mountedRef.current && currentSession.current === submittedSession;
    try {
      await filterJobRef.current;
      if (!isCurrent()) return false;
      return await updateForm.validateAndRun({ ...newConfig, config: { ...newConfig.config, filters: filterRef.current } }, async parsed => {
        const mappings = await fetchProductMappings();
        if (!isCurrent() || mappings === false) return false;
        let items: SaleItem[] | false;
        if (parsed.source === 'erp') items = await fetchReportItems(parsed.config, mappings);
        else if (parsed.csvData.length) items = mappedCsvItems(parsed.csvData, parsed.config);
        else {
          const receipt = salesReportSaleItemsSchema.safeParse(allProducts.map(product => ({
            date: reportStartDate || reportEndDate || new Date(), product: product.product, supplier: product.supplier || 'N/A',
            quantity: product.qty, salesValue: product.rev, cost: product.cost, profit: product.profit,
          })));
          if (!receipt.success) { setValidationError('O relatório antigo não possui todos os valores de origem. Anexe o CSV para recalcular.'); return false; }
          items = receipt.data;
        }
        if (!isCurrent() || items === false) return false;
        if (!items.length) { setValidationError('Nenhum dado encontrado para recalcular o relatório.'); return false; }
        const reportData = calculateABC(items, parsed.config.abcBasis, true, parsed.config, mappings, monthCount);
        const saved = await updateReport(id, parsed.name, parsed.source, parsed.config, reportData);
        if (!isCurrent() || !saved) return false;
        setReportName(saved.name); setReportConfig(saved.config); configRef.current = saved.config;
        setRawResults(saved.report_data.results); setResults(saved.report_data.results); setAllProducts(saved.report_data.allProducts);
        setTotalProfit(saved.report_data.totalProfit); setMonthCount(saved.report_data.monthCount || 1);
        setAvgProfitPerItem(saved.report_data.avgProfitPerItem); setAvgTurnoverPerItem(saved.report_data.avgTurnoverPerItem);
        setReportStartDate(saved.report_data.reportStartDate ? new Date(saved.report_data.reportStartDate) : null); setReportEndDate(saved.report_data.reportEndDate ? new Date(saved.report_data.reportEndDate) : null);
        confirmedFiltersRef.current = JSON.stringify(parsed.config.filters);
        setIsConfigOpen(false); setIsExclusionOpen(false); return true;
      }, errors => setValidationError(Object.values(flattenFormErrors(errors))[0] || 'Confira a configuração.'));
    } catch (failure) { if (isCurrent()) setValidationError(failure instanceof Error ? failure.message : 'Não foi possível atualizar o relatório.'); return false; }
    finally { updateBusyRef.current = false; if (mountedRef.current) setUpdating(false); }
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
      if (urlRef.current.get('print') === 'true') params.print = 'true';
      if (new URLSearchParams(params).toString() !== urlRef.current.toString()) setSearchRef.current(params, { replace: true });
    }, errors => setValidationError(Object.values(flattenFormErrors(errors))[0] || 'Confira os filtros.'));
    return () => { cancelled = true; };
  }, [selectedSuppliers, minProfit, maxProfit, searchTerm, reportType, abcBasis, sortConfig, reportConfig, validateView, applyFilters]);

  useEffect(() => {
    if (!id || !reportConfig || isPublicMode || updating) return;
    const filters = { suppliers: selectedSuppliers, minProfit, maxProfit, search: searchTerm };
    const signature = JSON.stringify(filters);
    if (signature === confirmedFiltersRef.current) return;
    const submittedSession = sessionKey; let cancelled = false;
    const isCurrent = () => !cancelled && mountedRef.current && currentSession.current === submittedSession;
    const timer = setTimeout(() => {
      const job = filterJobRef.current.then(async () => {
        if (!isCurrent() || updateBusyRef.current) return;
        const saved = await saveReportConfig(id, { ...configRef.current, filters }, isCurrent);
        if (!isCurrent()) return;
        if (!saved) { setFilterSaveError('Não foi possível confirmar o salvamento dos filtros. Os valores digitados foram preservados.'); return; }
        confirmedFiltersRef.current = signature; configRef.current = saved.config; setReportConfig(saved.config); setFilterSaveError('');
      });
      filterJobRef.current = job.catch(() => { if (isCurrent()) setFilterSaveError('Não foi possível salvar os filtros.'); });
    }, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [id, reportConfig, isPublicMode, updating, sessionKey, selectedSuppliers, minProfit, maxProfit, searchTerm, filterRetry, saveReportConfig]);

  const allSuppliers = useMemo(() => {
    const suppliers = Array.from(new Set(allProducts.map((r) => r.supplier)));
    return suppliers.sort();
  }, [allProducts]);

  const scatterData = useMemo(
    () => deriveReportScatterData(results, monthCount),
    [results, monthCount]
  );

  const chartData = useMemo(
    () => deriveReportAbcChartData(results, abcBasis, monthCount),
    [results, abcBasis, monthCount]
  );

  // Métricas dinâmicas para o refinamento (respeitando fornecedores selecionados)
  const refinementMetrics = useMemo(
    () => deriveReportRefinementMetrics(allProducts, selectedSuppliers, reportConfig?.excludedItems),
    [allProducts, selectedSuppliers, reportConfig?.excludedItems],
  );

  if (loading && !reportName) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-10">
        <div className="w-16 h-16 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-6" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 animate-pulse">
          Carregando Dados Estratégicos...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm print:hidden">
        {/* Linha 1: Identidade e Métricas Rápidas */}
        <div className="px-6 py-6 pb-2">
          <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              {!isPublicMode && (
                <Link
                  to="/sales-order/reports"
                  className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 dark:border-slate-800"
                >
                  <i className="bi bi-arrow-left text-lg"></i>
                </Link>
              )}
              <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight uppercase">
                  {isPublicMode && <i className="bi bi-shield-check text-emerald-500 mr-2"></i>}
                  {reportName}
                </h1>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {reportSource === 'erp' ? 'VIA ERP' : 'VIA CSV'}:
                  </span>
                  <span className="text-sm font-black text-emerald-600">
                    {totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Amostragem:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-600">
                      {monthCount} {monthCount === 1 ? 'mês' : 'meses'}
                    </span>
                    {reportStartDate &&
                      reportEndDate &&
                      !isNaN(reportStartDate.getTime()) &&
                      !isNaN(reportEndDate.getTime()) && (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                          {format(reportStartDate, 'MM/yyyy')} — {format(reportEndDate, 'MM/yyyy')}
                        </span>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* Indicadores de Meta no Header */}
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

        {/* Linha 2: ABAS de Navegação Principal (NOVO) */}
        <div className="px-6">
          <div className="max-w-[1800px] mx-auto flex border-b border-transparent">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('product')}
                className={`px-6 py-4 flex items-center gap-3 transition-all relative group ${viewMode === 'product' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i
                  className={`bi bi-box-seam ${viewMode === 'product' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-400'} text-lg transition-colors`}
                ></i>
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                  Desempenho dos Produtos
                </span>
                {viewMode === 'product' && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full animate-fade-in"></div>
                )}
              </button>
              <button
                onClick={() => setViewMode('supplier')}
                className={`px-6 py-4 flex items-center gap-3 transition-all relative group ${viewMode === 'supplier' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i
                  className={`bi bi-truck ${viewMode === 'supplier' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-400'} text-lg transition-colors`}
                ></i>
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                  Desempenho por Fornecedor
                </span>
                {viewMode === 'supplier' && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full animate-fade-in"></div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Linha 3: Controles de Refinamento e Ações */}
        <div className="bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 px-6 py-3">
          <div className="max-w-[1800px] mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              {viewMode === 'product' && (
                <div className="flex p-1 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <button
                    onClick={() => setReportType('abc')}
                    className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${reportType === 'abc' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    <i className="bi bi-graph-up-arrow mr-2 text-xs"></i>
                    Curva ABC Matriz
                  </button>
                  <button
                    onClick={() => setReportType('matrix')}
                    className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${reportType === 'matrix' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    <i className="bi bi-grid-3x3-gap-fill mr-2 text-xs"></i>
                    Matriz de Giro
                  </button>
                </div>
              )}

              {viewMode === 'product' && (
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setAbcBasis('revenue')}
                    className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${abcBasis === 'revenue' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    Por Faturamento
                  </button>
                  <button
                    onClick={() => setAbcBasis('profit')}
                    className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${abcBasis === 'profit' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    Por Lucratividade
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="h-10 px-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-all font-black text-[9px] uppercase tracking-widest hover:border-indigo-200 shadow-sm"
                title="Imprimir / Exportar PDF"
              >
                <i className="bi bi-printer-fill text-sm"></i>
                <span className="hidden sm:inline">Imprimir / PDF</span>
              </button>

              {!isPublicMode && (
                <>
                  <button
                    onClick={handleShareWhatsApp}
                    className="h-10 px-5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all font-black text-[9px] uppercase tracking-widest shadow-sm"
                    title="Compartilhar pelo WhatsApp"
                  >
                    <i className="bi bi-whatsapp text-sm"></i>
                    <span className="hidden sm:inline">Compartilhar</span>
                  </button>
                  <button
                    onClick={() => setIsConfigOpen(true)}
                    className="h-10 px-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-all font-black text-[9px] uppercase tracking-widest hover:border-indigo-200 shadow-sm"
                  >
                    <i className="bi bi-gear-wide-connected text-sm"></i>
                    <span className="hidden sm:inline">Configurar</span>
                  </button>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`h-10 px-5 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 ${showFilters ? 'bg-amber-600 border-amber-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600'}`}
                  >
                    <i className="bi bi-funnel-fill text-sm"></i>
                    <span className="hidden sm:inline">Filtros</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <style>{REPORT_PRINT_STYLES}</style>
      </header>

      {(validationError || filterSaveError || error) && <div role="alert" className="px-6 py-3 text-red-600">{validationError || filterSaveError || error} {filterSaveError ? <button disabled={updating} onClick={() => setFilterRetry(value => value + 1)}>Tentar salvar filtros</button> : <button disabled={loading || updating} onClick={() => id && loadReport(id)}>Carregar relatório</button>}</div>}
      {(loading || updating) && <p role="status" className="px-6 py-2 text-indigo-600">Consultando e confirmando o relatório...</p>}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto flex flex-col gap-8">
            {viewMode === 'product' ? (
              reportType === 'abc' ? (
                <>
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-10 flex items-center justify-between">
                      Análise de Pareto Completa
                      <div className="flex items-center gap-6">
                        {refinementMetrics.active} Itens Analisados
                        <div className="flex gap-4 border-l border-slate-100 dark:border-slate-800 pl-6">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                            <span className="text-[8px] font-black text-slate-400 uppercase">
                              Classe A
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>
                            <span className="text-[8px] font-black text-slate-400 uppercase">
                              Classe B
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-slate-400 rounded-full"></div>
                            <span className="text-[8px] font-black text-slate-400 uppercase">
                              Classe C
                            </span>
                          </div>
                        </div>
                      </div>
                    </h3>
                    <div className="h-[450px] overflow-hidden">
                      <div className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ bottom: 20 }}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#f1f5f9"
                            />
                            <XAxis
                              dataKey="percItens"
                              fontSize={9}
                              fontWeight="900"
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(val) => `${Number(val).toFixed(0)}%`}
                            />

                            <YAxis
                              yAxisId="left"
                              fontSize={9}
                              fontWeight="900"
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(val) => {
                                if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
                                if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
                                return `R$ ${val}`;
                              }}
                              domain={[0, 'dataMax']}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              fontSize={9}
                              fontWeight="900"
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(val) => `${Number(val).toFixed(0)}%`}
                              domain={[0, 100]}
                            />
                            <Tooltip
                              formatter={(value, name) => {
                                if (name === 'percItens')
                                  return [`${Number(value).toFixed(1)}%`, 'da Quantidade de Itens'];
                                if (name === 'perc')
                                  return [`${Number(value).toFixed(1)}%`, '% do Lucro Total'];
                                if (name === 'lucroAcumulado')
                                  return [
                                    Number(value).toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    }),
                                    'Lucro Mensal Acumulado',
                                  ];
                                return [value, name];
                              }}
                              labelFormatter={(label, payload) => {
                                if (payload && payload.length > 0) {
                                  const p = payload[0].payload;
                                  return `${p.percItens.toFixed(1)}% dos itens (${p.numeroItens} produtos até ${p.name})`;
                                }
                                return `${Number(label).toFixed(1)}% dos Itens`;
                              }}
                              contentStyle={{
                                borderRadius: '20px',
                                border: 'none',
                                boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)',
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(10px)',
                              }}
                            />

                            <Area
                              yAxisId="right"
                              type="monotone"
                              dataKey="perc"
                              stroke="transparent"
                              fill="url(#colorPerc)"
                              strokeWidth={0}
                              dot={false}
                              fillOpacity={0.1}
                            />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="lucroAcumulado"
                              stroke="#3b82f6"
                              strokeWidth={3}
                              dot={false}
                            />
                            <defs>
                              <linearGradient id="colorPerc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-955/50 border-b border-slate-100 dark:border-slate-800">
                          <th
                            onClick={() => handleSort('classification')}
                            className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            Classe <SortIcon column="classification" />
                          </th>
                          <th
                            onClick={() => handleSort('product')}
                            className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                          >
                            Produto <SortIcon column="product" />
                          </th>
                          <th
                            onClick={() => handleSort('giroMensal')}
                            className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
                          >
                            Giro Mensal <SortIcon column="giroMensal" />
                          </th>
                          <th
                            onClick={() => handleSort('totalProfit')}
                            className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
                          >
                            Lucro Total <SortIcon column="totalProfit" />
                          </th>
                          <th
                            onClick={() => handleSort('lucroMensal')}
                            className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
                          >
                            Lucro Mensal <SortIcon column="lucroMensal" />
                          </th>
                          <th
                            onClick={() => handleSort('accumulatedPercentage')}
                            className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
                          >
                            % Acum. <SortIcon column="accumulatedPercentage" />
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {sortedResults.map((res, i) => (
                          <tr
                            key={i}
                            onClick={() => handleRowClick(res)}
                            className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all cursor-pointer active:scale-[0.99]"
                          >
                            <td className="px-8 py-5">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[12px] ${res.classification === 'A' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : res.classification === 'B' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}
                              >
                                {res.classification}
                              </div>
                            </td>
                            <td className="px-6 py-5 max-w-[400px]">
                              <p className="text-[12px] font-black text-slate-800 dark:text-slate-100 leading-tight whitespace-pre-wrap">
                                {res.product}
                              </p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {res.supplier}
                              </p>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <span className="px-3 py-1 bg-slate-50 dark:bg-slate-950 rounded-lg text-[11px] font-black text-slate-800 dark:text-slate-200">
                                {(res.totalQuantity / (monthCount || 1)).toFixed(1)}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <span className="text-[12px] font-black text-emerald-600">
                                {res.totalProfit.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <span className="text-[12px] font-black text-indigo-600">
                                {(res.totalProfit / (monthCount || 1)).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right text-[11px] font-black text-slate-300">
                              {res.accumulatedPercentage.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-10 flex items-center justify-between">
                      Matriz Giro vs Lucratividade
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500">
                        {refinementMetrics.active} Itens Analisados
                      </span>
                    </h3>
                    <div className="h-[500px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 40, right: 120, bottom: 40, left: 40 }}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f1f5f9"
                            strokeOpacity={0.8}
                          />
                          <XAxis
                            type="number"
                            dataKey="x"
                            name="Giro Mensal"
                            fontSize={9}
                            fontWeight="900"
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => val.toFixed(1)}
                            domain={['auto', 'auto']}
                          />
                          <YAxis
                            type="number"
                            dataKey="y"
                            name="Lucro Mensal"
                            fontSize={9}
                            fontWeight="900"
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR')}`}
                            domain={['auto', 'auto']}
                          />
                          <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col gap-1 min-w-[200px]">
                                    <p className="text-[11px] font-black uppercase text-indigo-600 mb-1">
                                      {data.name}
                                    </p>
                                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex justify-between">
                                      <span className="text-slate-400 font-black uppercase text-[8px]">
                                        Lucro Mensal:
                                      </span>
                                      {data.y.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                      })}
                                    </p>
                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex justify-between">
                                      <span className="text-slate-400 font-black uppercase text-[8px]">
                                        Giro Mensal:
                                      </span>
                                      {data.x.toFixed(1)} un.
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <ReferenceLine
                            x={avgTurnoverPerItem}
                            stroke="#94a3b8"
                            strokeDasharray="8 8"
                            strokeWidth={1}
                            label={{
                              position: 'top',
                              value: `MÉD. GIRO: ${avgTurnoverPerItem.toFixed(1)} un/mês`,
                              fill: '#94a3b8',
                              fontSize: 8,
                              fontWeight: 900,
                            }}
                          />
                          <ReferenceLine
                            y={avgProfitPerItem}
                            stroke="#94a3b8"
                            strokeDasharray="8 8"
                            strokeWidth={1}
                            label={{
                              position: 'right',
                              value: `MÉD. LUCRO: ${avgProfitPerItem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                              fill: '#94a3b8',
                              fontSize: 8,
                              fontWeight: 900,
                            }}
                          />
                          <Scatter name="Produtos" data={scatterData}>
                            {scatterData.map((entry: any, index: number) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  entry.quadrant === 1
                                    ? '#10b981'
                                    : entry.quadrant === 2
                                      ? '#3b82f6'
                                      : entry.quadrant === 3
                                        ? '#f59e0b'
                                        : '#94a3b8'
                                }
                                fillOpacity={0.8}
                              />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                      {(() => {
                        const totalViewQty = results.reduce(
                          (acc, curr) => acc + (curr.totalQuantity || 0),
                          0
                        );
                        const q1ResTotal = results.filter((r) => r.quadrant === 1);
                        const q1ProfitSum = q1ResTotal.reduce(
                          (acc, curr) => acc + (curr.totalProfit || 0),
                          0
                        );
                        const q1AvgProfitPerItem =
                          q1ResTotal.length > 0 ? q1ProfitSum / q1ResTotal.length : 0;

                        return REPORT_QUADRANTS.map((q) => {
                          const qResults = results.filter((r) => r.quadrant === q.id);
                          const qProfit = qResults.reduce(
                            (acc, curr) => acc + (curr.totalProfit || 0),
                            0
                          );
                          const qQty = qResults.reduce(
                            (acc, curr) => acc + (curr.totalQuantity || 0),
                            0
                          );

                          const qPerc = totalProfit > 0 ? (qProfit / totalProfit) * 100 : 0;
                          const qItemsPerc =
                            results.length > 0 ? (qResults.length / results.length) * 100 : 0;
                          const qMonthlyProfit = qProfit / (monthCount || 1);

                          const qSupplierProfitSum = qResults.reduce((acc, r) => {
                            const sAvg = supplierAverages[r.supplier || 'N/A']?.avgProfit || 0;
                            return acc + sAvg * (monthCount || 1);
                          }, 0);

                          return (
                            <div
                              key={q.id}
                              className={`${q.bg} p-6 rounded-[2.5rem] border ${q.border} flex flex-col gap-2 shadow-sm transition-all hover:scale-[1.02]`}
                            >
                              <div className="flex flex-col mb-2">
                                <h4
                                  className={`text-[9px] font-black ${q.text} uppercase tracking-[0.2em]`}
                                >
                                  {q.label}
                                </h4>
                                <span className="text-[7px] font-bold opacity-50 uppercase tracking-widest">
                                  {q.sub}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1">
                                <p className={`text-xl font-black ${q.valText}`}>
                                  {qResults.length}{' '}
                                  <span className="text-[10px] font-bold opacity-60 uppercase">
                                    itens
                                  </span>
                                </p>
                                <div className="flex flex-col">
                                  <p className="text-[11px] font-black text-slate-800 dark:text-slate-100">
                                    {qProfit.toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    })}{' '}
                                    <span className="text-[8px] font-bold opacity-30 ml-1">
                                      TOTAL
                                    </span>
                                  </p>
                                  <p className={`text-[11px] font-black ${q.text}`}>
                                    {qMonthlyProfit.toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    })}{' '}
                                    <span className="text-[8px] font-bold opacity-40 ml-1">
                                      / MÊS
                                    </span>
                                  </p>
                                </div>
                                <div className="flex flex-col gap-0.5 mt-1 border-t border-black/5 dark:border-white/5 pt-2">
                                  <p className={`text-[10px] font-black opacity-60 ${q.text}`}>
                                    {qPerc.toFixed(1)}%{' '}
                                    <span className="text-[8px] uppercase tracking-tighter">
                                      do lucro total
                                    </span>
                                  </p>
                                  <p className={`text-[10px] font-black opacity-60 ${q.text}`}>
                                    {qItemsPerc.toFixed(1)}%{' '}
                                    <span className="text-[8px] uppercase tracking-tighter">
                                      da quantidade de itens
                                    </span>
                                  </p>
                                </div>
                                {q.id !== 1 && qResults.length > 0 && (
                                  <div className="mt-4 pt-2 -mx-2">
                                    <div className="relative group/insight">
                                      <button className="flex items-center gap-2 px-3 py-2 bg-white/40 dark:bg-black/10 hover:bg-white dark:hover:bg-indigo-600 hover:text-white rounded-xl border border-black/5 dark:border-white/5 transition-all cursor-help">
                                        <i className="bi bi-lightbulb-fill text-amber-500 group-hover/insight:text-white text-[10px]"></i>
                                        <span className="text-[8px] font-black uppercase tracking-widest">
                                          Ver Insights
                                        </span>
                                      </button>

                                      <div className="absolute bottom-full left-0 mb-3 w-[400px] p-8 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 opacity-0 invisible group-hover/insight:opacity-100 group-hover/insight:visible transition-all z-50 transform translate-y-2 group-hover/insight:translate-y-0">
                                        <div className="flex items-center gap-3 mb-6">
                                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                            <i className="bi bi-graph-up-arrow text-indigo-600 dark:text-indigo-400 text-lg"></i>
                                          </div>
                                          <div>
                                            <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none mb-1">
                                              Análise de Potencial
                                            </h5>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                              Simulações de Melhoria de Margem
                                            </p>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                          {/* Coluna 1: Cenário Realista (Benchmark SALVADOS) */}
                                          <div
                                            className={`flex flex-col gap-4 ${!salvadosBenchmark ? 'opacity-30 grayscale pointer-events-none' : ''}`}
                                          >
                                            <div className="flex items-center gap-2 mb-1">
                                              <div className="w-2 h-4 bg-indigo-500 rounded-full"></div>
                                              <h6 className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                                                Padrão SALVADOS
                                              </h6>
                                            </div>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-2">
                                              {salvadosBenchmark
                                                ? 'Simula elevar itens para o lucro médio do fornecedor Salvados.'
                                                : 'Fornecedor SALVADOS não encontrado neste relatório.'}
                                            </p>

                                            {salvadosBenchmark &&
                                              [100, 50, 25].map((perc) => {
                                                const ratio = perc / 100;
                                                const scenarioProfit =
                                                  qResults.length *
                                                    ratio *
                                                    salvadosBenchmark *
                                                    (monthCount || 1) +
                                                  qProfit * (1 - ratio);
                                                const profitIncrease = scenarioProfit - qProfit;
                                                const monthlyIncrease =
                                                  profitIncrease / (monthCount || 1);

                                                return (
                                                  <div
                                                    key={perc}
                                                    className="bg-slate-50 dark:bg-slate-955 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/20 transition-all"
                                                  >
                                                    <div className="flex justify-between items-center mb-1">
                                                      <span className="text-[9px] font-black text-slate-600">
                                                        {perc}% dos itens
                                                      </span>
                                                      <span className="text-[9px] font-black text-emerald-600">
                                                        +
                                                        {monthlyIncrease.toLocaleString('pt-BR', {
                                                          style: 'currency',
                                                          currency: 'BRL',
                                                          maximumFractionDigits: 0,
                                                        })}
                                                        /mês
                                                      </span>
                                                    </div>
                                                    <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                      <div
                                                        className="h-full bg-indigo-500"
                                                        style={{ width: `${perc}%` }}
                                                      ></div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                          </div>

                                          {/* Coluna 2: Cenário Otimista (Benchmark Q1) */}
                                          <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-2 mb-1">
                                              <div className="w-2 h-4 bg-emerald-500 rounded-full"></div>
                                              <h6 className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                                                Meta Estrela (Q1)
                                              </h6>
                                            </div>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-2">
                                              Simula elevar itens para a média geral dos melhores
                                              itens (Q1).
                                            </p>

                                            {[100, 50, 25].map((perc) => {
                                              const ratio = perc / 100;
                                              const scenarioProfit =
                                                qResults.length * ratio * q1AvgProfitPerItem +
                                                qProfit * (1 - ratio);
                                              const profitIncrease = scenarioProfit - qProfit;
                                              const monthlyIncrease =
                                                profitIncrease / (monthCount || 1);

                                              return (
                                                <div
                                                  key={perc}
                                                  className="bg-slate-50 dark:bg-slate-955 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/20 transition-all"
                                                >
                                                  <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[9px] font-black text-slate-600">
                                                      {perc}% dos itens
                                                    </span>
                                                    <span className="text-[9px] font-black text-emerald-600">
                                                      +
                                                      {monthlyIncrease.toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                        maximumFractionDigits: 0,
                                                      })}
                                                      /mês
                                                    </span>
                                                  </div>
                                                  <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                      className="h-full bg-emerald-500"
                                                      style={{ width: `${perc}%` }}
                                                    ></div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                                          <div className="grid grid-cols-2 gap-4">
                                            {salvadosBenchmark ? (
                                              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                                                <p className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">
                                                  Média SALVADOS
                                                </p>
                                                <p className="text-[11px] font-black text-slate-800 dark:text-slate-100">
                                                  R${' '}
                                                  {salvadosBenchmark.toLocaleString('pt-BR', {
                                                    maximumFractionDigits: 0,
                                                  })}{' '}
                                                  / item
                                                </p>
                                              </div>
                                            ) : (
                                              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                                                  Média SALVADOS
                                                </p>
                                                <p className="text-[11px] font-black text-slate-400 italic">
                                                  Não disponível
                                                </p>
                                              </div>
                                            )}
                                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                                              <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">
                                                Média Estrela (Q1)
                                              </p>
                                              <p className="text-[11px] font-black text-slate-800 dark:text-slate-100">
                                                R${' '}
                                                {(
                                                  q1AvgProfitPerItem / (monthCount || 1)
                                                ).toLocaleString('pt-BR', {
                                                  maximumFractionDigits: 0,
                                                })}{' '}
                                                / item
                                              </p>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-slate-100 dark:border-slate-800 rotate-45"></div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <ReportQuadrantProductLists results={results} onSelectResult={handleRowClick} />
                </>
              )
            ) : (
              <SupplierPerformanceView results={results} monthCount={monthCount} />
            )}
          </div>
        </div>

        <ReportFiltersSidebar
          showFilters={showFilters}
          onClose={() => setShowFilters(false)}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          minProfit={minProfit}
          setMinProfit={setMinProfit}
          maxProfit={maxProfit}
          setMaxProfit={setMaxProfit}
          selectedSuppliers={selectedSuppliers}
          setSelectedSuppliers={setSelectedSuppliers}
          allSuppliers={allSuppliers}
          refinementMetrics={refinementMetrics}
          onOpenItemExclusion={() => setIsExclusionOpen(true)}
          onOpenProductReference={() => setIsReferenceOpen(true)}
          sortConfig={sortConfig}
          handleSort={handleSort}
        />
      </main>

      <ReportConfigModal
        isOpen={isConfigOpen}
        onClose={() => { if (!updateBusyRef.current) setIsConfigOpen(false); }}
        onSave={handleUpdateReport}
        initialConfig={reportConfig}
        initialSource={reportSource}
        initialName={reportName}
        initialExcludedItems={reportConfig?.excludedItems || []}
        availableItems={rawResults.map((r) => ({
          product: r.product,
          qty: r.totalQuantity,
          profit: r.totalProfit,
          supplier: r.supplier,
        }))}
        loading={loading || updating}
      />

      <ItemExclusionModal
        isOpen={isExclusionOpen}
        onClose={() => { if (!updateBusyRef.current) setIsExclusionOpen(false); }}
        items={allProducts.filter(
          (i) => selectedSuppliers.includes(i.supplier || 'N/A') || selectedSuppliers.length === 0
        )}
        initialExcludedItems={reportConfig?.excludedItems || []}
        onConfirm={(nextExcluded: string[]) => handleUpdateReport({ name: reportName, source: reportSource, config: { ...configRef.current, excludedItems: nextExcluded } })}
        loading={updating}

      />

      <ProductReferenceModal
        readOnly={isPublicMode}
        contextKey={sessionKey}
        isOpen={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        availableProducts={rawResults.map((i) => ({ name: i.product, supplier: i.supplier || '' }))}
      />

      {hoveredResult && (
        <ReportProductDetailModal
          result={hoveredResult}
          monthCount={monthCount}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default ReportView;
