import { useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { format, parse, differenceInMonths, differenceInCalendarMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    const [reportStartDate, setReportStartDate] = useState<Date | null>(null);
    const [reportEndDate, setReportEndDate] = useState<Date | null>(null);

    const calculateABC = (
        items: SaleItem[], 
        basis: 'revenue' | 'profit' = 'revenue', 
        returnRaw: boolean = false,
        config?: any,
        productMappings: Record<string, string> = {}
    ) => {
        const productStats: Record<string, { product: string, supplier: string, qty: number, rev: number, profit: number, totalCost: number }> = {};
        const excludedItems = config?.excludedItems || [];
        
        // Inicializar com a primeira data válida ou data atual
        const validItems = items.filter(i => i.date && !isNaN(i.date.getTime()));
        const firstValidDate = validItems.length > 0 ? validItems[0].date : new Date();
        let minDate = firstValidDate;
        let maxDate = firstValidDate;
        let currentTotalProfit = 0;

        items.forEach(item => {
            const mappedName = productMappings[item.product] || item.product;
            
            if (excludedItems.includes(item.product) || excludedItems.includes(mappedName)) return; 
            
            // Se a data for válida, atualizamos o período do relatório
            if (item.date && !isNaN(item.date.getTime())) {
                if (item.date.getTime() < minDate.getTime()) minDate = item.date;
                if (item.date.getTime() > maxDate.getTime()) maxDate = item.date;
            }

            const key = `${mappedName}-${item.supplier}`;
            if (!productStats[key]) {
                productStats[key] = { product: mappedName, supplier: item.supplier, qty: 0, rev: 0, profit: 0, totalCost: 0 };
            }
            
            const qty = Number(item.quantity) || 0;
            const rev = Number(item.salesValue) || 0;
            const profit = Number(item.profit) || 0;
            const cost = Number(item.cost) || 0;

            productStats[key].qty += qty;
            productStats[key].rev += rev;
            productStats[key].profit += profit;
            productStats[key].totalCost += cost * qty;
            currentTotalProfit += profit;
        });

        // Calcular diferença em meses calendário (mínimo 1)
        // Usamos fórmula manual para garantir precisão absoluta:
        const diffMonths = (minDate && maxDate) ? 
            ((maxDate.getFullYear() - minDate.getFullYear()) * 12) + (maxDate.getMonth() - minDate.getMonth()) + 1 
            : 1;
        
        setMonthCount(diffMonths);
        setTotalProfit(currentTotalProfit);
        setReportStartDate(minDate);
        setReportEndDate(maxDate);

        const statsArray = Object.values(productStats);
        const totalBasis = statsArray.reduce((acc, curr) => acc + (basis === 'revenue' ? curr.rev : curr.profit), 0);
        
        // Médias para Matriz baseadas em valores MENSAIS para comparação justa
        const statsWithMonthly = statsArray.map(s => ({
            ...s,
            monthlyProfit: s.profit / (diffMonths || 1),
            monthlyTurnover: s.qty / (diffMonths || 1)
        }));

        const totalMonthlyProfitVal = statsWithMonthly.reduce((acc, curr) => acc + curr.monthlyProfit, 0);
        const totalMonthlyTurnoverVal = statsWithMonthly.reduce((acc, curr) => acc + curr.monthlyTurnover, 0);
        
        // Determinar as médias reais (thresholds)
        let avgP = statsArray.length > 0 ? totalMonthlyProfitVal / statsArray.length : 0;
        let avgT = statsArray.length > 0 ? totalMonthlyTurnoverVal / statsArray.length : 0;
        
        // Se houver configuração personalizada INDIVIDUAL, sobrepõe a média automática
        if (config?.profitThresholdMode === 'custom' && config.profitThreshold > 0) {
            avgP = config.profitThreshold;
        }
        
        if (config?.turnoverThresholdMode === 'custom' && config.turnoverThreshold > 0) {
            avgT = config.turnoverThreshold;
        }
        
        // Validar NaNs para evitar tela branca
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

            // Determinar Quadrante (1: +,+ | 2: +qty, -profit | 3: -qty, +profit | 4: -,-)
            // Agora usando lucro MENSAL e giro MENSAL como base para a matriz
            let quadrant: 1 | 2 | 3 | 4 = 4;
            if (monthlyTurnover >= safeAvgT && monthlyProfit >= safeAvgP) quadrant = 1;
            else if (monthlyTurnover < safeAvgT && monthlyProfit >= safeAvgP) quadrant = 2; // Nicho (Alto lucro mensal, baixo giro mensal)
            else if (monthlyTurnover >= safeAvgT && monthlyProfit < safeAvgP) quadrant = 3; // Volume (Baixo lucro mensal, alto giro mensal)

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

        if (!returnRaw) {
            setResults(finalResults);
            setRawResults(finalResults);
        }
        
        return { 
            results: finalResults, 
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

        if (filters.suppliers.length > 0) {
            filtered = filtered.filter(r => filters.suppliers.includes(r.supplier));
        }

        if (filters.minProfit && filters.minProfit > 0) {
            filtered = filtered.filter(r => r.totalProfit >= (filters.minProfit || 0));
        }

        if (filters.maxProfit && filters.maxProfit > 0) {
            filtered = filtered.filter(r => r.totalProfit <= (filters.maxProfit || 0));
        }

        if (filters.search) {
            const lowSearch = filters.search.toLowerCase();
            filtered = filtered.filter(r => r.product.toLowerCase().includes(lowSearch));
        }

        // 1. Determinar as médias que serão usadas para os quadrantes (respeitando modo custom)
        let finalAvgP = 0;
        let finalAvgT = 0;

        if (config?.profitThresholdMode === 'custom' && config.profitThreshold > 0) {
            finalAvgP = config.profitThreshold;
        } else if (filtered.length > 0) {
            const sumP = filtered.reduce((acc, curr) => acc + curr.monthlyProfit, 0);
            finalAvgP = sumP / filtered.length;
        }

        if (config?.turnoverThresholdMode === 'custom' && config.turnoverThreshold > 0) {
            finalAvgT = config.turnoverThreshold;
        } else if (filtered.length > 0) {
            const sumT = filtered.reduce((acc, curr) => acc + (curr.monthlyTurnover || (curr.totalQuantity / (monthCount || 1))), 0);
            finalAvgT = sumT / filtered.length;
        }

        // 2. Atualizar estados de média para que os ReferenceLines do gráfico reflitam o valor usado
        setAvgProfitPerItem(finalAvgP);
        setAvgTurnoverPerItem(finalAvgT);

        // 3. Recalcular Lucro Total acumulado do filtro
        const newTotalProfit = filtered.reduce((acc, curr) => acc + curr.totalProfit, 0);
        setTotalProfit(newTotalProfit);

        // 4. RE-CALCULAR QUADRANTES: Crucial para que as cores das bolinhas mudem ao alterar filtros/thresholds
        const updatedWithQuadrants = filtered.map(r => {
            let q: 1 | 2 | 3 | 4 = 4;
            const turnover = r.monthlyTurnover || (r.totalQuantity / (monthCount || 1));
            const profit = r.monthlyProfit;

            if (turnover >= finalAvgT && profit >= finalAvgP) q = 1;
            else if (turnover < finalAvgT && profit >= finalAvgP) q = 2; // Nicho (Alto lucro mensal, baixo giro mensal)
            else if (turnover >= finalAvgT && profit < finalAvgP) q = 3; // Volume (Baixo lucro mensal, alto giro mensal)
            
            return { ...r, quadrant: q };
        });

        setResults(updatedWithQuadrants);
    };

    const fetchFromERP = async (): Promise<SaleItem[]> => {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .is('order_data->deleted', null);

        if (error) throw error;

        const items: SaleItem[] = [];
        data.forEach((row: any) => {
            const order = row.order_data;
            
            // FILTRO CRÍTICO: Ignorar deletados, orçamentos, rascunhos e cancelados
            // Rascunhos costumam ser duplicados devido ao auto-save e não devem compor relatórios de performance real
            if (
                order.deleted || 
                order.orderType === 'budget' || 
                order.status === 'draft' || 
                order.status === 'cancelled'
            ) return;

            const date = order.date ? (order.date.includes('/') ? parse(order.date.split(',')[0], 'dd/MM/yyyy', new Date()) : new Date(order.date)) : new Date();

            order.items?.forEach((item: any) => {
                const qty = Number(item.quantity) || 0;
                const salesVal = Number(item.totalPrice) || 0;
                const cost = Number(item.unitCost) || 0;
                const profit = salesVal - (cost * qty);

                items.push({
                    date,
                    product: item.description || 'Sem Descrição',
                    supplier: item.mainSupplierName || 'Sem Fornecedor',
                    quantity: qty,
                    cost: cost,
                    salesValue: salesVal,
                    profit: profit
                });
            });
        });

        return items;
    };

    const saveReport = async (name: string, source: 'erp' | 'csv', config: any, manualData?: any) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sales_order_reports')
                .insert([{
                    name,
                    type: 'abc_curve',
                    source,
                    report_data: manualData || { results, totalProfit, monthCount, avgProfitPerItem, avgTurnoverPerItem, reportStartDate, reportEndDate },
                    config,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            if (error) throw error;
            await listSavedReports();
            return data;
        } finally {
            setLoading(false);
        }
    };

    const updateReport = async (id: string, name: string, source: 'erp' | 'csv', config: any, manualData?: any) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sales_order_reports')
                .update({
                    name,
                    source,
                    report_data: manualData || { results, totalProfit, monthCount, avgProfitPerItem, avgTurnoverPerItem, reportStartDate, reportEndDate },
                    config,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            await listSavedReports();
            return data;
        } finally {
            setLoading(false);
        }
    };

    const listSavedReports = async () => {
        try {
            const { data, error } = await supabase
                .from('sales_order_reports')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setSavedReports(data || []);
        } catch (e) {
            console.error("Erro ao listar relatórios", e);
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
        loading,
        setLoading,
        results,
        rawResults,
        totalProfit,
        monthCount,
        savedReports,
        avgProfitPerItem,
        avgTurnoverPerItem,
        calculateABC,
        applyFilters,
        fetchFromERP,
        saveReport,
        listSavedReports,
        deleteReport,
        setResults,
        setRawResults,
        setTotalProfit,
        setMonthCount,
        setAvgProfitPerItem,
        setAvgTurnoverPerItem,
        updateReport,
        reportStartDate,
        reportEndDate,
        setReportStartDate,
        setReportEndDate
    };
};
