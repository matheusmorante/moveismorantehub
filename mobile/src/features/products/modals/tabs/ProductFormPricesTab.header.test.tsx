import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  ActivityIndicator: () => null,
  StyleSheet: { create: (styles: unknown) => styles },
  Text: ({ children }: any) => React.createElement('span', null, children),
  TextInput: () => null,
  TouchableOpacity: ({ children, disabled, onPress }: any) =>
    React.createElement('button', { disabled, onClick: onPress }, children),
  View: ({ children }: any) => React.createElement('div', null, children),
}));

vi.mock('lucide-react-native', () => ({
  DollarSign: () => null,
  Plus: () => null,
  Search: () => null,
  Truck: () => null,
  X: () => null,
}));

vi.mock('../../../../services/stockService', () => ({ saveSupplier: vi.fn() }));
vi.mock('../../../stock/suppliers/SupplierFormModal', () => ({ SupplierFormModal: () => null }));
vi.mock('../../services/mobileSupplierService', () => ({
  fetchMobileProductSuppliersWithStatus: vi.fn(),
}));

import { ProductFormPricesTab } from './ProductFormPricesTab';

const renderPricesTab = (hasVariations: boolean) =>
  renderToStaticMarkup(
    <ProductFormPricesTab
      formData={{ hasVariations, productKind: 'normal', isOwnProduction: true }}
      setFormData={vi.fn()}
      dark={false}
    />
  );

describe('ProductFormPricesTab heading', () => {
  it('uses the ERP pricing heading for a simple product', () => {
    const markup = renderPricesTab(false);

    expect(markup).toContain('Precificação e Descontos');
    expect(markup).not.toContain('Produto Pai');
    expect(markup).not.toContain('Preços de Venda &amp; Desconto');
  });

  it('identifies parent pricing when the product has variations', () => {
    expect(renderPricesTab(true)).toContain('Precificação e Descontos (Produto Pai)');
  });
});
