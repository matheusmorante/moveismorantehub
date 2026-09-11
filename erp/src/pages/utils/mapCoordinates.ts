export const getNeighborhoodCoords = (neighborhood?: string, city?: string): { lat: number; lng: number } | null => {
    const neighborhoodCoords: Record<string, { lat: number; lng: number }> = {
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

export const parseCoordinatesFromMapsUrl = (url?: string | null): { latitude: number; longitude: number } | null => {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.trim();
    if (cleanUrl.length < 5) return null;

    // Pattern 1: @-25.3520305,-49.1692818
    const atMatch = cleanUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
        const lat = parseFloat(atMatch[1]);
        const lng = parseFloat(atMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            return { latitude: lat, longitude: lng };
        }
    }

    // Pattern 2: q=-25.352,-49.169 ou query=-25.352,-49.169 ou ll=-25.352,-49.169 ou destination=-25.352,-49.169
    const queryMatch = cleanUrl.match(/(?:q|query|ll|destination)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/i);
    if (queryMatch) {
        const lat = parseFloat(queryMatch[1]);
        const lng = parseFloat(queryMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            return { latitude: lat, longitude: lng };
        }
    }

    // Pattern 3: lat=-25.352&lng=-49.169
    const latParam = cleanUrl.match(/[?&]lat=(-?\d+\.\d+)/i);
    const lngParam = cleanUrl.match(/[?&](?:lng|lon)=(-?\d+\.\d+)/i);
    if (latParam && lngParam) {
        const lat = parseFloat(latParam[1]);
        const lng = parseFloat(lngParam[1]);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            return { latitude: lat, longitude: lng };
        }
    }

    return null;
};
