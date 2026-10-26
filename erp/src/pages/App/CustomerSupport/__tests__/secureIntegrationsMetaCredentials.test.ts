import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  authenticateErpRequest: vi.fn(),
  hasErpPermission: vi.fn(),
}));

vi.mock('../../../../../api/_lib/authenticatedErpRequest.js', () => authMocks);

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
    const query = {
      select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({
        data: { whatsappConfig: { wabaId: '2345678901' } }, error: null,
      }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const from = vi.fn().mockReturnValue(query);
    authMocks.authenticateErpRequest.mockResolvedValue({
      userId: 'operator-unit', roles: ['manager'], rolePermissions: {}, userDb: { from },
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
    expect(from).toHaveBeenCalledWith('settings');
    expect(query.select).toHaveBeenCalledWith('whatsappConfig:data->whatsappConfig');
    expect(query.eq).toHaveBeenCalledWith('id', 'app');
    const [url, request] = graph.mock.calls[0] as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe('https://graph.facebook.com/v26.0/2345678901/subscribed_apps');
    expect(request.headers).toEqual({ Authorization: `Bearer ${metaToken}` });
  });

  it('falha fechado quando o WABA não está configurado ou não pode ser lido', async () => {
    const query = {
      select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({
        data: { whatsappConfig: { wabaId: '' } }, error: null,
      }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const from = vi.fn().mockReturnValue(query);
    authMocks.authenticateErpRequest.mockResolvedValue({
      userId: 'operator-unit', roles: ['manager'], rolePermissions: {}, userDb: { from },
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
