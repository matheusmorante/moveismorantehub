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
const accessKey = (model: string) =>
  '41' + '2610' + '12345678000195' + model + '001' + '000000001' + '1' + '00000000' + '0';
const document = {
  id: documentId,
  order_id: orderId,
  document_type: 'outbound',
  status: 'homologada',
  ambiente: 2,
  modelo: '55',
  chave_acesso: accessKey('55'),
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

  it('indica NF-e de estorno após NFC-e 65 vencer os 30 minutos no Paraná', async () => {
    const scheduledOrder = { id: orderId, status: 'scheduled', order_type: 'sale', order_data: {} };
    const expiredNfce = {
      ...document,
      modelo: '65',
      chave_acesso: accessKey('65'),
      xml_protocolo:
        '<protNFe><infProt><dhRecbto>' +
        new Date(Date.now() - 31 * 60 * 1000).toISOString() +
        '</dhRecbto></infProt></protNFe>',
    };
    mocks.createClient.mockReturnValue({
      from: (table: string) =>
        query(table === 'orders' ? scheduledOrder : table === 'nfe_documents' ? [expiredNfce] : []),
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
      action: 'estorno',
      hasAuthorizedInvoice: true,
      model: '65',
      documentId,
      environment: 2,
      reason: expect.stringContaining('NF-e modelo 55 de ajuste'),
    });
  });

  it('encaminha venda entregue à devolução sem cancelá-la mesmo dentro do prazo', async () => {
    const deliveredOrder = { id: orderId, status: 'fulfilled', order_type: 'sale', order_data: {} };
    mocks.createClient.mockReturnValue({
      from: (table: string) =>
        query(table === 'orders' ? deliveredOrder : table === 'nfe_documents' ? [document] : []),
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
      action: 'return',
      hasAuthorizedInvoice: true,
      reason: expect.stringContaining('pedido já foi entregue'),
    });
  });

  it('bloqueia pedido em trânsito sem presumir estorno nem iniciar devolução', async () => {
    const inTransitOrder = {
      id: orderId,
      status: 'scheduled',
      order_type: 'sale',
      delivery_status: 'in_transit',
      order_data: {},
    };
    const expiredDocument = {
      ...document,
      xml_protocolo:
        '<protNFe><infProt><dhRecbto>' +
        new Date(Date.now() - 169 * 60 * 60 * 1000).toISOString() +
        '</dhRecbto></infProt></protNFe>',
    };
    mocks.createClient.mockReturnValue({
      from: (table: string) =>
        query(table === 'orders' ? inTransitOrder : table === 'nfe_documents' ? [expiredDocument] : []),
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
      action: 'blocked',
      hasAuthorizedInvoice: true,
      reason: expect.stringContaining('Confirme recusa ou retorno'),
    });
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

  it('bloqueia o cancelamento comercial enquanto a emissão da NF está pendente', async () => {
    const scheduledOrder = { id: orderId, status: 'scheduled', order_type: 'sale', order_data: {} };
    const pendingDocument = { ...document, status: 'pendente' };
    mocks.createClient.mockReturnValue({
      from: (table: string) =>
        query(table === 'orders' ? scheduledOrder : table === 'nfe_documents' ? [pendingDocument] : []),
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
      action: 'pending',
      hasAuthorizedInvoice: false,
      reason: expect.stringContaining('reconcilie a situação fiscal'),
    });
  });

  it('pede reconciliação para status fiscal desconhecido em vez de presumir ausência de nota', async () => {
    const scheduledOrder = { id: orderId, status: 'scheduled', order_type: 'sale', order_data: {} };
    const unknownDocument = { ...document, status: 'validando_documento' };
    mocks.createClient.mockReturnValue({
      from: (table: string) =>
        query(table === 'orders' ? scheduledOrder : table === 'nfe_documents' ? [unknownDocument] : []),
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
      action: 'reconcile',
      hasAuthorizedInvoice: false,
      reason: expect.stringContaining('status não reconhecido'),
    });
  });

  it('não aplica os prazos paranaenses quando a chave indica outra UF', async () => {
    const scheduledOrder = { id: orderId, status: 'scheduled', order_type: 'sale', order_data: {} };
    const otherUfDocument = {
      ...document,
      chave_acesso: '35' + document.chave_acesso.slice(2),
    };
    mocks.createClient.mockReturnValue({
      from: (table: string) =>
        query(table === 'orders' ? scheduledOrder : table === 'nfe_documents' ? [otherUfDocument] : []),
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
      action: 'manual_review',
      reason: expect.stringContaining('prazo fiscal específico'),
    });
  });

  it('não tenta novo cancelamento fiscal quando o documento já está cancelado', async () => {
    const scheduledOrder = { id: orderId, status: 'scheduled', order_type: 'sale', order_data: {} };
    const cancelledDocument = { ...document, status: 'cancelada' };
    mocks.createClient.mockReturnValue({
      from: (table: string) =>
        query(table === 'orders' ? scheduledOrder : table === 'nfe_documents' ? [cancelledDocument] : []),
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

  it('avalia a nota solicitada mesmo quando outras NF-e autorizadas estão ligadas ao mesmo pedido', async () => {
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
      canProceed: true,
      action: 'cancel',
    });
  });
});
