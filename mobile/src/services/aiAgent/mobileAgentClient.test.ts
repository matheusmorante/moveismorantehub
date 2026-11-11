import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.hoisted(() => vi.fn());
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession } } }));

import { MobileAgentClient } from './mobileAgentClient';

describe('cliente OpenAI do assistente Mobile', () => {
  beforeEach(() => {
    getSession.mockReset();
    vi.unstubAllGlobals();
  });

  it('mostra uma mensagem segura em 502 e preserva status estruturado', async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }));

    await expect(
      MobileAgentClient.generateContent({ contents: [] } as any)
    ).rejects.toMatchObject({
      name: 'OpenAiProviderError',
      message: 'O assistente está temporariamente indisponível. Tente novamente em instantes.',
      statusCode: 502,
      code: 'OPENAI_HTTP_502',
      retryable: true,
    });
  });
});
