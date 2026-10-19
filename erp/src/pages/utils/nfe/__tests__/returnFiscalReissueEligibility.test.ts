import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), tables: {} as Record<string, any[]>, rpc: vi.fn() }));
vi.mock('../../../../../../api/supabaseSecretKey', () => ({ getSupabaseSecretKey: () => 'test-service' }));
vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({ createClient: mocks.createClient }));
vi.mock('../../../../../../api/nfe/fiscalAuthorization', () => ({ authorizeFiscalOperator: async () => ({ ok: true, userId: 'operator' }) }));
vi.mock('../../../../../../api/nfe/automaticReturnWorkerAuthorization', () => ({ AUTOMATIC_RETURN_WORKER_SECRET_HEADER: 'x-test-worker', isAutomaticReturnWorkerAuthorized: (value: unknown) => value === 'worker' }));
vi.mock('../../../../../../api/nfe/returnFiscalRules', () => ({
  MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE: 'missing-original',
  getReturnIssuerSettings: () => ({ companyCnpj: '44512248000107', companyUF: 'PR', companyCRT: '1' }),
  resolveFiscalReturnMethod: () => 'COMPANY_PICKUP', validateAuthorizedOutboundNfe: () => null,
  validateSupportedReturnEntryScenario: () => null,
}));
vi.mock('../../../../../../shared-utils/fiscalOperationContext', () => ({ getReturnCfopOptionsForSourceItem: () => ['1201'], validateReturnTaxScenario: () => null }));
const returnId = '11111111-1111-4111-8111-111111111111';
const sourceId = '22222222-2222-4222-8222-222222222222';
const saleId = '33333333-3333-4333-8333-333333333333';
const oldId = '44444444-4444-4444-8444-444444444444';
const newId = '55555555-5555-4555-8555-555555555555';
function query(initial: any[]) {
  let rows = [...initial];
  const q: any = { select: () => q, order: () => q,
    eq: (key: string, value: unknown) => { rows = rows.filter(row => row[key] === value); return q; },
    in: (key: string, values: unknown[]) => { rows = rows.filter(row => values.includes(row[key])); return q; },
    maybeSingle: async () => ({ data: rows[0] || null, error: null }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
  }; return q;
}
async function eligibility(reviewCancelled = false, worker = false) {
  const handler = (await import('../../../../../../api/nfe/return-fiscal-eligibility')).default;
  let code = 200; let body: any;
  const res: any = { setHeader: vi.fn(), status: (value: number) => { code = value; return res; },
    json: (value: unknown) => { body = value; return res; } };
  await handler({ method: 'GET', query: { returnOrderId: returnId, ...(reviewCancelled ? { reviewCancelled: 'true' } : {}) },
    headers: worker ? { 'x-test-worker': 'worker' } : { authorization: 'Bearer test-token' } } as any, res);
  expect(code).toBe(200); return body;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.tables = {
    orders: [{ id: returnId, order_type: 'return', status: 'fulfilled', deleted: false, linked_order_id: saleId, order_data: {} }],
    settings: [{ id: 'app', data: {} }],
    nfe_return_item_allocations: [{ id: 'allocation', return_order_id: returnId, return_item_index: 0, original_document_id: sourceId, original_item_number: 1, quantity: 2, fiscal_return_document_id: null }],
    nfe_documents: [{ id: sourceId, order_id: saleId, document_type: 'outbound', status: 'homologada', modelo: '55', ambiente: 2,
      chave_acesso: '41261044512248000107550010000007111308145038', numero_nfe: 711, serie: '1', xml_nfe: '<NFe/>' },
      { id: oldId, original_document_id: sourceId, related_return_order_id: returnId, document_type: 'return', status: 'cancelada' }],
    nfe_document_items: [{ id: 'item', document_id: sourceId, item_number: 1, billed_quantity: 3, product_code: 'sku', product_xml: '<prod><CFOP>5101</CFOP></prod>', taxes_xml: '<imposto/>' }],
    nfe_operation_drafts: [{ id: oldId, original_document_id: sourceId, return_order_id: returnId, document_id: oldId, status: 'cancelled' }],
  };
  mocks.createClient.mockReturnValue({ from: (table: string) => query(mocks.tables[table] || []), rpc: mocks.rpc });
});
describe('nova revisão manual após cancelamento fiscal', () => {
  it('mantém a emissão automática bloqueada e permite só abrir revisão explícita com alocação liberada', async () => {
    const before = JSON.stringify(mocks.tables);
    expect(await eligibility()).toMatchObject({ eligible: false, sources: [expect.objectContaining({ state: 'cancelled' })] });
    expect(await eligibility(true)).toMatchObject({ eligible: true, reason: expect.stringContaining('exige revisão fiscal'),
      sources: [expect.objectContaining({ state: 'ready', draftId: null, returnDocumentId: null })] });
    expect(JSON.stringify(mocks.tables)).toBe(before);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('ignora a opção de revisão humana quando o chamador é o worker automático', async () => {
    expect(await eligibility(true, true)).toMatchObject({ eligible: false, sources: [expect.objectContaining({ state: 'cancelled' })] });
  });
  it.each(['allocation', 'draft'])('bloqueia estado parcialmente reconciliado: %s', async partial => {
    if (partial === 'allocation') mocks.tables.nfe_return_item_allocations[0].fiscal_return_document_id = oldId;
    else mocks.tables.nfe_operation_drafts[0].status = 'authorized';
    expect(await eligibility(true)).toMatchObject({ eligible: false, sources: [expect.objectContaining({ state: 'blocked', blockReason: expect.stringContaining('reconciliar') })] });
  });
  it('prioriza documento ativo após reemissão, mesmo com o cancelado primeiro no histórico', async () => {
    mocks.tables.nfe_documents.push({ id: newId, original_document_id: sourceId, related_return_order_id: returnId, document_type: 'return', status: 'homologada' });
    mocks.tables.nfe_return_item_allocations[0].fiscal_return_document_id = newId;
    mocks.tables.nfe_operation_drafts.push({ id: newId, original_document_id: sourceId, return_order_id: returnId, document_id: newId, status: 'authorized' });
    for (const manual of [false, true]) expect(await eligibility(manual)).toMatchObject({ eligible: true,
      sources: [expect.objectContaining({ state: 'authorized', returnDocumentId: newId, draftId: newId })] });
  });
  it.each(['unknown', 'transmitting'])('mantém tentativa %s na mesma revisão pendente', async status => {
    mocks.tables.nfe_operation_drafts.push({ id: newId, original_document_id: sourceId, return_order_id: returnId, status });
    expect(await eligibility(true)).toMatchObject({ eligible: true, sources: [expect.objectContaining({ state: 'pending', draftId: newId, returnDocumentId: null })] });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
