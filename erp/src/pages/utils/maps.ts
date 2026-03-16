import CustomerData from "../types/customerData.type"
import { AddressViaCep } from "../types/fullAddress.type";
import { stringifyFullAddress, stringifyMapAddress } from "./formatters";
import { getSettings } from '@/pages/utils/settingsService';

// ─── Neighborhood/City Coordinates mapping ───────────────────────────────────

export const getNeighborhoodCoords = (neighborhood?: string, city?: string) => {
    const neighborhoodCoords: Record<string, { lat: number, lng: number }> = {
        "Guaraituba": { lat: -25.3520, lng: -49.1692 },
        "Colombo": { lat: -25.2917, lng: -49.2242 },
        "Curitiba": { lat: -25.4290, lng: -49.2671 },
        "Centro": { lat: -25.4320, lng: -49.2710 },
        "Pinhais": { lat: -25.4411, lng: -49.1931 },
        "Balsa Nova": { lat: -25.5833, lng: -49.6333 },
        "Piraquara": { lat: -25.4417, lng: -49.0633 },
        "São José dos Pinhais": { lat: -25.5348, lng: -49.2064 }
    };

    if (neighborhood && neighborhoodCoords[neighborhood]) return neighborhoodCoords[neighborhood];
    if (city && neighborhoodCoords[city]) return neighborhoodCoords[city];
    return neighborhoodCoords["Curitiba"];
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
    destinationCoords: [number, number]; // [lng, lat] (MapLibre/GeoJSON format)
    routeGeoJSON: any; // GeoJSON geometry from ORS
}

// ─── Geocode address ─────────────────────────────────────────────

export const geocodeAddress = async (address: CustomerData['fullAddress'] | string): Promise<[number, number] | null> => {
    // 1. Try BrasilAPI v2 (accurate when CEP is available) if it's an address object
    if (typeof address !== 'string' && address.cep) {
        const cleanCep = address.cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            try {
                const cepRes = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
                if (cepRes.ok) {
                    const cepData = await cepRes.json();
                    if (cepData?.location?.coordinates?.longitude && cepData?.location?.coordinates?.latitude) {
                        return [Number(cepData.location.coordinates.longitude), Number(cepData.location.coordinates.latitude)];
                    }
                }
            } catch (e) {
                console.warn("BrasilAPI CEP v2 indisponível, tentando fallback...", e);
            }
        }
    }

    // 2. Fallback to Nominatim (OpenStreetMap)
    let addressString = '';
    if (typeof address === 'string') {
        addressString = address;
    } else {
        const { street, number, neighborhood, city } = address;
        addressString = [street, number, neighborhood, city].filter(Boolean).join(', ') + ' - PR';
    }

    const encodedAddress = encodeURIComponent(addressString);

    try {
        const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`, {
            headers: { 'Accept-Language': 'pt-BR' }
        });
        if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (nomData && nomData.length > 0) {
                return [Number(nomData[0].lon), Number(nomData[0].lat)];
            }
        }
    } catch (e) {
        console.warn("Nominatim indisponível", e);
    }

    return null;
}

// ─── Calculate route via OpenRouteService ────────────────────────────────────

const calculateRouteViaORS = async (
    origin: [number, number],
    destination: [number, number],
    apiKey: string
): Promise<{ distanceKm: number; geometry: any } | null> => {
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
                const distanceKm = Number((distanceMeters / 1000).toFixed(1));
                return {
                    distanceKm,
                    geometry: route.geometry
                };
            }
        } else {
            const errorData = await res.json().catch(() => ({}));
            console.error("OpenRouteService error:", res.status, errorData);
        }
    } catch (e) {
        console.error("Erro na chamada ao OpenRouteService:", e);
    }

    return null;
}

// ─── Fallback: Calculate route via OSRM (no API key needed) ──────────────────

const calculateRouteViaOSRM = async (
    origin: [number, number],
    destination: [number, number]
): Promise<{ distanceKm: number; geometry: any } | null> => {
    try {
        const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson`
        );

        if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                const distanceMeters = data.routes[0].distance;
                const distanceKm = Number((distanceMeters / 1000).toFixed(1));
                return {
                    distanceKm,
                    geometry: data.routes[0].geometry
                };
            }
        }
    } catch (e) {
        console.error("Erro na chamada ao OSRM:", e);
    }

    return null;
}

// ─── Public: Auto-calculate route distance ───────────────────────────────────

export const autoCalculateRouteDistance = async (address: CustomerData['fullAddress']): Promise<RouteResult | null> => {
    try {
        const settings = getSettings();
        const origin: [number, number] = settings.storeOriginCoords;

        // 1. Geocode the destination
        const destCoords = await geocodeAddress(address);
        if (!destCoords) {
            return null;
        }

        // 2. Calculate route (prefer OSRM as it is faster, fallback to ORS if needed)
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
            destinationCoords: destCoords, // [lng, lat]
            routeGeoJSON: routeData.geometry
        };
    } catch (error) {
        console.error("Erro ao calcular distância por rotas:", error);
        return null;
    }
}

// ─── Search Address Suggestions (Autocomplete) ──────────────────────────────

export const searchAddressSuggestions = async (query: string): Promise<any[]> => {
    if (!query || query.length < 3) return [];
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=br`);
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.warn("Erro ao buscar sugestões de endereço (Nominatim)", e);
    }
    return [];
}