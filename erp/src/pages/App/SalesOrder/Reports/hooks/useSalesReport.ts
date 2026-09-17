import { useState } from 'react';
import { ABCResult, calculateABC, applyFiltersCalculation, SaleItem } from '../utils/salesReportCalculations';
import { fetchFromERP, fetchSavedReports, insertReport, updateReportInDb, deleteReportFromDb } from '../services/salesReportApiService';
import { exportResultsToCSV, importResultsFromCSV } from '../utils/csvUtils';

export const useSalesReport = () => {
    const [loading, setLoading] = useState(false);
    const [rawResults, setRawResults] = useState<ABCResult[]>([]);
    const [results, setResults] = useState<ABCResult[]>([]);
    const [totalProfit, setTotalProfit] = useState(0);
    const [monthCount, setMonthCount] = useState(0);
    const [savedReports, setSavedReports] = useState<any[]>([]);
    
    const [avgProfitPerItem, setAvgProfitPerItem] = useState(0);
    const [avgTurnoverPerItem, setAvgTurnoverPerItem] = useState(0);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [reportStartDate, setReportStartDate] = useState<Date | null>(null);
    const [reportEndDate, setReportEndDate] = useState<Date | null>(null);

    const _calculateABC = (
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
        }
        setTotalProfit(out.totalProfit);
        setMonthCount(out.monthCount);
        setAvgProfitPerItem(out.avgProfitPerItem);
        setAvgTurnoverPerItem(out.avgTurnoverPerItem);
        setReportStartDate(out.reportStartDate);
        setReportEndDate(out.reportEndDate);
        
        return out;
    };

    const applyFilters = (filters: { suppliers: string[], minProfit?: number, maxProfit?: number, search: string }, config?: any) => {
        const out = applyFiltersCalculation(rawResults, filters, config, monthCount);
        setAvgProfitPerItem(out.finalAvgP);
        setAvgTurnoverPerItem(out.finalAvgT);
        setTotalProfit(out.newTotalProfit);
        setResults(out.updatedWithQuadrants);
    };

    const saveReport = async (name: string, source: 'erp' | 'csv', config: any, manualData?: any) => {
        setLoading(true);
        try {
            const dataToSave = manualData || { results: rawResults, allProducts, totalProfit, monthCount, avgProfitPerItem, avgTurnoverPerItem, reportStartDate, reportEndDate };
            const data = await insertReport(name, source, dataToSave, config);
            await listSavedReports();
            return data;
        } finally {
            setLoading(false);
        }
    };

    const updateReport = async (id: string, name: string, source: 'erp' | 'csv', config: any, manualData?: any) => {
        setLoading(true);
        try {
            const dataToSave = manualData || { results: rawResults, allProducts, totalProfit, monthCount, avgProfitPerItem, avgTurnoverPerItem, reportStartDate, reportEndDate };
            const data = await updateReportInDb(id, name, source, dataToSave, config);
            await listSavedReports();
            return data;
        } finally {
            setLoading(false);
        }
    };

    const listSavedReports = async () => {
        try {
            const data = await fetchSavedReports();
            setSavedReports(data);
        } catch (err) {
            console.error('Falha ao listar relatorios', err);
        }
    };

    const deleteReport = async (id: string) => {
        setLoading(true);
        try {
            await deleteReportFromDb(id);
            await listSavedReports();
        } finally {
            setLoading(false);
        }
    };

    const loadReportData = (report: any) => {
        if (!report.report_data) return;
        const d = report.report_data;
        setRawResults(d.results || []);
        setResults(d.results || []);
        setAllProducts(d.allProducts || []);
        setTotalProfit(d.totalProfit || 0);
        setMonthCount(d.monthCount || 0);
        setAvgProfitPerItem(d.avgProfitPerItem || 0);
        setAvgTurnoverPerItem(d.avgTurnoverPerItem || 0);
        setReportStartDate(d.reportStartDate ? new Date(d.reportStartDate) : null);
        setReportEndDate(d.reportEndDate ? new Date(d.reportEndDate) : null);
    };

    const exportToCSV = (dataToExport: ABCResult[]) => exportResultsToCSV(dataToExport);

    const importFromCSV = (
        file: File, 
        config: any, 
        productMappings: Record<string, string>, 
        forceMonthCount?: number
    ): Promise<void> => {
        return new Promise((resolve, reject) => {
            setLoading(true);
            importResultsFromCSV(file).then((items: any) => {
                _calculateABC(items, 'profit', false, config, productMappings, forceMonthCount);
                resolve();
            }).catch(reject).finally(() => setLoading(false));
        });
    };

    const loadFromERP = async (
        config: any, 
        productMappings: Record<string, string>
    ) => {
        setLoading(true);
        try {
            const items = await fetchFromERP();
            _calculateABC(items, 'profit', false, config, productMappings);
        } catch (error) {
            console.error('Failed to load ERP report', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
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
