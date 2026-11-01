import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  AccessibilityInfo: {
    isReduceMotionEnabled: async () => false,
    addEventListener: () => ({ remove: vi.fn() }),
  },
  Animated: {
    Value: class {
      value: number;
      constructor(value: number) { this.value = value; }
      interpolate() { return this.value; }
      setValue(value: number) { this.value = value; }
    },
    timing: () => ({ start: (callback?: (result: { finished: boolean }) => void) => callback?.({ finished: true }), stop: vi.fn() }),
    View: ({ children }: any) => React.createElement('div', null, children),
  },
  Easing: {
    cubic: (value: number) => value,
    inOut: (easing: (value: number) => number) => easing,
    out: (easing: (value: number) => number) => easing,
  },
  View: ({ children }: any) => React.createElement('div', null, children),
  Text: ({ children }: any) => React.createElement('span', null, children),
  TextInput: () => React.createElement('input'),
  TouchableOpacity: ({ children }: any) => React.createElement('button', null, children),
  Pressable: ({ children }: any) => React.createElement('button', null, children),
  Modal: ({ visible, children }: any) => visible ? React.createElement('div', null, children) : null,
  StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
  Alert: { alert: vi.fn() },
}));
vi.mock('lucide-react-native', () => ({
  Check: () => null,
  Plus: () => null,
  Search: () => null,
  ChevronDown: () => null,
  MoreVertical: () => null,
  Trash2: () => null,
}));
vi.mock('../../../../../components/shared/CurrencyInput', () => ({ CurrencyInput: () => null }));
vi.mock('../../hooks/usePurchaseForm', () => ({
  formatMoney: (value: number) => `R$ ${value.toFixed(2)}`,
  parseNumber: (value: string) => Number(value) || 0,
}));

import { PurchaseItemsSection } from './PurchaseItemsSection';

describe('composição do item de compra no aplicativo', () => {
  it('identifica valores por unidade e apresenta o total conforme o custo final exibido', () => {
    const markup = renderToStaticMarkup(
      <PurchaseItemsSection
        items={[{
          productId: 'produto', description: 'Mesa', quantity: 2,
          baseCost: 33.33, discountUnit: 0, unitCost: 33.33, totalCost: 66.66,
        }]}
        discountPercent="0"
        ipiPercent="3"
        freightPercent="7"
        onOpenProductPicker={vi.fn()}
        onAddItemRow={vi.fn()}
        onUpdateItem={vi.fn()}
        onRemoveItem={vi.fn()}
        colors={{ bg: '#fff', surface: '#fff', border: '#ddd', text: '#000', muted: '#666' }}
      />
    );

    expect(markup).toContain('Custo base un.');
    expect(markup).toContain('Composição do custo por unidade');
    expect(markup).toContain('Desconto un.');
    expect(markup).toContain('IPI un.');
    expect(markup).toContain('Frete un.');
    expect(markup).not.toContain('Desconto unitário de Mesa');
    expect(markup).toContain('Custo final un.');
    expect(markup).toContain('R$ 36.66');
    expect(markup).toContain('Total do item');
    expect(markup).toContain('R$ 73.32');
    expect(markup).not.toContain('Subtotal');
    expect(markup).not.toContain('Outras despesas');
  });

  it('preserva o valor calculado do recebimento sem aplicar as porcentagens do pedido', () => {
    const markup = renderToStaticMarkup(
      <PurchaseItemsSection
        items={[{
          productId: 'produto', description: 'Mesa', quantity: 2,
          baseCost: 100, discountUnit: 5, unitCost: 115, totalCost: 230,
        }]}
        receiptMode
        onOpenProductPicker={vi.fn()}
        onAddItemRow={vi.fn()}
        onUpdateItem={vi.fn()}
        onRemoveItem={vi.fn()}
        colors={{ bg: '#fff', surface: '#fff', border: '#ddd', text: '#000', muted: '#666' }}
      />
    );

    expect(markup).toContain('Custo unitário');
    expect(markup).toContain('Desconto por unidade');
    expect(markup).toContain('Subtotal:');
    expect(markup).toContain('R$ 230.00');
    expect(markup).not.toContain('IPI por unidade');
    expect(markup).not.toContain('Composição e total');
  });
});
