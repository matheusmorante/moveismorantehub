import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyWhatsAppWebhookSubscription } from '../../../../../server/secure-api/verifyWhatsAppWebhookSubscription';

const options = {
  appId: '1364259738556530',
  appSecret: 'app-secret-unit',
  accessToken: 'whatsapp-token-unit',
  wabaId: '2345678901',
  graphVersion: 'v26.0',
  signal: new AbortController().signal,
};

afterEach(() => vi.unstubAllGlobals());

describe('verifyWhatsAppWebhookSubscription', () => {
  it('confirma somente se o App ID configurado está inscrito e assina com appsecret_proof', async () => {
    const graph = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ whatsapp_business_api_data: { id: options.appId, name: 'nome privado' } }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', graph);

    await expect(verifyWhatsAppWebhookSubscription(options)).resolves.toEqual({ valid: true, subscribed: true });
    const [url, request] = graph.mock.calls[0] as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe(`https://graph.facebook.com/v26.0/${options.wabaId}/subscribed_apps`);
    expect(url.searchParams.get('appsecret_proof')).toBe(
      createHmac('sha256', options.appSecret).update(options.accessToken).digest('hex')
    );
    expect(url.searchParams.get('appsecret_proof')).not.toContain(options.appSecret);
    expect(url.toString()).not.toContain(options.accessToken);
    expect(request.headers).toEqual({ Authorization: `Bearer ${options.accessToken}` });
    expect(JSON.stringify(await verifyWhatsAppWebhookSubscription(options))).not.toContain('nome privado');
  });

  it('relata ausência de inscrição sem expor os demais apps do WABA', async () => {
    const graph = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ whatsapp_business_api_data: { id: '9999999999999999', name: 'outro app' } }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', graph);

    await expect(verifyWhatsAppWebhookSubscription(options)).resolves.toEqual({ valid: true, subscribed: false });
  });

  it('pagina por cursor Graph controlado, sem seguir uma URL retornada pela API', async () => {
    const graph = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [], paging: { next: 'https://example.invalid/attacker-url', cursors: { after: 'cursor-1' } },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: options.appId }] }), { status: 200 }));
    vi.stubGlobal('fetch', graph);

    await expect(verifyWhatsAppWebhookSubscription(options)).resolves.toEqual({ valid: true, subscribed: true });
    const [secondUrl] = graph.mock.calls[1] as [URL, RequestInit];
    expect(secondUrl.origin).toBe('https://graph.facebook.com');
    expect(secondUrl.searchParams.get('after')).toBe('cursor-1');
    expect(graph).toHaveBeenCalledTimes(2);
  });

  it('sanitiza erro Graph e falha fechado em entrada ou resposta inválida', async () => {
    const graph = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 100, error_subcode: 33, type: 'OAuthException', message: 'não registrar este texto' },
    }), { status: 403 }));
    vi.stubGlobal('fetch', graph);

    await expect(verifyWhatsAppWebhookSubscription(options)).resolves.toEqual({
      valid: false, reason: 'graph_http_error', graphStatus: 403, graphCode: 100, graphSubcode: 33,
    });
    await expect(verifyWhatsAppWebhookSubscription({ ...options, wabaId: 'waba-from-caller' }))
      .resolves.toEqual({ valid: false, reason: 'invalid_input' });
    graph.mockResolvedValueOnce(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    await expect(verifyWhatsAppWebhookSubscription(options))
      .resolves.toEqual({ valid: false, reason: 'invalid_response', graphStatus: 200 });
  });
});
