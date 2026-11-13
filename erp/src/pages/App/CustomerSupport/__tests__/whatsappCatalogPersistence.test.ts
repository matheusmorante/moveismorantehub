import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWhatsAppSupportSendHandler } from '../../../../../../api/whatsapp-support-send';
import { mapRowToMessage } from '@/pages/utils/customerSupport/customerSupportMappers';
import { getCatalogRetailerIds } from '../catalogInteractiveProducts';

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(), permission: vi.fn(), createClient: vi.fn(), secret: vi.fn(),
  resolveCatalog: vi.fn(), insert: vi.fn(), adminRpc: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({ createClient: mocks.createClient }));
vi.mock('../../../../../api/_lib/authenticatedErpRequest.js', () => ({
  authenticateErpRequest: mocks.authenticate, hasErpPermission: mocks.permission,
}));
vi.mock('../../../../../../api/supabaseSecretKey.js', () => ({ getSupabaseSecretKey: mocks.secret }));
vi.mock('../../../../../../api/whatsappSupportCatalogMessage.js', () => ({
  resolveWhatsAppSupportCatalogMessage: mocks.resolveCatalog,
}));

const conversationId = '33333333-3333-4333-8333-333333333333';
const productId = '22222222-2222-4222-8222-222222222222';

function userQuery(result: unknown) {
  const query = {
    select: () => query,
    eq: () => query,
    contains: () => query,
    maybeSingle: async () => result,
    limit: async () => result,
  };
  return query;
}

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://example.invalid');
  vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'token-de-teste');
  mocks.permission.mockReturnValue(true);
  mocks.secret.mockReturnValue('segredo-de-teste');
  mocks.resolveCatalog.mockResolvedValue({
    text: 'Confira este produto.',
    nativeProducts: [{ retailerId: 'BALCAO-02', name: 'Balcão azul' }],
  });
  const userDb = {
    rpc: async () => ({ data: true, error: null }),
    from: (table: string) => {
      if (table === 'whatsapp_conversations') return userQuery({ data: {
        id: conversationId, business_phone_number_id: '12345', contact_phone: '5541999999999',
        last_customer_message_at: new Date(Date.now() - 60_000).toISOString(), is_archived: false,
      }, error: null });
      if (table === 'whatsapp_messages') return userQuery({ data: [], error: null });
      if (table === 'settings') return userQuery({ data: { whatsappConfig: { phoneNumberId: '12345', catalogId: '67890' } }, error: null });
      if (table === 'profiles') return userQuery({ data: { full_name: 'Atendente' }, error: null });
      throw new Error(`Consulta inesperada: ${table}`);
    },
  };
  mocks.authenticate.mockResolvedValue({ userId: 'operator', userDb, whatsappConfig: { phoneNumberId: '12345', wabaId: '67890' } });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.adminRpc.mockImplementation(async (name: string) => name === 'customer_support_outside_window_quota'
    ? { data: { allowed: true, exempt: true, reservation_id: null }, error: null }
    : { data: true, error: null });
  const conversationUpdate: any = {
    eq: () => conversationUpdate,
    lte: () => conversationUpdate,
    then: (resolve: (value: { error: null }) => void) => resolve({ error: null }),
  };
  mocks.createClient.mockReturnValue({
    rpc: mocks.adminRpc,
    from: (table: string) => table === 'whatsapp_messages'
      ? { insert: mocks.insert }
      : { update: () => conversationUpdate },
  });
});

describe('acesso aos detalhes de cobrança da Meta', () => {
  it('exige acesso financeiro antes de consultar valores na Meta', async () => {
    mocks.permission.mockImplementation((_context, permission) => permission === 'viewCustomerSupport');
    const fetchMeta = vi.fn();
    const handler = createWhatsAppSupportSendHandler({ fetchMeta: fetchMeta as unknown as typeof fetch });
    const res: any = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    await handler({ method: 'GET', query: { include_cost: '1' }, headers: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ metaUsage: expect.objectContaining({ status: 'restricted' }) }));
    expect(fetchMeta).not.toHaveBeenCalled();
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('histórico de cards enviados pela Central', () => {
  it.each([
    { products: [{ retailerId: 'BALCAO-02', name: 'Balcão azul' }], type: 'product' },
    { products: [{ retailerId: 'BALCAO-02', name: 'Balcão azul' }, { retailerId: 'MESA-01', name: 'Mesa' }], type: 'product_list' },
  ])('guarda os identificadores de $type confirmado pela Meta', async ({ products, type }) => {
    mocks.resolveCatalog.mockResolvedValue({ text: 'Confira os produtos.', nativeProducts: products });
    const fetchMeta = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: 'wamid.fake' }] }) });
    const handler = createWhatsAppSupportSendHandler({ fetchMeta: fetchMeta as unknown as typeof fetch });
    const body = {
      conversationId, message: 'Confira este produto.',
      catalogSelection: { items: [{ productId }], bulkScope: null, hidePrices: false, deliveryMode: 'native' },
    };
    const req = { method: 'POST', headers: { 'content-type': 'application/json' }, rawBody: Buffer.from(JSON.stringify(body)) };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    await handler(req as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.createClient).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ accepted: true, persisted: true }));
    const saved = mocks.insert.mock.calls[0][0];
    expect(saved.message_type).toBe('interactive');
    expect(saved.raw_payload).toMatchObject({
      provider_message_type: type,
      catalog_product_count: products.length,
      catalog_products: products.map((product) => ({ retailer_id: product.retailerId, name: product.name })),
    });
    expect(getCatalogRetailerIds(mapRowToMessage(saved))).toEqual(products.map((product) => product.retailerId));
    expect(fetchMeta).toHaveBeenCalledTimes(1);
    expect(mocks.adminRpc).toHaveBeenCalledWith('customer_support_outside_window_quota', expect.objectContaining({
      p_conversation_id: conversationId, p_reserve: true,
    }));
    expect(mocks.adminRpc).not.toHaveBeenCalledWith('customer_support_finish_whatsapp_send_quota', expect.anything());
    const sentPayload = JSON.parse(fetchMeta.mock.calls[0][1].body);
    expect(sentPayload.interactive.type).toBe(type);
  });

  it('interrompe o envio quando a cota interna de ritmo está esgotada', async () => {
    mocks.adminRpc.mockResolvedValue({ data: { allowed: false, exempt: false, minute_remaining: 0, minute_limit: 10,
      hour_remaining: 40, hour_limit: 50, retry_after_seconds: 30 }, error: null });
    const fetchMeta = vi.fn();
    const handler = createWhatsAppSupportSendHandler({ fetchMeta: fetchMeta as unknown as typeof fetch });
    const body = { conversationId, message: 'Olá' };
    const req = { method: 'POST', headers: { 'content-type': 'application/json' }, rawBody: Buffer.from(JSON.stringify(body)) };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    await handler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(fetchMeta).not.toHaveBeenCalled();
  });
});
