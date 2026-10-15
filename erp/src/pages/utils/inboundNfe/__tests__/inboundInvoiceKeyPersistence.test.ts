import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboundInvoice } from '../inboundNfeTypes';
const mocks = vi.hoisted(() => ({ local: [] as InboundInvoice[], upsert: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), from: vi.fn() }));
vi.mock('../../supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('../services/inboundInvoicesCache', () => ({
  getLocalInvoices: () => mocks.local,
  saveLocalInvoices: (value: InboundInvoice[]) => { mocks.local = value; },
  isSampleInvoice: () => false,
}));
import { checkInboundInvoiceKeyExists, deleteInboundInvoice, markInvoiceAsReceived, saveInboundInvoice } from '../inboundInvoicesService';
const key = '41261012ABC34501DE35550010000001061705367136';
const formatted = key.toLowerCase().replace(/(.{4})/g, '$1 ');
const invoice = (): InboundInvoice => ({
  id: 'fda3c419-65a1-44ce-9627-c9442b7c6850', nfeKey: formatted, nfeNumber: '106', series: '1',
  issuedAt: '2026-10-15T12:00:00Z', emitterCnpj: '12ABC34501DE35', emitterName: 'Fornecedor',
  recipientCnpj: '12345678000195', recipientName: 'Loja', totalProducts: 20, totalFreight: 0, totalIpi: 0,
  model: '55', environment: 2, status: 'pending', items: [], itemsCount: 0, totalInvoice: 20,
});
beforeEach(() => {
  vi.clearAllMocks(); mocks.local = [];
  const query: Record<string, any> = {};
  query.select = () => query; query.neq = () => query; query.delete = () => query;
  query.eq = mocks.eq.mockReturnValue(query); query.upsert = mocks.upsert;
  query.maybeSingle = mocks.maybeSingle; mocks.from.mockReturnValue(query);
  mocks.upsert.mockResolvedValue({ error: null }); mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
});

describe('chave alfanumérica nos serviços ativos de entrada', () => {
  it('preserva a chave completa no cache, payload e conflito da gravação', async () => {
    const saved = await saveInboundInvoice(invoice());
    expect(saved.nfeKey).toBe(key); expect(mocks.local[0].nfeKey).toBe(key);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ chave_acesso: key }), { onConflict: 'chave_acesso' });
    await saveInboundInvoice({ ...invoice(), nfeKey: key, totalInvoice: 30 });
    expect(mocks.local).toHaveLength(1); expect(mocks.local[0].totalInvoice).toBe(30);
  });
  it('encontra duplicidade no cache com a mesma normalização e preserva exclusão por id', async () => {
    await saveInboundInvoice(invoice()); mocks.from.mockClear();
    expect((await checkInboundInvoiceKeyExists(formatted))?.nfeKey).toBe(key);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(await checkInboundInvoiceKeyExists(formatted, invoice().id)).toBeNull();
    expect(mocks.eq).toHaveBeenCalledWith('chave_acesso', key);
  });
  it('consulta a chave completa no Supabase quando não há cache', async () => {
    expect(await checkInboundInvoiceKeyExists(formatted)).toBeNull();
    expect(mocks.eq).toHaveBeenCalledWith('chave_acesso', key);
  });
  it('remove somente a nota correspondente à chave e mantém as demais no cache', async () => {
    mocks.local = [{ ...invoice(), nfeKey: key }, { ...invoice(), id: 'other', nfeKey: '41260944512248000107550010000099991000099999' }];
    await deleteInboundInvoice(`inbound_${formatted}`);
    expect(mocks.eq).toHaveBeenCalledWith('chave_acesso', key);
    expect(mocks.local).toHaveLength(1); expect(mocks.local[0].id).toBe('other');
    expect(mocks.from).toHaveBeenCalledTimes(1); expect(mocks.from).toHaveBeenCalledWith('inbound_invoices');
  });
  it('localiza a nota pela chave formatada ao marcar recebimento', async () => {
    mocks.local = [{ ...invoice(), nfeKey: key }];
    await markInvoiceAsReceived(formatted, 'receipt');
    expect(mocks.local[0]).toMatchObject({ nfeKey: key, status: 'received', receiptId: 'receipt' });
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ chave_acesso: key, receipt_id: 'receipt' }), { onConflict: 'chave_acesso' });
  });
});
