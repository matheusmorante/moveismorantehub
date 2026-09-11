import { Linking, Platform } from 'react-native';

export interface NavigationTarget {
  latitude?: number;
  longitude?: number;
  fullAddress?: string;
  mapsUrl?: string | null;
}

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? value as UnknownRecord : {};

const asNonEmptyString = (value: unknown): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
};

const asCoordinate = (value: unknown): number | undefined => {
  const coordinate = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(coordinate) && coordinate !== 0 ? coordinate : undefined;
};

/** Extrai somente dados de navegação já presentes no pedido, sem alterar o registro. */
export const extractNavigationTarget = (order: unknown, fullAddress?: string): NavigationTarget => {
  const row = asRecord(order);
  const orderData = asRecord(row.order_data);
  const shipping = asRecord(orderData.shipping ?? row.shipping);
  const deliveryAddress = asRecord(shipping.deliveryAddress ?? shipping.address);
  const customerData = asRecord(orderData.customerData ?? row.customerData ?? orderData.customer ?? row.customer);
  const customerAddress = asRecord(customerData.fullAddress ?? customerData.address);
  const destinationCoords = Array.isArray(shipping.destinationCoords) ? shipping.destinationCoords : [];

  const rawMapsUrl = asNonEmptyString(
    deliveryAddress.mapsUrl
    ?? deliveryAddress.googleMapsUrl
    ?? deliveryAddress.mapsLink
    ?? shipping.mapsUrl
    ?? shipping.googleMapsUrl
    ?? shipping.mapsLink
    ?? customerAddress.mapsUrl
    ?? customerAddress.googleMapsUrl
    ?? customerAddress.mapsLink
    ?? customerData.mapsUrl
    ?? customerData.googleMapsUrl
    ?? customerData.mapsLink
    ?? orderData.mapsUrl
    ?? row.mapsUrl,
  );

  return {
    latitude: asCoordinate(shipping.latitude ?? destinationCoords[1]),
    longitude: asCoordinate(shipping.longitude ?? destinationCoords[0]),
    fullAddress: fullAddress || asNonEmptyString(deliveryAddress.fullAddress ?? deliveryAddress.address ?? customerAddress.fullAddress ?? customerAddress.address),
    mapsUrl: rawMapsUrl,
  };
};

/**
 * Abre o Google Maps externo com navegação curva a curva GPS (Intent nativa no Android).
 * PRIORIDADE ABSOLUTA: Se houver URL/Link de localização exata (mapsUrl), abre este link diretamente!
 */
export async function openExternalNavigation(target: NavigationTarget): Promise<void> {
  const { latitude, longitude, fullAddress, mapsUrl } = target;

  // 1º PRIORIDADE ABSOLUTA: Link do Google Maps do local real informado no pedido/cliente
  if (mapsUrl && typeof mapsUrl === 'string' && mapsUrl.trim().length > 5) {
    const cleanUrl = mapsUrl.trim();
    try {
      await Linking.openURL(cleanUrl);
      return;
    } catch (e) {
      console.warn('Falha ao abrir mapsUrl direta, tentando alternativas:', e);
    }
  }

  // 2º Se houver coordenadas
  if (latitude && longitude) {
    if (Platform.OS === 'android') {
      const androidNavUrl = `google.navigation:q=${latitude},${longitude}&mode=d`;
      const canOpen = await Linking.canOpenURL(androidNavUrl);
      if (canOpen) {
        await Linking.openURL(androidNavUrl);
        return;
      }
    }

    const universalUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    await Linking.openURL(universalUrl);
    return;
  }

  // 3º Fallback para endereço textual
  if (fullAddress) {
    const encoded = encodeURIComponent(fullAddress);
    if (Platform.OS === 'android') {
      const androidNavAddr = `google.navigation:q=${encoded}&mode=d`;
      const canOpen = await Linking.canOpenURL(androidNavAddr);
      if (canOpen) {
        await Linking.openURL(androidNavAddr);
        return;
      }
    }

    const universalAddr = `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`;
    await Linking.openURL(universalAddr);
  }
}

/** Nome explícito para as etapas de entrega; delega à única implementação de navegação. */
export const openGoogleMapsNavigation = openExternalNavigation;
