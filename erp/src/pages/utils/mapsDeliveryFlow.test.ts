import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSettings, usageCheck, usageRecord, supabaseFrom } = vi.hoisted(() => ({
    getSettings: vi.fn(),
    usageCheck: vi.fn(),
    usageRecord: vi.fn(),
    supabaseFrom: vi.fn(),
}));

vi.mock('./settingsService', () => ({ getSettings }));
vi.mock('./supabaseConfig', () => ({ supabase: { from: supabaseFrom } }));
vi.mock('@/services/apiMonitoring/apiUsageGuard', () => ({ ApiUsageGuard: { check: usageCheck } }));
vi.mock('@/services/apiMonitoring/apiUsageTracker', () => ({ ApiUsageTracker: { record: usageRecord } }));

import { autoCalculateRouteDistance, searchAddressSuggestions } from './maps';
import { calculateFreightByDistance } from './shippingPricing';

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

    it('permite tentar novamente a busca depois que o script do Google falha ao carregar', async () => {
        const prediction = {
            description: 'Rua das Flores, Colombo - PR, Brasil',
            place_id: 'place-retry-1',
            types: ['route'],
        };
        const maps = {
            Geocoder: class {},
            DirectionsService: class {},
            LatLng: class {
                constructor(_lat: number, _lng: number) {}
            },
            places: {
                PlacesServiceStatus: { OK: 'OK' },
                AutocompleteService: class {
                    getPlacePredictions(_options: unknown, callback: (items: unknown[], status: string) => void) {
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
            DirectionsService: class {},
            places: {
                PlacesServiceStatus: { OK: 'OK' },
                AutocompleteService: class {
                    getPlacePredictions(_options: unknown, callback: (items: unknown[], status: string) => void) {
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
        expect(usageRecord).toHaveBeenCalledWith(expect.objectContaining({
            service: 'google_places',
            status: 'SUCCESS',
        }));
    });

    it('geocodifica o destino, calcula rota e estima frete pela tarifa configurada', async () => {
        const maps = {
            places: {},
            Geocoder: class {
                geocode(_request: unknown, callback: (results: unknown[], status: string) => void) {
                    callback([{
                        geometry: { location: { lng: () => -49.2, lat: () => -25.4 } },
                    }], 'OK');
                }
            },
            DirectionsService: class {
                route(_request: unknown, callback: (result: unknown, status: string) => void) {
                    callback({
                        routes: [{
                            legs: [{ distance: { value: 12500 }, duration: { value: 1800 } }],
                            overview_path: [{ lng: () => -49.17, lat: () => -25.35 }, { lng: () => -49.2, lat: () => -25.4 }],
                        }],
                    }, 'OK');
                }
            },
            TravelMode: { DRIVING: 'DRIVING' },
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
        expect(usageRecord).toHaveBeenCalledWith(expect.objectContaining({
            service: 'google_geocoding',
            status: 'SUCCESS',
        }));
        expect(usageRecord).toHaveBeenCalledWith(expect.objectContaining({
            service: 'google_routes',
            status: 'SUCCESS',
        }));
    });
});
