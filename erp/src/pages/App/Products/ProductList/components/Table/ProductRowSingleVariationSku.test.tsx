// @vitest-environment happy-dom

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { renderProductRowStandardCell } from './ProductRowStandardCells';
import ProductRow from './ProductRow';
import { ProductCardHeader } from '../Card/ProductCardHeader';
import type Product from '@/pages/types/product.type';
import type { ProductListRow } from '../../types';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) }),
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: { role: 'admin' } }),
}));

vi.mock('../../hooks/data/useProductMetadata', () => ({
  useProductMetadata: () => ({ oppName: 'Queima dos Salvados', supplierNames: [] }),
}));

vi.mock('./ProductRowModals', () => ({ ProductRowModals: () => null }));

vi.mock('@/pages/utils/accessRoles', () => ({
  isProductIdentificationLabelOnlyProfile: () => false,
  canPrintProductIdentificationLabels: () => true,
  getProductIdentificationLabelActionAvailability: () => ({
    canOpenMenu: true,
    canPrintLabel: true,
  }),
}));

afterEach(cleanup);

describe('Exibição do SKU quando o produto possui variação única', () => {
  const baseProduct: Product = {
    id: 'prod-001',
    code: '000100',
    sku: '000100',
    name: 'Mesa de Centro',
    description: 'Mesa de Centro',
    unitPrice: 150,
    unit: 'UN',
    stock: 10,
    active: true,
    status: 'published',
    itemType: 'product',
  };

  const singleVariation: ProductListRow = {
    ...baseProduct,
    id: 'var-001',
    code: '000100-01',
    sku: '000100-01',
    name: 'Mesa de Centro Rústica',
    isVariation: true,
    parentId: 'prod-001',
  };

  const visibilitySettings = {
    id: false,
    sku: true,
    code: true,
    description: true,
    category: true,
    costPrice: false,
    createdAt: true,
    unitPrice: true,
    weight: false,
    stock: true,
    status: true,
    actions: true,
  };

  it('exibe o SKU da variação única na coluna code da linha da tabela', () => {
    const ctx = {
      product: { ...baseProduct, allVariations: [singleVariation] } as any,
      singleVariation,
      visibilitySettings,
      isChildVar: false,
      hasVariations: false,
      canManageCatalog: true,
      canDeleteProducts: true,
      isDraft: false,
      onToggleActive: () => {},
      onDeactivateCatalog: () => {},
    };

    render(
      <table>
        <tbody>
          <tr>{renderProductRowStandardCell('code', ctx)}</tr>
        </tbody>
      </table>
    );

    expect(screen.getByText('000100-01')).toBeDefined();
  });

  it('exibe o SKU da variação única na coluna sku da linha da tabela', () => {
    const ctx = {
      product: { ...baseProduct, allVariations: [singleVariation] } as any,
      singleVariation,
      visibilitySettings,
      isChildVar: false,
      hasVariations: false,
      canManageCatalog: true,
      canDeleteProducts: true,
      isDraft: false,
      onToggleActive: () => {},
      onDeactivateCatalog: () => {},
    };

    render(
      <table>
        <tbody>
          <tr>{renderProductRowStandardCell('sku', ctx)}</tr>
        </tbody>
      </table>
    );

    expect(screen.getByText('000100-01')).toBeDefined();
  });

  it('oculta o badge ERP na tabela quando a oportunidade resolvida por ID é de Salvados', () => {
    const ctx = {
      product: { ...baseProduct, opportunityId: 'opportunity-1' } as any,
      opportunityName: 'Queima dos Salvados',
      visibilitySettings,
      isChildVar: false,
      canManageCatalog: true,
      canDeleteProducts: true,
      isDraft: false,
      onToggleActive: () => {},
      onDeactivateCatalog: () => {},
    };

    render(
      <table>
        <tbody>
          <tr>{renderProductRowStandardCell('status', ctx)}</tr>
        </tbody>
      </table>
    );

    expect(screen.queryByText('ERP')).toBeNull();
    expect(screen.getByRole('button', { name: /Status Catálogo/i })).toBeDefined();
  });

  it('usa o nome resolvido por ID no badge e no fundo da linha da tabela', () => {
    const product = {
      ...baseProduct,
      opportunityId: 'opportunity-1',
      active: false,
      status: 'published',
    } as any;

    const { container } = render(
      <table>
        <tbody>
          <ProductRow
            product={product}
            canDeleteProducts={true}
            onEdit={() => {}}
            onDelete={() => {}}
            onRestore={() => {}}
            onToggleActive={() => {}}
            onDeactivateCatalog={() => {}}
            visibilitySettings={{ ...visibilitySettings, description: false, actions: false }}
            orderedColumnKeys={['status']}
          />
        </tbody>
      </table>
    );

    const row = container.querySelector('tr');
    expect(row?.className).toContain('bg-white dark:bg-slate-900');
    expect(row?.className).not.toContain('bg-slate-100/90');
    expect(screen.queryByText('ERP')).toBeNull();
    expect(screen.getByRole('button', { name: /Status Catálogo/i })).toBeDefined();
  });

  it('exibe o SKU da variação única no card do produto', () => {
    render(
      <ProductCardHeader
        product={baseProduct}
        isParent={true}
        isVariation={false}
        isDraft={false}
        canManageCatalog={true}
        canDeleteProducts={true}
        hasParentVariations={false}
        singleVariation={singleVariation as any}
        showVariations={false}
        setShowVariations={() => {}}
        oppName={undefined}
        showTrash={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
        onDeactivateCatalog={() => {}}
        onOpenSalesModal={() => {}}
      />
    );

    expect(screen.getByText('000100-01')).toBeDefined();
  });

  it('exibe o código pai quando o produto possui múltiplas variações', () => {
    const ctx = {
      product: {
        ...baseProduct,
        allVariations: [
          singleVariation,
          { ...singleVariation, id: 'var-002', code: '000100-02', sku: '000100-02' },
        ],
      } as any,
      singleVariation: undefined,
      visibilitySettings,
      isChildVar: false,
      hasVariations: true,
      canManageCatalog: true,
      canDeleteProducts: true,
      isDraft: false,
      onToggleActive: () => {},
      onDeactivateCatalog: () => {},
    };

    render(
      <table>
        <tbody>
          <tr>{renderProductRowStandardCell('code', ctx)}</tr>
        </tbody>
      </table>
    );

    expect(screen.getByText('000100')).toBeDefined();
  });
});
