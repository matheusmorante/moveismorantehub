import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), authorizeFiscalOperator: vi.fn() }));

vi.mock('../../../../../../api/supabaseSecretKey', () => ({
  getSupabaseSecretKey: () => 'test-service-key',
}));
vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({
  createClient: mocks.createClient,
}));
vi.mock('../../../../../../api/nfe/fiscalAuthorization', () => ({
  authorizeFiscalOperator: mocks.authorizeFiscalOperator,
}));

const documentId = '77777777-7777-4777-8777-777777777777';
const orderId = '88888888-8888-4888-8888-888888888888';
const document = {
  id: documentId,
  order_id: orderId,
  document_type: 'outbound',
  status: 'homologada',
  ambiente: 2,
  modelo: '55',
  chave_acesso: '1'.repeat(44),
  numero_protocolo: '141260000000001',
  xml_protocolo: `<protNFe><infProt><dhRecbto>${new Date(Date.now() - 60 * 60 * 1000).toISOString()}</dhRecbto></infProt></protNFe>`,
  created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
};

function query(data: unknown) {
  const current: any = {
    select: () => current,
    in: () => current,
    eq: () => current,
    order: () => current,
    limit: () => current,
    maybeSingle: () =>
      Promise.resolve({ data: Array.isArray(data) ? (data[0] ?? null) : data, error: null }),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve, reject),
  };
  return current;
}

function response() {
  let statusCode = 200;
  let body: any;
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
      return body;
    },
  };
}

describe('API de pré-validação do cancelamento fiscal por documento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    mocks.authorizeFiscalOperator.mockResolvedValue({ ok: true, userId: 'test-user' });
  });

  it('retorna a elegibilidade fiscal central para a página de Notas Fiscais de Saída', async () => {
    mocks.createClient.mockReturnValue({
      from: (table: string) =>
        query(
          table === 'nfe_documents'
            ? [document]
            : table === 'orders'
              ? [{ id: orderId, status: 'scheduled', order_data: {} }]
              : []
        ),
    });
    const handler = (await import('../../../../../../api/nfe/order-cancellation-policy')).default;
    const result = response();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        body: { documentIds: [documentId] },
      } as any,
      result.res as any
    );

    expect(result.statusCode).toBe(200);
    expect(result.body.documents[documentId]).toMatchObject({
      canProceed: true,
      action: 'cancel',
      orderId,
      orderStatus: 'scheduled',
    });
  });

  it('retorna a prévia de cancelamento ou estorno usada pela tela de pedidos', async () => {
    const scheduledOrder = { id: orderId, status: 'scheduled', order_data: {} };
    const authorizedDocument = {
      ...document,
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    };
    mocks.createClient.mockReturnValue({
      from: (table: string) =>
        query(table === 'orders' ? scheduledOrder : [authorizedDocument]),
    });
    const handler = (await import('../../../../../../api/nfe/order-cancellation-policy')).default;
    const result = response();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        body: { orderId, preview: true },
      } as any,
      result.res as any
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({
      action: 'cancel',
      hasAuthorizedInvoice: true,
      model: '55',
      documentId,
      environment: 2,
    });
  });

  it('indica estorno após o prazo da NF-e 55 na prévia da tela de pedidos', async () => {
    const scheduledOrder = { id: orderId, status: 'scheduled', order_data: {} };
    const expiredDocument = {
      ...document,
      created_at: new Date(Date.now() - 169 * 60 * 60 * 1000).toISOString(),
      xml_protocolo: `<protNFe><infProt><dhRecbto>${new Date(Date.now() - 169 * 60 * 60 * 1000).toISOString()}</dhRecbto></infProt></protNFe>`,
    };
    mocks.createClient.mockReturnValue({
      from: (table: string) => query(table === 'orders' ? scheduledOrder : [expiredDocument]),
    });
    const handler = (await import('../../../../../../api/nfe/order-cancellation-policy')).default;
    const result = response();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        body: { orderId, preview: true },
      } as any,
      result.res as any
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ action: 'estorno', hasAuthorizedInvoice: true });
  });

  it('mantém o cancelamento somente comercial quando não há NF-e de saída autorizada', async () => {
    const scheduledOrder = { id: orderId, status: 'scheduled', order_data: {} };
    mocks.createClient.mockReturnValue({
      from: (table: string) => query(table === 'orders' ? scheduledOrder : []),
    });
    const handler = (await import('../../../../../../api/nfe/order-cancellation-policy')).default;
    const result = response();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        body: { orderId, preview: true },
      } as any,
      result.res as any
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ action: 'none', hasAuthorizedInvoice: false });
  });

  it('não estima cancelamento nem estorno pela data de cadastro se faltar dhRecbto', async () => {
    const scheduledOrder = { id: orderId, status: 'scheduled', order_data: {} };
    const documentWithoutAuthorizationTime = {
      ...document,
      created_at: new Date(Date.now() - 169 * 60 * 60 * 1000).toISOString(),
      xml_protocolo: '',
    };
    mocks.createClient.mockReturnValue({
      from: (table: string) => query(table === 'orders' ? scheduledOrder : [documentWithoutAuthorizationTime]),
    });
    const handler = (await import('../../../../../../api/nfe/order-cancellation-policy')).default;
    const result = response();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        body: { orderId, preview: true },
      } as any,
      result.res as any
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ action: 'manual_review', hasAuthorizedInvoice: true });
  });

  it('não sinaliza cancelamento em uma nota com evento anterior ainda em transmissão', async () => {
    mocks.createClient.mockReturnValue({
      from: (table: string) =>
        query(
          table === 'nfe_documents'
            ? [document]
            : table === 'orders'
              ? [{ id: orderId, status: 'scheduled', order_data: {} }]
              : [
                  {
                    document_id: documentId,
                    status: 'transmitting',
                    requested_at: new Date().toISOString(),
                    attempt_number: 1,
                  },
                ]
        ),
    });
    const handler = (await import('../../../../../../api/nfe/order-cancellation-policy')).default;
    const result = response();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        body: { documentIds: [documentId] },
      } as any,
      result.res as any
    );

    expect(result.body.documents[documentId]).toMatchObject({
      canProceed: false,
      action: 'pending',
    });
  });

  it('não libera a ação quando outra NF-e autorizada está ligada ao mesmo pedido', async () => {
    let documentQueryCount = 0;
    mocks.createClient.mockReturnValue({
      from: (table: string) => {
        if (table === 'nfe_documents') {
          documentQueryCount += 1;
          return query(
            documentQueryCount === 1
              ? [document]
              : [document, { ...document, id: '99999999-9999-4999-8999-999999999999' }]
          );
        }
        return query(
          table === 'orders' ? [{ id: orderId, status: 'scheduled', order_data: {} }] : []
        );
      },
    });
    const handler = (await import('../../../../../../api/nfe/order-cancellation-policy')).default;
    const result = response();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
        body: { documentIds: [documentId] },
      } as any,
      result.res as any
    );

    expect(result.body.documents[documentId]).toMatchObject({
      canProceed: false,
      action: 'manual_review',
    });
  });
});
