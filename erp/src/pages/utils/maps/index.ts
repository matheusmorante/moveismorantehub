export { getNeighborhoodCoords, parseCoordinatesFromMapsUrl } from '../mapCoordinates';
export { normalizeUf, parseAddressPrediction } from '../addressParsing';

export { isGoogleQuotaError, loadGoogleMapsApi } from './googleMapsLoader';

export {
  geocodeCache,
  geocodeRequests,
  getGeocodeRequestKey,
  seedGeocodeCache,
  normalizeStreetAndNumber,
  buildGeocodeCandidateQueries,
  geocodeAddressUncached,
  geocodeAddress,
  type GeocodeResponse,
} from './addressGeocoding';

export {
  getShippingRouteUrl,
  calculateRouteViaGoogleMaps,
  autoCalculateRouteDistance,
  clearRouteCache,
  type RouteResult,
} from './routeCalculation';

export { searchAddressSuggestions, fetchPlaceDetails } from './placesAutocomplete';

export { getAddressByCep } from './cepService';
