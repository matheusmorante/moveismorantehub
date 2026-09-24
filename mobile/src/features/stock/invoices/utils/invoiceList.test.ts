import { describe, expect, it } from 'vitest';
import { buildInboundInvoiceSearchFilter, getDefaultInvoiceDateFilter, getInvoiceDateBounds, hasUnlinkedInvoiceItems, normalizeInvoiceStatus } from './invoiceList';

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
        expect(hasUnlinkedInvoiceItems([{ product_id: 'product-1' }, { compositionLinks: [{ productId: 'p2' }] }])).toBe(false);
        expect(hasUnlinkedInvoiceItems([{ product_id: null }])).toBe(true);
    });
});
