import { Linking, Platform } from 'react-native';

export interface NavigationTarget {
  latitude?: number;
  longitude?: number;
  fullAddress?: string;
}

/**
 * Abre o Google Maps externo com navegação curva a curva GPS (Intent nativa no Android).
 * Prioriza coordenadas precisas e possui fallback para endereço textual.
 */
export async function openExternalNavigation(target: NavigationTarget): Promise<void> {
  const { latitude, longitude, fullAddress } = target;

  if (latitude && longitude) {
    if (Platform.OS === 'android') {
      // Intent nativa direta do Google Maps no Android
      const androidNavUrl = `google.navigation:q=${latitude},${longitude}&mode=d`;
      const canOpen = await Linking.canOpenURL(androidNavUrl);
      if (canOpen) {
        await Linking.openURL(androidNavUrl);
        return;
      }
    }

    // URL universal do Google Maps com coordenadas
    const universalUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    await Linking.openURL(universalUrl);
    return;
  }

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
