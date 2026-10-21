import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mediaHandler from '../../../../../../api/whatsapp-media';
import webhookHandler from '../../../../../api/whatsapp-webhook';
import { handleWhatsAppMedia } from '../../../utils/customerSupport/whatsappMediaProxy';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

function response() {
  return { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis(), end: vi.fn() };
}

describe.each([['standalone', mediaHandler], ['webhook consolidado', webhookHandler]] as const)('Mídia autenticada — %s', (_name, handler) => {
  let db: any;
  let graph: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.stubEnv('SUPABASE_ANON_KEY', 'public-key');
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'server-meta-token');
    db = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator' } }, error: null }) },
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'message' }, error: null }),
    };
    createClient.mockReturnValue(db);
    graph = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://lookaside.fbsbx.com/file', mime_type: 'image/jpeg' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
    vi.stubGlobal('fetch', graph);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  async function request(headers: Record<string, string> = { authorization: 'Bearer user-jwt' }, id: unknown = '12345', method = 'GET') {
    const res = response();
    await handler({ method, query: { operation: 'media', id }, headers } as any, res as any);
    return res;
  }

  it('rejeita ausência de sessão antes de consultar banco ou Meta', async () => {
    const res = await request({});
    expect(res.status).toHaveBeenCalledWith(401);
    expect(createClient).not.toHaveBeenCalled();
    expect(graph).not.toHaveBeenCalled();
  });

  it('rejeita token inválido', async () => {
    db.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid token') });
    expect((await request()).status).toHaveBeenCalledWith(401);
    expect(db.rpc).not.toHaveBeenCalled();
    expect(graph).not.toHaveBeenCalled();
  });

  it('exige viewCustomerSupport confirmado no servidor', async () => {
    db.rpc.mockResolvedValue({ data: false, error: null });
    expect((await request()).status).toHaveBeenCalledWith(403);
    expect(db.rpc).toHaveBeenCalledWith('customer_support_can_view');
    expect(db.from).not.toHaveBeenCalled();
    expect(graph).not.toHaveBeenCalled();
  });

  it('não consulta a Meta quando o gate de permissão falha', async () => {
    db.rpc.mockResolvedValue({ data: null, error: new Error('unavailable') });
    expect((await request()).status).toHaveBeenCalledWith(503);
    expect(graph).not.toHaveBeenCalled();
  });

  it('exige mídia vinculada a uma mensagem visível pela RLS', async () => {
    db.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await request()).status).toHaveBeenCalledWith(404);
    expect(db.from).toHaveBeenCalledWith('whatsapp_messages');
    expect(db.eq).toHaveBeenCalledWith('media_id', '12345');
    expect(graph).not.toHaveBeenCalled();
  });

  it('falha fechado se a consulta da mensagem falhar', async () => {
    db.maybeSingle.mockResolvedValue({ data: null, error: new Error('unavailable') });
    expect((await request()).status).toHaveBeenCalledWith(503);
    expect(graph).not.toHaveBeenCalled();
  });

  it.each([undefined, ['123'], '../me', '123?access_token=secret'])('rejeita identificador inválido %j', async (id) => {
    const res = response();
    await handler({ method: 'GET', query: { operation: 'media', id }, headers: { authorization: 'Bearer user-jwt' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(graph).not.toHaveBeenCalled();
  });

  it('aceita somente GET e preserva o preflight', async () => {
    expect((await request(undefined, '12345', 'POST')).status).toHaveBeenCalledWith(405);
    expect((await request({}, '12345', 'OPTIONS')).status).toHaveBeenCalledWith(200);
    expect(graph).not.toHaveBeenCalled();
  });

  it.each(['image/jpeg', 'image/webp', 'audio/ogg', 'video/mp4', 'application/pdf'])('preserva o binário %s e separa JWT do token Meta', async (mime) => {
    graph.mockReset().mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://lookaside.fbsbx.com/file', mime_type: mime }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
    const res = await request();
    expect(db.auth.getUser).toHaveBeenCalledWith('user-jwt');
    expect(createClient).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
      global: expect.objectContaining({ headers: { Authorization: 'Bearer user-jwt' } }),
    }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(Buffer.from([1, 2, 3]));
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', mime);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    for (const [, options] of graph.mock.calls) expect(options.headers.Authorization).toBe('Bearer server-meta-token');
    expect(res.json).not.toHaveBeenCalled();
  });

  it('não expõe erros nem tokens da Meta', async () => {
    graph.mockReset().mockRejectedValue(new Error('server-meta-token secret URL'));
    const res = await request();
    expect(res.status).toHaveBeenCalledWith(502);
    expect(JSON.stringify(res.json.mock.calls)).not.toMatch(/server-meta-token|secret URL/);
  });
});

it('mantém despacho bloqueado no dispatcher consolidado', async () => {
  const res = response();
  await webhookHandler({ method: 'POST', headers: {}, query: { operation: 'dispatch' } } as any, res as any);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'BLOCKED_FREE_TIER_PROTECTION' }));
});

describe('Mídia com a configuração existente do canal no ERP', () => {
  const lookup = (data: unknown) => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) });
  let userDb: any;
  let configDb: any;
  let message: ReturnType<typeof lookup>;
  let conversation: ReturnType<typeof lookup>;
  let settings: ReturnType<typeof lookup>;
  let graph: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    for (const key of ['WHATSAPP_ACCESS_TOKEN', 'META_ACCESS_TOKEN', 'WHATSAPP_TOKEN']) vi.stubEnv(key, '');
    message = lookup({ id: 'message', conversation_id: 'conversation' });
    conversation = lookup({ business_phone_number_id: '12345' });
    settings = lookup({ whatsappConfig: { phoneNumberId: '12345', accessToken: ' stored-token ' } });
    userDb = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator' } }, error: null }) },
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: vi.fn((table: string) => table === 'whatsapp_messages' ? message : conversation) };
    configDb = { from: vi.fn().mockReturnValue(settings) };
    createClient.mockImplementation((_url, key) => key === 'server-key' ? configDb : userDb);
    graph = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://lookaside.fbsbx.com/file', mime_type: 'image/jpeg' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
    vi.stubGlobal('fetch', graph);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
  const request = async () => {
    const res = response();
    await handleWhatsAppMedia({ method: 'GET', query: { id: '12345' }, headers: { authorization: 'Bearer user-jwt' } } as any,
      res as any, { supabaseUrl: 'https://unit.supabase.co', supabaseAnonKey: 'public-key', supabaseSecretKey: 'server-key' });
    return res;
  };

  it('usa somente a configuração WhatsApp do canal da mensagem, no servidor', async () => {
    const res = await request();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(conversation.eq).toHaveBeenCalledWith('id', 'conversation');
    expect(configDb.from).toHaveBeenCalledWith('settings');
    expect(settings.select).toHaveBeenCalledWith('data->whatsappConfig');
    expect(settings.eq).toHaveBeenCalledWith('id', 'app');
    expect(createClient).toHaveBeenCalledWith('https://unit.supabase.co', 'server-key', expect.objectContaining({
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: expect.any(Function) },
    }));
    for (const [, options] of graph.mock.calls) expect(options.headers.Authorization).toBe('Bearer stored-token');
    expect(JSON.stringify(res.json.mock.calls)).not.toMatch(/stored-token|server-key/);
  });
  it('rejeita configuração de outro canal antes da Meta', async () => {
    settings.maybeSingle.mockResolvedValue({ data: { whatsappConfig: { phoneNumberId: 'other', accessToken: 'stored-token' } }, error: null });
    expect((await request()).status).toHaveBeenCalledWith(503);
    expect(graph).not.toHaveBeenCalled();
  });
  it.each(['', 123])('rejeita token de configuração inválido %j', async (accessToken) => {
    settings.maybeSingle.mockResolvedValue({ data: { whatsappConfig: { phoneNumberId: '12345', accessToken } }, error: null });
    expect((await request()).status).toHaveBeenCalledWith(503);
    expect(graph).not.toHaveBeenCalled();
  });
  it.each([null, [], true, 'legacy'])('rejeita configuração sem objeto %j', async (whatsappConfig) => {
    settings.maybeSingle.mockResolvedValue({ data: { whatsappConfig }, error: null });
    expect((await request()).status).toHaveBeenCalledWith(503);
    expect(graph).not.toHaveBeenCalled();
  });
  it('não consulta configuração privilegiada sem mensagem visível', async () => {
    message.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await request()).status).toHaveBeenCalledWith(404);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(configDb.from).not.toHaveBeenCalled();
  });
  it('não consulta configuração privilegiada sem permissão', async () => {
    userDb.rpc.mockResolvedValue({ data: false, error: null });
    expect((await request()).status).toHaveBeenCalledWith(403);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(configDb.from).not.toHaveBeenCalled();
  });
  it('falha fechado ao consultar o canal', async () => {
    conversation.maybeSingle.mockResolvedValue({ data: null, error: new Error('unavailable') });
    expect((await request()).status).toHaveBeenCalledWith(503);
    expect(configDb.from).not.toHaveBeenCalled();
    expect(graph).not.toHaveBeenCalled();
  });
  it('falha fechado ao consultar a configuração', async () => {
    settings.maybeSingle.mockResolvedValue({ data: null, error: new Error('unavailable') });
    expect((await request()).status).toHaveBeenCalledWith(503);
    expect(graph).not.toHaveBeenCalled();
  });
  it('preserva a prioridade do token de ambiente', async () => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'environment-token');
    expect((await request()).status).toHaveBeenCalledWith(200);
    expect(configDb.from).not.toHaveBeenCalled();
    expect(userDb.from).toHaveBeenCalledTimes(1);
    expect(graph.mock.calls[0][1].headers.Authorization).toBe('Bearer environment-token');
  });
});
