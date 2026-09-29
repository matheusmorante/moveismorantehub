import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  authorizeFiscalOperator: vi.fn(),
  extractCertificateAndKey: vi.fn(),
  signNfeEventXml: vi.fn(),
  sendSoapToSefaz: vi.fn(),
}));

vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({
  createClient: mocks.createClient,
}));
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

const documentId = '77777777-7777-4777-8777-777777777777';
const requestId = '88888888-8888-4888-8888-888888888888';
const fiscalDocument = {
  id: documentId,
  modelo: '55',
  ambiente: 2,
  status: 'homologada',
  chave_acesso: '1'.repeat(44),
  xml_nfe: '<NFe><infNFe><emit><CNPJ>12345678000195</CNPJ></emit></infNFe></NFe>',
  numero_protocolo: '123456789012345',
};

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
  const events: Record<string, any>[] = [];
  let attempt = 0;
  const matches = (row: Record<string, any>, filters: Record<string, unknown>, inFilters: Record<string, unknown[]>) =>
    Object.entries(filters).every(([key, value]) => row[key] === value) &&
    Object.entries(inFilters).every(([key, values]) => values.includes(row[key]));

  const db = {
    from: vi.fn((table: string) => {
      let action: 'select' | 'update' = 'select';
      let updateValues: Record<string, unknown> = {};
      const filters: Record<string, unknown> = {};
      const inFilters: Record<string, unknown[]> = {};
      const query: any = {
        select: () => query,
        update: (values: Record<string, unknown>) => {
          action = 'update';
          updateValues = values;
          return query;
        },
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return query;
        },
        in: (key: string, values: unknown[]) => {
          inFilters[key] = values;
          return query;
        },
        order: () => query,
        limit: () => query,
        maybeSingle: async () => ({
          data:
            table === 'nfe_documents'
              ? fiscalDocument
              : events.find((row) => matches(row, filters, inFilters)) || null,
          error: null,
        }),
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve().then(() => {
            if (action === 'update') {
              const rows = events.filter((row) => matches(row, filters, inFilters));
              rows.forEach((row) => Object.assign(row, updateValues));
              return { data: rows, error: null };
            }
            return {
              data: events
                .filter((row) => matches(row, filters, inFilters))
                .sort((a, b) => b.attempt_number - a.attempt_number),
              error: null,
            };
          }).then(resolve, reject),
      };
      return query;
    }),
    rpc: vi.fn(async (_name: string, args: Record<string, any>) => {
      attempt += 1;
      const event = {
        id: `event-${attempt}`,
        document_id: args.p_document_id,
        event_type: '110110',
        event_sequence: args.p_event_sequence,
        attempt_number: attempt,
        environment: args.p_environment,
        status: 'transmitting',
        justification: args.p_correction,
        signed_xml: args.p_signed_xml,
        request_id: args.p_request_id,
        requested_at: new Date().toISOString(),
        cstat: null,
        xmotivo: null,
        protocol_number: null,
        protocol_date: null,
      };
      events.push(event);
      return { data: [{ event_id: event.id, created: true }], error: null };
    }),
  };
  return { db, events };
}

const authorizedRequest = (body: Record<string, unknown>, method = 'POST') => ({
  method,
  headers: { authorization: 'Bearer user-token' },
  query: { documentId },
  body: { documentId, ...body },
}) as any;

describe('API de Carta de Correção Eletrônica', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
    process.env.NFE_CERTIFICATE_BASE64 = 'mock-certificate';
    process.env.NFE_CERTIFICATE_PASSWORD = 'mock-password';
    delete process.env.NFE_PRODUCTION_ENABLED;
    mocks.authorizeFiscalOperator.mockResolvedValue({ ok: true, userId: documentId });
    mocks.extractCertificateAndKey.mockReturnValue({
      certPem: 'mock-cert-pem',
      privateKeyPem: 'mock-private-key',
      certDerBase64: 'mock-cert-der',
    });
    mocks.signNfeEventXml.mockImplementation((xml: string) => xml);
  });

  it('nega requisição sem autorização fiscal antes de consultar documento ou transmitir', async () => {
    const { db } = database();
    mocks.createClient.mockReturnValue(db);
    mocks.authorizeFiscalOperator.mockResolvedValue({ ok: false, status: 403, message: 'Sem permissão.' });
    const handler = (await import('../../../../../../api/nfe/cce')).default;
    const result = response();

    await handler(authorizedRequest({ action: 'transmit', correction: 'Correção válida com quinze caracteres.', requestId }), result.res);

    expect(result.statusCode).toBe(403);
    expect(db.from).not.toHaveBeenCalled();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('persiste apenas a CC-e confirmada e devolve protocolo', async () => {
    const { db, events } = database();
    mocks.createClient.mockReturnValue(db);
    mocks.sendSoapToSefaz.mockResolvedValue(
      '<retEvento><infEvento><cStat>135</cStat><xMotivo>Evento registrado e vinculado à NF-e</xMotivo><nProt>141260000000001</nProt><dhRegEvento>2026-09-29T12:00:00-03:00</dhRegEvento></infEvento></retEvento>'
    );
    const handler = (await import('../../../../../../api/nfe/cce')).default;
    const result = response();

    await handler(
      authorizedRequest({
        action: 'transmit',
        correction: 'Correção válida do endereço de entrega.',
        requestId,
      }),
      result.res
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ success: true, sequence: 1, cStat: '135', protocolNumber: '141260000000001' });
    expect(events[0]).toMatchObject({ status: 'registered', cstat: '135', protocol_number: '141260000000001' });
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4' })
    );

    const retryResult = response();
    await handler(
      authorizedRequest({
        action: 'transmit',
        correction: 'Correção válida do endereço de entrega.',
        requestId,
      }),
      retryResult.res
    );
    expect(retryResult.statusCode).toBe(200);
    expect(retryResult.body).toMatchObject({ success: true, alreadyProcessed: true, sequence: 1 });
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
  });

  it('não retransmite após timeout e reconcilia pela consulta da chave', async () => {
    const { db, events } = database();
    mocks.createClient.mockReturnValue(db);
    mocks.sendSoapToSefaz
      .mockRejectedValueOnce(new Error('socket timeout'))
      .mockResolvedValueOnce(
        '<retConsSitNFe><procEventoNFe><evento><infEvento><tpEvento>110110</tpEvento><nSeqEvento>1</nSeqEvento></infEvento></evento><retEvento><infEvento><cStat>135</cStat><xMotivo>Evento registrado</xMotivo><nProt>141260000000002</nProt><dhRegEvento>2026-09-29T12:01:00-03:00</dhRegEvento></infEvento></retEvento></procEventoNFe></retConsSitNFe>'
      );
    const handler = (await import('../../../../../../api/nfe/cce')).default;
    const transmitResult = response();

    await handler(
      authorizedRequest({
        action: 'transmit',
        correction: 'Correção válida do endereço de entrega.',
        requestId,
      }),
      transmitResult.res
    );

    expect(transmitResult.statusCode).toBe(202);
    expect(transmitResult.body).toMatchObject({ pending: true });
    expect(events[0].status).toBe('unknown');

    const reconcileResult = response();
    await handler(authorizedRequest({ action: 'reconcile' }), reconcileResult.res);

    expect(reconcileResult.statusCode).toBe(200);
    expect(reconcileResult.body).toMatchObject({ success: true, reconciled: true, sequence: 1 });
    expect(events[0]).toMatchObject({ status: 'registered', cstat: '135', protocol_number: '141260000000002' });
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(2);
    expect(mocks.sendSoapToSefaz.mock.calls[1][0].url).toBe(
      'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4'
    );
  });
});
