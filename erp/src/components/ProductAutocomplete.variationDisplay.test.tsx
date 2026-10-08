// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Product, { Variation } from '../pages/types/product.type';
import ProductAutocomplete from './ProductAutocomplete';

const { mockUseProductAutocomplete } = vi.hoisted(() => ({
  mockUseProductAutocomplete: vi.fn(),
}));

vi.mock('./hooks/useProductAutocomplete', () => ({
  useProductAutocomplete: mockUseProductAutocomplete,
}));

vi.mock('../pages/utils/productService', () => ({
  fetchProductsPage: vi.fn(),
}));

vi.mock('./shared/DropdownPortal', () => ({
  default: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div>{children}</div> : null,
}));

const product = {
  id: 'sofa-capri',
  name: 'Sofá Capri',
  description: 'Sofá Capri',
  unitPrice: 100,
  unit: 'un',
  active: true,
  itemType: 'product',
  code: '001',
} as Product;

const variation = {
  id: 'sofa-capri-azul',
  name: 'Sofá Capri',
  attributes: [{ name: 'Cor', value: 'Azul' }],
  sku: '001-01',
  stock: 2,
  unitPrice: 100,
  active: true,
} as Variation;

describe('ProductAutocomplete variation display', () => {
  beforeEach(() => {
    mockUseProductAutocomplete.mockReturnValue({
      query: 'Sofá Capri',
      setQuery: vi.fn(),
      handleQueryChange: vi.fn(),
      suggestions: [{ product, variation }],
      isLoading: false,
      showSuggestions: true,
      setShowSuggestions: vi.fn(),
      wrapperRef: { current: null },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the color when a legacy variation name contains only the parent name', () => {
    const view = render(<ProductAutocomplete onSelect={vi.fn()} />);

    expect(view.container.querySelector('button')?.textContent).toContain('Sofá Capri Azul');
  });
});
