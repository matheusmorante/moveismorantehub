import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.hoisted(() => vi.fn());
const recordUsageMock = vi.hoisted(() => vi.fn());

vi.mock('../../../services/supabaseClient', () => ({
  supabase: { auth: { getSession: getSessionMock } },
}));

vi.mock('../../../services/apiUsageTracker', () => ({
  MobileApiUsageTracker: { record: recordUsageMock },
}));

import { computeRoute } from './googleRoutesService';

describe('googleRoutesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calcula uma rota online pela API e converte distância e duração', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        routes: [{ distanceMeters: 3210, duration: '180s', polyline: { encodedPolyline: '' } }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await computeRoute(
      { latitude: 10.123, longitude: 20.123 },
      { latitude: 11.123, longitude: 21.123 }
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ distanceMeters: 3210, distanceKm: 3.2, durationSeconds: 180, durationMinutes: 3 });
  });

  it('degrada para rota indisponível sem travar quando está sem rede', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('Network request failed');
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      computeRoute(
        { latitude: 12.234, longitude: 22.234 },
        { latitude: 13.234, longitude: 23.234 }
      )
    ).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('não chama a API sem sessão autenticada', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });

    await expect(
      computeRoute(
        { latitude: 14.345, longitude: 24.345 },
        { latitude: 15.345, longitude: 25.345 }
      )
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
