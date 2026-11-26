import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReportFiltersSidebar from './ReportFiltersSidebar';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import ItemExclusionModal from '../modals/ItemExclusionModal';
import ProductReferenceModal from '../modals/ProductReferenceModal';
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
import { deriveReportAbcChartData } from './reportChartData';
import { deriveReportRefinementMetrics } from './reportSupplierMetrics';
import ReportProductDetailModal from './ReportProductDetailModal';
import { ReportHeader } from './ReportHeader';
import { ReportAbcResultsTable } from './ReportAbcResultsTable';
import { ReportAbcChart } from './ReportAbcChart';
import { ReportMatrixAnalysis } from './ReportMatrixAnalysis';

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
      <ReportHeader
        isPublicMode={isPublicMode}
        reportName={reportName}
        reportSource={reportSource}
        totalProfit={totalProfit}
        monthCount={monthCount}
        reportStartDate={reportStartDate}
        reportEndDate={reportEndDate}
        avgTurnoverPerItem={avgTurnoverPerItem}
        avgProfitPerItem={avgProfitPerItem}
        viewMode={viewMode}
        setViewMode={setViewMode}
        reportType={reportType}
        setReportType={setReportType}
        abcBasis={abcBasis}
        setAbcBasis={setAbcBasis}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onShareWhatsApp={handleShareWhatsApp}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {(validationError || filterSaveError || error) && <div role="alert" className="px-6 py-3 text-red-600">{validationError || filterSaveError || error} {filterSaveError ? <button disabled={updating} onClick={() => setFilterRetry(value => value + 1)}>Tentar salvar filtros</button> : <button disabled={loading || updating} onClick={() => id && loadReport(id)}>Carregar relatório</button>}</div>}
      {(loading || updating) && <p role="status" className="px-6 py-2 text-indigo-600">Consultando e confirmando o relatório...</p>}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto flex flex-col gap-8">
            {viewMode === 'product' ? (
              reportType === 'abc' ? (
                <>
                  <ReportAbcChart
                    chartData={chartData}
                    analyzedItemCount={refinementMetrics.active}
                  />

                  <ReportAbcResultsTable
                    sortedResults={sortedResults}
                    monthCount={monthCount}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    onRowClick={handleRowClick}
                  />
                </>
              ) : (
                <ReportMatrixAnalysis
                  results={results}
                  rawResults={rawResults}
                  totalProfit={totalProfit}
                  avgProfitPerItem={avgProfitPerItem}
                  avgTurnoverPerItem={avgTurnoverPerItem}
                  monthCount={monthCount}
                  refinementMetrics={refinementMetrics}
                  onSelectResult={handleRowClick}
                />
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