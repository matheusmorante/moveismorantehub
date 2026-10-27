import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => {
  const container = ({ children }: any) => React.createElement('div', null, children);
  return {
    Modal: ({ visible, children }: any) =>
      visible ? React.createElement('div', null, children) : null,
    ScrollView: ({ children, horizontal }: any) =>
      React.createElement(
        horizontal ? 'div' : 'section',
        { 'data-scroll-axis': horizontal ? 'horizontal' : 'vertical' },
        children,
      ),
    StyleSheet: { create: (styles: unknown) => styles },
    Text: ({ children }: any) => React.createElement('span', null, children),
    TouchableOpacity: ({
      children,
      accessibilityRole,
      accessibilityLabel,
      accessibilityState,
    }: any) =>
      React.createElement(
        'button',
        {
          role: accessibilityRole,
          'aria-label': accessibilityLabel,
          'aria-checked': accessibilityState?.checked,
        },
        children,
      ),
    View: container,
  };
});

vi.mock('lucide-react-native', () => ({
  Check: () => null,
  X: () => null,
}));

import { ProductsHeaderFiltersSheet } from './ProductsHeaderFiltersSheet';

const createProps: React.ComponentProps<typeof ProductsHeaderFiltersSheet> = {
  visible: true,
  onClose: vi.fn(),
  dark: false,
  mode: 'standard',
  statusFilter: 'active',
  onStatusFilterChange: vi.fn(),
  generalTypeFilter: 'product',
  onGeneralTypeFilterChange: vi.fn(),
  showMergedProducts: false,
  isAdministrator: false,
  showTestProducts: false,
  showTrash: false,
  catalogStatusFilter: 'hidden',
  onCatalogStatusFilterChange: vi.fn(),
  canFilterByCategory: true,
  categories: [{ id: 'bedroom', name: 'Quarto' }],
  categoryFilter: 'bedroom',
  onCategoryFilterChange: vi.fn(),
};

describe('ProductsHeaderFiltersSheet accessibility', () => {
  it('announces each filter choice as a radio with its selected state and context', () => {
    const markup = renderToStaticMarkup(<ProductsHeaderFiltersSheet {...createProps} />);

    expect(markup).toContain(
      '<button role="radio" aria-label="Situação no ERP: Produtos Ativos" aria-checked="true">',
    );
    expect(markup).toContain(
      '<button role="radio" aria-label="Situação no ERP: Todos os Produtos" aria-checked="false">',
    );
    expect(markup).toContain(
      '<button role="radio" aria-label="Tipo geral: Somente Produtos" aria-checked="true">',
    );
    expect(markup).toContain(
      '<button role="radio" aria-label="Catálogo digital: Ocultado do Catálogo" aria-checked="true">',
    );
    expect(markup).toContain(
      '<button role="radio" aria-label="Categoria: Quarto" aria-checked="true">',
    );
  });

  it('keeps the actions after the vertically scrollable filter options', () => {
    const markup = renderToStaticMarkup(<ProductsHeaderFiltersSheet {...createProps} />);
    const scrollStart = markup.indexOf('data-scroll-axis="vertical"');
    const scrollEnd = markup.indexOf('</section>', scrollStart);
    const applyAction = markup.indexOf('Aplicar filtros');

    expect(scrollStart).toBeGreaterThanOrEqual(0);
    expect(scrollEnd).toBeGreaterThan(scrollStart);
    expect(applyAction).toBeGreaterThan(scrollEnd);
  });
});
