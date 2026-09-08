import { describe, it, expect } from 'vitest';
import { isReceiptInPeriod, filterReceiptsByPeriod, parseReceiptDate } from './receiptPeriodUtils';
import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';

const createFakeReceipt = (id: string, receivedAt: string, supplierId?: string): GoodsReceipt => ({
    id,
    receivedAt,
    supplierId,
    supplierName: 'Fornecedor Teste',
    items: [],
    totalValue: 100,
    status: 'received',
    isDraft: false,
});

describe('receiptPeriodUtils', () => {
    const referenceDate = new Date(2026, 8, 7); // 07 de Setembro de 2026 (Mês 8 = Setembro)

    it('deve extrair data com segurança', () => {
        const parsed = parseReceiptDate('2026-09-07T12:00:00');
        expect(parsed?.year).toBe(2026);
        expect(parsed?.month).toBe(8);
        expect(parsed?.day).toBe(7);
        expect(parsed?.dateOnly).toBe('2026-09-07');
    });

    it('deve filtrar corretamente por este mês', () => {
        const rCurrentMonth = createFakeReceipt('1', '2026-09-02T10:00:00');
        const rLastMonth = createFakeReceipt('2', '2026-08-25T10:00:00');
        const rNextMonth = createFakeReceipt('3', '2026-10-01T10:00:00');

        expect(isReceiptInPeriod(rCurrentMonth, 'this_month', undefined, undefined, referenceDate)).toBe(true);
        expect(isReceiptInPeriod(rLastMonth, 'this_month', undefined, undefined, referenceDate)).toBe(false);
        expect(isReceiptInPeriod(rNextMonth, 'this_month', undefined, undefined, referenceDate)).toBe(false);
    });

    it('deve filtrar corretamente pelo mês passado', () => {
        const rCurrentMonth = createFakeReceipt('1', '2026-09-02T10:00:00');
        const rLastMonth = createFakeReceipt('2', '2026-08-25T10:00:00');

        expect(isReceiptInPeriod(rCurrentMonth, 'last_month', undefined, undefined, referenceDate)).toBe(false);
        expect(isReceiptInPeriod(rLastMonth, 'last_month', undefined, undefined, referenceDate)).toBe(true);
    });

    it('deve filtrar corretamente pelo ano atual', () => {
        const rSameYear = createFakeReceipt('1', '2026-01-15T10:00:00');
        const rPastYear = createFakeReceipt('2', '2025-12-31T10:00:00');

        expect(isReceiptInPeriod(rSameYear, 'this_year', undefined, undefined, referenceDate)).toBe(true);
        expect(isReceiptInPeriod(rPastYear, 'this_year', undefined, undefined, referenceDate)).toBe(false);
    });

    it('deve filtrar corretamente por período personalizado', () => {
        const r1 = createFakeReceipt('1', '2026-09-05T10:00:00');
        const r2 = createFakeReceipt('2', '2026-09-12T10:00:00');
        const r3 = createFakeReceipt('3', '2026-09-20T10:00:00');

        const filtered = filterReceiptsByPeriod([r1, r2, r3], 'custom', '2026-09-05', '2026-09-15', referenceDate);
        expect(filtered.map((r) => r.id)).toEqual(['1', '2']);
    });

    it('deve retornar todos quando período for all', () => {
        const r1 = createFakeReceipt('1', '2025-01-01');
        const r2 = createFakeReceipt('2', '2026-09-01');

        const filtered = filterReceiptsByPeriod([r1, r2], 'all', undefined, undefined, referenceDate);
        expect(filtered.length).toBe(2);
    });
});
