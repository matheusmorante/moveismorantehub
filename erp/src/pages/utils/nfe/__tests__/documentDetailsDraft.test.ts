import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), authorizeFiscalOperator: vi.fn() }));
vi.mock('../../../../../../api/supabaseSecretKey', () => ({ getSupabaseSecretKey: () => 'test-service-key' }));
vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({ createClient: mocks.createClient }));
vi.mock('../../../../../../api/nfe/fiscalAuthorization', () => ({ authorizeFiscalOperator: mocks.authorizeFiscalOperator }));
const draftId = '77777777-7777-4777-8777-777777777777';
const source = {
  id: '88888888-8888-4888-8888-888888888888', order_id: 'sale', modelo: '65', ambiente: 2,
  numero_nfe: 647, serie: '1', chave_acesso: '41261044512248000107650010000006471984765280',
  xml_nfe: '<NFe>original</NFe>', xml_protocolo: '<protNFe>original</protNFe>',
};
const draft = { id: draftId, operation_kind: 'estorno', environment: 2, status: 'draft', original_document_id: source.id };
async function callDetails(draftData: Record<string, unknown>, issuedResult?: { data: unknown; error: unknown }) {
  const reads = [{ data: null, error: null }, { data: draftData, error: null }, issuedResult || { data: source, error: null }];
  mocks.createClient.mockReturnValue({ from: (table: string) => {
    const result = table === 'nfe_document_events' ? { data: [], error: null } : reads.shift();
    const query: any = { select: () => query, eq: () => query, in: () => query, order: () => query, limit: () => query,
      maybeSingle: () => Promise.resolve(result), then: (resolve: any) => Promise.resolve(result).then(resolve) };
    return query;
  } });
  let status = 200; let body: any;
  const res: any = { setHeader() {}, status(value: number) { status = value; return res; }, json(value: unknown) { body = value; return res; } };
  const handler = (await import('../../../../../../api/nfe/document-details')).default;
  await handler({ method: 'POST', headers: { authorization: 'Bearer test' }, body: { documentId: draftId } } as any, res);
  return { status, body };
}
describe('identidade fiscal própria nos detalhes do rascunho', () => {
  beforeEach(() => {
    vi.clearAllMocks(); process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    mocks.authorizeFiscalOperator.mockResolvedValue({ ok: true, userId: 'operator' });
  });
  it.each(['draft', 'ready'])('não empresta número, chave ou XML da origem no estado %s', async status => {
    const result = await callDetails({ ...draft, status });
    expect(result.status).toBe(200);
    expect(result.body.document).toMatchObject({ numero_nfe: 0, serie: '', chave_acesso: '', status: 'pendente', xml_nfe: null, xml_protocolo: null, numero_protocolo: null });
    expect(result.body.operationDrafts[0].sourceDocument).toMatchObject({ id: source.id, numero_nfe: 647, modelo: '65' });
  });
  it('exige conferência do documento emitido antes de declarar autorização', async () => {
    expect((await callDetails({ ...draft, status: 'authorized', document_id: 'issued' }, { data: null, error: { message: 'read failed' } })).status).toBe(503);
    expect((await callDetails({ ...draft, status: 'authorized' })).status).toBe(503);
  });
  it('usa a identidade própria quando a transmissão já reservou uma chave', async () => {
    const key = '41261044512248000107550010000007071545832869';
    const result = await callDetails({ ...draft, status: 'unknown', access_key: key, signed_xml: '<NFe>estorno</NFe>' });
    expect(result.body.document).toMatchObject({ numero_nfe: 707, serie: '1', chave_acesso: key, xml_nfe: '<NFe>estorno</NFe>', xml_protocolo: null });
  });
});
