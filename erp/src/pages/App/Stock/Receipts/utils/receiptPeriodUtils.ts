import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { ReceiptPeriod } from '../types/receiptPeriodFilter.types';

/**
 * Informações estruturadas de uma data de recebimento para filtragem temporal eficiente.
 */
export interface ParsedDateInfo {
    readonly year: number;
    readonly month: number; // 0-indexed (0 = Jan, 11 = Dez)
    readonly day: number;
    readonly dateOnly: string; // YYYY-MM-DD
}

/**
 * Realiza o parsing seguro de uma string de data (ISO ou YYYY-MM-DD)
 * evitando problemas comuns de fuso horário ao priorizar regex de prefixo YYYY-MM-DD.
 * 
 * @param dateStr String de data a ser analisada
 * @returns Objeto com dados estruturados ou null se data inválida
 */
export const parseReceiptDate = (dateStr?: string | null): ParsedDateInfo | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;

    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);

        if (month < 0 || month > 11 || day < 1 || day > 31) {
            return null;
        }

        return {
            year,
            month,
            day,
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

/**
 * Avalia se um recebimento pertence ao período selecionado.
 */
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

/**
 * Filtra a lista de recebimentos com base no período e parâmetros customizados.
 */
export const filterReceiptsByPeriod = (
    receipts: readonly GoodsReceipt[],
    period: ReceiptPeriod,
    customStartDate?: string,
    customEndDate?: string,
    referenceDate: Date = new Date()
): GoodsReceipt[] => {
    return receipts.filter((receipt) =>
        isReceiptInPeriod(receipt, period, customStartDate, customEndDate, referenceDate)
    );
};
