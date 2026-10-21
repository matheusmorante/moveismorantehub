import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHmac } from 'node:crypto';
import { request } from 'node:http';
import type { Server } from 'node:http';

const fetchHTTP = globalThis.fetch;
const require = createRequire(import.meta.url);
let server: Server;
let baseURL: string;

beforeAll(async () => {
  // Normal build preparation; Vitest remains the test runner. No database runs.
  execFileSync(process.execPath, [fileURLToPath(new URL('../../../../../../scripts/build-customer-support-api.cjs', import.meta.url))]);
  const localAPI = require('../../../../../../scripts/local-fiscal-dev-server.cjs');
  server = await localAPI.start(0);
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Local HTTP test listener missing.');
  baseURL = `http://127.0.0.1:${address.port}`;
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
afterAll(async () => {
  server?.closeAllConnections();
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Rotas da Central no adaptador HTTP de desenvolvimento', () => {
  it('preserva health e o retorno de rota inexistente', async () => {
    expect((await fetchHTTP(`${baseURL}/health`)).status).toBe(200);
    expect((await fetchHTTP(`${baseURL}/api/unknown-route`)).status).toBe(404);
  });

  it('encaminha mídia e o dispatcher consolidado à guarda de sessão', async () => {
    for (const path of ['/api/whatsapp-media?id=12345', '/api/whatsapp-webhook?operation=media&id=12345']) {
      const response = await fetchHTTP(baseURL + path);
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ error: 'Entre novamente para consultar a mídia.' });
    }
  });

  it('mantém as duas rotas de envio bloqueadas', async () => {
    const outbound = vi.fn().mockRejectedValue(new Error('External requests forbidden in this proof.'));
    vi.stubGlobal('fetch', outbound);
    for (const path of ['/api/whatsapp-dispatch', '/api/whatsapp-webhook?operation=dispatch']) {
      expect((await fetchHTTP(baseURL + path, { method: 'POST', body: '{}' })).status).toBe(403);
    }
    expect(outbound).not.toHaveBeenCalled();
  });

  it('rejeita assinatura inválida e segredo ausente em produção', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('WHATSAPP_APP_SECRET', 'unit-secret');
    expect((await fetchHTTP(`${baseURL}/api/whatsapp-webhook`, { method: 'POST', body: '{}' })).status).toBe(401);
    vi.stubEnv('WHATSAPP_APP_SECRET', '');
    vi.stubEnv('META_APP_SECRET', '');
    expect((await fetchHTTP(`${baseURL}/api/whatsapp-webhook`, { method: 'POST', body: '{}' })).status).toBe(503);
  });

  it('preserva os bytes UTF-8 do webhook, inclusive quando um caractere é dividido entre chunks', async () => {
    vi.stubEnv('WHATSAPP_APP_SECRET', 'unit-secret');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'unit-service-key');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://unit.supabase.co');
    const outbound = vi.fn().mockRejectedValue(new Error('No database or Meta calls allowed.'));
    vi.stubGlobal('fetch', outbound);
    // Empty entries exercise raw-body/HMAC/acknowledgment without business events.
    const bytes = Buffer.from(JSON.stringify({ entry: [], label: 'Olá' }));
    const split = bytes.indexOf(Buffer.from('á')) + 1;
    const signature = 'sha256=' + createHmac('sha256', 'unit-secret').update(bytes).digest('hex');
    const status = await new Promise<number>((resolve, reject) => {
      const req = request(`${baseURL}/api/whatsapp-webhook`, { method: 'POST', headers: { 'x-hub-signature-256': signature } }, (response) => {
        response.resume();
        response.on('end', () => resolve(response.statusCode || 0));
      });
      req.on('error', reject);
      req.write(bytes.subarray(0, split));
      setTimeout(() => req.end(bytes.subarray(split)), 10);
    });
    expect(status).toBe(200);
    expect(outbound).not.toHaveBeenCalled();
  });
});
