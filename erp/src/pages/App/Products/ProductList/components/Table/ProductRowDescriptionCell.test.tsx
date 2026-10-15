// @vitest-environment happy-dom
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {},
  isTestEnvironment: false,
}));

import { ProductRowDescriptionCell } from './ProductRowDescriptionCell';
import type Product from '@/pages/types/product.type';

afterEach(cleanup);

describe('ProductRowDescriptionCell - Rótulo de Origem do Estoque', () => {
  const baseProduct: Product = {
    id: 'prod-1',
    name: 'Guarda-Roupa Casal',
    description: 'Guarda-roupa casal 6 portas',
    productKind: 'normal',
    active: true,
    isDraft: false,
    itemType: 'product',
  };

  it('renderiza o rótulo de origem de estoque Convencional sem ícones em produto normal', () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <ProductRowDescriptionCell
              product={baseProduct}
              displayName="Guarda-Roupa Casal"
              isChildVar={false}
              isChildVariation={false}
              oppName={null}
              supplierNames={[]}
            />
          </tr>
        </tbody>
      </table>
    );

    const badge = screen.getByTestId('stock-origin-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe('Convencional');
    expect(badge.className).toContain('bg-blue-100');
    expect(badge.className).toContain('text-blue-900');
    expect(container.querySelector('.bi-fire')).toBeNull();
  });

  it('renderiza o rótulo de origem de estoque Salvados com cor quente avermelhada sem ícones', () => {
    const salvadoProduct: Product = {
      ...baseProduct,
      id: 'prod-salvado-1',
      productKind: 'salvado',
      opportunityName: 'Queima dos Salvados',
    };

    const { container } = render(
      <table>
        <tbody>
          <tr>
            <ProductRowDescriptionCell
              product={salvadoProduct}
              displayName="Guarda-Roupa Salvados"
              isChildVar={false}
              isChildVariation={false}
              oppName="Queima dos Salvados"
              supplierNames={[]}
            />
          </tr>
        </tbody>
      </table>
    );

    const badge = screen.getByTestId('stock-origin-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe('Salvados');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-900');
    expect(container.querySelector('.bi-fire')).toBeNull();
  });

  it('renderiza o rótulo de origem de estoque Usados em cor âmbar sem ícones', () => {
    const usadoProduct: Product = {
      ...baseProduct,
      id: 'prod-usado-1',
      productKind: 'usado',
    };

    const { container } = render(
      <table>
        <tbody>
          <tr>
            <ProductRowDescriptionCell
              product={usadoProduct}
              displayName="Guarda-Roupa Usado"
              isChildVar={false}
              isChildVariation={false}
              oppName={null}
              supplierNames={[]}
            />
          </tr>
        </tbody>
      </table>
    );

    const badge = screen.getByTestId('stock-origin-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe('Usados');
    expect(badge.className).toContain('bg-amber-100');
    expect(badge.className).toContain('text-amber-900');
    expect(container.querySelector('.bi-fire')).toBeNull();
  });

  it('não exibe o rótulo de origem de estoque em sublinhas de variação filha', () => {
    render(
      <table>
        <tbody>
          <tr>
            <ProductRowDescriptionCell
              product={baseProduct}
              displayName="Variação Branca"
              isChildVar={true}
              isChildVariation={true}
              oppName={null}
              supplierNames={[]}
            />
          </tr>
        </tbody>
      </table>
    );

    expect(screen.queryByTestId('stock-origin-badge')).toBeNull();
  });
});
