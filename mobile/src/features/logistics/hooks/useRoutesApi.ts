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
  const lastCallRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !origin || !destination) {
      setRoute(null);
      return;
    }

    const key = `${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}->${destination.latitude.toFixed(3)},${destination.longitude.toFixed(3)}`;
    if (lastCallRef.current === key) return;

    let active = true;

    const run = async () => {
      setLoading(true);
      lastCallRef.current = key;
      const res = await computeRoute(origin, destination);
      if (active) {
        setRoute(res);
        setLoading(false);
      }
    };

    // Pequeno debounce para estabilizar o GPS
    const timer = setTimeout(run, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude, enabled]);

  return {
    route,
    polylineCoords: route?.coordinates || [],
    distanceKm: route?.distanceKm,
    durationMin: route?.durationMinutes,
    loading,
  };
}
