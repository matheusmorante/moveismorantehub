import { beforeEach, expect, it, vi } from 'vitest';
import type { InboundInvoice } from '../types/inboundNfeTypes';
import { saveInboundInvoice } from '../services/inboundInvoicesMutationService';
const mocks = vi.hoisted(() => ({ from: vi.fn(), local: [] as InboundInvoice[], cache: vi.fn(), header: vi.fn(), items: vi.fn() }));
vi.mock('../../supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('../services/inboundInvoicesCache', () => ({ getLocalInvoices: () => mocks.local, saveLocalInvoices: mocks.cache, isSampleInvoice: () => false }));
const invoice = {
  id: '92b3b7f6-a00a-41e2-97ac-9e92b66598dd', nfeKey: '', nfeNumber: '1', supplierId: 'supplier-1', recipientCnpj: '44.512.248/0001-07', totalInvoice: 0,
  items: [{ itemNumber: 1, productCode: 'F-1', productDescription: 'Mesa', quantity: 2, unitCost: 0, totalCost: 0, unit: 'UN', ncm: '', cfop: '', matchedProductId: 'product-1' }],
} as InboundInvoice;
beforeEach(() => {
  vi.clearAllMocks(); mocks.local = [];
  mocks.header.mockReset().mockImplementation((payload) => ({ data: { id: payload.id, supplier_id: payload.supplier_id, itens: payload.itens }, error: null }));
  mocks.items.mockReset().mockImplementation((payload) => ({ data: payload.map((row: any) => ({ inbound_invoice_id: row.inbound_invoice_id, item_index: row.item_index })), error: null }));
  mocks.from.mockImplementation((table: string) => ({ upsert: (payload: any) => {
    const response = () => table === 'inbound_invoices' ? mocks.header(payload) : mocks.items(payload);
    return { then: (resolve: any, reject: any) => Promise.resolve(response()).then(resolve, reject),
      select: () => ({ single: () => Promise.resolve(response()), then: (resolve: any, reject: any) => Promise.resolve(response()).then(resolve, reject) }) };
  } }));
});
it('confirma as duas tabelas antes de publicar cache e conserva zero/metadata', async () => {
  const guard = vi.fn(); const saved = await saveInboundInvoice({ ...invoice, rawExtraction: { source: 'original' } }, { requireConfirmation: true, assertCurrent: guard });
  expect(mocks.header).toHaveBeenCalledOnce(); expect(mocks.items).toHaveBeenCalledOnce(); expect(mocks.cache).toHaveBeenCalledOnce();
  expect(saved).toMatchObject({ id: invoice.id, totalInvoice: 0, rawExtraction: { source: 'original' }, items: [{ unitCost: 0 }] });
  expect(guard.mock.calls.length).toBeGreaterThanOrEqual(4);
});
it.each(['headerError', 'headerMissing', 'headerWrongItems', 'itemError', 'itemMissing', 'itemWrongId'] as const)('resposta %s não publica cache de sucesso', async (kind) => {
  if (kind === 'headerError') mocks.header.mockReturnValueOnce({ data: null, error: new Error('Negado') });
  if (kind === 'headerMissing') mocks.header.mockReturnValueOnce({ data: null, error: null });
  if (kind === 'headerWrongItems') mocks.header.mockReturnValueOnce({ data: { id: invoice.id, supplier_id: invoice.supplierId, itens: [] }, error: null });
  if (kind === 'itemError') mocks.items.mockReturnValueOnce({ data: null, error: new Error('Itens não salvos') });
  if (kind === 'itemMissing') mocks.items.mockReturnValueOnce({ data: [], error: null });
  if (kind === 'itemWrongId') mocks.items.mockReturnValueOnce({ data: [{ inbound_invoice_id: 'other', item_index: 1 }], error: null });
  await expect(saveInboundInvoice(invoice, { requireConfirmation: true })).rejects.toBeTruthy(); expect(mocks.cache).not.toHaveBeenCalled();
  if (kind.startsWith('header')) expect(mocks.items).not.toHaveBeenCalled();
});
it('JSONB com outra ordem de chaves é aceito e nota sem itens exige recibo do cabeçalho', async () => {
  mocks.header.mockImplementationOnce((payload) => ({ data: { id: payload.id, supplier_id: payload.supplier_id, itens: payload.itens.map((row: any) => Object.fromEntries(Object.entries(row).reverse())) }, error: null }));
  await expect(saveInboundInvoice(invoice, { requireConfirmation: true })).resolves.toMatchObject({ id: invoice.id });
  mocks.cache.mockClear(); mocks.header.mockReturnValueOnce({ data: null, error: null });
  await expect(saveInboundInvoice({ ...invoice, items: [] }, { requireConfirmation: true })).rejects.toThrow('não foi confirmada'); expect(mocks.cache).not.toHaveBeenCalled();
});
it('contexto inválido após cabeçalho impede continuar a escrita de itens', async () => {
  const guard = vi.fn().mockImplementationOnce(() => {}).mockImplementation(() => { throw new Error('Contexto expirado'); });
  await expect(saveInboundInvoice(invoice, { requireConfirmation: true, assertCurrent: guard })).rejects.toThrow('Contexto expirado');
  expect(mocks.items).not.toHaveBeenCalled(); expect(mocks.cache).not.toHaveBeenCalled();
});
it('chamador legado conserva fallback em cache quando servidor rejeita', async () => {
  mocks.header.mockReturnValueOnce({ data: null, error: new Error('Falha remota') });
  await expect(saveInboundInvoice(invoice)).resolves.toMatchObject({ id: invoice.id }); expect(mocks.cache).toHaveBeenCalledOnce();
});
