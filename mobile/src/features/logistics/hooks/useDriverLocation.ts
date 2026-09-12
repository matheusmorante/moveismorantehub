import { useState, useEffect, useCallback } from 'react';
import { getCurrentDriverLocation, watchDriverLocation, DriverCoordinates } from '../../../services/locationService';

export function useDriverLocation() {
  const [coords, setCoords] = useState<DriverCoordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    const result = await getCurrentDriverLocation();
    if (result.coords) {
      setCoords(result.coords);
    }
    setPermissionGranted(result.permissionGranted);
    setError(result.error || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLocation();

    let stopWatcher: (() => void) | null = null;
    let isMounted = true;

    void watchDriverLocation(
      (newCoords) => {
        if (!isMounted) return;
        setCoords(newCoords);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (!isMounted) return;
        setError(err);
      }
    ).then((cleanup) => {
      if (!isMounted && cleanup) {
        cleanup();
      } else {
        stopWatcher = cleanup;
      }
    });

    return () => {
      isMounted = false;
      if (stopWatcher) {
        stopWatcher();
      }
    };
  }, [fetchLocation]);

  return {
    coords,
    loading,
    error,
    permissionGranted,
    refreshLocation: fetchLocation,
  };
}
