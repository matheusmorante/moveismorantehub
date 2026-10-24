import { useState, useEffect, useRef } from 'react';
import { computeRoute, RouteComputationResult } from '../services/googleRoutesService';
import { DriverCoordinates } from '../../../services/locationService';

interface Props {
  origin: DriverCoordinates | null;
  destination: { latitude: number; longitude: number } | null;
  enabled?: boolean;
}

export function useRoutesApi({ origin, destination, enabled = true }: Props) {
  const [route, setRoute] = useState<RouteComputationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const coordinatesRef = useRef({ origin, destination });
  const routeKey = enabled && origin && destination
    ? `${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}->${destination.latitude.toFixed(3)},${destination.longitude.toFixed(3)}`
    : null;

  useEffect(() => {
    coordinatesRef.current = { origin, destination };
  }, [origin, destination]);

  useEffect(() => {
    if (!routeKey) {
      setRoute(null);
      setLoading(false);
      return;
    }

    let active = true;

    const run = async () => {
      const { origin, destination } = coordinatesRef.current;
      if (!origin || !destination) return;
      setLoading(true);
      try {
        const res = await computeRoute(origin, destination);
        if (active) setRoute(res);
      } catch {
        if (active) setRoute(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    // Pequeno debounce para estabilizar o GPS
    const timer = setTimeout(run, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [routeKey]);

  return {
    route,
    polylineCoords: route?.coordinates || [],
    distanceKm: route?.distanceKm,
    durationMin: route?.durationMinutes,
    loading,
  };
}
