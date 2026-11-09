import { describe, expect, it } from 'vitest';
import {
  mapDbVariations,
  createDefaultVariation,
} from '@/pages/utils/productService/productVariationMapper';

export function registerCatalogVariationStatusMappingCases(): void {
  describe('Mapeamento seguro de status de variações (Anti-publicação indevida)', () => {
    it('mapDbVariations define status hidden quando variação e pai não possuem status explícito', () => {
      const rawVariations = [
        {
          id: 'var-1',
          product_id: 'prod-1',
          sku: 'MESA-01',
          name: 'Mesa Tabaco',
          price: 500,
          stock: 2,
          status: null, // Sem status
        },
      ];

      const mapped = mapDbVariations(rawVariations, { id: 'prod-1', status: null }, 'MESA');
      expect(mapped[0].status).toBe('hidden');
    });

    it('createDefaultVariation define status hidden quando pai não possui status', () => {
      const mapped = createDefaultVariation(
        { id: 'prod-1', status: null },
        'MESA',
        'Mesa Simples',
        []
      );
      expect(mapped[0].status).toBe('hidden');
    });
  });
}
