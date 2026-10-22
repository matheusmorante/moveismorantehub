import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock('../../supabaseConfig', () => ({
  supabase: { auth: { getSession: mocks.getSession } },
}));

import {
  FISCAL_NUMBER_PREVIEW_TIMEOUT_MS,
  getNextNfeNumberPreview,
} from '../nfeNumberPreviewService';

describe('prévia de sequência fiscal', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('encerra a espera e informa erro se a sessão não responder', async () => {
    vi.useFakeTimers();
    mocks.getSession.mockReturnValue(new Promise(() => {}));

    const result = getNextNfeNumberPreview('55', 1, '991', 1);
    const rejection = expect(result).rejects.toThrow('A consulta da sessão fiscal excedeu o tempo limite.');
    await vi.advanceTimersByTimeAsync(FISCAL_NUMBER_PREVIEW_TIMEOUT_MS);
    await rejection;
  });

  it('aborta a consulta de rede se a API não responder', async () => {
    vi.useFakeTimers();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'synthetic-test-token' } },
      error: null,
    });
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        requestSignal = init.signal as AbortSignal;
        return new Promise(() => {});
      })
    );

    const result = getNextNfeNumberPreview('55', 1, '992', 1);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    const rejection = expect(result).rejects.toThrow('A consulta do próximo número fiscal excedeu o tempo limite.');
    await vi.advanceTimersByTimeAsync(FISCAL_NUMBER_PREVIEW_TIMEOUT_MS);
    await rejection;
    expect(requestSignal?.aborted).toBe(true);
  });
});
