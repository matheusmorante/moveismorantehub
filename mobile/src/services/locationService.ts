import * as Location from 'expo-location';

export interface DriverCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  coords: DriverCoordinates | null;
  permissionGranted: boolean;
  error?: string;
}

/**
 * Solicita permissão de localização ao usuário de forma transparente.
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('[LocationService] Erro ao solicitar permissão de localização:', err);
    return false;
  }
}

/**
 * Verifica se a permissão de localização já foi concedida.
 */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Obtém a posição atual do entregador com tolerância a falhas.
 * Primeiro tenta posição rápida em cache; se não houver, busca posição atual com precisão balanceada.
 */
export async function getCurrentDriverLocation(): Promise<LocationResult> {
  try {
    const isGranted = await hasLocationPermission();
    if (!isGranted) {
      const requested = await requestLocationPermission();
      if (!requested) {
        return { coords: null, permissionGranted: false, error: 'Permissão de localização não concedida' };
      }
    }

    // Tenta obter última posição conhecida recente (máx 10 segundos)
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 10000 });
    if (lastKnown?.coords) {
      return {
        coords: {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        },
        permissionGranted: true,
      };
    }

    // Obtém localização ativa com alta precisão (GPS fino de satélite)
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      permissionGranted: true,
    };
  } catch (error: any) {
    console.warn('[LocationService] Falha ao obter localização do entregador:', error?.message);
    return {
      coords: null,
      permissionGranted: true,
      error: error?.message || 'Localização indisponível',
    };
  }
}

/**
 * Monitora a localização em tempo real com alta precisão e calibração contínua de GPS.
 */
export async function watchDriverLocation(
  onLocation: (coords: DriverCoordinates) => void,
  onError?: (error: string) => void
): Promise<(() => void) | null> {
  try {
    const isGranted = await hasLocationPermission();
    if (!isGranted) {
      const requested = await requestLocationPermission();
      if (!requested) {
        onError?.('Permissão de localização não concedida');
        return null;
      }
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 2,
      },
      (location) => {
        if (location?.coords) {
          onLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      }
    );

    return () => {
      subscription.remove();
    };
  } catch (err: any) {
    console.warn('[LocationService] Falha ao iniciar monitoramento contínuo de GPS:', err);
    onError?.(err?.message || 'Falha ao monitorar GPS');
    return null;
  }
}
