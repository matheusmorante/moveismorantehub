import { useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { format, parse } from 'date-fns';

export interface ABCResult {
    product: string;
    supplier: string;
    totalQuantity: number;
    totalRevenue: number;
    totalProfit: number;
    avgCost: number;
    accumulatedPercentage: number;
    classification: 'A' | 'B' | 'C';
    monthlyProfit: number;
    monthlyTurnover: number;
    quadrant?: 1 | 2 | 3 | 4;
}

export interface SaleItem {
    date: Date;
    product: string;
    supplier: string;
    quantity: number;
    cost: number;
    salesValue: number;
    profit: number;
}

export const useSalesReport = () => {
    const [loading, setLoading] = useState(false);
    const [rawResults, setRawResults] = useState<ABCResult[]>([]);
    const [results, setResults] = useState<ABCResult[]>([]);
    const [totalProfit, setTotalProfit] = useState(0);
    const [monthCount, setMonthCount] = useState(0);
    const [savedReports, setSavedReports] = useState<any[]>([]);
    
    // Matriz de Giro e Lucro
    const [avgProfitPerItem, setAvgProfitPerItem] = useState(0);
    const [avgTurnoverPerItem, setAvgTurnoverPerItem] = useState(0);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [reportStartDate, setReportStartDate] = useState<Date | null>(null);
    const [reportEndDate, setReportEndDate] = useState<Date | null>(null);

    const calculateABC = (
        items: SaleItem[], 
        basis: 'revenue' | 'profit' = 'revenue', 
        returnRaw: boolean = false,
        config?: any,
        productMappings: Record<string, string> = {},
        forceMonthCount?: number
    ) => {
        const productStats: Record<string, { product: string, supplier: string, qty: number, rev: number, profit: number, totalCost: number }> = {};
        const excludedItems = config?.excludedItems || [];
        
        let minDate: Date | null = null;
        let maxDate: Date | null = null;
        let currentTotalProfit = 0;
        
        const allItemsRaw = items.map(item => ({
            ...item,
            mappedName: productMappings[item.product] || item.product
        }));

        allItemsRaw.forEach(item => {
            if (item.date && !isNaN(item.date.getTime())) {
                if (!minDate || item.date.getTime() < minDate.getTime()) minDate = item.date;
                if (!maxDate || item.date.getTime() > maxDate.getTime()) maxDate = item.date;
            }

            const key = `${item.mappedName}-${item.supplier}`;
            if (!productStats[key]) {
                productStats[key] = { product: item.mappedName, supplier: item.supplier, qty: 0, rev: 0, profit: 0, totalCost: 0 };
            }
            
            const qty = Number(item.quantity ?? 0);
            const rev = Number(item.salesValue ?? 0);
            const profit = Number(item.profit ?? 0);
            const cost = Number(item.cost ?? 0);

            productStats[key].qty += qty;
            productStats[key].rev += rev;
            productStats[key].profit += profit;
            productStats[key].totalCost += cost * qty;
            
            if (!excludedItems.includes(item.product) && !excludedItems.includes(item.mappedName)) {
                currentTotalProfit += profit;
            }
        });

        const diffMonths = forceMonthCount || ((minDate && maxDate) ? 
            (((maxDate as Date).getFullYear() - (minDate as Date).getFullYear()) * 12) + ((maxDate as Date).getMonth() - (minDate as Date).getMonth()) + 1 
            : 1);
        
        setMonthCount(diffMonths);
        setTotalProfit(currentTotalProfit);
        setReportStartDate(minDate);
        setReportEndDate(maxDate);

        const statsArray = Object.values(productStats).filter(s => !excludedItems.includes(s.product));
        const totalBasis = statsArray.reduce((acc, curr) => acc + (basis === 'revenue' ? curr.rev : curr.profit), 0);
        
        const statsWithMonthly = statsArray.map(s => ({
            ...s,
            monthlyProfit: s.profit / (diffMonths || 1),
            monthlyTurnover: s.qty / (diffMonths || 1)
        }));

        const totalMonthlyProfitVal = statsWithMonthly.reduce((acc, curr) => acc + curr.monthlyProfit, 0);
        const totalMonthlyTurnoverVal = statsWithMonthly.reduce((acc, curr) => acc + curr.monthlyTurnover, 0);
        
        let avgP = statsArray.length > 0 ? totalMonthlyProfitVal / statsArray.length : 0;
        let avgT = statsArray.length > 0 ? totalMonthlyTurnoverVal / statsArray.length : 0;
        
        if (config?.profitThresholdMode === 'custom' && config.profitThreshold > 0) avgP = config.profitThreshold;
        if (config?.turnoverThresholdMode === 'custom' && config.turnoverThreshold > 0) avgT = config.turnoverThreshold;
        
        const safeAvgP = isNaN(avgP) ? 0 : avgP;
        const safeAvgT = isNaN(avgT) ? 0 : avgT;

        setAvgProfitPerItem(safeAvgP);
        setAvgTurnoverPerItem(safeAvgT);

        if (totalBasis === 0 || statsArray.length === 0) {
            setResults([]);
            setRawResults([]);
            return { 
                results: [], totalProfit: currentTotalProfit, monthCount: diffMonths, 
                avgProfitPerItem: safeAvgP, avgTurnoverPerItem: safeAvgT,
                reportStartDate: minDate, reportEndDate: maxDate
            };
        }

        statsArray.sort((a, b) => (basis === 'revenue' ? b.rev - a.rev : b.profit - a.profit));

        let currentSum = 0;
        const finalResults: ABCResult[] = statsArray.map(stat => {
            const val = (basis === 'revenue' ? stat.rev : stat.profit);
            currentSum += val;
            const accumulatedPercentage = (currentSum / totalBasis) * 100;

            let classification: 'A' | 'B' | 'C' = 'C';
            if (accumulatedPercentage <= 70) classification = 'A';
            else if (accumulatedPercentage <= 90) classification = 'B';

            const monthlyProfit = stat.profit / (diffMonths || 1);
            const monthlyTurnover = stat.qty / (diffMonths || 1);

            let quadrant: 1 | 2 | 3 | 4 = 4;
            if (monthlyTurnover >= safeAvgT && monthlyProfit >= safeAvgP) quadrant = 1;
            else if (monthlyTurnover < safeAvgT && monthlyProfit >= safeAvgP) quadrant = 2;
            else if (monthlyTurnover >= safeAvgT && monthlyProfit < safeAvgP) quadrant = 3;

            return {
                product: stat.product,
                supplier: stat.supplier,
                totalQuantity: stat.qty,
                totalRevenue: stat.rev,
                totalProfit: stat.profit,
                monthlyProfit,
                monthlyTurnover,
                avgCost: stat.qty > 0 ? stat.totalCost / stat.qty : 0,
                accumulatedPercentage,
                classification,
                quadrant
            };
        });

        const allProductsList = Object.values(productStats).map(s => {
            const mProfit = s.profit / (diffMonths || 1);
            const mTurnover = s.qty / (diffMonths || 1);
            let q: 1 | 2 | 3 | 4 = 4;
            if (mTurnover >= safeAvgT && mProfit >= safeAvgP) q = 1;
            else if (mTurnover < safeAvgT && mProfit >= safeAvgP) q = 2;
            else if (mTurnover >= safeAvgT && mProfit < safeAvgP) q = 3;
            
            return {
                product: s.product,
                supplier: s.supplier,
                qty: s.qty,
                rev: s.rev,
                profit: s.profit,
                cost: s.qty > 0 ? s.totalCost / s.qty : 0,
                quadrant: q
            };
        });

        if (!returnRaw) {
            setResults(finalResults);
            setRawResults(finalResults);
            setAllProducts(allProductsList);
        }
        
        return { 
            results: finalResults, 
            allProducts: allProductsList,
            totalProfit: currentTotalProfit, 
            monthCount: diffMonths, 
            avgProfitPerItem: avgP, 
            avgTurnoverPerItem: avgT,
            reportStartDate: minDate,
            reportEndDate: maxDate
        };
    };

    const applyFilters = (filters: { 
        suppliers: string[], 
        minProfit?: number, 
        maxProfit?: number, 
        search: string 
    }, config?: any) => {
        let filtered = [...rawResults];
        if (filters.suppliers.length > 0) filtered = filtered.filter(r => filters.suppliers.includes(r.supplier));
        if (filters.minProfit) filtered = filtered.filter(r => r.totalProfit >= filters.minProfit!);
        if (filters.maxProfit) filtered = filtered.filter(r => r.totalProfit <= filters.maxProfit!);
        if (filters.search) {
            const lowSearch = filters.search.toLowerCase();
            filtered = filtered.filter(r => r.product.toLowerCase().includes(lowSearch));
        }

        let finalAvgP = 0, finalAvgT = 0;
        if (config?.profitThresholdMode === 'custom' && config.profitThreshold > 0) finalAvgP = config.profitThreshold;
        else if (filtered.length > 0) finalAvgP = filtered.reduce((acc, curr) => acc + curr.monthlyProfit, 0) / filtered.length;

        if (config?.turnoverThresholdMode === 'custom' && config.turnoverThreshold > 0) finalAvgT = config.turnoverThreshold;
        else if (filtered.length > 0) finalAvgT = filtered.reduce((acc, curr) => acc + curr.monthlyTurnover, 0) / filtered.length;

        setAvgProfitPerItem(finalAvgP);
        setAvgTurnoverPerItem(finalAvgT);
        setTotalProfit(filtered.reduce((acc, curr) => acc + curr.totalProfit, 0));

        const updatedWithQuadrants = filtered.map(r => {
            let q: 1 | 2 | 3 | 4 = 4;
            const turnover = r.monthlyTurnover;
            const profit = r.monthlyProfit;
            if (turnover >= finalAvgT && profit >= finalAvgP) q = 1;
            else if (turnover < finalAvgT && profit >= finalAvgP) q = 2;
            else if (turnover >= finalAvgT && profit < finalAvgP) q = 3;
            return { ...r, quadrant: q };
        });

        setResults(updatedWithQuadrants);
    };

    const fetchFromBling = async (startDate?: string, endDate?: string): Promise<SaleItem[]> => {
        setLoading(true);
        try {
            const items: SaleItem[] = [];
            let page = 1;
            let hasMore = true;

            // Busca os produtos primeiro para pegar o custo (Bling v3 não retorna custo no pedido de venda por padrão com facilidade)
            // Na verdade, no v3 /pedidos/vendas o item vem com valor e custo se disponível.
            
            while (hasMore) {
                const params: any = { 
                    pagina: page, 
                    limite: 100,
                    dataInicial: startDate, 
                    dataFinal: endDate
                };
                
                console.log(`Buscando todos os pedidos (Sem filtro de situação) Pág ${page}:`, params);

                const response = await fetch('/api/bling-proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        endpoint: '/pedidos/vendas',
                        params 
                    })
                });

                const data = await response.json();
                
                if (!response.ok) {
                    alert(`Erro na API do Bling: ${data.error || response.statusText}`);
                    hasMore = false;
                    break;
                }

                if (!data.data || data.data.length === 0) {
                    if (page === 1) alert(`Bling não retornou NENHUM pedido entre ${startDate} e ${endDate}. Verifique se as datas de venda no Bling estão dentro deste intervalo.`);
                    hasMore = false;
                    break;
                }

                // Filtrar apenas pedidos atendidos (6) ou enviados (9) localmente
                const atendidos = data.data.filter((o: any) => o.situacao?.id === 6 || o.situacao?.id === 9);
                
                atendidos.forEach((order: any) => {
                    const orderDate = order.data ? new Date(order.data) : new Date();
                    order.itens?.forEach((item: any) => {
                        const qty = Number(item.quantidade) || 0;
                        const salesVal = (Number(item.valor) || 0) * qty;
                        const cost = Number(item.custo) || 0;
                        const profit = salesVal - (cost * qty);

                        items.push({
                            date: orderDate,
                            product: item.descricao || 'Sem Descrição',
                            supplier: 'Bling API',
                            quantity: qty,
                            cost: cost,
                            salesValue: salesVal,
                            profit: profit
                        });
                    });
                });

                if (data.data.length < 100) hasMore = false;
                else page++;
                
                if (page > 50) hasMore = false;
            }

            console.log(`Total de itens processados: ${items.length}`);

            return items;
        } catch (e) {
            console.error("Erro ao buscar do Bling:", e);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const saveReport = async (name: string, source: 'erp' | 'csv' | 'bling', config: any, manualData?: any) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sales_order_reports')
                .insert([{
                    name,
                    type: 'abc_curve_bling',
                    source,
                    report_data: manualData || { results: rawResults, allProducts, totalProfit, monthCount, avgProfitPerItem, avgTurnoverPerItem, reportStartDate, reportEndDate },
                    config,
                    created_at: new Date().toISOString()
                }])
                .select().single();
            if (error) throw error;
            await listSavedReports();
            return data;
        } finally {
            setLoading(false);
        }
    };

    const updateReport = async (id: string, name: string, source: 'erp' | 'csv' | 'bling', config: any, manualData?: any) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sales_order_reports')
                .update({
                    name,
                    source,
                    report_data: manualData || { results: rawResults, allProducts, totalProfit, monthCount, avgProfitPerItem, avgTurnoverPerItem, reportStartDate, reportEndDate },
                    config,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id).select();
            if (error) throw error;
            await listSavedReports();
            return data?.[0];
        } finally {
            setLoading(false);
        }
    };

    const listSavedReports = async () => {
        try {
            const { data, error } = await supabase
                .from('sales_order_reports')
                .select('*')
                .eq('type', 'abc_curve_bling')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setSavedReports(data || []);
        } catch (e) {
            console.error("Erro ao listar relatórios Bling", e);
        }
    };

    const deleteReport = async (id: string) => {
        try {
            const { error } = await supabase.from('sales_order_reports').delete().eq('id', id);
            if (error) throw error;
            await listSavedReports();
        } catch (e) {
            console.error(e);
        }
    };

    return {
        loading, setLoading, results, rawResults, allProducts, setAllProducts,
        totalProfit, monthCount, savedReports, avgProfitPerItem, avgTurnoverPerItem,
        calculateABC, applyFilters, fetchFromBling, saveReport, listSavedReports, deleteReport,
        setResults, setRawResults, setTotalProfit, setMonthCount, setAvgProfitPerItem, setAvgTurnoverPerItem,
        updateReport, reportStartDate, reportEndDate, setReportStartDate, setReportEndDate
    };
};
