import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  authenticateErpRequest: vi.fn(),
  hasErpPermission: vi.fn(),
}));
const quotaMocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('../../../../../api/_lib/authenticatedErpRequest.js', () => authMocks);
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ rpc: quotaMocks.rpc })) }));

import handler from '../../../../../api/secure-integrations';

const appId = '1364259738556530';
const appSecret = 'app-secret-unit';
const metaToken = 'whatsapp-token-unit';

function responseMock() {
  const response: Record<string, unknown> = {
    statusCode: 0,
    body: undefined,
    headers: {},
    setHeader(name: string, value: string) {
      (this.headers as Record<string, string>)[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    end() { return this; },
  };
  return response;
}

async function callVerificationRoute(operation = 'verify_app_credentials') {
  const req = {
    method: 'POST',
    query: { operation: 'meta-graph' },
    headers: { authorization: 'Bearer authenticated-session' },
    body: { operation },
  };
  const res = responseMock();
  await handler(req as never, res as never);
  return res;
}

beforeEach(() => {
  vi.stubEnv('WHATSAPP_ACCESS_TOKEN', metaToken);
  vi.stubEnv('WHATSAPP_APP_ID', appId);
  vi.stubEnv('WHATSAPP_APP_SECRET', appSecret);
  vi.stubEnv('WHATSAPP_VERIFY_TOKEN', 'webhook-verify-token-unit');
  authMocks.authenticateErpRequest.mockResolvedValue({
    userId: 'operator-unit', roles: ['manager'], rolePermissions: {}, userDb: {},
  });
  authMocks.hasErpPermission.mockReturnValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('POST /api/meta-graph verify_app_credentials', () => {
  it('exige manageSettings e não contata a Meta quando a permissão falta', async () => {
    const graph = vi.fn();
    vi.stubGlobal('fetch', graph);
    authMocks.hasErpPermission.mockReturnValue(false);

    const res = await callVerificationRoute();

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Sem permissão para verificar a configuração Meta.' });
    expect(authMocks.hasErpPermission).toHaveBeenCalledWith(expect.any(Object), 'manageSettings');
    expect(graph).not.toHaveBeenCalled();
  });

  it('retorna somente a confirmação booleana e mantém o segredo no cabeçalho server-side', async () => {
    const graph = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: appId }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { app_id: appId, is_valid: true, scopes: ['whatsapp_business_management'] },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', graph);

    const res = await callVerificationRoute();

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ valid: true });
    expect(JSON.stringify(res.body)).not.toContain(appSecret);
    expect(JSON.stringify(res.body)).not.toContain(metaToken);
    expect(graph).toHaveBeenCalledTimes(2);
    const [appUrl, appRequest] = graph.mock.calls[0] as [URL, RequestInit];
    const [url, request] = graph.mock.calls[1] as [URL, RequestInit];
    expect(appUrl.origin + appUrl.pathname).toBe(`https://graph.facebook.com/v26.0/${appId}`);
    expect(appUrl.searchParams.get('fields')).toBe('id');
    expect(appUrl.searchParams.get('appsecret_proof')).toBe(
      createHmac('sha256', appSecret).update(`${appId}|${appSecret}`).digest('hex')
    );
    expect(appUrl.toString()).not.toContain(appSecret);
    expect(appRequest.headers).toEqual({ Authorization: `Bearer ${appId}|${appSecret}` });
    expect(url.origin + url.pathname).toBe('https://graph.facebook.com/v26.0/debug_token');
    expect(url.searchParams.get('input_token')).toBe(metaToken);
    expect(url.searchParams.get('appsecret_proof')).toBe(
      createHmac('sha256', appSecret).update(`${appId}|${appSecret}`).digest('hex')
    );
    expect(url.toString()).not.toContain(appSecret);
    expect(request.headers).toEqual({ Authorization: `Bearer ${appId}|${appSecret}` });
  });

  it('responde 503 sem App Secret e não inicia consulta externa', async () => {
    vi.stubEnv('WHATSAPP_APP_SECRET', '');
    const graph = vi.fn();
    vi.stubGlobal('fetch', graph);

    const res = await callVerificationRoute();

    expect(res.statusCode).toBe(503);
    expect(graph).not.toHaveBeenCalled();
  });
});

describe('POST /api/meta-graph verify_waba_subscription', () => {
  it('exige manageSettings antes de consultar configuração ou Graph', async () => {
    const graph = vi.fn();
    vi.stubGlobal('fetch', graph);
    authMocks.hasErpPermission.mockReturnValue(false);

    const res = await callVerificationRoute('verify_waba_subscription');

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Sem permissão para verificar a inscrição do webhook.' });
    expect(graph).not.toHaveBeenCalled();
  });

  it('consulta o WABA configurado e retorna somente o status booleano', async () => {
    const from = vi.fn();
    authMocks.authenticateErpRequest.mockResolvedValue({
      userId: 'operator-unit', roles: ['manager'], rolePermissions: {}, userDb: { from },
      whatsappConfig: { wabaId: '2345678901' },
    });
    const graph = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ whatsapp_business_api_data: { id: appId, name: 'não expor este nome' } }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', graph);

    const res = await callVerificationRoute('verify_waba_subscription');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ valid: true, subscribed: true });
    expect(JSON.stringify(res.body)).not.toContain(appSecret);
    expect(JSON.stringify(res.body)).not.toContain(metaToken);
    expect(JSON.stringify(res.body)).not.toContain('não expor este nome');
    expect(from).not.toHaveBeenCalled();
    expect(authMocks.authenticateErpRequest).toHaveBeenCalledWith(
      expect.any(Object), expect.any(Object), { includeWhatsAppConfig: true },
    );
    const [url, request] = graph.mock.calls[0] as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe('https://graph.facebook.com/v26.0/2345678901/subscribed_apps');
    expect(request.headers).toEqual({ Authorization: `Bearer ${metaToken}` });
  });

  it('falha fechado quando o WABA não está configurado ou não pode ser lido', async () => {
    const from = vi.fn();
    authMocks.authenticateErpRequest.mockResolvedValue({
      userId: 'operator-unit', roles: ['manager'], rolePermissions: {}, userDb: { from },
      whatsappConfig: { wabaId: '' },
    });
    const graph = vi.fn();
    vi.stubGlobal('fetch', graph);

    const res = await callVerificationRoute('verify_waba_subscription');

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'WABA não configurado no sistema.' });
    expect(graph).not.toHaveBeenCalled();
  });
});

describe('POST /api/meta-graph ensure_smb_message_echoes_subscription', () => {
  it('exige manageSettings antes de chamar a Meta', async () => {
    const graph = vi.fn();
    vi.stubGlobal('fetch', graph);
    authMocks.hasErpPermission.mockReturnValue(false);

    const res = await callVerificationRoute('ensure_smb_message_echoes_subscription');

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Sem permissão para alterar a inscrição do webhook.' });
    expect(graph).not.toHaveBeenCalled();
  });

  it('atualiza a inscrição idempotente usando segredo somente no servidor e confirma o readback', async () => {
    const current = { object: 'whatsapp_business_account', callback_url: 'https://morantehub.vercel.app/api/whatsapp-webhook',
      active: true, fields: [{ name: 'messages' }], include_values: false };
    const updated = { ...current, fields: [...current.fields, { name: 'smb_message_echoes' }] };
    const graph = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [current] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [updated] }), { status: 200 }));
    vi.stubGlobal('fetch', graph);

    const res = await callVerificationRoute('ensure_smb_message_echoes_subscription');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ valid: true, changed: true, fields: ['messages', 'smb_message_echoes'] });
    expect(JSON.stringify(res.body)).not.toContain(appSecret);
    expect(JSON.stringify(res.body)).not.toContain('webhook-verify-token-unit');
    expect(graph).toHaveBeenCalledTimes(3);
  });
});

describe('POST /api/openai-proxy', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-unit');
    quotaMocks.rpc.mockImplementation(async (name: string) => name === 'check_and_reserve_ai_quota'
      ? { data: { allowed: true, reservation_id: 'reservation-unit' }, error: null }
      : { data: { log_id: 'log-unit', reservation_committed: true }, error: null });
    authMocks.authenticateErpRequest.mockResolvedValue({ id: 'user-1' });
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('rejeita método GET com 405', async () => {
    const req = {
      method: 'GET',
      query: { operation: 'openai-proxy' },
      headers: {},
      body: {},
    };
    const res = responseMock();
    await handler(req as never, res as never);
    expect(res.statusCode).toBe(405);
  });

  it('rejeita se OPENAI_API_KEY não estiver configurada no servidor', async () => {
    delete process.env.OPENAI_API_KEY;
    const req = {
      method: 'POST',
      query: { operation: 'openai-proxy' },
      headers: { authorization: 'Bearer session' },
      body: { model: 'gpt-6-luna', messages: [{ role: 'user', content: 'oi' }] },
    };
    const res = responseMock();
    await handler(req as never, res as never);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'OpenAI indisponível no servidor.' });
  });

  it('rejeita modelo não permitido', async () => {
    const req = {
      method: 'POST',
      query: { operation: 'openai-proxy' },
      headers: { authorization: 'Bearer session' },
      body: { model: 'unauthorized-model', messages: [{ role: 'user', content: 'oi' }] },
    };
    const res = responseMock();
    await handler(req as never, res as never);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Modelo OpenAI não permitido.' });
  });

  it('encaminha chamada com sucesso para a OpenAI com gpt-6-luna', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: 'Olá! Sou o Seu Lizandro.' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'POST',
      query: { operation: 'openai-proxy' },
      headers: { authorization: 'Bearer session' },
      body: { model: 'gpt-6-luna', messages: [{ role: 'user', content: 'oi' }] },
    };
    const res = responseMock();
    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-openai-key',
        }),
      })
    );
  });

  it('preserva a resposta OpenAI quando os RPCs Supabase retornam thenables sem catch', async () => {
    const rpc = quotaMocks.rpc.mockImplementation((name: string) => ({
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
        const result = name === 'check_and_reserve_ai_quota'
          ? { data: { allowed: true, reservation_id: 'reservation-unit' }, error: null }
          : { data: null, error: null };
        return Promise.resolve(result).then(resolve, reject);
      },
    }));
    authMocks.authenticateErpRequest.mockResolvedValueOnce({ id: 'user-1', userDb: {} });

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: 'Resposta de teste.' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'POST',
      query: { operation: 'openai-proxy' },
      headers: { authorization: 'Bearer session' },
      body: { model: 'gpt-6-luna', messages: [{ role: 'user', content: 'oi' }] },
    };
    const res = responseMock();
    await handler(req as never, res as never);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.statusCode).toBe(200);
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      'check_and_reserve_ai_quota',
      'record_ai_token_usage',
    ]);
  });
});
