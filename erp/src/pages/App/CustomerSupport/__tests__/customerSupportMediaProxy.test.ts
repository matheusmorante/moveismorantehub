import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mediaHandler from '../../../../../../api/whatsapp-media';
import webhookHandler from '../../../../../api/whatsapp-webhook';
import { handleWhatsAppMedia } from '../../../utils/customerSupport/whatsappMediaProxy';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

function response() {
  return { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis(), end: vi.fn() };
}

function mediaResponse(bytes = new Uint8Array([1, 2, 3])) {
  return {
    ok: true,
    headers: { get: (name: string) => name.toLowerCase() === 'content-length' ? String(bytes.byteLength) : null },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  };
}

describe.each([['standalone', mediaHandler], ['webhook consolidado', webhookHandler]] as const)('Mídia autenticada — %s', (_name, handler) => {
  let db: any;
  let graph: ReturnType<typeof vi.fn>;
  let messageRows: Array<{ id: string; conversation_id: string }>;
  let messageQueryError: Error | null;
  let conversationRow: { business_phone_number_id: string } | null;
  let conversationQueryError: Error | null;
  beforeEach(() => {
    vi.stubEnv('SUPABASE_ANON_KEY', 'public-key');
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'server-meta-token');
    messageRows = [{ id: 'message', conversation_id: 'conversation' }];
    messageQueryError = null;
    conversationRow = { business_phone_number_id: '987654321' };
    conversationQueryError = null;
    db = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator' } }, error: null }) },
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      currentTable: '',
      from: vi.fn((table: string) => { db.currentTable = table; return db; }),
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(async () => ({ data: messageRows, error: messageQueryError })),
      maybeSingle: vi.fn().mockImplementation(async () => ({ data: conversationRow, error: conversationQueryError })),
    };
    createClient.mockReturnValue(db);
    graph = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://lookaside.fbsbx.com/file', mime_type: 'image/jpeg' }) })
      .mockResolvedValueOnce(mediaResponse());
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
    messageRows = [];
    expect((await request()).status).toHaveBeenCalledWith(404);
    expect(db.from).toHaveBeenCalledWith('whatsapp_messages');
    expect(db.eq).toHaveBeenCalledWith('media_id', '12345');
    expect(graph).not.toHaveBeenCalled();
  });

  it('falha fechado se a consulta da mensagem falhar', async () => {
    messageQueryError = new Error('unavailable');
    expect((await request()).status).toHaveBeenCalledWith(503);
    expect(graph).not.toHaveBeenCalled();
  });

  it('falha fechado se o canal da conversa não estiver visível pela RLS', async () => {
    conversationQueryError = new Error('unavailable');
    expect((await request()).status).toHaveBeenCalledWith(503);
    expect(db.from).toHaveBeenNthCalledWith(2, 'whatsapp_conversations');
    expect(graph).not.toHaveBeenCalled();
  });

  it('rejeita um media_id ambíguo associado a mais de uma mensagem', async () => {
    messageRows = [
      { id: 'message-1', conversation_id: 'conversation-1' },
      { id: 'message-2', conversation_id: 'conversation-2' },
    ];
    expect((await request()).status).toHaveBeenCalledWith(404);
    expect(db.from).not.toHaveBeenCalledWith('whatsapp_conversations');
    expect(graph).not.toHaveBeenCalled();
  });

  it('rejeita canais sintéticos ou inválidos antes de chamar a Meta', async () => {
    conversationRow = { business_phone_number_id: 'test-artifact:run-id' };
    expect((await request()).status).toHaveBeenCalledWith(404);
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
      .mockResolvedValueOnce(mediaResponse());
    const res = await request();
    expect(db.auth.getUser).toHaveBeenCalledWith('user-jwt');
    expect(createClient).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
      global: expect.objectContaining({ headers: { Authorization: 'Bearer user-jwt' } }),
    }));
    expect(db.from).toHaveBeenNthCalledWith(2, 'whatsapp_conversations');
    expect(graph.mock.calls[0][0]).toBe('https://graph.facebook.com/v26.0/12345?phone_number_id=987654321');
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

describe('Token Meta da mídia', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  it('exige token de ambiente e ignora credenciais legadas do banco', async () => {
    vi.stubEnv('SUPABASE_ANON_KEY', 'public-key');
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', '');
    const userDb = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator' } }, error: null }) },
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: vi.fn(function (this: any) { return this; }), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ id: 'message', conversation_id: 'conversation' }], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { business_phone_number_id: '987654321' }, error: null }),
    };
    createClient.mockReturnValue(userDb);
    const graph = vi.fn(); vi.stubGlobal('fetch', graph);
    const res = response();
    await handleWhatsAppMedia({ method: 'GET', query: { id: '12345' }, headers: { authorization: 'Bearer user-jwt' } } as any,
      res as any, { supabaseUrl: 'https://unit.supabase.co', supabaseAnonKey: 'public-key' });
    expect(res.status).toHaveBeenCalledWith(503);
    expect(userDb.from).toHaveBeenCalledWith('whatsapp_messages');
    expect(graph).not.toHaveBeenCalled();
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
