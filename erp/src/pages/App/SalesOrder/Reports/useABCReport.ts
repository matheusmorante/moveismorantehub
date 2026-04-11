import { useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { parse, format } from 'date-fns';

export interface ABCResult {
    product: string;
    supplier: string;
    totalQuantity: number;
    totalRevenue: number;
    totalProfit: number;
    avgCost: number;
    accumulatedPercentage: number;
    classification: 'A' | 'B' | 'C';
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

export const useABCReport = () => {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ABCResult[]>([]);
    const [totalProfit, setTotalProfit] = useState(0);
    const [monthCount, setMonthCount] = useState(0);
    const [savedReports, setSavedReports] = useState<any[]>([]);

    const calculateABC = (items: SaleItem[], basis: 'revenue' | 'profit' = 'revenue') => {
        // Agrupar por produto
        const productStats: Record<string, { product: string, supplier: string, qty: number, rev: number, profit: number, totalCost: number }> = {};
        
        let minDate = items.length > 0 ? items[0].date : new Date();
        let maxDate = items.length > 0 ? items[0].date : new Date();
        let currentTotalProfit = 0;

        items.forEach(item => {
            if (item.date < minDate) minDate = item.date;
            if (item.date > maxDate) maxDate = item.date;

            const key = `${item.product}-${item.supplier}`;
            if (!productStats[key]) {
                productStats[key] = { product: item.product, supplier: item.supplier, qty: 0, rev: 0, profit: 0, totalCost: 0 };
            }
            
            const qty = isNaN(item.quantity) ? 0 : item.quantity;
            const rev = isNaN(item.salesValue) ? 0 : item.salesValue;
            const profit = isNaN(item.profit) ? 0 : item.profit;
            const cost = isNaN(item.cost) ? 0 : item.cost;

            productStats[key].qty += qty;
            productStats[key].rev += rev;
            productStats[key].profit += profit;
            productStats[key].totalCost += cost * qty;
            currentTotalProfit += profit;
        });

        // Calcular diferença em meses (mínimo 1)
        const diffMonths = Math.max(1, (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth()));
        setMonthCount(diffMonths);
        setTotalProfit(currentTotalProfit);

        const statsArray = Object.values(productStats);
        const totalBasis = statsArray.reduce((acc, curr) => acc + (basis === 'revenue' ? curr.rev : curr.profit), 0);

        if (totalBasis === 0) {
            setResults([]);
            return;
        }

        // Ordenar pela base escolhida (Receita ou Lucro)
        statsArray.sort((a, b) => (basis === 'revenue' ? b.rev - a.rev : b.profit - a.profit));

        let currentSum = 0;
        const finalResults: ABCResult[] = statsArray.map(stat => {
            const val = (basis === 'revenue' ? stat.rev : stat.profit);
            currentSum += val;
            const accumulatedPercentage = (currentSum / totalBasis) * 100;

            let classification: 'A' | 'B' | 'C' = 'C';
            if (accumulatedPercentage <= 70) classification = 'A';
            else if (accumulatedPercentage <= 90) classification = 'B';

            return {
                product: stat.product,
                supplier: stat.supplier,
                totalQuantity: stat.qty,
                totalRevenue: stat.rev,
                totalProfit: stat.profit,
                avgCost: stat.qty > 0 ? stat.totalCost / stat.qty : 0,
                accumulatedPercentage,
                classification
            };
        });

        setResults(finalResults);
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
            if (order.deleted || order.orderType === 'budget') return;

            const date = order.date ? (order.date.includes('/') ? parse(order.date.split(',')[0], 'dd/MM/yyyy', new Date()) : new Date(order.date)) : new Date();

            order.items?.forEach((item: any) => {
                const qty = item.quantity || 0;
                const salesVal = item.totalPrice || 0;
                const cost = item.unitCost || 0;
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

    const saveReport = async (name: string, source: 'erp' | 'csv', config: any) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('sales_order_reports')
                .insert([{
                    name,
                    type: 'abc_curve',
                    source,
                    report_data: { results, totalProfit, monthCount },
                    config,
                    created_at: new Date().toISOString()
                }]);
            if (error) throw error;
            await listSavedReports();
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
        totalProfit,
        monthCount,
        savedReports,
        calculateABC,
        fetchFromERP,
        saveReport,
        listSavedReports,
        deleteReport,
        setResults,
        setTotalProfit,
        setMonthCount
    };
};
