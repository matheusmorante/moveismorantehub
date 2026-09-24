import type { Invoice, InvoiceDateFilter } from '../../types/stock.types';

export const getInvoiceMonthBounds = (month: string) => {
    const [year, monthNumber] = month.split('-').map(Number);
    if (!year || monthNumber < 1 || monthNumber > 12) return null;
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const paddedMonth = String(monthNumber).padStart(2, '0');
    return {
        start: `${year}-${paddedMonth}-01T00:00:00.000Z`,
        end: `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`,
    };
};

export const getInvoiceYearBounds = (year: number) => ({
    start: `${year}-01-01T00:00:00.000Z`,
    end: `${year}-12-31T23:59:59.999Z`,
});

export const buildInboundInvoiceSearchFilter = (searchTerm: string): string | null => {
    const term = searchTerm.trim();
    if (!term) return null;

    const cleanNumber = term.replace(/\D/g, '');
    const safeTerm = term.replace(/[,%()]/g, ' ').trim().replace(/\\/g, '\\\\').replace(/\*/g, '');
    const filters = [`emitente_nome.ilike.*${safeTerm}*`];

    if (cleanNumber) {
        const numericPattern = `*${cleanNumber}*`;
        filters.push(`emitente_cnpj.ilike.${numericPattern}`, `chave_acesso.ilike.${numericPattern}`);
    }

    // numero_nfe is INTEGER in the database, so ilike on it makes the query fail.
    if (/^\d+$/.test(term)) filters.push(`numero_nfe.eq.${Number(term)}`);
    return filters.join(',');
};

export const getInvoiceDateBounds = (filter: InvoiceDateFilter, now = new Date()) => {
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
    const year = now.getFullYear();

    switch (filter.mode) {
        case 'current_month': return getInvoiceMonthBounds(month);
        case 'previous_month': return getInvoiceMonthBounds(previousMonth);
        case 'current_year': return getInvoiceYearBounds(year);
        case 'previous_year': return getInvoiceYearBounds(year - 1);
        case 'custom_month': return getInvoiceMonthBounds(filter.customMonth || month);
        case 'custom_range': {
            const start = getInvoiceMonthBounds(filter.startMonth || previousMonth);
            const end = getInvoiceMonthBounds(filter.endMonth || month);
            return start && end ? { start: start.start, end: end.end } : null;
        }
    }
};

export const getDefaultInvoiceDateFilter = (now = new Date()): InvoiceDateFilter => {
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
        mode: 'current_month',
        customMonth: currentMonth,
        startMonth: `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`,
        endMonth: currentMonth,
    };
};

export const normalizeInvoiceStatus = (status: unknown): Invoice['status'] => {
    if (status === 'received' || status === 'recebida') return 'received';
    if (status === 'manifested' || status === 'manifestada') return 'manifested';
    return 'pending';
};

export const hasUnlinkedInvoiceItems = (items: unknown): boolean => {
    if (!Array.isArray(items)) return true;
    return items.some((item) => {
        const row = item as Record<string, any>;
        return !(row.matchedProductId || row.matched_product_id || row.product_id || row.compositionLinks?.length);
    });
};
