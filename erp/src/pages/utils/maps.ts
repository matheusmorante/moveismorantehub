import CustomerData from "../types/customerData.type"
import { AddressViaCep } from "../types/fullAddress.type";
import { stringifyFullAddress, stringifyMapAddress } from "./formatters";
import { getSettings } from '@/pages/utils/settingsService';

// ─── Neighborhood/City Coordinates mapping ───────────────────────────────────

export const getNeighborhoodCoords = (neighborhood?: string, city?: string) => {
    const neighborhoodCoords: Record<string, { lat: number, lng: number }> = {
        "guaraituba": { lat: -25.3520, lng: -49.1692 },
        "parque dos lagos": { lat: -25.3622, lng: -49.1387 },
        "colombo": { lat: -25.2917, lng: -49.2242 },
        "curitiba": { lat: -25.4290, lng: -49.2671 },
        "centro": { lat: -25.4320, lng: -49.2710 },
        "pinhais": { lat: -25.4411, lng: -49.1931 },
        "piraquara": { lat: -25.4417, lng: -49.0633 },
        "sao jose dos pinhais": { lat: -25.5348, lng: -49.2064 },
        "são josé dos pinhais": { lat: -25.5348, lng: -49.2064 }
    };

    const n = neighborhood?.toLowerCase() || "";
    const c = city?.toLowerCase() || "";

    if (neighborhoodCoords[n]) return neighborhoodCoords[n];
    if (neighborhoodCoords[c]) return neighborhoodCoords[c];
    return null;
};

// ─── Google Maps URL (for "Ver Rota" link) ───────────────────────────────────

export const getShippingRouteUrl = (fullAddress: CustomerData['fullAddress']) => {
    const settings = getSettings();
    const originString = settings.companyAddress;
    const destinationString = stringifyMapAddress(fullAddress);

    const originURI = encodeURIComponent(originString);
    const destinationURI = encodeURIComponent(destinationString);

    return (
        `https://www.google.com/maps/dir/?api=1&origin=${originURI}&destination=${destinationURI}&travelmode=driving`
    )
}

// ─── CEP Lookup ──────────────────────────────────────────────────────────────

export const getAddressByCep = async (cep: string): Promise<AddressViaCep> => {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);

    const data = await res.json();
    return data
}

// ─── Route Result Type ───────────────────────────────────────────────────────

export interface RouteResult {
    distanceKm: number;
    durationMinutes: number;
    destinationCoords: [number, number]; // [lng, lat] (MapLibre/GeoJSON format)
    routeGeoJSON: any; // GeoJSON geometry from ORS
}

// ─── Geocode address ─────────────────────────────────────────────

export interface GeocodeResponse {
    coords: [number, number];
    isPrecision: boolean;
}

export const geocodeAddress = async (address: CustomerData['fullAddress'] | string): Promise<GeocodeResponse | null> => {
    let street = '';
    let neighborhood = '';
    let city = '';
    
    if (typeof address === 'string') {
        street = address;
    } else {
        street = address.street;
        neighborhood = address.neighborhood;
        city = address.city;
    }

    const fetchNom = async (q: string) => {
        try {
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
                headers: { 
                    'Accept-Language': 'pt-BR',
                    'User-Agent': 'AntigravityERP/1.0 (brasillogistics; contact@morante.com.br)'
                }
            });
            if (nomRes.ok) {
                const nomData = await nomRes.json();
                if (nomData && nomData.length > 0) {
                    return [Number(nomData[0].lon), Number(nomData[0].lat)] as [number, number];
                }
            }
        } catch {}
        return null;
    };

    // 1. Tenta Busca Completa (Rua + Número + Bairro + Cidade)
    if (typeof address !== 'string') {
        const full = [address.street, address.number, address.neighborhood, address.city].filter(Boolean).join(', ') + ' - PR';
        let res = await fetchNom(full);
        if (res) return { coords: res, isPrecision: true };
    }

    // 2. Tenta Busca Social (Rua + Bairro + Cidade)
    const simpler = [street, neighborhood, city].filter(Boolean).join(', ') + ' - PR';
    let resSimpler = await fetchNom(simpler);
    if (resSimpler) return { coords: resSimpler, isPrecision: true };

    // 3. Fallback: Bairro (Coordenadas Fixas ou Busca por Bairro)
    const fallback = getNeighborhoodCoords(neighborhood, city);
    if (fallback) return { coords: [fallback.lng, fallback.lat], isPrecision: false };

    const neighborhoodSearch = [neighborhood, city].filter(Boolean).join(', ') + ' - PR';
    let resNeighborhood = await fetchNom(neighborhoodSearch);
    if (resNeighborhood) return { coords: resNeighborhood, isPrecision: false };

    // 4. Fallback Final: Cidade
    if (city) {
        let resCity = await fetchNom(city + ' - PR');
        if (resCity) return { coords: resCity, isPrecision: false };
    }

    return null;
}

// ─── Calculate route via OpenRouteService ────────────────────────────────────

const calculateRouteViaORS = async (
    origin: [number, number],
    destination: [number, number],
    apiKey: string
): Promise<{ distanceKm: number; durationMinutes: number; geometry: any } | null> => {
    try {
        const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify({
                coordinates: [origin, destination]
            })
        });

        if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                const route = data.features[0];
                const distanceMeters = route.properties.summary.distance;
                const durationSeconds = route.properties.summary.duration;
                const distanceKm = Number((distanceMeters / 1000).toFixed(1));
                const durationMinutes = Math.ceil(durationSeconds / 60);
                return {
                    distanceKm,
                    durationMinutes,
                    geometry: route.geometry
                };
            }
        }
    } catch (e) {
        console.error("ORS error:", e);
    }

    return null;
}

// ─── Fallback: Calculate route via OSRM (no API key needed) ──────────────────

const calculateRouteViaOSRM = async (
    origin: [number, number],
    destination: [number, number]
): Promise<{ distanceKm: number; durationMinutes: number; geometry: any } | null> => {
    try {
        const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson`
        );

        if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                const distanceMeters = data.routes[0].distance;
                const durationSeconds = data.routes[0].duration;
                const distanceKm = Number((distanceMeters / 1000).toFixed(1));
                const durationMinutes = Math.ceil(durationSeconds / 60);
                return {
                    distanceKm,
                    durationMinutes,
                    geometry: data.routes[0].geometry
                };
            }
        }
    } catch (e) {
        console.error("OSRM error:", e);
    }

    return null;
}

// ─── Public: Auto-calculate route distance ───────────────────────────────────

export const autoCalculateRouteDistance = async (address: CustomerData['fullAddress']): Promise<RouteResult | null> => {
    try {
        const settings = getSettings();
        const origin: [number, number] = settings.storeOriginCoords;

        // 1. Geocode the destination
        let geoRes = await geocodeAddress(address);
        if (!geoRes) return null;
        
        let destCoords = geoRes.coords;

        // 2. Calculate route (prefer OSRM)
        let routeData = await calculateRouteViaOSRM(origin, destCoords);

        // Fallback to ORS if OSRM fails and API key is available
        if (!routeData && settings.openRouteServiceApiKey) {
            routeData = await calculateRouteViaORS(origin, destCoords, settings.openRouteServiceApiKey);
        }

        if (!routeData) {
            return null;
        }

        return {
            distanceKm: routeData.distanceKm,
            durationMinutes: routeData.durationMinutes,
            destinationCoords: destCoords, // [lng, lat]
            routeGeoJSON: routeData.geometry
        };
    } catch (error) {
        console.error("Erro ao calcular distância por rotas:", error);
        return null;
    }
}

// ─── Search Address Suggestions (Autocomplete) ──────────────────────────────

export const searchAddressSuggestions = async (query: string, city?: string): Promise<any[]> => {
    if (!query || query.length < 3) return [];
    
    let results: any[] = [];
    const settings = getSettings();

    // Normalização básica: Remover prefixos comuns
    const cleanQuery = query.replace(/^(rua|travessa|avenida|trav|r\.|av\.|aven|rod\.|rodovia)\s+/i, '');

    const tryFetch = async (q: string, contextCity?: string) => {
        const searchSuffix = contextCity ? `, ${contextCity}, Paraná` : ', Paraná';
        const fullQuery = q + searchSuffix;

        try {
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&addressdetails=1&limit=10&countrycodes=br`, {
                headers: { 
                    'Accept-Language': 'pt-BR',
                    'User-Agent': 'AntigravityERP/1.0 (brasillogistics; contact@morante.com.br)'
                }
            });
            if (nomRes.ok) {
                return await nomRes.json();
            }
        } catch {}
        return [];
    };

    // 1. Tentar Busca Original com Cidade
    results = await tryFetch(query, city);

    // 2. Se falhar, tentar busca sem o prefixo
    if (results.length === 0 && cleanQuery !== query) {
        results = await tryFetch(cleanQuery, city);
    }

    // 3. Se ainda falhar, tentar busca ampla (apenas estado)
    if (results.length === 0 && city) {
        results = await tryFetch(query);
    }

    // 4. Fallback: Photon (Komoot)
    if (results.length < 3) {
        try {
            const photonQuery = city ? `${query}, ${city}` : query;
            const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(photonQuery)}&limit=5&lat=-25.3&lon=-49.2`); 
            if (photonRes.ok) {
                const photonData = await photonRes.json();
                if (photonData.features) {
                    const photonMapped = photonData.features
                        .filter((f: any) => 
                            f.properties.country === 'Brazil' || f.properties.countrycode === 'BR'
                        )
                        .map((f: any) => ({
                            display_name: [f.properties.name, f.properties.district, f.properties.city, f.properties.state].filter(Boolean).join(', '),
                            lat: f.geometry.coordinates[1],
                            lon: f.geometry.coordinates[0],
                            address: {
                                road: f.properties.name,
                                suburb: f.properties.district,
                                neighbourhood: f.properties.district,
                                city: f.properties.city || f.properties.town,
                                postcode: f.properties.postcode
                            }
                        }));
                    
                    results = [...results, ...photonMapped.filter((o: any) => 
                        !results.some((r: any) => r.display_name.toLowerCase().includes(o.address.road?.toLowerCase()))
                    )];
                }
            }
        } catch {}
    }

    return results;
}