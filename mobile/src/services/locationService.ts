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

    // Tenta obter última posição conhecida primeiro para resposta instantânea
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
    if (lastKnown?.coords) {
      return {
        coords: {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        },
        permissionGranted: true,
      };
    }

    // Se não houver cache recente, obtém localização ativa com timeout de 6s
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
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
