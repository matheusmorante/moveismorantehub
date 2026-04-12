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
            // Se a data for válida, atualizamos o período do relatório (independente de estar excluído ou não)
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
            
            // SOMAR LUCRO TOTAL APENAS PARA ITENS NÃO EXCLUÍDOS
            if (!excludedItems.includes(item.product) && !excludedItems.includes(item.mappedName)) {
                currentTotalProfit += profit;
            }
        });

        // Calcular diferença em meses calendário (mínimo 1)
        const diffMonths = forceMonthCount || ((minDate && maxDate) ? 
            (((maxDate as Date).getFullYear() - (minDate as Date).getFullYear()) * 12) + ((maxDate as Date).getMonth() - (minDate as Date).getMonth()) + 1 
            : 1);
        
        setMonthCount(diffMonths);
        setTotalProfit(currentTotalProfit);
        setReportStartDate(minDate);
        setReportEndDate(maxDate);

        //statsArray contém APENAS os itens incluídos para o cálculo da curva ABC
        const statsArray = Object.values(productStats).filter(s => 
            !excludedItems.includes(s.product)
        );
        
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

        // Return all unique products for the exclusion modal list
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
            const sumP = filtered.reduce((acc, curr) => acc + (curr.monthlyProfit ?? (curr.totalProfit / (monthCount || 1))), 0);
            finalAvgP = sumP / filtered.length;
        }

        if (config?.turnoverThresholdMode === 'custom' && config.turnoverThreshold > 0) {
            finalAvgT = config.turnoverThreshold;
        } else if (filtered.length > 0) {
            const sumT = filtered.reduce((acc, curr) => acc + (curr.monthlyTurnover ?? (curr.totalQuantity / (monthCount || 1))), 0);
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
            const turnover = r.monthlyTurnover ?? (r.totalQuantity / (monthCount || 1));
            const profit = r.monthlyProfit ?? (r.totalProfit / (monthCount || 1));

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
                    report_data: manualData || { results: rawResults, allProducts, totalProfit, monthCount, avgProfitPerItem, avgTurnoverPerItem, reportStartDate, reportEndDate },
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
                    report_data: manualData || { results: rawResults, allProducts, totalProfit, monthCount, avgProfitPerItem, avgTurnoverPerItem, reportStartDate, reportEndDate },
                    config,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();
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
        allProducts,
        setAllProducts,
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
