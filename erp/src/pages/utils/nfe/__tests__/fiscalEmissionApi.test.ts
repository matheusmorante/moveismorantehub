import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  authorizeFiscalOperator: vi.fn(),
  sendSoapToSefaz: vi.fn(),
  validateNfeAgainstOfficialSchema: vi.fn(),
  extractCertificateAndKey: vi.fn(),
}));

vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({
  createClient: mocks.createClient,
}));
vi.mock('../../../../../../api/nfe/fiscalAuthorization', () => ({
  authorizeFiscalOperator: mocks.authorizeFiscalOperator,
}));
vi.mock('../../../../../../api/nfe/sefazClient', () => ({
  sendSoapToSefaz: mocks.sendSoapToSefaz,
}));
vi.mock('../../../../../../api/nfe/schemaValidator', () => ({
  validateNfeAgainstOfficialSchema: mocks.validateNfeAgainstOfficialSchema,
}));
vi.mock('../../../../../../api/nfe/nfeSigner', () => ({
  extractCertificateAndKey: mocks.extractCertificateAndKey,
  signNfeXml: vi.fn(),
}));

const orderId = 'order-synthetic-123';
const emissionRequestId = 'f19b3e63-6f84-45ea-8c5f-39476d709a3d';
const retryDocumentId = 'nfe-document-original';
const retryOrderId = 'order-original';
const retryAccessKey = '1'.repeat(44);

function response() {
  let statusCode = 200;
  let body: any;
  const res: any = {
    setHeader: vi.fn(),
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(value: unknown) {
      body = value;
      return res;
    },
    end: vi.fn(),
  };
  return {
    res,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
}

function database() {
  const from = vi.fn<(table: string) => any>((table: string) => {
    const query: any = {
      select: () => query,
      eq: () => query,
      in: () => query,
      order: () => query,
      limit: () => query,
      maybeSingle: async () => ({
        data:
          table === 'orders'
            ? {
                id: orderId,
                order_type: 'sale',
                status: 'scheduled',
                order_data: { items: [], payments: [] },
                version: 1,
                updated_at: '2026-09-30T12:00:00.000Z',
              }
            : ['nfe_documents', 'nfe_fiscal_snapshots', 'nfe_outbound_attempts'].includes(table)
              ? null
              : { data: { companyCnpj: '00000000000000', companyCMun: '4106902' } },
        error: null,
      }),
    };
    return query;
  });
  return { from, rpc: vi.fn() };
}

function retryDatabase(options: { reactivationWon?: boolean } = {}) {
  const queriedOrderIds: string[] = [];
  const updates: Array<{ table: string; values: unknown; filters: Array<[string, unknown]> }> = [];
  const retryXml = `<NFe><infNFe Id="NFe${retryAccessKey}"><ide><mod>65</mod><serie>4</serie><nNF>701</nNF><tpNF>1</tpNF><tpAmb>2</tpAmb><finNFe>1</finNFe></ide></infNFe></NFe>`;
  const retryDocument = {
    id: retryDocumentId,
    order_id: retryOrderId,
    status: 'erro',
    xml_nfe: retryXml,
    chave_acesso: retryAccessKey,
    numero_nfe: 701,
    serie: '4',
    modelo: '65',
    ambiente: 2,
    motivo_status: 'SEFAZ cStat 217 - Documento não consta',
  };
  const from = vi.fn((table: string) => {
    const filters: Array<[string, unknown]> = [];
    let updateStarted = false;
    const query: any = {
      eq(field: string, value: unknown) {
        filters.push([field, value]);
        if (table === 'orders' && field === 'id') queriedOrderIds.push(String(value));
        return query;
      },
      select() {
        return query;
      },
      async maybeSingle() {
        if (table === 'nfe_documents' && updateStarted)
          return {
            data: options.reactivationWon === false ? null : { id: retryDocumentId },
            error: null,
          };
        if (table === 'nfe_documents') return { data: retryDocument, error: null };
        if (table === 'orders')
          return {
            data: { id: retryOrderId, order_type: 'sale', status: 'scheduled' },
            error: null,
          };
        return { data: null, error: null };
      },
    };
    return {
      select: () => query,
      update: (values: unknown) => {
        updateStarted = true;
        updates.push({ table, values, filters });
        return query;
      },
    };
  });
  return { from, rpc: vi.fn(), queriedOrderIds, updates, retryXml };
}

describe('API de emissão fiscal server-side', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
    delete process.env.NFE_PRODUCTION_ENABLED;
    delete process.env.NFE_CERTIFICATE_BASE64;
    delete process.env.NFE_CERTIFICATE_PASSWORD;
    mocks.authorizeFiscalOperator.mockResolvedValue({ ok: true, userId: 'operator-id' });
    mocks.validateNfeAgainstOfficialSchema.mockResolvedValue(undefined);
    mocks.extractCertificateAndKey.mockReturnValue({
      privateKeyPem: 'synthetic-private-key',
      certPem: 'synthetic-certificate',
      certDerBase64: 'synthetic-certificate-der',
    });
  });

  it('lê pedido e perfil no servidor e bloqueia antes de reservar número ou transmitir', async () => {
    const db = database();
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/emit')).default;
    const result = response();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer operator-token' },
        body: { orderId, environment: 2, emissionRequestId, previewOnly: true },
      } as any,
      result.res
    );

    expect(result.statusCode).toBe(422);
    expect(result.body).toMatchObject({
      success: false,
      code: 'FISCAL_PREPARATION_INVALID',
      numberReserved: false,
      sefazContacted: false,
    });
    expect(db.from).toHaveBeenCalledWith('orders');
    expect(db.from).toHaveBeenCalledWith('settings');
    expect(db.rpc).not.toHaveBeenCalled();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(mocks.validateNfeAgainstOfficialSchema).not.toHaveBeenCalled();
  });

  it('recusa XML e decisões fiscais fornecidas pelo navegador', async () => {
    const db = database();
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/emit')).default;
    const result = response();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer operator-token' },
        body: {
          orderId,
          environment: 2,
          emissionRequestId,
          model: '55',
          xml: '<NFe />',
        },
      } as any,
      result.res
    );

    expect(result.statusCode).toBe(400);
    expect(result.body.code).toBe('INVALID_FISCAL_EMISSION_COMMAND');
    expect(db.from).not.toHaveBeenCalled();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('recupera autorização HML antes de ler pedido e configurações atuais', async () => {
    const db = database();
    db.from.mockImplementation((table: string) => {
      if (table === 'nfe_outbound_attempts')
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        };
      if (table !== 'nfe_documents') throw new Error('Pedido/configuração atual não deve ser lido');
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: retryDocumentId,
                order_id: orderId,
                modelo: '55',
                ambiente: 2,
                fiscal_ruleset_version: 'HML_TECHNICAL_V1',
                status: 'homologada',
                numero_protocolo: '141260000000001',
                numero_nfe: 700,
                serie: '900',
                chave_acesso: retryAccessKey,
                xml_nfe: '<XML_ASSINADO_PERSISTIDO/>',
              },
              error: null,
            }),
          }),
        }),
      };
    });
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/emit')).default;
    const result = response();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer operator-token' },
        body: { orderId, environment: 2, emissionRequestId },
      } as any,
      result.res
    );
    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({
      success: true,
      documentId: retryDocumentId,
      protocolNumber: '141260000000001',
      signedXml: '<XML_ASSINADO_PERSISTIDO/>',
    });
    expect(db.rpc).not.toHaveBeenCalled();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(mocks.extractCertificateAndKey).not.toHaveBeenCalled();
  });

  it('conecta Produção ao preflight comum e recusa fatos incompletos antes da reserva', async () => {
    const db = database();
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_PRODUCTION_ENABLED = 'true';
    const handler = (await import('../../../../../../api/nfe/emit')).default;
    const result = response();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer operator-token' },
        body: {
          orderId,
          environment: 1,
          emissionRequestId,
          productionConfirmed: true,
          previewOnly: true,
        },
      } as any,
      result.res
    );
    expect(result.statusCode).toBe(422);
    expect(result.body.code).toBe('FISCAL_PREPARATION_INVALID');
    expect(db.from).toHaveBeenCalledWith('orders');
    expect(db.rpc).not.toHaveBeenCalled();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('deriva pedido, modelo, ambiente, chave, série e XML do documento persistido no retry', async () => {
    const db = retryDatabase();
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_CERTIFICATE_BASE64 = 'synthetic-certificate';
    mocks.sendSoapToSefaz.mockRejectedValue(new Error('synthetic network timeout'));
    const handler = (await import('../../../../../../api/nfe/emit')).default;
    const result = response();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer operator-token' },
        body: {
          retryDocumentId,
          orderId: 'order-forged',
          environment: 1,
          model: '55',
          accessKey: '2'.repeat(44),
          xml: '<NFe />',
          productionConfirmed: false,
        },
      } as any,
      result.res
    );

    expect(result.statusCode).toBe(502);
    expect(result.body).toMatchObject({
      success: false,
      pending: true,
      documentId: retryDocumentId,
      orderId: retryOrderId,
      accessKey: retryAccessKey,
      nfeNumber: 701,
      series: '4',
      model: '65',
      environment: 2,
      error:
        'Transmissão sem resposta confirmada. Consulte a chave original antes de tentar novamente.',
      diagnosticId: expect.any(String),
      diagnosticStage: 'sefaz-transmission',
    });
    expect(db.queriedOrderIds).toEqual([retryOrderId]);
    expect(db.from).not.toHaveBeenCalledWith('settings');
    expect(db.updates[0]).toMatchObject({
      table: 'nfe_documents',
      values: { status: 'processando' },
    });
    expect(db.updates[0].filters).toEqual([
      ['id', retryDocumentId],
      ['status', 'erro'],
    ]);
    expect(mocks.validateNfeAgainstOfficialSchema).toHaveBeenCalledWith(db.retryXml);
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4',
        xmlPayload: expect.stringContaining(db.retryXml),
      })
    );
  });

  it('não reativa nem transmite um retry cujo XML persistido falha no XSD', async () => {
    const db = retryDatabase();
    mocks.createClient.mockReturnValue(db);
    mocks.validateNfeAgainstOfficialSchema.mockRejectedValue(
      new Error('XML da NF-e não passou pelo schema oficial: falha sintética')
    );
    const handler = (await import('../../../../../../api/nfe/emit')).default;
    const result = response();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer operator-token' },
        body: { retryDocumentId },
      } as any,
      result.res
    );

    expect(result.statusCode).toBe(422);
    expect(result.body).toMatchObject({
      success: false,
      documentId: retryDocumentId,
      orderId: retryOrderId,
    });
    expect(mocks.validateNfeAgainstOfficialSchema).toHaveBeenCalledWith(db.retryXml);
    expect(db.updates).toHaveLength(0);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('não transmite quando outra chamada já reativou o documento para retry', async () => {
    const db = retryDatabase({ reactivationWon: false });
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_CERTIFICATE_BASE64 = 'synthetic-certificate';
    const handler = (await import('../../../../../../api/nfe/emit')).default;
    const result = response();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer operator-token' },
        body: { retryDocumentId, productionConfirmed: false },
      } as any,
      result.res
    );

    expect(result.statusCode).toBe(409);
    expect(result.body.documentId).toBe(retryDocumentId);
    expect(result.body.error).toMatch(/já estar em processamento/);
    expect(db.updates).toHaveLength(1);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('não altera o estado do documento quando o A1 não está disponível', async () => {
    const db = retryDatabase();
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/emit')).default;
    const result = response();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer operator-token' },
        body: { retryDocumentId, productionConfirmed: false },
      } as any,
      result.res
    );

    expect(result.statusCode).toBe(503);
    expect(result.body).toMatchObject({
      documentId: retryDocumentId,
      environment: 2,
      error: 'Certificado digital A1 não configurado no servidor fiscal.',
    });
    expect(db.updates).toHaveLength(0);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });
});
