import { afterEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  auth: { getSession: vi.fn() },
  from: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: supabaseMock }));

import { fetchFiscalPendencies } from './fiscalPendenciesService';

describe('fetchFiscalPendencies', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('propaga erro da API sem retornar uma lista vazia por fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: vi.fn() }));

    await expect(fetchFiscalPendencies('session-token')).rejects.toThrow(
      'Não foi possível carregar as pendências fiscais.'
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('falha com mensagem segura quando a sessão expirou', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(fetchFiscalPendencies()).rejects.toThrow('A sessão expirou');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
