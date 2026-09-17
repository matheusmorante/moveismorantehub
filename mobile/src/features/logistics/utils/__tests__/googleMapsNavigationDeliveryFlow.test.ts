import { Linking, Platform } from 'react-native';
import { extractNavigationTarget, openExternalNavigation } from '../externalMapsNavigation';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mocks do React Native
vi.mock('react-native', () => ({
  Linking: {
    openURL: vi.fn(),
    canOpenURL: vi.fn(),
  },
  Platform: {
    OS: 'android',
  },
}));

describe('Fluxo de Navegação Externa (Google Maps Delivery)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Platform.OS = 'android'; // Reseta para android por padrão
  });

  describe('extractNavigationTarget', () => {
    it('deve extrair a mapsUrl prioritária se disponível', () => {
      const order = {
        order_data: {
          shipping: {
            deliveryAddress: {
              mapsUrl: 'https://maps.app.goo.gl/priorityLink',
            },
          },
        },
      };

      const result = extractNavigationTarget(order);
      expect(result.mapsUrl).toBe('https://maps.app.goo.gl/priorityLink');
    });

    it('deve extrair latitude e longitude corretamente', () => {
      const order = {
        order_data: {
          shipping: {
            latitude: -25.4284,
            longitude: -49.2733,
            address: 'Centro, Curitiba',
          },
        },
      };

      const result = extractNavigationTarget(order, 'Rua Teste, 123');
      expect(result.latitude).toBe(-25.4284);
      expect(result.longitude).toBe(-49.2733);
      expect(result.fullAddress).toBe('Rua Teste, 123');
    });
  });

  describe('openExternalNavigation', () => {
    it('deve abrir a mapsUrl diretamente (prioridade 1) ignorando plataforma', async () => {
      const target = { mapsUrl: 'https://maps.app.goo.gl/directLink', latitude: -25, longitude: -49 };
      
      await openExternalNavigation(target);

      expect(Linking.openURL).toHaveBeenCalledWith('https://maps.app.goo.gl/directLink');
      expect(Linking.canOpenURL).not.toHaveBeenCalled();
    });

    it('deve abrir a intenção do Google Maps Nativo no Android se houver coordenadas e canOpenURL for true (prioridade 2)', async () => {
      Platform.OS = 'android';
      (Linking.canOpenURL as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      const target = { latitude: -25.4284, longitude: -49.2733 };
      
      await openExternalNavigation(target);

      expect(Linking.canOpenURL).toHaveBeenCalledWith('google.navigation:q=-25.4284,-49.2733&mode=d');
      expect(Linking.openURL).toHaveBeenCalledWith('google.navigation:q=-25.4284,-49.2733&mode=d');
    });

    it('deve realizar fallback para o link universal se canOpenURL for false no Android', async () => {
      Platform.OS = 'android';
      (Linking.canOpenURL as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

      const target = { latitude: -25.4284, longitude: -49.2733 };
      
      await openExternalNavigation(target);

      expect(Linking.openURL).toHaveBeenCalledWith('https://www.google.com/maps/dir/?api=1&destination=-25.4284,-49.2733&travelmode=driving');
    });

    it('deve realizar fallback para o link universal se a plataforma for iOS com coordenadas', async () => {
      Platform.OS = 'ios';

      const target = { latitude: -25.4284, longitude: -49.2733 };
      
      await openExternalNavigation(target);

      expect(Linking.openURL).toHaveBeenCalledWith('https://www.google.com/maps/dir/?api=1&destination=-25.4284,-49.2733&travelmode=driving');
    });

    it('deve buscar por endereço textual via intenção Nativa no Android (prioridade 3) caso não haja coordenadas nem mapsUrl', async () => {
      Platform.OS = 'android';
      (Linking.canOpenURL as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      const target = { fullAddress: 'Rua Teste, 123, Curitiba' };
      const encodedAddress = encodeURIComponent('Rua Teste, 123, Curitiba');
      
      await openExternalNavigation(target);

      expect(Linking.canOpenURL).toHaveBeenCalledWith(`google.navigation:q=${encodedAddress}&mode=d`);
      expect(Linking.openURL).toHaveBeenCalledWith(`google.navigation:q=${encodedAddress}&mode=d`);
    });
  });
});
