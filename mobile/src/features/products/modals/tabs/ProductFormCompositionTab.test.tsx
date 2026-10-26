import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  actions: [] as Array<{ label: string; onPress?: () => void }>,
}));

vi.mock('react-native', () => {
  const nodeText = (node: any): string => {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(nodeText).join('');
    if (node && typeof node === 'object' && 'props' in node) return nodeText(node.props.children);
    return '';
  };
  const view = ({ children }: any) => React.createElement('div', null, children);
  const text = ({ children }: any) => React.createElement('span', null, children);

  return {
    ScrollView: view,
    StyleSheet: { create: (styles: unknown) => styles },
    Text: text,
    TextInput: () => null,
    TouchableOpacity: ({ children, onPress, accessibilityLabel }: any) => {
      mocks.actions.push({ label: accessibilityLabel || nodeText(children), onPress });
      return React.createElement('button', { onClick: onPress }, children);
    },
    View: view,
  };
});

vi.mock('lucide-react-native', () => {
  const icon = () => null;
  return { Info: icon, Minus: icon, Plus: icon, Search: icon, Trash2: icon };
});

vi.mock('../../../../hooks/useZodForm', () => ({
  useZodForm: () => ({ validateValues: vi.fn() }),
}));

vi.mock('../../services/mobileProductCompositionService', () => ({
  searchMobileProductCompositionCandidates: vi.fn(),
}));

import { ProductFormCompositionTab } from './ProductFormCompositionTab';

describe('ProductFormCompositionTab', () => {
  beforeEach(() => {
    mocks.actions.length = 0;
  });

  it('remove somente o componente selecionado e mantém as demais linhas', () => {
    const items = [
      { productId: 'product-a', description: 'Mesa Aurora', quantity: 2, unitPrice: 100, stock: 8 },
      { productId: 'product-b', description: 'Cadeira Aurora', quantity: 1, unitPrice: 50, stock: 4 },
    ];
    const previous = { id: 'composition', name: 'Kit Aurora', comboItems: items };
    const setFormData = vi.fn();

    renderToStaticMarkup(
      <ProductFormCompositionTab
        formData={previous}
        setFormData={setFormData}
        dark={false}
      />
    );

    const removeActions = mocks.actions.filter(({ label }) => label === 'Remover Item');
    expect(removeActions).toHaveLength(2);
    removeActions[1].onPress?.();

    expect(setFormData).toHaveBeenCalledOnce();
    const update = setFormData.mock.calls[0][0] as (value: typeof previous) => typeof previous;
    expect(update(previous)).toEqual({ ...previous, comboItems: [items[0]] });
  });
});
