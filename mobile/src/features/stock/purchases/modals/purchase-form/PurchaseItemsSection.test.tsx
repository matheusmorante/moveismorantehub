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
vi.mock('../../../../../components/shared/FormTextInput', () => ({
  FormTextInput: (props: any) => React.createElement('input', props),
}));
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
        selectedItemIndex={0}
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
        selectedItemIndex={0}
        onOpenProductPicker={vi.fn()}
        onAddItemRow={vi.fn()}
        onUpdateItem={vi.fn()}
        onRemoveItem={vi.fn()}
        colors={{ bg: '#fff', surface: '#fff', border: '#ddd', text: '#000', muted: '#666' }}
      />
    );

    expect(markup).toContain('Custo unitário');
    expect(markup).not.toContain('Desconto por unidade');
    expect(markup).toContain('Subtotal:');
    expect(markup).toContain('R$ 230.00');
    expect(markup).not.toContain('IPI por unidade');
    expect(markup).not.toContain('Composição e total');
  });

  it('mostra frete rateado na composição do recebimento sem NF sem campo de desconto', () => {
    const markup = renderToStaticMarkup(
      <PurchaseItemsSection
        items={[{
          productId: 'produto', description: 'Mesa', quantity: 2,
          baseCost: 100, discountUnit: 5, freightUnit: 3, unitCost: 98, totalCost: 196,
        }]}
        receiptMode
        simplifiedReceiptMode
        showReceiptCostComposition
        selectedItemIndex={0}
        onOpenProductPicker={vi.fn()}
        onAddItemRow={vi.fn()}
        onUpdateItem={vi.fn()}
        onRemoveItem={vi.fn()}
        colors={{ bg: '#fff', surface: '#fff', border: '#ddd', text: '#000', muted: '#666' }}
      />
    );

    expect(markup).toContain('Composição do custo por unidade');
    expect(markup).not.toContain('Desconto por unidade');
    expect(markup).toContain('Frete por unidade');
    expect(markup).not.toContain('R$ 5.00');
    expect(markup).toContain('R$ 3.00');
    expect(markup).toContain('Custo total');
    expect(markup).not.toContain('IPI por unidade');
  });

  it('exibe os itens de recebimento com NF como informação, sem campos ou ações de edição', () => {
    const markup = renderToStaticMarkup(
      <PurchaseItemsSection
        items={[{
          productId: 'produto', description: 'Roupeiro Seridó', quantity: 4,
          baseCost: 151, discountUnit: 2.5, unitCost: 148.5, totalCost: 594,
        }]}
        receiptMode
        readOnly
        selectedItemIndex={0}
        simplifiedReceiptMode={false}
        onOpenProductPicker={vi.fn()}
        onAddItemRow={vi.fn()}
        onUpdateItem={vi.fn()}
        onRemoveItem={vi.fn()}
        colors={{ bg: '#f8fafc', surface: '#fff', border: '#ddd', text: '#000', muted: '#666' }}
      />
    );

    expect(markup).toContain('Roupeiro Seridó');
    expect(markup).toContain('R$ 151.00');
    expect(markup).not.toContain('R$ 2.50');
    expect(markup).not.toContain('Desconto por unidade');
    expect(markup).not.toContain('<input');
    expect(markup).not.toContain('Alterar produto');
    expect(markup).not.toContain('Remover item');
    expect(markup).not.toContain('Adicionar item');
  });
});
