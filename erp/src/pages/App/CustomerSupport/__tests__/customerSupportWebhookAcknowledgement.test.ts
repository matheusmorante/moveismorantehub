// @vitest-environment node
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));
// The standalone API resolves the root dependency, distinct from ERP's copy.
vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({ createClient }));

const entries = [
  ['standalone', () => import('../../../../../../api/whatsapp-webhook')],
  ['consolidado', () => import('../../../../../api/whatsapp-webhook')],
] as const;

function database() {
  const maybeSingle = vi.fn();
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle };
  return {
    from: vi.fn().mockReturnValue(query), maybeSingle,
    rpc: vi.fn().mockResolvedValue({ error: null, data: {
      conversation_id: 'conversation-unit', message_id: 'message-unit', inserted: true, reopened: false,
    } }),
  };
}

function payload(count = 1) {
  return { entry: [{ changes: [{ value: {
    metadata: { phone_number_id: 'channel-unit' },
    messages: Array.from({ length: count }, (_, index) => ({
      id: `wamid.unit-ack-${index}`, from: '5511999990000', timestamp: '1792580000',
      type: 'text', text: { body: 'Mensagem de teste isolado' },
    })),
  } }] }] };
}

describe.each(entries)('Confirmação HTTP do webhook — %s', (_name, load) => {
  let db: ReturnType<typeof database>;
  let network: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('WHATSAPP_APP_SECRET', 'unit-webhook-secret');
    vi.stubEnv('META_APP_SECRET', '');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'unit-service-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'unit-service-key');
    vi.stubEnv('SUPABASE_URL', 'https://unit.supabase.co');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://unit.supabase.co');
    db = database();
    createClient.mockReturnValue(db);
    network = vi.fn().mockRejectedValue(new Error('Network forbidden in unit proof.'));
    vi.stubGlobal('fetch', network);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    const networkCalls = network.mock.calls.length;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    expect(networkCalls).toBe(0);
  });

  async function request(body = payload(), signature?: string) {
    const rawBody = Buffer.from(JSON.stringify(body));
    const signed = 'sha256=' + createHmac('sha256', 'unit-webhook-secret').update(rawBody).digest('hex');
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    const { default: handler } = await load();
    await handler({ method: 'POST', query: {}, rawBody,
      headers: { 'x-hub-signature-256': signature ?? signed } } as any, res as any);
    return res;
  }

  it('não confirma recebimento quando uma consulta necessária falha', async () => {
    db.maybeSingle.mockResolvedValue({ data: null, error: { code: '08006', message: 'Private database detail' } });
    const res = await request();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Webhook processing could not be completed.' });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it.each([
    { data: null, error: { code: '08006', message: 'Private database detail' } },
    { data: null, error: null },
  ])('não confirma erro ou ausência de recibo da persistência: %j', async (result) => {
    db.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'conversation-unit', customer_id: 'customer-unit', customer_link_status: 'manually_linked' }, error: null });
    db.rpc.mockResolvedValue(result);
    const res = await request();
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Webhook processing could not be completed.' });
  });

  it('não confirma o lote quando uma mensagem é persistida e a seguinte falha', async () => {
    db.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'conversation-unit', customer_id: 'customer-unit', customer_link_status: 'manually_linked' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '08006', message: 'Private database detail' } });
    const res = await request(payload(2));
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Webhook processing could not be completed.' });
  });

  it('confirma a mensagem somente após o recibo válido da RPC', async () => {
    db.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'conversation-unit', customer_id: 'customer-unit', customer_link_status: 'manually_linked' }, error: null });
    const res = await request();
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'EVENT_RECEIVED' });
  });

  it('confirma a duplicata validada pela RPC sem inserir uma nova mensagem', async () => {
    db.maybeSingle.mockResolvedValue({ data: { id: 'message-unit' }, error: null });
    db.rpc.mockResolvedValue({ error: null, data: {
      conversation_id: 'conversation-unit', message_id: 'message-unit', inserted: false, reopened: false,
    } });
    const res = await request();
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('mantém a recusa de assinatura inválida antes de criar cliente de banco', async () => {
    const res = await request(payload(), 'sha256=' + '0'.repeat(64));
    expect(res.status).toHaveBeenCalledWith(401);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('mantém a recusa de segredo ausente em produção', async () => {
    vi.stubEnv('WHATSAPP_APP_SECRET', '');
    const res = await request();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(createClient).not.toHaveBeenCalled();
  });
});
