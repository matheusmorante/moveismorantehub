// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import { useProductFormSync } from './useProductFormSync';

const makeVariation = (): Variation => ({
  id: 'variation-1',
  name: 'Nome antigo',
  sku: 'SKU-1',
  stock: 1,
  unitPrice: 10,
  costPrice: 5,
  active: false,
  attributes: [{ name: 'Cor', value: 'Azul' }],
  images: ['https://img.test/old.jpg'],
  syncUnitPrice: true,
  syncCostPrice: true,
});

describe('useProductFormSync simple creation inheritance', () => {
  it('inherits the parent fields while leaving variation photos empty for the parent-photo fallback', async () => {
    const { result } = renderHook(() => {
      const [formData, setFormData] = useState<Partial<Product>>({
        name: 'Mesa',
        title: 'Mesa principal',
        marketplaceTitle: 'Mesa catálogo',
        barcode: '123456',
        stock: 8,
        unitPrice: 120,
        promoPrice: 100,
        costPrice: 55,
        condition: 'novo',
        description: 'Mesa de madeira',
        fiscal: { ncm: '94032000' },
        width: 90,
        height: 75,
        depth: 60,
        weight: 25,
        ipiPercent: 4,
        ipiType: 'percentage',
        freightCost: 12,
        freightType: 'fixed',
        minStock: 2,
        technicalValues: { Material: 'MDF', Acabamento: 'Fosco' },
        images: ['https://img.test/mesa.jpg'],
        hasVariations: false,
        variations: [makeVariation()],
      });

      useProductFormSync({ formData, setFormData });
      return formData;
    });

    await waitFor(() => {
      expect(result.current.variations?.[0]).toMatchObject({
        name: 'Mesa',
        title: 'Mesa principal',
        marketplaceTitle: 'Mesa catálogo',
        barcode: '123456',
        stock: 8,
        unitPrice: 120,
        promoPrice: 100,
        costPrice: 55,
        condition: 'novo',
        description: 'Mesa de madeira',
        fiscal: { ncm: '94032000' },
        width: 90,
        height: 75,
        depth: 60,
        weight: 25,
        ipiPercent: 4,
        freightCost: 12,
        minStock: 2,
        attributes: [],
        technicalValues: { Material: 'MDF', Acabamento: 'Fosco' },
        images: [],
      });
    });
  });

  it('does not overwrite variation fields for an existing saved product', async () => {
    const savedVariation = {
      ...makeVariation(),
      syncUnitPrice: false,
      syncCostPrice: false,
      syncPromoPrice: false,
    };
    const { result } = renderHook(() => {
      const [formData, setFormData] = useState<Partial<Product>>({
        name: 'Mesa',
        stock: 8,
        unitPrice: 120,
        hasVariations: false,
        variations: [savedVariation],
      });

      useProductFormSync({ formData, setFormData, isExistingProduct: true });
      return formData;
    });

    await waitFor(() => expect(result.current.variations?.[0]).toEqual(savedVariation));
  });
});
