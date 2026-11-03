// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyMetaSignature } from '@/pages/utils/customerSupport/whatsappWebhookProcessor';
import whatsappDispatchHandler from '../../../../../../api/whatsapp-dispatch';

afterEach(() => { vi.restoreAllMocks(); });

describe('Proteções das integrações WhatsApp', () => {
  it('rejeita assinatura inválida e segredo ausente', () => {
    expect(verifyMetaSignature('{"event":1}', 'sha256=invalid', 'app-secret')).toBe(false);
    expect(verifyMetaSignature('{"event":1}', undefined, undefined)).toBe(false);
    expect(verifyMetaSignature('{"event":1}', '0123456789abcdef', 'app-secret')).toBe(false);
  });

  it('webhook HTTP rejeita assinatura inválida e segredo ausente em produção', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalAppSecret = process.env.WHATSAPP_APP_SECRET;
    const originalMetaSecret = process.env.META_APP_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      process.env.WHATSAPP_APP_SECRET = '';
      process.env.META_APP_SECRET = '';
      vi.resetModules();
      const { default: missingSecretHandler } = await import('../../../../../../api/whatsapp-webhook');
      const missingSecretResponse = makeResponse();
      await missingSecretHandler(makePostRequest('sha256=invalid') as any, missingSecretResponse as any);
      expect(missingSecretResponse.statusCode).toBe(503);

      process.env.WHATSAPP_APP_SECRET = 'configured-secret';
      vi.resetModules();
      const { default: invalidSignatureHandler } = await import('../../../../../../api/whatsapp-webhook');
      const invalidSignatureResponse = makeResponse();
      await invalidSignatureHandler(makePostRequest('sha256=invalid') as any, invalidSignatureResponse as any);
      expect(invalidSignatureResponse.statusCode).toBe(401);
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
      if (originalAppSecret === undefined) delete process.env.WHATSAPP_APP_SECRET;
      else process.env.WHATSAPP_APP_SECRET = originalAppSecret;
      if (originalMetaSecret === undefined) delete process.env.META_APP_SECRET;
      else process.env.META_APP_SECRET = originalMetaSecret;
      vi.resetModules();
    }
  });

  it('mantém o despacho bloqueado fora do Development', async () => {
    const response = {
      statusCode: 200,
      setHeader: vi.fn(),
      status(code: number) { this.statusCode = code; return this; },
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    } as any;
    await whatsappDispatchHandler({ method: 'POST', headers: {} } as any, response);
    expect(response.statusCode).toBe(403);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('só fica disponível no Development') }));
  });
});

function makePostRequest(signature: string) {
  return {
    method: 'POST',
    headers: { 'x-hub-signature-256': signature },
    query: {},
    async *[Symbol.asyncIterator]() {
      yield Buffer.from('{"entry":[]}');
    },
  };
}

function makeResponse() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(value: unknown) { this.body = value; return this; },
    send(value: unknown) { this.body = value; return this; },
    end(value?: unknown) { this.body = value; return this; },
    setHeader() { return this; },
  };
}
