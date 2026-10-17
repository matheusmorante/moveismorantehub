import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  authorizeFiscalOperator: vi.fn(),
  signNfeEventXml: vi.fn(),
  extractCertificateAndKey: vi.fn(),
  sendSoapToSefaz: vi.fn(),
  validateCancellation: vi.fn(),
}));

vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({
  createClient: mocks.createClient,
}));
vi.mock('../../../../../../api/nfe/schemaValidator', () => ({ validateCancellationAgainstOfficialSchema: mocks.validateCancellation }));
vi.mock('../../../../../../api/nfe/fiscalAuthorization', () => ({
  authorizeFiscalOperator: mocks.authorizeFiscalOperator,
}));
vi.mock('../../../../../../api/nfe/nfeSigner', () => ({
  extractCertificateAndKey: mocks.extractCertificateAndKey,
  signNfeEventXml: mocks.signNfeEventXml,
}));
vi.mock('../../../../../../api/nfe/sefazClient', () => ({
  sendSoapToSefaz: mocks.sendSoapToSefaz,
}));

const fiscalDocument = {
  id: '77777777-7777-4777-8777-777777777777',
  order_id: '88888888-8888-4888-8888-888888888888',
  modelo: '55',
  ambiente: 2,
  status: 'homologada',
  document_type: 'outbound',
  chave_acesso:
    '41' + '2610' + '12345678000195' + '55' + '001' + '000000001' + '1' + '00000000' + '0',
  numero_protocolo: '123456789012345',
  xml_nfe: '<NFe><emit><CNPJ>12345678000195</CNPJ></emit></NFe>',
  xml_protocolo: `<protNFe><infProt><dhRecbto>${new Date(Date.now() - 60 * 60 * 1000).toISOString()}</dhRecbto></infProt></protNFe>`,
  created_at: new Date().toISOString(),
};

function response() {
  let statusCode = 200;
  let body: unknown;
  const res = {
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
      return body as Record<string, unknown> | undefined;
    },
  };
}

function database(
  orderStatus: 'fulfilled' | 'scheduled' | 'cancelled',
  options: {
    priorEvents?: Array<Record<string, unknown>>;
    reservationError?: boolean;
    documentOverrides?: Partial<typeof fiscalDocument>;
    orderOverrides?: Record<string, unknown>;
    replacementRecord?: Record<string, unknown> | null;
  } = {}
) {
  const from = vi.fn((table: string) => {
    const query: any = {
      select: () => query,
      eq: () => query,
      order: () => query,
      insert: vi.fn(() => query),
      update: vi.fn(() => query),
      in: () => query,
      single: async () =>
        options.reservationError && table === 'nfe_document_events'
          ? { data: null, error: { code: '23505', message: 'duplicate event attempt' } }
          : { data: { id: 'event-id' }, error: null },
      maybeSingle: async () => ({
        data:
          table === 'nfe_documents'
            ? { ...fiscalDocument, ...options.documentOverrides }
            : table === 'orders'
              ? {
                  status: orderStatus,
                  delivery_status: null,
                  delivery_method: null,
                  order_data: {},
                  ...options.orderOverrides,
                }
              : table === 'nfe_order_edit_replacements'
                ? options.replacementRecord ?? null
                : null,
        error: null,
      }),
      // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are intentionally thenable.
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve({
          data: table === 'nfe_document_events' ? options.priorEvents || [] : [],
          error: null,
        }).then(resolve, reject),
    };
    return query;
  });
  return { from, rpc: vi.fn(async (name: string, params?: any) =>
    name === 'reserve_nfe_cancellation_event'
      ? options.reservationError ? { data: null, error: { code: '40001' } } : { data: { eventId: 'event-id' }, error: null }
      : { data: { eventId: params?.p_event_id, status: params?.p_status }, error: null }) };
}

const request = {
  method: 'POST',
  headers: { authorization: 'Bearer test-token' },
  body: {
    documentId: fiscalDocument.id,
    reason: 'Cancelamento antes da entrega ao cliente.',
  },
} as any;

describe('API de cancelamento de NF-e', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateCancellation.mockResolvedValue(undefined);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
    delete process.env.NFE_CERTIFICATE_BASE64;
    delete process.env.NFE_CERTIFICATE_PASSWORD;
    mocks.authorizeFiscalOperator.mockResolvedValue({ ok: true, userId: 'test-user' });
  });

  it('rejeita cancelamento após atendimento, sem assinar ou transmitir evento', async () => {
    const db = database('fulfilled');
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(request, result.res as any);

    expect(result.statusCode).toBe(409);
    expect(result.body?.error).toContain('circulação/entrega');
    expect(mocks.signNfeEventXml).not.toHaveBeenCalled();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('rejeita cancelamento quando há timestamp estruturado de saída para entrega', async () => {
    const db = database('cancelled', {
      orderOverrides: { delivery_started_at: new Date().toISOString() },
    });
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(request, result.res as any);

    expect(result.statusCode).toBe(409);
    expect(result.body?.error).toContain('entrega ou retirada');
    expect(mocks.signNfeEventXml).not.toHaveBeenCalled();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('não transmite evento fiscal se a operação comercial do pedido ainda não foi cancelada', async () => {
    const db = database('scheduled');
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(request, result.res as any);

    expect(result.statusCode).toBe(409);
    expect(result.body?.error).toContain('operação comercial');
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('bloqueia no backend uma nota cujo status não corresponde ao ambiente fiscal', async () => {
    const db = database('cancelled', { documentOverrides: { ambiente: 1 } });
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(request, result.res as any);

    expect(result.statusCode).toBe(409);
    expect(result.body?.error).toContain('ambiente');
    expect(mocks.signNfeEventXml).not.toHaveBeenCalled();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('não retransmite quando a consulta após uma tentativa incerta não confirma o estado', async () => {
    const db = database('cancelled', {
      priorEvents: [
        {
          id: 'prior-event',
          status: 'unknown',
          requested_at: new Date(Date.now() - 60_000).toISOString(),
          attempt_number: 1,
        },
      ],
    });
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_CERTIFICATE_BASE64 = 'mock-certificate';
    mocks.extractCertificateAndKey.mockReturnValue({
      privateKeyPem: 'mock-key',
      certPem: 'mock-cert',
      certDerBase64: 'mock-der',
    });
    mocks.sendSoapToSefaz.mockResolvedValue(
      '<retConsSitNFe><cStat>999</cStat><xMotivo>Situação ainda inconclusiva</xMotivo></retConsSitNFe>'
    );
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(request, result.res as any);

    expect(result.statusCode).toBe(202);
    expect(result.body).toMatchObject({ success: false, pending: true });
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
    expect(mocks.sendSoapToSefaz.mock.calls[0][0].xmlPayload).toContain('<consSitNFe');
    expect(mocks.signNfeEventXml).not.toHaveBeenCalled();
  });

  it.each(['valid', 'environment', 'key', 'protocol', 'malformed'])('confere a identidade na reconciliação de cancelamento: %s', async (scenario) => {
    const db = database('cancelled', {
      priorEvents: [{ id: 'prior-event', status: 'unknown', requested_at: new Date(Date.now() - 60_000).toISOString(), attempt_number: 1 }],
    });
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_CERTIFICATE_BASE64 = 'mock-certificate';
    mocks.extractCertificateAndKey.mockReturnValue({ privateKeyPem: 'mock-key', certPem: 'mock-cert', certDerBase64: 'mock-der' });
    const key = scenario === 'key' ? '5'.repeat(44) : fiscalDocument.chave_acesso;
    const environment = scenario === 'environment' ? 1 : 2;
    const protocol = scenario === 'protocol' ? '999999999999999' : fiscalDocument.numero_protocolo;
    const xml = `<retConsSitNFe><tpAmb>${environment}</tpAmb><chNFe>${key}</chNFe><cStat>101</cStat><protNFe><infProt><tpAmb>${environment}</tpAmb><chNFe>${key}</chNFe><cStat>100</cStat><nProt>${protocol}</nProt></infProt></protNFe><procEventoNFe><retEvento><infEvento><tpAmb>${environment}</tpAmb><chNFe>${key}</chNFe><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><cStat>135</cStat><nProt>141260000000002</nProt><dhRegEvento>2026-10-13T10:00:00-03:00</dhRegEvento></infEvento></retEvento></procEventoNFe></retConsSitNFe>`;
    mocks.sendSoapToSefaz.mockResolvedValue(scenario === 'malformed' ? `<unclosed>${xml}` : xml);
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(request, result.res as any);

    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
    expect(mocks.signNfeEventXml).not.toHaveBeenCalled();
    if (scenario === 'valid') {
      expect(result.statusCode).toBe(200);
      expect(result.body).toMatchObject({ success: true, status: 'cancelada' });
    } else {
      expect(result.statusCode).toBe(202);
      expect(result.body).toMatchObject({ success: false, pending: true, reconciliationRequired: true });
      db.from.mock.results.forEach(({ value }) => { expect(value.update).not.toHaveBeenCalled(); });
    }
  });

  it('não transmite se a reserva do evento perde uma disputa concorrente', async () => {
    const db = database('cancelled', { reservationError: true });
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_CERTIFICATE_BASE64 = 'mock-certificate';
    mocks.extractCertificateAndKey.mockReturnValue({
      privateKeyPem: 'mock-key',
      certPem: 'mock-cert',
      certDerBase64: 'mock-der',
    });
    mocks.signNfeEventXml.mockImplementation((xml: string) => xml);
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(request, result.res as any);

    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({ success: false, pending: true });
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('mantém pendente uma resposta 135 de outro ambiente e não cancela o documento', async () => {
    const db = database('cancelled');
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_CERTIFICATE_BASE64 = 'mock-certificate';
    mocks.extractCertificateAndKey.mockReturnValue({
      privateKeyPem: 'mock-key',
      certPem: 'mock-cert',
      certDerBase64: 'mock-der',
    });
    mocks.signNfeEventXml.mockImplementation((xml: string) => xml);
    mocks.sendSoapToSefaz.mockResolvedValue(
      `<retEnvEvento><retEvento><infEvento><tpAmb>1</tpAmb><chNFe>${fiscalDocument.chave_acesso}</chNFe><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><cStat>135</cStat><nProt>141260000000001</nProt></infEvento></retEvento></retEnvEvento>`
    );
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(request, result.res as any);

    expect(result.statusCode).toBe(202);
    expect(result.body).toMatchObject({ success: false, pending: true, cStat: '135' });
    db.from.mock.calls.forEach(([table], index) => {
      const query = db.from.mock.results[index].value;
      if (table === 'nfe_documents') expect(query.update).not.toHaveBeenCalled();
    });
    expect(db.rpc).toHaveBeenCalledWith('persist_nfe_cancellation_result', expect.objectContaining({ p_status: 'unknown', p_protocol: null }));
  });

  it.each(['schema', 'rpc_missing', 'commit_failure', 'commit_response_lost', 'commit_response_empty'])('não informa conclusão parcial após falha em %s', async (stage) => {
    const db = database('cancelled');
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_CERTIFICATE_BASE64 = 'mock-certificate';
    mocks.extractCertificateAndKey.mockReturnValue({ privateKeyPem: 'mock-key', certPem: 'mock-cert', certDerBase64: 'mock-der' });
    mocks.signNfeEventXml.mockImplementation((xml: string) => xml);
    mocks.sendSoapToSefaz.mockResolvedValue(`<retEnvEvento><retEvento><infEvento><tpAmb>2</tpAmb><chNFe>${fiscalDocument.chave_acesso}</chNFe><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><cStat>135</cStat><nProt>141260000000001</nProt><dhRegEvento>2026-10-13T10:00:00-03:00</dhRegEvento></infEvento></retEvento></retEnvEvento>`);
    if (stage === 'schema') mocks.validateCancellation.mockRejectedValueOnce(new Error('invalid XML'));
    else if (stage === 'rpc_missing') db.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    else if (stage === 'commit_response_empty') db.rpc.mockResolvedValueOnce({ data: { eventId: 'event-id' }, error: null }).mockResolvedValueOnce({ data: null, error: null });
    else if (stage === 'commit_response_lost') db.rpc.mockResolvedValueOnce({ data: { eventId: 'event-id' }, error: null }).mockRejectedValueOnce(new Error('fetch failed'));
    else db.rpc.mockResolvedValueOnce({ data: { eventId: 'event-id' }, error: null }).mockResolvedValueOnce({ data: null, error: { code: '23514' } });
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();
    await handler(request, result.res as any);
    expect(result.body?.success).toBe(false);
    if (stage.startsWith('commit_')) {
      expect(result.statusCode).toBe(503);
      expect(result.body).toMatchObject({ pending: true, sefazConfirmed: true, reconciliationRequired: true });
      expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
    } else expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    db.from.mock.results.forEach(({ value }) => {
      expect(value.update).not.toHaveBeenCalled();
      expect(value.insert).not.toHaveBeenCalled();
    });
  });

  it('mantém timeout pendente mesmo se a gravação local também perder a resposta', async () => {
    const db = database('cancelled');
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_CERTIFICATE_BASE64 = 'mock-certificate';
    mocks.extractCertificateAndKey.mockReturnValue({ privateKeyPem: 'mock-key', certPem: 'mock-cert', certDerBase64: 'mock-der' });
    mocks.signNfeEventXml.mockImplementation((xml: string) => xml);
    mocks.sendSoapToSefaz.mockRejectedValueOnce(new Error('timeout'));
    db.rpc.mockResolvedValueOnce({ data: { eventId: 'event-id' }, error: null }).mockRejectedValueOnce(new Error('fetch failed'));
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();
    await handler(request, result.res as any);
    expect(result.statusCode).toBe(502);
    expect(result.body).toMatchObject({ success: false, pending: true });
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
    expect(db.rpc).toHaveBeenCalledWith('persist_nfe_cancellation_result', expect.objectContaining({ p_status: 'unknown' }));
    db.from.mock.results.forEach(({ value }) => { expect(value.update).not.toHaveBeenCalled(); });
  });

  it.each(['12345678000195', '12ABC34501DE35'])('envia dhEvento com fuso e persiste cancelamento com CNPJ %s', async (cnpj) => {
    const source = { ...fiscalDocument, chave_acesso: fiscalDocument.chave_acesso.replace('12345678000195', cnpj), xml_nfe: fiscalDocument.xml_nfe.replace('12345678000195', cnpj) };
    const db = database('cancelled', { documentOverrides: source });
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_CERTIFICATE_BASE64 = 'mock-certificate';
    mocks.extractCertificateAndKey.mockReturnValue({
      privateKeyPem: 'mock-key',
      certPem: 'mock-cert',
      certDerBase64: 'mock-der',
    });
    mocks.signNfeEventXml.mockImplementation((xml: string) => xml);
    mocks.sendSoapToSefaz.mockResolvedValue(
      `<retEnvEvento><retEvento><infEvento><tpAmb>2</tpAmb><chNFe>${source.chave_acesso}</chNFe><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><cStat>135</cStat><xMotivo>Evento registrado e vinculado a NF-e</xMotivo><nProt>141260000000001</nProt><dhRegEvento>2026-10-01T15:00:00-03:00</dhRegEvento></infEvento></retEvento></retEnvEvento>`
    );
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();
    const before = Date.now();
    await handler(
      {
        ...request,
        body: { ...request.body },
      },
      result.res as any
    );
    const after = Date.now();

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({
      success: true,
      status: 'cancelada',
      cStat: '135',
      protocolNumber: '141260000000001',
      protocolDate: '2026-10-01T15:00:00-03:00',
      reconciliationRequired: false,
    });
    const xml = mocks.signNfeEventXml.mock.calls[0][0] as string;
    expect(xml).toContain(`<CNPJ>${cnpj}</CNPJ>`);
    expect(xml).toContain(`<chNFe>${source.chave_acesso}</chNFe>`);
    const timestamp = xml.match(/<dhEvento>([^<]+)<\/dhEvento>/)?.[1];
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/);
    expect(Date.parse(timestamp!)).toBeGreaterThanOrEqual(before - 1000);
    expect(Date.parse(timestamp!)).toBeLessThanOrEqual(after);
    expect(mocks.sendSoapToSefaz.mock.calls[0][0]).toMatchObject({
      url: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4',
      xmlPayload: xml,
    });
    expect(db.rpc).toHaveBeenCalledWith('persist_nfe_cancellation_result', expect.objectContaining({ p_status: 'registered' }));
    db.from.mock.results.forEach(({ value }) => { expect(value.update).not.toHaveBeenCalled(); });
  });

  it('permite cancelamento fiscal de NF-e modelo 55 de Devolução quando vinculada a pedido de devolução', async () => {
    const returnDoc = {
      ...fiscalDocument,
      document_type: 'return',
      modelo: '55',
      original_document_id: '11111111-1111-4111-8111-111111111111',
      related_return_order_id: 'return-order-id-123',
    };
    const db = database('fulfilled', {
      documentOverrides: returnDoc,
      orderOverrides: { order_type: 'return', status: 'fulfilled' },
    });
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_CERTIFICATE_BASE64 = 'mock-certificate';
    mocks.extractCertificateAndKey.mockReturnValue({
      privateKeyPem: 'mock-key',
      certPem: 'mock-cert',
      certDerBase64: 'mock-der',
    });
    mocks.signNfeEventXml.mockImplementation((xml: string) => xml);
    mocks.sendSoapToSefaz.mockResolvedValue(
      `<retEnvEvento><retEvento><infEvento><tpAmb>2</tpAmb><chNFe>${returnDoc.chave_acesso}</chNFe><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><cStat>135</cStat><xMotivo>Evento registrado e vinculado a NF-e</xMotivo><nProt>141260000000001</nProt><dhRegEvento>2026-10-17T15:00:00-03:00</dhRegEvento></infEvento></retEvento></retEnvEvento>`
    );
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(
      {
        ...request,
        body: { documentId: returnDoc.id, reason: 'Cancelamento fiscal da devolucao autorizada' },
      },
      result.res as any
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ success: true, status: 'cancelada', cStat: '135' });
    expect(db.rpc).toHaveBeenCalledWith('reserve_nfe_cancellation_event', expect.anything());
    expect(db.rpc).toHaveBeenCalledWith(
      'persist_nfe_cancellation_result',
      expect.objectContaining({ p_status: 'registered', p_cstat: '135' })
    );
  });

  it('rejeita cancelamento fiscal de NF-e de Devolução quando pedido de devolução não é do tipo return', async () => {
    const returnDoc = {
      ...fiscalDocument,
      document_type: 'return',
      modelo: '55',
      original_document_id: '11111111-1111-4111-8111-111111111111',
      related_return_order_id: 'return-order-id-123',
    };
    const db = database('fulfilled', {
      documentOverrides: returnDoc,
      orderOverrides: { order_type: 'sale', status: 'fulfilled' },
    });
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(
      {
        ...request,
        body: { documentId: returnDoc.id, reason: 'Cancelamento fiscal de devolucao invalida' },
      },
      result.res as any
    );

    expect(result.statusCode).toBe(409);
    expect(result.body?.error).toContain('pedido de devolução comercial');
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('permite cancelamento fiscal de NF-e modelo 55 de Estorno quando não há substituição ativa vinculada', async () => {
    const estornoDoc = {
      ...fiscalDocument,
      document_type: 'estorno',
      modelo: '55',
      original_document_id: '11111111-1111-4111-8111-111111111111',
      related_return_order_id: null,
    };
    const db = database('cancelled', {
      documentOverrides: estornoDoc,
      replacementRecord: null,
    });
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_CERTIFICATE_BASE64 = 'mock-certificate';
    mocks.extractCertificateAndKey.mockReturnValue({
      privateKeyPem: 'mock-key',
      certPem: 'mock-cert',
      certDerBase64: 'mock-der',
    });
    mocks.signNfeEventXml.mockImplementation((xml: string) => xml);
    mocks.sendSoapToSefaz.mockResolvedValue(
      `<retEnvEvento><retEvento><infEvento><tpAmb>2</tpAmb><chNFe>${estornoDoc.chave_acesso}</chNFe><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><cStat>135</cStat><xMotivo>Evento registrado e vinculado a NF-e</xMotivo><nProt>141260000000001</nProt><dhRegEvento>2026-10-17T15:00:00-03:00</dhRegEvento></infEvento></retEvento></retEnvEvento>`
    );
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(
      {
        ...request,
        body: { documentId: estornoDoc.id, reason: 'Cancelamento fiscal do estorno autorizado' },
      },
      result.res as any
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ success: true, status: 'cancelada', cStat: '135' });
    expect(db.rpc).toHaveBeenCalledWith('reserve_nfe_cancellation_event', expect.anything());
    expect(db.rpc).toHaveBeenCalledWith(
      'persist_nfe_cancellation_result',
      expect.objectContaining({ p_status: 'registered', p_cstat: '135' })
    );
  });

  it('rejeita cancelamento fiscal de NF-e modelo 55 de Estorno quando há substituição ativa em andamento', async () => {
    const estornoDoc = {
      ...fiscalDocument,
      document_type: 'estorno',
      modelo: '55',
      original_document_id: '11111111-1111-4111-8111-111111111111',
      related_return_order_id: null,
    };
    const db = database('cancelled', {
      documentOverrides: estornoDoc,
      replacementRecord: { id: 'repl-123', status: 'ready_to_reissue' },
    });
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(
      {
        ...request,
        body: { documentId: estornoDoc.id, reason: 'Cancelamento fiscal de estorno bloqueado' },
      },
      result.res as any
    );

    expect(result.statusCode).toBe(409);
    expect(result.body?.error).toContain('substituição fiscal de edição aplicada ou concluída');
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('rejeita cancelamento fiscal de Devolução ou Estorno se o modelo for 65', async () => {
    const returnDocNfce = {
      ...fiscalDocument,
      document_type: 'return',
      modelo: '65',
      original_document_id: '11111111-1111-4111-8111-111111111111',
    };
    const db = database('fulfilled', { documentOverrides: returnDocNfce });
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(
      {
        ...request,
        body: { documentId: returnDocNfce.id, reason: 'Cancelamento fiscal devolucao modelo 65 invalido' },
      },
      result.res as any
    );

    expect(result.statusCode).toBe(409);
    expect(result.body?.error).toContain('modelo 55');
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
