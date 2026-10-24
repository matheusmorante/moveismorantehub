import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import {
  getCurrentDriverLocation,
  getLocationAccessStatus,
  watchDriverLocation,
  DriverCoordinates,
} from '../../../services/locationService';

export function useDriverLocation() {
  const [coords, setCoords] = useState<DriverCoordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);
  const [gpsEnabled, setGpsEnabled] = useState(false);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    const result = await getCurrentDriverLocation();
    setCoords(result.coords);
    setPermissionGranted(result.permissionGranted);
    const access = await getLocationAccessStatus();
    setGpsEnabled(access.permissionGranted && access.servicesEnabled);
    setError(result.error || (access.servicesEnabled ? null : 'GPS desligado'));
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchLocation();
    let previousAvailability: boolean | null = null;
    let isMounted = true;

    const refreshAvailability = async () => {
      const access = await getLocationAccessStatus();
      if (!isMounted) return;

      const isAvailable = access.permissionGranted && access.servicesEnabled;
      setPermissionGranted(access.permissionGranted);
      setGpsEnabled(isAvailable);
      if (!isAvailable) {
        setCoords(null);
        setError(access.permissionGranted ? 'GPS desligado' : 'Permissão de localização não concedida');
        setLoading(false);
      } else if (previousAvailability === false) {
        void fetchLocation();
      }
      previousAvailability = isAvailable;
    };

    void refreshAvailability();
    const interval = setInterval(() => void refreshAvailability(), 5000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshAvailability();
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [fetchLocation]);

  useEffect(() => {
    if (!permissionGranted || !gpsEnabled) return;
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
        if (err.toLowerCase().includes('gps') || err.toLowerCase().includes('permissão')) {
          setCoords(null);
          setGpsEnabled(false);
        }
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
  }, [permissionGranted, gpsEnabled]);

  return {
    coords,
    loading,
    error,
    permissionGranted,
    gpsEnabled,
    refreshLocation: fetchLocation,
  };
}
