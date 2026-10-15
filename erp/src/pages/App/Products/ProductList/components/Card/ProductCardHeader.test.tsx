// @vitest-environment happy-dom
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {},
  isTestEnvironment: false,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: { role: 'admin' } }),
}));

import { MemoryRouter } from 'react-router-dom';
import { ProductCardHeader } from './ProductCardHeader';
import type Product from '@/pages/types/product.type';

afterEach(cleanup);

describe('ProductCardHeader - Rótulo de Origem do Estoque', () => {
  const defaultProps = {
    readOnly: false,
    canDeleteProducts: true,
    showCatalogControl: true,
    isParent: false,
    isVariation: false,
    isDraft: false,
    canManageCatalog: true,
    hasParentVariations: false,
    showVariations: false,
    setShowVariations: vi.fn(),
    showTrash: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleActive: vi.fn(),
    onDeactivateCatalog: vi.fn(),
    onOpenSalesModal: vi.fn(),
  };

  const baseProduct: Product = {
    id: 'prod-card-1',
    name: 'Mesa de Centro',
    description: 'Mesa de centro retangular',
    productKind: 'normal',
    active: true,
    isDraft: false,
    itemType: 'product',
  };

  it('renderiza o selo Convencional em azul sem ícone no card', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCardHeader
          {...defaultProps}
          product={baseProduct}
          oppName={undefined}
        />
      </MemoryRouter>
    );

    const badge = screen.getByTestId('stock-origin-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe('Convencional');
    expect(badge.className).toContain('bg-blue-100');
    expect(badge.className).toContain('text-blue-900');
    expect(badge.className).toContain('rounded-full');
    expect(container.querySelector('.bi-fire')).toBeNull();
  });

  it('renderiza o selo Salvados em vermelho quente sem ícone no card', () => {
    const salvadoProduct: Product = {
      ...baseProduct,
      productKind: 'salvado',
      opportunityName: 'Queima dos Salvados',
    };

    const { container } = render(
      <MemoryRouter>
        <ProductCardHeader
          {...defaultProps}
          product={salvadoProduct}
          oppName="Queima dos Salvados"
        />
      </MemoryRouter>
    );

    const badge = screen.getByTestId('stock-origin-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe('Salvados');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-900');
    expect(container.querySelector('.bi-fire')).toBeNull();
  });

  it('renderiza o selo Usados em cor âmbar sem ícone no card', () => {
    const usadoProduct: Product = {
      ...baseProduct,
      productKind: 'usado',
    };

    const { container } = render(
      <MemoryRouter>
        <ProductCardHeader
          {...defaultProps}
          product={usadoProduct}
          oppName={undefined}
        />
      </MemoryRouter>
    );

    const badge = screen.getByTestId('stock-origin-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe('Usados');
    expect(badge.className).toContain('bg-amber-100');
    expect(badge.className).toContain('text-amber-900');
    expect(container.querySelector('.bi-fire')).toBeNull();
  });
});
