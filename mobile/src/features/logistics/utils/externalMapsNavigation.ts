import { Linking, Platform, Alert } from 'react-native';

export interface NavigationTarget {
  latitude?: number | null;
  longitude?: number | null;
  fullAddress?: string | null;
}

/**
 * Valida estritamente se as coordenadas de latitude e longitude são utilizáveis para GPS.
 * Rejeita: null, undefined, NaN, 0,0 e valores fora dos limites geográficos (-90..90, -180..180).
 */
export function isValidCoordinate(latitude: any, longitude: any): boolean {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return false;
  }
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;

  return true;
}

/**
 * Extrai o melhor alvo de navegação (coordenadas prioritárias ou endereço textual)
 * a partir da estrutura real de dados do pedido / frete / cliente.
 */
export function extractNavigationTarget(orderOrData: any, fallbackAddress?: string): NavigationTarget {
  if (!orderOrData) {
    return { fullAddress: fallbackAddress || null };
  }

  const data = orderOrData.order_data || orderOrData;
  const shipping = data.shipping || {};
  const customer = data.customerData || orderOrData.customer || {};

  // 1. Prioridade Máxima: shipping.destinationCoords formato GeoJSON/MapLibre [lng, lat]
  const dCoords = shipping.destinationCoords;
  if (Array.isArray(dCoords) && dCoords.length === 2) {
    const lng = Number(dCoords[0]);
    const lat = Number(dCoords[1]);
    if (isValidCoordinate(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  // 2. Coordenadas em objeto coords { latitude, longitude } ou { lat, lng }
  const rawCoords = orderOrData.coords || shipping.coords || shipping.deliveryAddress?.coords || customer.coords;
  if (rawCoords) {
    if (Array.isArray(rawCoords) && rawCoords.length === 2) {
      const lng = Number(rawCoords[0]);
      const lat = Number(rawCoords[1]);
      if (isValidCoordinate(lat, lng)) return { latitude: lat, longitude: lng };
    } else if (typeof rawCoords === 'object') {
      const lat = Number(rawCoords.latitude ?? rawCoords.lat);
      const lng = Number(rawCoords.longitude ?? rawCoords.lng);
      if (isValidCoordinate(lat, lng)) return { latitude: lat, longitude: lng };
    }
  }

  // 3. Latitude e longitude explícitas
  const directLat = shipping.latitude ?? shipping.deliveryAddress?.latitude ?? customer.latitude;
  const directLng = shipping.longitude ?? shipping.deliveryAddress?.longitude ?? customer.longitude;
  if (isValidCoordinate(directLat, directLng)) {
    return { latitude: Number(directLat), longitude: Number(directLng) };
  }

  // 4. Fallback de endereço textual formatado
  const street = (shipping.deliveryAddress?.street || customer.fullAddress?.street || customer.address?.street || '').trim();
  const number = (shipping.deliveryAddress?.number || customer.fullAddress?.number || customer.address?.number || '').trim();
  const neighborhood = (shipping.deliveryAddress?.neighborhood || customer.fullAddress?.neighborhood || customer.address?.neighborhood || '').trim();
  const city = (shipping.deliveryAddress?.city || customer.fullAddress?.city || customer.city || 'Colombo').trim();
  const state = (shipping.deliveryAddress?.state || customer.fullAddress?.state || 'PR').trim();
  const cep = (shipping.deliveryAddress?.cep || customer.fullAddress?.cep || '').trim();

  let resolvedAddress = fallbackAddress || '';
  if (!resolvedAddress && street) {
    const parts: string[] = [];
    parts.push(number ? `${street}, ${number}` : street);
    if (neighborhood) parts.push(neighborhood);
    if (city) parts.push(state ? `${city} - ${state}` : city);
    if (cep) parts.push(cep);
    resolvedAddress = parts.join(', ');
  }

  return { fullAddress: resolvedAddress.trim() || null };
}

/**
 * Abre o aplicativo oficial Google Maps no Android via Intent nativa direta (google.navigation:q=...&mode=d).
 * Se o Google Maps não estiver instalado, faz fallback seguro para a URL web oficial sem travar o aplicativo.
 * A origem da rota é automaticamente a posição atual do aparelho assumida pelo Google Maps.
 */
export async function openGoogleMapsNavigation(target: NavigationTarget): Promise<void> {
  const { latitude, longitude, fullAddress } = target;
  const hasCoords = isValidCoordinate(latitude, longitude);

  try {
    if (hasCoords) {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (Platform.OS === 'android') {
        // Intent oficial do Google Maps com modo de direção (carro)
        const androidNavUri = `google.navigation:q=${lat},${lng}&mode=d`;
        const canOpen = await Linking.canOpenURL(androidNavUri);
        if (canOpen) {
          await Linking.openURL(androidNavUri);
          return;
        }
      }

      // Fallback seguro universal do Google Maps com coordenadas
      const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      await Linking.openURL(webUrl);
      return;
    }

    if (fullAddress && fullAddress.trim().length > 0) {
      const encodedAddress = encodeURIComponent(fullAddress.trim());

      if (Platform.OS === 'android') {
        const androidNavAddrUri = `google.navigation:q=${encodedAddress}&mode=d`;
        const canOpen = await Linking.canOpenURL(androidNavAddrUri);
        if (canOpen) {
          await Linking.openURL(androidNavAddrUri);
          return;
        }
      }

      const webAddrUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
      await Linking.openURL(webAddrUrl);
      return;
    }

    // Caso não exista destino confiável
    Alert.alert(
      'Destino não encontrado',
      'Esta entrega não possui coordenadas nem endereço válido cadastrado para navegação.'
    );
  } catch (error: any) {
    // Tratamento de segurança contra crashes
    const fallbackDestination = hasCoords
      ? `${latitude},${longitude}`
      : fullAddress ? encodeURIComponent(fullAddress.trim()) : '';

    if (fallbackDestination) {
      try {
        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${fallbackDestination}&travelmode=driving`);
      } catch {
        Alert.alert('Erro de Navegação', 'Não foi possível iniciar o aplicativo Google Maps.');
      }
    } else {
      Alert.alert('Erro de Navegação', 'Destino inválido para iniciar a navegação.');
    }
  }
}

/**
 * Alias de compatibilidade com os componentes existentes.
 */
export const openExternalNavigation = openGoogleMapsNavigation;
