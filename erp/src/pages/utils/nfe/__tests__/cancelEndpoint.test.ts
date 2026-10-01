import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  authorizeFiscalOperator: vi.fn(),
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
  extractCertificateAndKey: vi.fn(),
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
  chave_acesso: '1'.repeat(44),
  numero_protocolo: '123456789012345',
  xml_nfe: '<NFe><emit><CNPJ>12345678000195</CNPJ></emit></NFe>',
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

function database(orderStatus: 'fulfilled' | 'scheduled') {
  const from = vi.fn((table: string) => {
    const query: any = {
      select: () => query,
      eq: () => query,
      order: () => query,
      maybeSingle: async () => ({
        data:
          table === 'nfe_documents'
            ? fiscalDocument
            : table === 'orders'
              ? { status: orderStatus, delivery_status: null, delivery_method: null, order_data: {} }
              : null,
        error: null,
      }),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve, reject),
    };
    return query;
  });
  return { from, rpc: vi.fn() };
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

  it('não bloqueia pelo critério de circulação enquanto o pedido segue agendado', async () => {
    const db = database('scheduled');
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(request, result.res as any);

    expect(result.statusCode).toBe(503);
    expect(result.body?.error).toContain('Certificado digital');
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
