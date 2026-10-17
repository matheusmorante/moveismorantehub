import { useCallback, useState } from 'react';
import {
  ABCResult,
  calculateABC,
  applyFiltersCalculation,
  SaleItem,
} from '../utils/salesReportCalculations';
import { fetchFromERP } from '../services/salesReportApiService';
import { useSavedSalesReports } from './useSavedSalesReports';
import { useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { salesReportLoadFormSchema, salesReportSaleItemsSchema, salesReportCsvImportFormSchema, salesReportExportFormSchema, salesReportLoadSnapshotFormSchema } from '../../../../../../../shared-utils/salesReportFormSchemas';
import { exportResultsToCSV, importResultsFromCSV } from '../utils/csvUtils';

export const useSalesReport = (contextKey = 'list', readOnly = false) => {
  const [loading, setLoading] = useState(false);
  const [rawResults, setRawResults] = useState<ABCResult[]>([]);
  const [results, setResults] = useState<ABCResult[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [monthCount, setMonthCount] = useState(0);

  const [avgProfitPerItem, setAvgProfitPerItem] = useState(0);
  const [avgTurnoverPerItem, setAvgTurnoverPerItem] = useState(0);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [reportStartDate, setReportStartDate] = useState<Date | null>(null);
  const [reportEndDate, setReportEndDate] = useState<Date | null>(null);

  const persistence = useSavedSalesReports({ results: rawResults, allProducts, totalProfit, monthCount, avgProfitPerItem, avgTurnoverPerItem, reportStartDate, reportEndDate }, contextKey, readOnly, 'abc_curve');
  const { begin, scopeRef, mountedRef, invalid, showError } = persistence;
  const loadForm = useZodForm(salesReportLoadFormSchema, { config: {}, productMappings: {} });
  const importForm = useZodForm(salesReportCsvImportFormSchema, { config: {}, productMappings: {}, file: undefined as unknown as File });
  const exportForm = useZodForm(salesReportExportFormSchema, { results: [] });
  const snapshotForm = useZodForm(salesReportLoadSnapshotFormSchema, { report_data: { results: [], allProducts: [], totalProfit: 0, monthCount: 0, avgProfitPerItem: 0, avgTurnoverPerItem: 0 } });

  const _calculateABC = useCallback((
    items: SaleItem[],
    basis: 'revenue' | 'profit' = 'revenue',
    returnRaw: boolean = false,
    config?: any,
    productMappings: Record<string, string> = {},
    forceMonthCount?: number
  ) => {
    const out = calculateABC(items, basis, returnRaw, config, productMappings, forceMonthCount);
    if (!returnRaw) {
      setResults(out.results);
      setRawResults(out.rawResults);
      setAllProducts(out.allProducts);
      setTotalProfit(out.totalProfit);
      setMonthCount(out.monthCount);
      setAvgProfitPerItem(out.avgProfitPerItem);
      setAvgTurnoverPerItem(out.avgTurnoverPerItem);
      setReportStartDate(out.reportStartDate);
      setReportEndDate(out.reportEndDate);
    }
    return out;
  }, []);

  const applyFilters = useCallback((
    filters: { suppliers: string[]; minProfit?: number; maxProfit?: number; search: string },
    config?: any
  ) => {
    const out = applyFiltersCalculation(rawResults, filters, config, monthCount);
    setAvgProfitPerItem(out.finalAvgP);
    setAvgTurnoverPerItem(out.finalAvgT);
    setTotalProfit(out.newTotalProfit);
    setResults(out.updatedWithQuadrants);
  }, [rawResults, monthCount]);

  const { enqueueAndRun: validateLoad } = loadForm;
  const performLoad = useCallback(async (config: any = {}, productMappings: Record<string, string> = {}, apply = false) => {
    const submittedScope = scopeRef.current; const finish = begin(); let active = true;
    const isCurrent = () => active && mountedRef.current && scopeRef.current === submittedScope;
    try {
      return await validateLoad({ config, productMappings }, async parsed => {
        if (!isCurrent()) return false;
        const items = await withTimeout(fetchFromERP({ isCurrent }), 30_000, null, 'Consultar itens do relatório ERP');
        if (!isCurrent()) return false;
        if (!items) throw new Error('A consulta de itens excedeu o prazo. Tente carregar novamente.');
        const receipt = salesReportSaleItemsSchema.safeParse(items);
        if (!receipt.success) throw new Error('Os itens retornados pelo ERP são inválidos. Nenhum relatório foi aplicado.');
        if (apply) _calculateABC(receipt.data, 'profit', false, parsed.config, parsed.productMappings);
        return receipt.data;
      }, invalid);
    } catch (failure) { if (isCurrent()) showError(failure instanceof Error ? failure.message : 'Não foi possível carregar o relatório.'); return false; }
    finally { active = false; finish(); }
  }, [begin, scopeRef, mountedRef, invalid, showError, validateLoad, _calculateABC]);
  const fetchReportItems = useCallback((config?: any, productMappings?: Record<string, string>) => performLoad(config, productMappings), [performLoad]);
  const loadFromERP = useCallback((config: any, productMappings: Record<string, string>) => performLoad(config, productMappings, true), [performLoad]);
  const { validateAndRun: validateImport } = importForm;
  const importFromCSV = useCallback(async (file: File, config: any, productMappings: Record<string, string>, forceMonthCount?: number) => {
    const submittedScope = scopeRef.current; const finish = begin();
    const isCurrent = () => mountedRef.current && scopeRef.current === submittedScope;
    try {
      return await validateImport({ file, config, productMappings, forceMonthCount }, async parsed => {
        if (!isCurrent()) return false;
        const items = await withTimeout(importResultsFromCSV(parsed.file), 10_000, null, 'Importar análise CSV');
        if (!isCurrent()) return false;
        if (!items) throw new Error('A leitura do CSV excedeu o prazo. Tente importar novamente.');
        const receipt = salesReportSaleItemsSchema.safeParse(items);
        if (!receipt.success) throw new Error('O arquivo contém dados de análise inválidos.');
        _calculateABC(receipt.data, 'profit', false, parsed.config, parsed.productMappings, parsed.forceMonthCount);
        return true;
      }, invalid);
    } catch (failure) { if (isCurrent()) showError(failure instanceof Error ? failure.message : 'Não foi possível importar o CSV.'); return false; }
    finally { finish(); }
  }, [begin, scopeRef, mountedRef, invalid, showError, validateImport, _calculateABC]);
  const { validateAndRun: validateExport } = exportForm;
  const exportToCSV = useCallback((dataToExport: ABCResult[]) => validateExport({ results: dataToExport }, parsed => { exportResultsToCSV(parsed.results); return true; }, invalid).catch(() => { showError('Não foi possível exportar a análise.'); return false; }), [validateExport, invalid, showError]);
  const { validateAndRun: validateSnapshot } = snapshotForm;
  const loadReportData = useCallback((report: any) => validateSnapshot({ report_data: report?.report_data }, ({ report_data: data }) => {
    setRawResults(data.results); setResults(data.results); setAllProducts(data.allProducts);
    setTotalProfit(data.totalProfit); setMonthCount(data.monthCount); setAvgProfitPerItem(data.avgProfitPerItem); setAvgTurnoverPerItem(data.avgTurnoverPerItem);
    setReportStartDate(data.reportStartDate ? new Date(data.reportStartDate) : null); setReportEndDate(data.reportEndDate ? new Date(data.reportEndDate) : null);
    return true;
  }, invalid), [invalid, validateSnapshot]);

  const { saveReport, updateReport, deleteReport, listSavedReports, savedReports, getReport, getProductMappings, saveReportConfig, error, sessionKey } = persistence;
  return {
    loading: loading || persistence.loading,
    error, sessionKey, getReport, getProductMappings, saveReportConfig, fetchReportItems,
    results,
    rawResults,
    totalProfit,
    monthCount,
    avgProfitPerItem,
    avgTurnoverPerItem,
    allProducts,
    savedReports,
    reportStartDate,
    reportEndDate,
    calculateABC: _calculateABC,
    applyFilters,
    loadFromERP,
    exportToCSV,
    importFromCSV,
    saveReport,
    updateReport,
    listSavedReports,
    deleteReport,
    loadReportData,
    setLoading,
    setRawResults,
    setResults,
    setTotalProfit,
    setMonthCount,
    setAvgProfitPerItem,
    setAvgTurnoverPerItem,
    setAllProducts,
    setReportStartDate,
    setReportEndDate,
  };
};
