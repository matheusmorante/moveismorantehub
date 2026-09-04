import { useState, useEffect, useCallback } from 'react';
import { getCurrentDriverLocation, DriverCoordinates } from '../../../services/locationService';

export function useDriverLocation() {
  const [coords, setCoords] = useState<DriverCoordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    const result = await getCurrentDriverLocation();
    setCoords(result.coords);
    setPermissionGranted(result.permissionGranted);
    setError(result.error || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return {
    coords,
    loading,
    error,
    permissionGranted,
    refreshLocation: fetchLocation,
  };
}
