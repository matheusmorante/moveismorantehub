import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureWhatsAppEchoWebhookSubscription } from '../../../../../server/secure-api/ensureWhatsAppEchoWebhookSubscription';

const options = {
  appId: '1364259738556530',
  appSecret: 'app-secret-unit',
  verifyToken: 'webhook-verify-token-unit',
  graphVersion: 'v26.0',
  signal: new AbortController().signal,
};
const appToken = `${options.appId}|${options.appSecret}`;
const original = {
  object: 'whatsapp_business_account',
  callback_url: 'https://morantehub.vercel.app/api/whatsapp-webhook',
  active: true,
  fields: [{ name: 'messages' }, { name: 'account_update' }],
  include_values: false,
};

function response(subscription: unknown, status = 200) {
  return new Response(JSON.stringify(subscription), { status });
}

afterEach(() => vi.unstubAllGlobals());

describe('ensureWhatsAppEchoWebhookSubscription', () => {
  it('adiciona smb_message_echoes preservando messages, callback e opções existentes', async () => {
    const updated = { ...original, fields: [...original.fields, { name: 'smb_message_echoes' }] };
    const graph = vi.fn()
      .mockResolvedValueOnce(response({ data: [original] }))
      .mockResolvedValueOnce(response({ success: true }))
      .mockResolvedValueOnce(response({ data: [updated] }));
    vi.stubGlobal('fetch', graph);

    const result = await ensureWhatsAppEchoWebhookSubscription(options);

    expect(result).toEqual({ valid: true, changed: true, fields: ['messages', 'account_update', 'smb_message_echoes'] });
    expect(graph).toHaveBeenCalledTimes(3);
    const [readUrl, readRequest] = graph.mock.calls[0] as [URL, RequestInit];
    expect(readUrl.origin + readUrl.pathname).toBe(`https://graph.facebook.com/v26.0/${options.appId}/subscriptions`);
    expect(readUrl.searchParams.get('appsecret_proof')).toBe(createHmac('sha256', options.appSecret).update(appToken).digest('hex'));
    expect(readRequest.headers).toEqual({ Authorization: `Bearer ${appToken}` });
    const [, updateRequest] = graph.mock.calls[1] as [URL, RequestInit];
    const form = updateRequest.body as URLSearchParams;
    expect(form.get('object')).toBe('whatsapp_business_account');
    expect(form.get('callback_url')).toBe(original.callback_url);
    expect(form.get('verify_token')).toBe(options.verifyToken);
    expect(form.get('fields')).toBe('messages,account_update,smb_message_echoes');
    expect(form.get('include_values')).toBe('false');
    expect(JSON.stringify(result)).not.toContain(options.appSecret);
    expect(JSON.stringify(result)).not.toContain(options.verifyToken);
  });

  it('é idempotente quando o campo já está ativo e não grava na Meta', async () => {
    const graph = vi.fn().mockResolvedValue(response({
      data: [{ ...original, fields: [...original.fields, { name: 'smb_message_echoes' }] }],
    }));
    vi.stubGlobal('fetch', graph);

    await expect(ensureWhatsAppEchoWebhookSubscription(options)).resolves.toEqual({
      valid: true, changed: false, fields: ['messages', 'account_update', 'smb_message_echoes'],
    });
    expect(graph).toHaveBeenCalledTimes(1);
  });

  it('não altera uma assinatura sem messages ou com callback fora da Production aprovada', async () => {
    const graph = vi.fn()
      .mockResolvedValueOnce(response({ data: [{ ...original, fields: [{ name: 'account_update' }] }] }))
      .mockResolvedValueOnce(response({ data: [{ ...original, callback_url: 'https://attacker.invalid/api/whatsapp-webhook' }] }));
    vi.stubGlobal('fetch', graph);

    await expect(ensureWhatsAppEchoWebhookSubscription(options)).resolves.toEqual({ valid: false, reason: 'messages_not_subscribed' });
    await expect(ensureWhatsAppEchoWebhookSubscription(options)).resolves.toEqual({ valid: false, reason: 'callback_not_allowed' });
    expect(graph).toHaveBeenCalledTimes(2);
  });

  it('retorna erro Graph sanitizado sem executar update quando o estado não pode ser lido', async () => {
    const graph = vi.fn().mockResolvedValue(response({
      error: { code: 190, message: 'segredo de resposta que não deve vazar' },
    }, 401));
    vi.stubGlobal('fetch', graph);

    const result = await ensureWhatsAppEchoWebhookSubscription(options);
    expect(result).toEqual({ valid: false, reason: 'graph_http_error', graphStatus: 401, graphCode: 190 });
    expect(JSON.stringify(result)).not.toContain('segredo de resposta');
    expect(graph).toHaveBeenCalledTimes(1);
  });
});
