import { Linking, Platform } from 'react-native';

export interface NavigationTarget {
  latitude?: number;
  longitude?: number;
  fullAddress?: string;
  mapsUrl?: string | null;
}

/**
 * Abre o Google Maps externo com navegação curva a curva GPS (Intent nativa no Android).
 * PRIORIDADE ABSOLUTA: Se houver URL/Link de localização exata (mapsUrl), abre este link diretamente!
 */
export async function openExternalNavigation(target: NavigationTarget): Promise<void> {
  const { latitude, longitude, fullAddress, mapsUrl } = target;

  // 1º PRIORIDADE ABSOLUTA: Link do Google Maps do local real informado no pedido
  if (mapsUrl && typeof mapsUrl === 'string' && mapsUrl.trim().length > 5) {
    const cleanUrl = mapsUrl.trim();
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('google.navigation:')) {
      const canOpen = await Linking.canOpenURL(cleanUrl);
      if (canOpen) {
        await Linking.openURL(cleanUrl);
        return;
      }
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
