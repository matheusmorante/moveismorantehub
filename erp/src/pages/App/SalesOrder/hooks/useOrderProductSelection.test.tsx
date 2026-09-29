// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type Item from '@/pages/types/items.type';
import { useOrderProductSelection } from './useOrderProductSelection';

const emptyItem: Item = {
  description: '',
  quantity: 1,
  unitPrice: 0,
  unitDiscount: 0,
  discountType: 'fixed',
  handlingType: '',
};

describe('seleção de produto na venda por origem do estoque', () => {
  for (const [productKind, expectedCondition] of [
    ['normal', 'novo'],
    ['salvado', 'salvado'],
    ['usado', 'usado'],
  ] as const) {
    it(`copia valores e vincula somente produto ${productKind}`, () => {
      const { result } = renderHook(() => {
        const [items, setItems] = useState<Item[]>([emptyItem]);
        return { items, ...useOrderProductSelection(items, setItems) };
      });

      act(() => result.current.handleSelectProduct(0, {
        id: `produto-${productKind}`,
        productKind,
        name: 'Mesa',
        code: 'MESA-1',
        unitPrice: 120,
        costPrice: 80,
      }));

      const item = result.current.items[0];
      expect(item.condition).toBe(expectedCondition);
      expect(item.description).toBe('Mesa');
      expect(item.unitPrice).toBe(120);
      expect(item.productId).toBe(productKind === 'normal' ? 'produto-normal' : undefined);
      expect(item.isTemporaryProduct).toBe(productKind !== 'normal');
    });
  }
});
