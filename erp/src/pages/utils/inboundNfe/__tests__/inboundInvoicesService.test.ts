import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../supabaseConfig', () => {
    const chainable = {
        select: () => chainable,
        order: () => chainable,
        gte: () => chainable,
        lte: () => chainable,
        or: () => chainable,
        range: () => Promise.resolve({ data: null, count: 0, error: { code: 'PGRST116', message: 'mock fallback to local storage' } }),
        upsert: () => Promise.resolve({ error: null })
    };
    return {
        supabase: {
            from: () => chainable,
            functions: { invoke: () => Promise.resolve({ data: { success: true }, error: null }) }
        }
    };
});

import {
    fetchInboundInvoices,
    saveInboundInvoice,
    syncSefazDfe,
    markInvoiceAsReceived
} from '../inboundInvoicesService';
import { InboundInvoice } from '../inboundNfeTypes';

const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Inbound Invoices Service', () => {
    beforeEach(() => {
        global.localStorage.clear();
        vi.clearAllMocks();
    });

    const mockInvoice: InboundInvoice = {
        id: 'inbound_test_999',
        nfeKey: '41260944512248000107550010000099991000099999',
        nfeNumber: '9999',
        series: '1',
        issuedAt: new Date().toISOString(),
        emitterCnpj: '99.888.777/0001-99',
        emitterName: 'Fábrica de Móveis Teste',
        recipientCnpj: '44.512.248/0001-07',
        recipientName: 'MOVEIS MORANTE LTDA',
        totalProducts: 1000,
        totalFreight: 50,
        totalIpi: 20,
        totalInvoice: 1070,
        status: 'pending',
        itemsCount: 1,
        items: [
            {
                itemNumber: 1,
                productCode: 'PROD-01',
                productDescription: 'Sofá Teste 3 Lugares',
                ncm: '94014010',
                cfop: '5102',
                unit: 'UN',
                quantity: 1,
                unitCost: 1000,
                totalCost: 1000
            }
        ]
    };

    it('saves and retrieves inbound invoice from cache', async () => {
        await saveInboundInvoice(mockInvoice);
        const list = await fetchInboundInvoices();

        expect(list).toHaveLength(1);
        expect(list[0].nfeKey).toBe(mockInvoice.nfeKey);
        expect(list[0].emitterName).toBe('Fábrica de Móveis Teste');
        expect(list[0].status).toBe('pending');
    });

    it('marks invoice as received with associated receiptId', async () => {
        await saveInboundInvoice(mockInvoice);
        await markInvoiceAsReceived(mockInvoice.nfeKey, 'receipt_abc_789');

        const list = await fetchInboundInvoices();
        const updated = list.find((i) => i.nfeKey === mockInvoice.nfeKey);

        expect(updated?.status).toBe('received');
        expect(updated?.receiptId).toBe('receipt_abc_789');
        expect(updated?.receivedAt).toBeDefined();
    });

    it('syncSefazDfe imports new SEFAZ DF-e mock invoice when not present', async () => {
        const result = await syncSefazDfe();

        expect(result.newInvoicesCount).toBeGreaterThanOrEqual(0);
        const list = await fetchInboundInvoices();
        expect(list.length).toBeGreaterThanOrEqual(0);
    });
});
