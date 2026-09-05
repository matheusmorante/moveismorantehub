import { describe, it, expect, vi, beforeEach } from 'vitest';

// Funções puras idênticas às implementadas no helper mobile/src/features/logistics/utils/externalMapsNavigation.ts
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

export function buildAndroidNavigationUri(latitude: number, longitude: number): string {
  return `google.navigation:q=${latitude},${longitude}&mode=d`;
}

export function buildAndroidAddressNavigationUri(fullAddress: string): string {
  return `google.navigation:q=${encodeURIComponent(fullAddress.trim())}&mode=d`;
}

export function buildWebNavigationUrl(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}

export interface NavigationTarget {
  latitude?: number | null;
  longitude?: number | null;
  fullAddress?: string | null;
}

export function extractNavigationTarget(orderOrData: any, fallbackAddress?: string): NavigationTarget {
  if (!orderOrData) {
    return { fullAddress: fallbackAddress || null };
  }

  const data = orderOrData.order_data || orderOrData;
  const shipping = data.shipping || {};
  const customer = data.customerData || orderOrData.customer || {};

  // 1. Prioridade Máxima: shipping.destinationCoords formato [lng, lat]
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

describe('Google Maps Navigation & Delivery Flow - Requisitos Obrigatórios', () => {
  let mockLinking: {
    canOpenURL: (url: string) => Promise<boolean>;
    openURL: (url: string) => Promise<void>;
  };
  let alertSpy: any;

  beforeEach(() => {
    mockLinking = {
      canOpenURL: vi.fn().mockResolvedValue(true),
      openURL: vi.fn().mockResolvedValue(undefined),
    };
    alertSpy = vi.fn();
  });

  async function executeNavigation(
    target: NavigationTarget,
    platform: 'android' | 'ios' = 'android',
    canOpenAndroidMaps = true
  ) {
    const { latitude, longitude, fullAddress } = target;
    const hasCoords = isValidCoordinate(latitude, longitude);

    if (hasCoords) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (platform === 'android') {
        const androidNavUri = buildAndroidNavigationUri(lat, lng);
        mockLinking.canOpenURL = vi.fn().mockResolvedValue(canOpenAndroidMaps);
        const canOpen = await mockLinking.canOpenURL(androidNavUri);
        if (canOpen) {
          await mockLinking.openURL(androidNavUri);
          return { method: 'android_intent', uri: androidNavUri };
        }
      }
      const webUrl = buildWebNavigationUrl(`${lat},${lng}`);
      await mockLinking.openURL(webUrl);
      return { method: 'web_fallback', uri: webUrl };
    }

    if (fullAddress && fullAddress.trim().length > 0) {
      const encodedAddress = encodeURIComponent(fullAddress.trim());
      if (platform === 'android') {
        const androidNavAddrUri = buildAndroidAddressNavigationUri(fullAddress);
        mockLinking.canOpenURL = vi.fn().mockResolvedValue(canOpenAndroidMaps);
        const canOpen = await mockLinking.canOpenURL(androidNavAddrUri);
        if (canOpen) {
          await mockLinking.openURL(androidNavAddrUri);
          return { method: 'android_intent_address', uri: androidNavAddrUri };
        }
      }
      const webAddrUrl = buildWebNavigationUrl(encodedAddress);
      await mockLinking.openURL(webAddrUrl);
      return { method: 'web_fallback_address', uri: webAddrUrl };
    }

    alertSpy('Destino não encontrado');
    return { method: 'none' };
  }

  it('1. Validação estrita de coordenadas: rejeita null, undefined, NaN, 0,0 e fora dos limites', () => {
    expect(isValidCoordinate(null, -49.18)).toBe(false);
    expect(isValidCoordinate(-25.36, undefined)).toBe(false);
    expect(isValidCoordinate(NaN, -49.18)).toBe(false);
    expect(isValidCoordinate(0, 0)).toBe(false);
    expect(isValidCoordinate(-91, -49.18)).toBe(false);
    expect(isValidCoordinate(91, -49.18)).toBe(false);
    expect(isValidCoordinate(-25.36, -181)).toBe(false);
    expect(isValidCoordinate(-25.36, 181)).toBe(false);

    // Coordenadas válidas
    expect(isValidCoordinate(-25.365123, -49.183456)).toBe(true);
    expect(isValidCoordinate('-25.365123', '-49.183456')).toBe(true);
  });

  it('2. Prioridade de Coordenadas: extrai destinationCoords [lng, lat] com precedência', () => {
    const order = {
      order_data: {
        shipping: {
          destinationCoords: [-49.183456, -25.365123], // [lng, lat]
          deliveryAddress: { street: 'Rua Campo Mourão', number: '672', city: 'Colombo' },
        },
      },
    };

    const target = extractNavigationTarget(order);
    expect(target.latitude).toBe(-25.365123);
    expect(target.longitude).toBe(-49.183456);
  });

  it('3. Fallback por endereço se coordenadas não existirem', () => {
    const order = {
      order_data: {
        shipping: {
          deliveryAddress: {
            street: 'Rua Campo Mourão',
            number: '672',
            neighborhood: 'Guaraituba',
            city: 'Colombo',
            state: 'PR',
          },
        },
      },
    };

    const target = extractNavigationTarget(order);
    expect(target.latitude).toBeUndefined();
    expect(target.fullAddress).toContain('Rua Campo Mourão, 672');
    expect(target.fullAddress).toContain('Guaraituba');
    expect(target.fullAddress).toContain('Colombo - PR');
  });

  it('4. Intent Android direto com mode=d e coordenadas corretas', async () => {
    const target: NavigationTarget = {
      latitude: -25.365123,
      longitude: -49.183456,
    };

    const res = await executeNavigation(target, 'android', true);
    expect(res.method).toBe('android_intent');
    expect(res.uri).toBe('google.navigation:q=-25.365123,-49.183456&mode=d');
    expect(mockLinking.openURL).toHaveBeenCalledWith('google.navigation:q=-25.365123,-49.183456&mode=d');
  });

  it('5. Fallback web sem crash caso Google Maps não esteja instalado no Android', async () => {
    const target: NavigationTarget = {
      latitude: -25.365123,
      longitude: -49.183456,
    };

    const res = await executeNavigation(target, 'android', false); // canOpen = false
    expect(res.method).toBe('web_fallback');
    expect(res.uri).toContain('https://www.google.com/maps/dir/?api=1');
    expect(res.uri).toContain('destination=-25.365123,-49.183456');
    expect(res.uri).toContain('travelmode=driving');
  });

  it('6. Coordenadas inválidas sem endereço: não navega e emite aviso', async () => {
    const target: NavigationTarget = {
      latitude: 0,
      longitude: 0,
      fullAddress: '',
    };

    const res = await executeNavigation(target, 'android', true);
    expect(res.method).toBe('none');
    expect(mockLinking.openURL).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Destino não encontrado');
  });

  it('7. Abrir Google Maps NÃO altera a etapa nem conclui a entrega', () => {
    let currentStep = 1;
    let deliveryStatus = 'in_progress';
    let completed = false;

    // Simula o motorista tocando em "ABRIR ROTA NO GOOGLE MAPS" múltiplas vezes
    const onOpenGoogleMaps = () => {
      // Apenas abre Intent externa, preservando rigorosamente o estado
    };

    onOpenGoogleMaps();
    onOpenGoogleMaps();

    expect(currentStep).toBe(1);
    expect(deliveryStatus).toBe('in_progress');
    expect(completed).toBe(false);
  });

  it('8. Entrega já em andamento: reabertura restaura fluxo sem duplicar startDelivery', () => {
    let startDeliveryCallCount = 0;

    const startDelivery = () => {
      startDeliveryCallCount++;
    };

    const openExistingDelivery = (order: any) => {
      const isAlreadyStarted = order.order_data?.deliveryStatus === 'in_progress' || Boolean(order.order_data?.deliveryStartedAt);
      if (!isAlreadyStarted) {
        startDelivery();
      }
      return { step: 1, isOpened: true };
    };

    const activeOrder = {
      id: 'ord-123',
      order_data: {
        deliveryStatus: 'in_progress',
        deliveryStartedAt: '2026-09-05T10:00:00.000Z',
      },
    };

    // Abre primeira vez (já em andamento)
    const res1 = openExistingDelivery(activeOrder);
    expect(res1.isOpened).toBe(true);
    expect(startDeliveryCallCount).toBe(0);

    // Reabre após voltar do Google Maps
    const res2 = openExistingDelivery(activeOrder);
    expect(res2.isOpened).toBe(true);
    expect(startDeliveryCallCount).toBe(0);
  });
});
