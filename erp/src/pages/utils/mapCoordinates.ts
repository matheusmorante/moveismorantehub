export const getNeighborhoodCoords = (
  neighborhood?: string,
  city?: string
): { lat: number; lng: number } | null => {
  const neighborhoodCoords: Record<string, { lat: number; lng: number }> = {
    // Colombo
    guaraituba: { lat: -25.352, lng: -49.1692 },
    'parque dos lagos': { lat: -25.3622, lng: -49.1387 },
    maracanã: { lat: -25.3675, lng: -49.1834 },
    maracana: { lat: -25.3675, lng: -49.1834 },
    'alto maracanã': { lat: -25.3675, lng: -49.1834 },
    'roça grande': { lat: -25.3377, lng: -49.2001 },
    'roca grande': { lat: -25.3377, lng: -49.2001 },
    'rio verde': { lat: -25.3582, lng: -49.1894 },
    'são gabriel': { lat: -25.334, lng: -49.215 },
    arruda: { lat: -25.34, lng: -49.16 },
    colombo: { lat: -25.2917, lng: -49.2242 },
    // Curitiba
    curitiba: { lat: -25.429, lng: -49.2671 },
    centro: { lat: -25.432, lng: -49.271 },
    atuba: { lat: -25.3855, lng: -49.2085 },
    'santa cândida': { lat: -25.375, lng: -49.23 },
    'santa candida': { lat: -25.375, lng: -49.23 },
    'boa vista': { lat: -25.39, lng: -49.245 },
    bacacheri: { lat: -25.405, lng: -49.23 },
    cabral: { lat: -25.412, lng: -49.255 },
    'alto da xv': { lat: -25.426, lng: -49.255 },
    batel: { lat: -25.441, lng: -49.285 },
    portão: { lat: -25.475, lng: -49.295 },
    portao: { lat: -25.475, lng: -49.295 },
    fazendinha: { lat: -25.485, lng: -49.32 },
    cic: { lat: -25.505, lng: -49.345 },
    boqueirão: { lat: -25.505, lng: -49.235 },
    boqueirao: { lat: -25.505, lng: -49.235 },
    'sitio cercado': { lat: -25.535, lng: -49.265 },
    'sítio cercado': { lat: -25.535, lng: -49.265 },
    // Região Metropolitana
    pinhais: { lat: -25.4411, lng: -49.1931 },
    piraquara: { lat: -25.4417, lng: -49.0633 },
    'sao jose dos pinhais': { lat: -25.5348, lng: -49.2064 },
    'são josé dos pinhais': { lat: -25.5348, lng: -49.2064 },
    'almirante tamandaré': { lat: -25.32, lng: -49.3 },
    'almirante tamandare': { lat: -25.32, lng: -49.3 },
    'quatro barras': { lat: -25.365, lng: -49.075 },
    'campina grande do sul': { lat: -25.305, lng: -49.055 },
    araucária: { lat: -25.59, lng: -49.405 },
    araucaria: { lat: -25.59, lng: -49.405 },
  };

  const n = neighborhood?.toLowerCase().trim() || '';
  const c = city?.toLowerCase().trim() || '';

  if (neighborhoodCoords[n]) return neighborhoodCoords[n];
  if (neighborhoodCoords[c]) return neighborhoodCoords[c];
  return null;
};

export const parseCoordinatesFromMapsUrl = (
  url?: string | null
): { latitude: number; longitude: number } | null => {
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
