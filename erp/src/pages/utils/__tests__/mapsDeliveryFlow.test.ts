import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSettings, usageCheck, usageRecord, supabaseFrom } = vi.hoisted(() => ({
  getSettings: vi.fn(),
  usageCheck: vi.fn(),
  usageRecord: vi.fn(),
  supabaseFrom: vi.fn(),
}));

vi.mock('../settingsService', () => ({ getSettings }));
vi.mock('../supabaseConfig', () => ({ supabase: { from: supabaseFrom } }));
vi.mock('@/services/apiMonitoring/apiUsageGuard', () => ({ ApiUsageGuard: { check: usageCheck } }));
vi.mock('@/services/apiMonitoring/apiUsageTracker', () => ({
  ApiUsageTracker: { record: usageRecord },
}));

import { autoCalculateRouteDistance, searchAddressSuggestions } from '../maps';
import { calculateFreightByDistance } from '../shippingPricing';

describe('fluxo de endereço e logística com Google Maps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSettings.mockReturnValue({
      googleMapsApiKey: 'test-google-maps-key',
      storeOriginCoords: [-49.17, -25.35],
      freightPerKm: 2,
    });
    usageCheck.mockResolvedValue({ allowed: true });
    supabaseFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: 'cache miss' }) }) }),
      upsert: async () => ({ error: null }),
    });
  });

  it('não chama o Google quando o endereço está vazio', async () => {
    const onFailure = vi.fn();
    const result = await autoCalculateRouteDistance(
      { street: '', number: '', neighborhood: '', city: '', state: 'PR' },
      onFailure
    );

    expect(result).toBeNull();
    expect(usageCheck).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledWith(expect.stringContaining('Endereço insuficiente'));
  });

  it('permite tentar novamente a busca depois que o script do Google falha ao carregar', async () => {
    const prediction = {
      description: 'Rua das Flores, Colombo - PR, Brasil',
      place_id: 'place-retry-1',
      types: ['route'],
    };
    const maps = {
      Geocoder: class {},
      importLibrary: vi.fn(async () => ({ Route: { computeRoutes: vi.fn() } })),
      LatLng: class {
        constructor(_lat: number, _lng: number) {}
      },
      places: {
        PlacesServiceStatus: { OK: 'OK' },
        AutocompleteService: class {
          getPlacePredictions(
            _options: unknown,
            callback: (items: unknown[], status: string) => void
          ) {
            callback([prediction], 'OK');
          }
        },
      },
    };
    const scripts: any[] = [];
    (globalThis as any).window = {};
    (globalThis as any).document = {
      querySelector: () => null,
      createElement: () => ({ remove: vi.fn() }),
      head: {
        appendChild: (script: any) => {
          scripts.push(script);
          queueMicrotask(() => {
            if (scripts.length === 1) {
              script.onerror(new Error('network error'));
            } else {
              (globalThis as any).window.google = { maps };
              script.onload();
            }
          });
        },
      },
    };

    await expect(searchAddressSuggestions('Rua das Flores', 'Colombo', 'PR')).resolves.toEqual([]);
    const suggestions = await searchAddressSuggestions('Avenida Brasil', 'Colombo', 'PR');

    expect(scripts).toHaveLength(2);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].place_id).toBe(prediction.place_id);
    delete (globalThis as any).document;
  });

  it('busca sugestões e seleciona o endereço retornado pelo Places', async () => {
    const prediction = {
      description: 'Rua das Flores, Colombo - PR, Brasil',
      place_id: 'place-test-1',
      types: ['route'],
    };
    const maps = {
      Geocoder: class {},
      importLibrary: vi.fn(async () => ({ Route: { computeRoutes: vi.fn() } })),
      places: {
        PlacesServiceStatus: { OK: 'OK' },
        AutocompleteService: class {
          getPlacePredictions(
            _options: unknown,
            callback: (items: unknown[], status: string) => void
          ) {
            callback([prediction], 'OK');
          }
        },
      },
      LatLng: class {
        constructor(_lat: number, _lng: number) {}
      },
    };
    (globalThis as any).window = { google: { maps } };

    const suggestions = await searchAddressSuggestions('Rua das Flores', 'Colombo', 'PR');

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      display_name: prediction.description,
      place_id: prediction.place_id,
    });
    expect(usageRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'google_places',
        status: 'SUCCESS',
      })
    );
  });

  it('geocodifica o destino, calcula rota e estima frete pela tarifa configurada', async () => {
    const maps = {
      places: {},
      Geocoder: class {
        geocode(_request: unknown, callback: (results: unknown[], status: string) => void) {
          callback(
            [
              {
                geometry: { location: { lng: () => -49.2, lat: () => -25.4 } },
              },
            ],
            'OK'
          );
        }
      },
      importLibrary: vi.fn(async () => ({
        Route: {
          computeRoutes: vi.fn(async (request: any) => {
            expect(request).toMatchObject({
              travelMode: 'DRIVING',
              fields: ['distanceMeters', 'durationMillis', 'path'],
            });
            return {
              routes: [
                {
                  distanceMeters: 12500,
                  durationMillis: 1800000,
                  path: [
                    { lng: -49.17, lat: -25.35 },
                    { lng: -49.2, lat: -25.4 },
                  ],
                },
              ],
            };
          }),
        },
      })),
    };
    (globalThis as any).window = { google: { maps } };

    const route = await autoCalculateRouteDistance({
      street: 'Rua das Flores',
      number: '100',
      neighborhood: 'Centro',
      city: 'Colombo',
      state: 'PR',
    });

    expect(route).toMatchObject({
      distanceKm: 12.5,
      durationMinutes: 30,
      destinationCoords: [-49.2, -25.4],
      routeGeoJSON: { type: 'LineString' },
    });
    expect(calculateFreightByDistance(route!.distanceKm)).toBe(25);
    expect(usageRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'google_geocoding',
        status: 'SUCCESS',
      })
    );
    expect(usageRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'google_routes',
        status: 'SUCCESS',
      })
    );
  });

  it('deduplica chamadas simultâneas para o mesmo endereço em uma geocodificação e uma rota', async () => {
    let geocodeCalls = 0;
    let routeCalls = 0;
    const maps = {
      places: {},
      Geocoder: class {
        geocode(_request: unknown, callback: (results: unknown[], status: string) => void) {
          geocodeCalls += 1;
          setTimeout(
            () =>
              callback(
                [{ geometry: { location: { lng: () => -50.2, lat: () => -24.2 } } }],
                'OK'
              ),
            0
          );
        }
      },
      importLibrary: vi.fn(async () => ({
        Route: {
          computeRoutes: vi.fn(async () => {
            routeCalls += 1;
            await new Promise((resolve) => setTimeout(resolve, 0));
            return {
              routes: [
                {
                  distanceMeters: 8400,
                  durationMillis: 1200000,
                  path: [
                    { lng: -50.1, lat: -24.1 },
                    { lng: -50.2, lat: -24.2 },
                  ],
                },
              ],
            };
          }),
        },
      })),
    };
    (globalThis as any).window = { google: { maps } };
    getSettings.mockReturnValue({
      googleMapsApiKey: 'test-google-maps-key',
      storeOriginCoords: [-50.1, -24.1],
      freightPerKm: 2,
    });

    const address = {
      street: 'Rua de teste concorrente',
      number: '909',
      neighborhood: 'Centro de teste',
      city: 'Cidade de teste',
      state: 'PR',
    };
    const [firstResult, secondResult] = await Promise.all([
      autoCalculateRouteDistance(address),
      autoCalculateRouteDistance(address),
    ]);

    expect(firstResult).toEqual(secondResult);
    expect(firstResult?.distanceKm).toBe(8.4);
    expect(geocodeCalls).toBe(1);
    expect(routeCalls).toBe(1);
    expect(usageCheck).toHaveBeenCalledTimes(2);
    expect(usageRecord).toHaveBeenCalledTimes(2);
  });

  it('prioriza coordenadas diretas no endereço sem acionar geocodificação textual', async () => {
    let geocodeCalled = false;
    const maps = {
      places: {},
      Geocoder: class {
        geocode() {
          geocodeCalled = true;
        }
      },
      importLibrary: vi.fn(async () => ({
        Route: {
          computeRoutes: vi.fn(async () => ({
            routes: [
              {
                distanceMeters: 6200,
                durationMillis: 600000,
                path: [
                  { lng: -49.17, lat: -25.35 },
                  { lng: -49.25, lat: -25.42 },
                ],
              },
            ],
          })),
        },
      })),
    };
    (globalThis as any).window = { google: { maps } };

    const addressWithCoords = {
      street: 'Rua Preservada do Autocomplete',
      number: '120',
      neighborhood: 'Bairro Teste',
      city: 'Colombo',
      state: 'PR',
      coords: [-49.25, -25.42] as [number, number],
    };

    const result = await autoCalculateRouteDistance(addressWithCoords);

    expect(result).not.toBeNull();
    expect(result?.distanceKm).toBe(6.2);
    expect(result?.destinationCoords).toEqual([-49.25, -25.42]);
    expect(geocodeCalled).toBe(false);
  });

  it('recupera com sucesso via fallback sem bairro quando a query com bairro informal falha', async () => {
    const executedQueries: string[] = [];
    const maps = {
      places: {},
      Geocoder: class {
        geocode(req: any, callback: (results: unknown[], status: string) => void) {
          executedQueries.push(req.address);
          // Simula falha na query que contém o bairro informal "Loteamento Não Oficial"
          if (req.address.includes('Loteamento Não Oficial')) {
            callback([], 'ZERO_RESULTS');
          } else {
            callback(
              [{ geometry: { location: { lng: () => -49.21, lat: () => -25.38 } } }],
              'OK'
            );
          }
        }
      },
      importLibrary: vi.fn(async () => ({
        Route: {
          computeRoutes: vi.fn(async () => ({
            routes: [
              {
                distanceMeters: 7500,
                durationMillis: 700000,
                path: [
                  { lng: -49.17, lat: -25.35 },
                  { lng: -49.21, lat: -25.38 },
                ],
              },
            ],
          })),
        },
      })),
    };
    (globalThis as any).window = { google: { maps } };

    const addressWithInformalNeighborhood = {
      street: 'Rua das Camélias',
      number: '45',
      neighborhood: 'Loteamento Não Oficial',
      city: 'Colombo',
      state: 'PR',
    };

    const result = await autoCalculateRouteDistance(addressWithInformalNeighborhood);

    expect(result).not.toBeNull();
    expect(result?.distanceKm).toBe(7.5);
    expect(executedQueries.length).toBeGreaterThan(1);
    expect(executedQueries[0]).toContain('Loteamento Não Oficial');
    expect(executedQueries.some((q) => !q.includes('Loteamento Não Oficial') && q.includes('45'))).toBe(true);
  });

  it('normaliza o logradouro para não duplicar o número quando já contido no nome da via', async () => {
    const executedQueries: string[] = [];
    const maps = {
      places: {},
      Geocoder: class {
        geocode(req: any, callback: (results: unknown[], status: string) => void) {
          executedQueries.push(req.address);
          callback(
            [{ geometry: { location: { lng: () => -49.22, lat: () => -25.39 } } }],
            'OK'
          );
        }
      },
      importLibrary: vi.fn(async () => ({
        Route: {
          computeRoutes: vi.fn(async () => ({
            routes: [
              {
                distanceMeters: 5000,
                durationMillis: 500000,
                path: [
                  { lng: -49.17, lat: -25.35 },
                  { lng: -49.22, lat: -25.39 },
                ],
              },
            ],
          })),
        },
      })),
    };
    (globalThis as any).window = { google: { maps } };

    const addressWithDuplicateNumber = {
      street: 'Rua Presidente Faria, 150',
      number: '150',
      neighborhood: 'Centro',
      city: 'Curitiba',
      state: 'PR',
    };

    const result = await autoCalculateRouteDistance(addressWithDuplicateNumber);

    expect(result).not.toBeNull();
    expect(executedQueries.length).toBeGreaterThan(0);
    // Não deve conter '150, 150'
    expect(executedQueries[0]).not.toContain('150, 150');
    expect(executedQueries[0]).toContain('Rua Presidente Faria, 150');
  });
});
