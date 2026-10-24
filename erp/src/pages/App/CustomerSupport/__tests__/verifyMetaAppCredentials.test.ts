import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyMetaAppCredentials } from '../../../../../server/secure-api/verifyMetaAppCredentials';

const validOptions = {
  appId: '1364259738556530',
  appSecret: 'app-secret-unit',
  accessToken: 'whatsapp-token-unit',
  graphVersion: 'v26.0',
  signal: new AbortController().signal,
};

afterEach(() => vi.unstubAllGlobals());

describe('verifyMetaAppCredentials', () => {
  it('confirma validade e app_id sem colocar o App Secret na URL', async () => {
    const graph = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: validOptions.appId }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { app_id: validOptions.appId, is_valid: true, scopes: ['whatsapp_business_management'] },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', graph);

    await expect(verifyMetaAppCredentials(validOptions)).resolves.toEqual({ valid: true });
    expect(graph).toHaveBeenCalledTimes(2);
    const [appUrl, appRequest] = graph.mock.calls[0] as [URL, RequestInit];
    const [requestUrl, request] = graph.mock.calls[1] as [URL, RequestInit];
    expect(appUrl.origin + appUrl.pathname).toBe(`https://graph.facebook.com/v26.0/${validOptions.appId}`);
    expect(appUrl.searchParams.get('fields')).toBe('id');
    expect(appUrl.searchParams.get('appsecret_proof')).toBe(
      createHmac('sha256', validOptions.appSecret).update(`${validOptions.appId}|${validOptions.appSecret}`).digest('hex')
    );
    expect(appUrl.toString()).not.toContain(validOptions.appSecret);
    expect(appRequest.headers).toEqual({ Authorization: `Bearer ${validOptions.appId}|${validOptions.appSecret}` });
    expect(requestUrl.origin + requestUrl.pathname).toBe('https://graph.facebook.com/v26.0/debug_token');
    expect(requestUrl.searchParams.get('input_token')).toBe(validOptions.accessToken);
    expect(requestUrl.searchParams.get('appsecret_proof')).toBe(
      createHmac('sha256', validOptions.appSecret).update(`${validOptions.appId}|${validOptions.appSecret}`).digest('hex')
    );
    expect(requestUrl.toString()).not.toContain(validOptions.appSecret);
    expect(request?.headers).toEqual({ Authorization: `Bearer ${validOptions.appId}|${validOptions.appSecret}` });
  });

  it.each([
    { data: { app_id: '9999999999999999', is_valid: true }, result: { valid: false, reason: 'app_id_mismatch', graphStatus: 200 } },
    { data: { app_id: validOptions.appId, is_valid: false }, result: { valid: false, reason: 'token_invalid', graphStatus: 200 } },
  ])('rejeita token inválido ou vinculado a outro aplicativo: %j', async ({ data, result }) => {
    const graph = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: validOptions.appId }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data }), { status: 200 }));
    vi.stubGlobal('fetch', graph);
    await expect(verifyMetaAppCredentials(validOptions)).resolves.toEqual(result);
  });

  it('separa falha do App ID/Secret da rejeição do token WhatsApp', async () => {
    const graph = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 190, message: 'Invalid OAuth access token.' },
    }), { status: 401 }));
    vi.stubGlobal('fetch', graph);

    await expect(verifyMetaAppCredentials(validOptions)).resolves.toEqual({
      valid: false, reason: 'app_credentials_rejected', graphStatus: 401,
      graphCode: 190, graphErrorKind: 'invalid_access_token',
    });
    expect(graph).toHaveBeenCalledTimes(1);
  });

  it('falha fechado em HTTP não-2xx e em resposta sem dados de depuração', async () => {
    const graph = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: validOptions.appId }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 100, message: 'Invalid appsecret_proof provided in the API argument.' } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: validOptions.appId }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 190 } }), { status: 200 }));
    vi.stubGlobal('fetch', graph);
    await expect(verifyMetaAppCredentials(validOptions)).resolves.toEqual({
      valid: false, reason: 'graph_http_error', graphStatus: 400, graphCode: 100, graphErrorKind: 'invalid_appsecret_proof',
    });
    await expect(verifyMetaAppCredentials(validOptions)).resolves.toEqual({
      valid: false, reason: 'invalid_response', graphStatus: 200, graphCode: 190, graphErrorKind: 'invalid_access_token',
    });
  });

  it('não chama a Graph quando uma credencial obrigatória está ausente', async () => {
    const graph = vi.fn();
    vi.stubGlobal('fetch', graph);
    await expect(verifyMetaAppCredentials({ ...validOptions, appSecret: ' ' }))
      .resolves.toEqual({ valid: false, reason: 'invalid_input' });
    await expect(verifyMetaAppCredentials({ ...validOptions, appId: 'not-an-id' }))
      .resolves.toEqual({ valid: false, reason: 'invalid_input' });
    expect(graph).not.toHaveBeenCalled();
  });

  it.skipIf(process.env.SUPPORT_VERIFY_META_APP_SECRET !== '1')(
    'valida as variáveis da Vercel Production pela Graph sem exibir credenciais',
    async () => {
      const appId = process.env.WHATSAPP_APP_ID?.trim() || '';
      const appSecret = process.env.WHATSAPP_APP_SECRET?.trim() || '';
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '';
      const missing = [
        !/^\d{1,32}$/.test(appId) && 'WHATSAPP_APP_ID',
        !appSecret && 'WHATSAPP_APP_SECRET',
        !accessToken && 'WHATSAPP_ACCESS_TOKEN',
      ].filter(Boolean);
      if (missing.length) {
        throw new Error(`Variáveis Meta ausentes ou inválidas no ambiente selecionado: ${missing.join(', ')}.`);
      }

      let result: Awaited<ReturnType<typeof verifyMetaAppCredentials>> = { valid: false, reason: 'invalid_response' };
      try {
        result = await verifyMetaAppCredentials({
          appId,
          appSecret,
          accessToken,
          graphVersion: 'v26.0',
          signal: AbortSignal.timeout(20_000),
        });
      } catch {
        throw new Error('Não foi possível consultar a validação Meta; credenciais omitidas.');
      }
      expect(result).toEqual({ valid: true });
    },
    25_000
  );
});
