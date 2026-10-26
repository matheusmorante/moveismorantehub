import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => {
  const view = ({ children }: any) => React.createElement('div', null, children);
  const text = ({ children }: any) => React.createElement('span', null, children);
  return {
    StyleSheet: { create: (styles: unknown) => styles },
    Text: text,
    TextInput: () => React.createElement('input'),
    TouchableOpacity: ({ children, onPress }: any) =>
      React.createElement('button', { onClick: onPress }, children),
    View: view,
  };
});

vi.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  MoreVertical: () => null,
  Search: () => null,
  X: () => null,
}));

vi.mock('./header/ProductsHeaderMenuDropdown', () => ({
  ProductsHeaderMenuDropdown: () => null,
}));

vi.mock('./header/ProductsHeaderFiltersSheet', () => ({
  ProductsHeaderFiltersSheet: () => null,
}));

import { ProductsHeader } from './ProductsHeader';

const createProps = (overrides: Partial<React.ComponentProps<typeof ProductsHeader>> = {}) => ({
  dark: false,
  search: '',
  totalCount: 0,
  onSearch: vi.fn(),
  onNewProduct: vi.fn(),
  onOpenConfigs: vi.fn(),
  showDeactivated: false,
  onToggleDeactivated: vi.fn(),
  canFilterByCategory: false,
  categories: [],
  statusFilter: 'all' as const,
  categoryFilter: '',
  catalogStatusFilter: 'all' as const,
  onStatusFilterChange: vi.fn(),
  onCategoryFilterChange: vi.fn(),
  onCatalogStatusFilterChange: vi.fn(),
  ...overrides,
});

describe('ProductsHeader', () => {
  it('oculta a contagem quando a consulta não entregou produtos', () => {
    const markup = renderToStaticMarkup(<ProductsHeader {...createProps({ showCount: false })} />);

    expect(markup).not.toContain('<span>0</span>');
  });

  it('mantém a contagem do snapshot enquanto há produtos na lista', () => {
    const markup = renderToStaticMarkup(
      <ProductsHeader {...createProps({ showCount: true, totalCount: 15 })} />,
    );

    expect(markup).toContain('<span>15</span>');
  });
});
