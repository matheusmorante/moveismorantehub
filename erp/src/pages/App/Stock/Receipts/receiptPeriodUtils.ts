import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { ReceiptPeriod } from './receiptPeriodFilter.types';

export interface ParsedDateInfo {
    year: number;
    month: number; // 0-indexed (0 = Jan, 11 = Dez)
    day: number;
    dateOnly: string; // YYYY-MM-DD
}

export const parseReceiptDate = (dateStr?: string): ParsedDateInfo | null => {
    if (!dateStr) return null;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return {
            year: parseInt(match[1], 10),
            month: parseInt(match[2], 10) - 1,
            day: parseInt(match[3], 10),
            dateOnly: `${match[1]}-${match[2]}-${match[3]}`
        };
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();
    const dateOnly = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, day, dateOnly };
};

export const isReceiptInPeriod = (
    receipt: GoodsReceipt,
    period: ReceiptPeriod,
    customStartDate?: string,
    customEndDate?: string,
    referenceDate: Date = new Date()
): boolean => {
    if (period === 'all') return true;

    const rawDate = receipt.receivedAt || receipt.createdAt;
    const parsed = parseReceiptDate(rawDate);
    if (!parsed) return false;

    if (period === 'this_month') {
        return parsed.year === referenceDate.getFullYear() && parsed.month === referenceDate.getMonth();
    }

    if (period === 'last_month') {
        const expectedMonth = referenceDate.getMonth() === 0 ? 11 : referenceDate.getMonth() - 1;
        const expectedYear = referenceDate.getMonth() === 0 ? referenceDate.getFullYear() - 1 : referenceDate.getFullYear();
        return parsed.year === expectedYear && parsed.month === expectedMonth;
    }

    if (period === 'this_year') {
        return parsed.year === referenceDate.getFullYear();
    }

    if (period === 'custom') {
        if (customStartDate && parsed.dateOnly < customStartDate) return false;
        if (customEndDate && parsed.dateOnly > customEndDate) return false;
        return true;
    }

    return true;
};

export const filterReceiptsByPeriod = (
    receipts: GoodsReceipt[],
    period: ReceiptPeriod,
    customStartDate?: string,
    customEndDate?: string,
    referenceDate: Date = new Date()
): GoodsReceipt[] => {
    return receipts.filter((receipt) =>
        isReceiptInPeriod(receipt, period, customStartDate, customEndDate, referenceDate)
    );
};
