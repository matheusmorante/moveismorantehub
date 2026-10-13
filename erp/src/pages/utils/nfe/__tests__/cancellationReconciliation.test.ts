import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  authorize: vi.fn(),
  extractCertificateAndKey: vi.fn(),
  sendSoapToSefaz: vi.fn(),
}));

vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({
  createClient: mocks.createClient,
}));
vi.mock('../../../../../../api/nfe/fiscalAuthorization', () => ({
  authorizeFiscalOperator: mocks.authorize,
}));
vi.mock('../../../../../../api/nfe/nfeSigner', () => ({
  extractCertificateAndKey: mocks.extractCertificateAndKey,
}));
vi.mock('../../../../../../api/nfe/sefazClient', () => ({
  sendSoapToSefaz: mocks.sendSoapToSefaz,
}));
vi.mock('../../../../../../erp/src/pages/utils/nfe/nfeEventRules', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../../../erp/src/pages/utils/nfe/nfeEventRules')>()),
  parseSefazNfeSituation: vi.fn(() => ({
    state: 'authorized',
    cStat: '100',
    xMotivo: 'Autorizado o uso da NF-e',
    cancellationEventXml: null,
  })),
}));

describe('reconciliação do evento de cancelamento fiscal', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-service-key');
    vi.stubEnv('NFE_CERTIFICATE_BASE64', 'synthetic-certificate');
    mocks.authorize.mockResolvedValue({ ok: true, userId: 'TEST_AUT' });
    mocks.extractCertificateAndKey.mockReturnValue({
      certPem: 'synthetic-cert',
      privateKeyPem: 'synthetic-key',
    });
    mocks.sendSoapToSefaz.mockResolvedValue('<retConsSitNFe/>');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('marca a tentativa como não registrada quando a SEFAZ confirma que a NF continua autorizada', async () => {
    const updates: Array<{ table: string; values: Record<string, unknown> }> = [];
    const sourceDocument = {
      id: 'TEST_AUT_document',
      status: 'homologada',
      modelo: '55',
      ambiente: 2,
      chave_acesso: '41' + '2610' + '12345678000195' + '55' + '001' + '000000001' + '1' + '00000000' + '0',
      numero_protocolo: '141260000000001',
      xml_nfe: '<NFe><emit><CNPJ>12345678000195</CNPJ></emit></NFe>',
    };
    let observedSoapStart = 0;
    mocks.sendSoapToSefaz.mockImplementation(async () => {
      observedSoapStart = Date.now();
      return `<retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>2</tpAmb><chNFe>${sourceDocument.chave_acesso}</chNFe><cStat>100</cStat><protNFe><infProt><tpAmb>2</tpAmb><chNFe>${sourceDocument.chave_acesso}</chNFe><cStat>100</cStat><nProt>${sourceDocument.numero_protocolo}</nProt></infProt></protNFe></retConsSitNFe>`;
    });
    const db = {
      rpc: vi.fn().mockResolvedValue({ data: { documentId: sourceDocument.id, status: 'homologada' }, error: null }),
      from: vi.fn((table: string) => {
        let updateValues: Record<string, unknown> | null = null;
        const query: any = {
          select: () => query,
          eq: () => query,
          order: () => query,
          limit: () => query,
          in: () => query,
          update: (values: Record<string, unknown>) => {
            updateValues = values;
            updates.push({ table, values });
            return query;
          },
          maybeSingle: async () => ({
            data:
              table === 'nfe_documents'
                ? sourceDocument
                : updateValues
                  ? { id: 'TEST_AUT_event' }
                  : { id: 'TEST_AUT_event', status: 'unknown' },
            error: null,
          }),
          // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are intentionally thenable.
          then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve({ data: null, error: null }).then(resolve, reject),
        };
        return query;
      }),
    };
    mocks.createClient.mockReturnValue(db);

    const { default: handler } = await import('../../../../../../api/nfe/consult');
    let statusCode = 200;
    let body: Record<string, unknown> | undefined;
    const res: any = {
      setHeader: vi.fn(),
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(value: Record<string, unknown>) {
        body = value;
        return res;
      },
    };

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer TEST_AUT_token' },
        body: { documentId: 'TEST_AUT_document' },
      } as any,
      res
    );

    expect(statusCode).toBe(200);
    expect(body).toMatchObject({
      success: true,
      state: 'authorized',
      cancellationAttemptState: 'not_registered',
      reconciliationRequired: false,
    });
    expect(updates).toEqual([]);
    expect(db.rpc).toHaveBeenCalledWith('persist_nfe_legacy_consultation', expect.objectContaining({ p_document_id: sourceDocument.id, p_event_id: 'TEST_AUT_event' }));
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledOnce();
    const params = db.rpc.mock.calls[0]?.[1] as any;
    expect(Number.isFinite(Date.parse(params.p_consultation_started_at))).toBe(true);
    expect(Date.parse(params.p_consultation_started_at)).toBeLessThanOrEqual(observedSoapStart);
  });
});
