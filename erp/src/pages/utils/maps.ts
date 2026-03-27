import CustomerData from "../types/customerData.type"
import { AddressViaCep } from "../types/fullAddress.type";
import { stringifyFullAddress, stringifyMapAddress } from "./formatters";
import { getSettings } from '@/pages/utils/settingsService';
import { supabase } from '@/pages/utils/supabaseConfig';

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

// ─── Google Maps Service Loader ──────────────────────────────────────────────
const loadGoogleMapsApi = async (apiKey: string): Promise<void> => {
    if ((window as any).__googleMapsPromise) return (window as any).__googleMapsPromise;
    if ((window as any).google?.maps) return Promise.resolve();
    
    (window as any).__googleMapsPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps script'));
        document.head.appendChild(script);
    });
    return (window as any).__googleMapsPromise;
};

// ─── Geocode address ─────────────────────────────────────────────

export interface GeocodeResponse {
    coords: [number, number];
    isPrecision: boolean;
}

export const geocodeAddress = async (address: CustomerData['fullAddress'] | string): Promise<GeocodeResponse | null> => {
    let street = '', neighborhood = '', city = '', number = '';
    
    if (typeof address === 'string') {
        street = address;
    } else {
        street = address.street;
        neighborhood = address.neighborhood;
        city = address.city;
        number = address.number || '';
    }

    const cleanStreet = street
        .replace(/^(rua|travessa|avenida|trav|r\.|av\.|aven|rod\.|rodovia|pref\.|prefeito|gov\.|governador|pres\.|presidente)\s+/i, '')
        .replace(/\s(da|do|de|das|dos|d')\s/gi, ' ')
        .replace(/-/g, ' ')
        .trim();

    // 0. TENTA GOOGLE MAPS (Se disponível)
    const settings = getSettings();
    const fetchGoogle = async (q: string) => {
        if (!settings.googleMapsApiKey) return null;
        try {
            await loadGoogleMapsApi(settings.googleMapsApiKey);
            const geocoder = new (window as any).google.maps.Geocoder();
            const r: any = await new Promise((resolve, reject) => {
                geocoder.geocode({ address: q, region: 'br' }, (results: any, status: any) => {
                    if (status === 'OK' && results && results.length > 0) resolve(results[0]);
                    else reject(status);
                });
            });
            return { coords: [r.geometry.location.lng(), r.geometry.location.lat()] as [number, number], isPrecise: true };
        } catch {}
        return null;
    };

    // 1. TENTA NOMINATIM (Completão)
    const fetchNom = async (q: string) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=1`, {
                headers: { 
                    'Accept-Language': 'pt-BR',
                    'User-Agent': 'AntigravityLogistics/1.0' 
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    const d = data[0];
                    const hasNumber = d.address?.house_number;
                    return { coords: [Number(d.lon), Number(d.lat)] as [number, number], isPrecise: !!hasNumber };
                }
            }
        } catch {}
        return null;
    };

    // 2. TENTA ARCGIS
    const fetchArcGIS = async (q: string) => {
        try {
            const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?address=${encodeURIComponent(q)}&maxLocations=1&outFields=Addr_type&f=json&location=-49.2,-25.3&distance=50000`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.candidates?.length > 0) {
                    const c = data.candidates[0];
                    const isPrecise = c.attributes.Addr_type === 'PointAddress';
                    return { coords: [c.location.x, c.location.y] as [number, number], isPrecise };
                }
            }
        } catch {}
        return null;
    };

    const query = `${street}${number ? ', ' + number : ''}, ${neighborhood}, ${city}, PR`;
    const simpleQuery = `${cleanStreet}${number ? ', ' + number : ''}, ${city}, PR`;

    let resGoogle = await fetchGoogle(query);
    if (resGoogle?.isPrecise) return { coords: resGoogle.coords, isPrecision: true };

    let resGoogleSimple = await fetchGoogle(simpleQuery);
    if (resGoogleSimple?.isPrecise) return { coords: resGoogleSimple.coords, isPrecision: true };

    let resNom = await fetchNom(query);
    if (resNom?.isPrecise) return { coords: resNom.coords, isPrecision: true };

    let resArc = await fetchArcGIS(query);
    if (resArc?.isPrecise) return { coords: resArc.coords, isPrecision: true };

    let resArcSimple = await fetchArcGIS(simpleQuery);
    if (resArcSimple?.isPrecise) return { coords: resArcSimple.coords, isPrecision: true };

    if (resGoogle?.coords) return { coords: resGoogle.coords, isPrecision: false };
    if (resArc?.coords) return { coords: resArc.coords, isPrecision: false };
    if (resNom?.coords) return { coords: resNom.coords, isPrecision: false };

    const fallback = getNeighborhoodCoords(neighborhood, city);
    if (fallback) return { coords: [fallback.lng, fallback.lat], isPrecision: false };

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

const calculateRouteViaGoogleMaps = async (
    origin: [number, number],
    destination: [number, number],
    apiKey: string
): Promise<{ distanceKm: number; durationMinutes: number; geometry: any } | null> => {
    try {
        await loadGoogleMapsApi(apiKey);
        const directionsService = new (window as any).google.maps.DirectionsService();
        const request = {
            origin: { lat: origin[1], lng: origin[0] },
            destination: { lat: destination[1], lng: destination[0] },
            travelMode: (window as any).google.maps.TravelMode.DRIVING,
            region: 'br',
            language: 'pt-BR'
        };
        const r: any = await new Promise((resolve, reject) => {
            directionsService.route(request, (result: any, status: any) => {
                if (status === 'OK') resolve(result);
                else reject(status);
            });
        });

        if (r.routes && r.routes.length > 0) {
            const route = r.routes[0];
            const leg = route.legs[0];
            const distanceKm = Number((leg.distance.value / 1000).toFixed(1));
            const durationMinutes = Math.ceil(leg.duration.value / 60);
            
            return {
                distanceKm,
                durationMinutes,
                geometry: {
                    type: "LineString",
                    coordinates: route.overview_path.map((p: any) => [p.lng(), p.lat()])
                }
            };
        }
    } catch (e) {
        console.error("Google Directions API error:", e);
    }
    return null;
}

// ─── Public: Auto-calculate route distance ───────────────────────────────────

export const autoCalculateRouteDistance = async (address: CustomerData['fullAddress']): Promise<RouteResult | null> => {
    try {
        const settings = getSettings();
        const origin: [number, number] = settings.storeOriginCoords;

        let geoRes = await geocodeAddress(address);
        if (!geoRes) return null;
        
        let destCoords = geoRes.coords;

        let routeData = null;
        
        if (settings.googleMapsApiKey) {
            routeData = await calculateRouteViaGoogleMaps(origin, destCoords, settings.googleMapsApiKey);
        }

        if (!routeData) {
            routeData = await calculateRouteViaOSRM(origin, destCoords);
        }

        if (!routeData && settings.openRouteServiceApiKey) {
            routeData = await calculateRouteViaORS(origin, destCoords, settings.openRouteServiceApiKey);
        }

        if (!routeData) {
            // FALLBACK TO STRAIGHT-LINE DISTANCE
            // Se as APIs de rota (OSRM/ORS) falharem, ainda temos as coordenadas.
            // Retornamos uma linha reta aproximada em vez de abortar o mapa.
            const toRad = (v: number) => v * Math.PI / 180;
            const R = 6371; // km
            const dLat = toRad(destCoords[1] - origin[1]);
            const dLon = toRad(destCoords[0] - origin[0]);
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                      Math.cos(toRad(origin[1])) * Math.cos(toRad(destCoords[1])) * 
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const straightDistance = R * c;

            return {
                distanceKm: Number((straightDistance * 1.3).toFixed(1)), // Penalidade de 30% simulando ruas
                durationMinutes: Math.ceil(straightDistance * 1.3 * 2), // 2 min por km
                destinationCoords: destCoords,
                routeGeoJSON: {
                    type: "LineString",
                    coordinates: [origin, destCoords]
                }
            };
        }

        return {
            distanceKm: routeData.distanceKm,
            durationMinutes: routeData.durationMinutes,
            destinationCoords: destCoords,
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

    const cleanQuery = query
        .replace(/^(rua|travessa|avenida|trav|r\.|av\.|aven|rod\.|rodovia|prefeito|pref\.|gov\.|governador|pres\.|presidente)\s+/i, '')
        .replace(/\s(da|do|de|das|dos|d')\s/gi, ' ')
        .trim();

    const tryFetchCacheDB = async (q: string) => {
        try {
            const { data, error } = await supabase
                .from('address_cache')
                .select('results')
                .eq('query_key', 'v2_' + q.toLowerCase())
                .single();
            if (!error && data && data.results) {
                return data.results;
            }
        } catch {}
        return [];
    };

    results = await tryFetchCacheDB(cleanQuery);

    const tryFetchNominatim = async (q: string, contextCity?: string) => {
        const searchSuffix = contextCity ? `, ${contextCity}, Paraná` : ', Paraná';
        const fullQuery = q + searchSuffix;

        try {
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&addressdetails=1&limit=5&countrycodes=br`, {
                headers: { 
                    'Accept-Language': 'pt-BR',
                    'User-Agent': 'AntigravityLogistics/1.0'
                }
            });
            if (nomRes.ok) return await nomRes.json();
        } catch {}
        return [];
    };

    const tryFetchGoogleMaps = async (q: string, contextCity?: string) => {
        if (!settings.googleMapsApiKey) return [];
        
        const searchSuffix = contextCity ? `, ${contextCity}, Paraná, Brasil` : ', Paraná, Brasil';
        const fullQuery = q + searchSuffix;

        try {
            await loadGoogleMapsApi(settings.googleMapsApiKey);
            const geocoder = new (window as any).google.maps.Geocoder();
            const gResults: any[] = await new Promise((resolve, reject) => {
                geocoder.geocode({ address: fullQuery, region: 'br' }, (res: any, status: any) => {
                    if (status === 'OK' && res) resolve(res);
                    else reject(status);
                });
            });

            if (gResults && gResults.length > 0) {
                const mappedResults = gResults.map((r: any) => {
                    const getComponent = (type: string) => {
                        const comp = r.address_components.find((c: any) => c.types.includes(type));
                        return comp ? comp.long_name : "";
                    };
                    
                    return {
                        display_name: r.formatted_address,
                        lat: r.geometry.location.lat(),
                        lon: r.geometry.location.lng(),
                        address: {
                            road: getComponent("route"),
                            suburb: getComponent("sublocality") || getComponent("sublocality_level_1") || getComponent("neighborhood"),
                            neighbourhood: getComponent("neighborhood") || getComponent("sublocality") || getComponent("sublocality_level_1"),
                            city: getComponent("administrative_area_level_2") || getComponent("locality"),
                            postcode: getComponent("postal_code")
                        }
                    };
                });
                
                // Salvar no BD cache paralelamente com prefixo v2_
                supabase.from('address_cache').upsert({
                    query_key: 'v2_' + q.toLowerCase(),
                    results: mappedResults
                }).then().catch((e: any) => console.error("Cache address error:", e));

                return mappedResults;
            }
        } catch (error) {
            console.error("Erro no Google Maps API:", error);
        }
        return [];
    };

    if (results.length === 0) {
        if (settings.googleMapsApiKey) {
            results = await tryFetchGoogleMaps(query, city);
        } else {
            results = await tryFetchNominatim(query, city);
            if (results.length === 0 && cleanQuery !== query) {
                results = await tryFetchNominatim(cleanQuery, city);
            }
            if (results.length === 0) {
                results = await tryFetchNominatim('Rua ' + cleanQuery, city);
            }
        }
    }

    if (results.length === 0 && !settings.googleMapsApiKey) {
        try {
            const photonQuery = city ? `${query}, ${city}` : query;
            const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(photonQuery)}&limit=5&lat=-25.3&lon=-49.2`); 
            if (photonRes.ok) {
                const photonData = await photonRes.json();
                if (photonData.features) {
                    const photonMapped = photonData.features
                        .filter((f: any) => f.properties.countrycode === 'BR')
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
                    results = [...results, ...photonMapped];
                }
            }
        } catch {}
    }

    if (results.length === 0 && !settings.googleMapsApiKey) {
        try {
            const arcgisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?address=${encodeURIComponent(query + (city ? ', ' + city : ''))}&maxLocations=5&outFields=Addr_type,Match_addr,StName,City,Postal,District&f=json&location=-49.2,-25.3&distance=50000`;
            const arcgisRes = await fetch(arcgisUrl);
            if (arcgisRes.ok) {
                const arcgisData = await arcgisRes.json();
                if (arcgisData.candidates) {
                    const arcgisMapped = arcgisData.candidates.map((c: any) => ({
                        display_name: c.address,
                        lat: c.location.y,
                        lon: c.location.x,
                        address: {
                            road: c.attributes.StName,
                            suburb: c.attributes.District,
                            neighbourhood: c.attributes.District,
                            city: c.attributes.City,
                            postcode: c.attributes.Postal
                        }
                    }));
                    results = [...results, ...arcgisMapped];
                }
            }
        } catch {}
    }

    const seen = new Set();
    const finalResults = results.filter(res => {
        // STRICTER DEDUPLICATION: block identical display strings instantly
        const displayKey = (res.display_name || "").toLowerCase().trim();
        if (!displayKey || seen.has(displayKey)) return false;
        seen.add(displayKey);

        const road = (res.address?.road || res.address?.pedestrian || "").toLowerCase().trim();
        const suburb = (res.address?.suburb || res.address?.neighbourhood || "").toLowerCase().trim();
        const cityStr = (res.address?.city || res.address?.town || "").toLowerCase().trim();
        const compKey = `${road}|${suburb}|${cityStr}`;
        if (!road || seen.has(compKey)) return false;
        
        seen.add(compKey);
        return true;
    });

    return finalResults.slice(0, 8);
}
