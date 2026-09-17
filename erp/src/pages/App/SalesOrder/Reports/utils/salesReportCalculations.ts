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
    cost?: number;
    salesValue: number;
    profit?: number;
    variationId?: string;
}

export const calculateABC = (
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

        const key = `${item.variationId || item.mappedName}-${item.supplier}`;
        if (!productStats[key]) {
            productStats[key] = { product: item.mappedName, supplier: item.supplier, qty: 0, rev: 0, profit: 0, totalCost: 0 };
        }
        
        const qty = Number(item.quantity ?? 0);
        const rev = Number(item.salesValue ?? 0);
        const hasCost = typeof item.cost === 'number' && Number.isFinite(item.cost) && item.cost > 0;
        const profit = hasCost ? Number(item.profit) : 0;
        const cost = hasCost ? Number(item.cost) : 0;

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
    
    if (config?.profitThresholdMode === 'custom' && config.profitThreshold > 0) {
        avgP = config.profitThreshold;
    }
    
    if (config?.turnoverThresholdMode === 'custom' && config.turnoverThreshold > 0) {
        avgT = config.turnoverThreshold;
    }
    
    const safeAvgP = isNaN(avgP) ? 0 : avgP;
    const safeAvgT = isNaN(avgT) ? 0 : avgT;

    if (totalBasis === 0 || statsArray.length === 0) {
        return { 
            results: [], 
            rawResults: [],
            allProducts: [],
            totalProfit: currentTotalProfit, 
            monthCount: diffMonths, 
            avgProfitPerItem: safeAvgP, 
            avgTurnoverPerItem: safeAvgT,
            reportStartDate: minDate, 
            reportEndDate: maxDate
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

    return { 
        results: returnRaw ? [] : finalResults, 
        rawResults: finalResults,
        allProducts: returnRaw ? [] : allProductsList,
        totalProfit: currentTotalProfit, 
        monthCount: diffMonths, 
        avgProfitPerItem: safeAvgP, 
        avgTurnoverPerItem: safeAvgT,
        reportStartDate: minDate,
        reportEndDate: maxDate
    };
};

export const applyFiltersCalculation = (
    rawResults: ABCResult[],
    filters: { suppliers: string[], minProfit?: number, maxProfit?: number, search: string },
    config: any,
    monthCount: number
) => {
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

    const newTotalProfit = filtered.reduce((acc, curr) => acc + curr.totalProfit, 0);

    const updatedWithQuadrants = filtered.map(r => {
        let q: 1 | 2 | 3 | 4 = 4;
        const turnover = r.monthlyTurnover ?? (r.totalQuantity / (monthCount || 1));
        const profit = r.monthlyProfit ?? (r.totalProfit / (monthCount || 1));

        if (turnover >= finalAvgT && profit >= finalAvgP) q = 1;
        else if (turnover < finalAvgT && profit >= finalAvgP) q = 2;
        else if (turnover >= finalAvgT && profit < finalAvgP) q = 3;
        
        return { ...r, quadrant: q };
    });

    return { updatedWithQuadrants, finalAvgP, finalAvgT, newTotalProfit };
};
