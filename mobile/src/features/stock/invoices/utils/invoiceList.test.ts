import { describe, expect, it } from 'vitest';
import { buildInboundInvoiceSearchFilter, formatInvoiceDate, getDefaultInvoiceDateFilter, getInvoiceDateBounds, getInvoicePageRange, hasUnlinkedInvoiceItems, normalizeInvoiceStatus } from './invoiceList';

describe('invoice list helpers', () => {
    it('defaults to the ERP current month and previous-to-current range', () => {
        const filter = getDefaultInvoiceDateFilter(new Date(2026, 8, 23));

        expect(filter).toEqual({
            mode: 'current_month',
            customMonth: '2026-09',
            startMonth: '2026-08',
            endMonth: '2026-09',
        });
        expect(getInvoiceDateBounds(filter, new Date(2026, 8, 23))).toEqual({
            start: '2026-09-01T00:00:00.000Z',
            end: '2026-09-30T23:59:59.999Z',
        });
    });

    it('supports the ERP custom month and custom range filters', () => {
        expect(getInvoiceDateBounds({
            mode: 'custom_range', customMonth: '', startMonth: '2026-02', endMonth: '2026-03',
        })).toEqual({ start: '2026-02-01T00:00:00.000Z', end: '2026-03-31T23:59:59.999Z' });
    });

    it('uses the same 15-item page boundaries as the ERP with zero-based query pages', () => {
        expect(getInvoicePageRange(0, 15)).toEqual({ from: 0, to: 14 });
        expect(getInvoicePageRange(1, 15)).toEqual({ from: 15, to: 29 });
    });

    it('formats invoice dates from the ISO date portion like the ERP, without timezone shifts', () => {
        expect(formatInvoiceDate('2026-09-17T00:30:00+14:00')).toBe('17/09/2026');
        expect(formatInvoiceDate('2026-09-17')).toBe('17/09/2026');
        expect(formatInvoiceDate('17/09/2026')).toBe('17/09/2026');
    });

    it('builds a safe search filter without applying text operators to the integer invoice number', () => {
        expect(buildInboundInvoiceSearchFilter('133744')).toBe(
            'emitente_nome.ilike.*133744*,emitente_cnpj.ilike.*133744*,chave_acesso.ilike.*133744*,numero_nfe.eq.133744',
        );
        expect(buildInboundInvoiceSearchFilter('HORFRAN')).toBe('emitente_nome.ilike.*HORFRAN*');
        expect(buildInboundInvoiceSearchFilter('')).toBeNull();
    });

    it('maps receipt states and pending item links to the ERP labels', () => {
        expect(normalizeInvoiceStatus('recebida')).toBe('received');
        expect(normalizeInvoiceStatus('manifested')).toBe('manifested');
        expect(normalizeInvoiceStatus(null)).toBe('pending');
        expect(hasUnlinkedInvoiceItems([{ matchedProductId: 'product-1' }, { matched_product_id: 'p2' }])).toBe(false);
        expect(hasUnlinkedInvoiceItems([{ item_snapshot: { matchedProductId: 'product-1' } }])).toBe(false);
        expect(hasUnlinkedInvoiceItems([{ product_id: 'product-1' }])).toBe(true);
        expect(hasUnlinkedInvoiceItems([{ compositionLinks: [{ productId: 'p2' }] }])).toBe(false);
        expect(hasUnlinkedInvoiceItems([{ item_snapshot: { composition_links: [{ product_id: 'p2' }] } }])).toBe(false);
        expect(hasUnlinkedInvoiceItems([{ product_id: null }])).toBe(true);
    });
});
