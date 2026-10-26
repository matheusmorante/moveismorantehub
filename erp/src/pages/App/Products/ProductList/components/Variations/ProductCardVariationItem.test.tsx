// @vitest-environment happy-dom

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderProductRowStandardCell } from '../Table/ProductRowStandardCells';
import { ProductCardVariationItem } from './ProductCardVariationItem';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: { role: 'admin' } }) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/pages/utils/accessRoles', () => ({
  canPrintProductIdentificationLabels: () => true,
  isProductIdentificationLabelOnlyProfile: () => false,
}));
vi.mock('@/components/ProductImage', () => ({ default: () => null }));
vi.mock('../Shared/ChannelStatusBadges', () => ({ ChannelStatusBadges: () => null }));
vi.mock('../Shared/MergedBadge', () => ({ MergedBadge: () => null }));
vi.mock('./VariationItemActions', () => ({ VariationItemActions: () => null }));

afterEach(cleanup);

describe('ProductCardVariationItem — preço efetivo', () => {
  it('não substitui por preço do pai um preço próprio zero quando a promoção é herdada', () => {
    render(
      <ProductCardVariationItem
        product={{
          id: 'product-1',
          name: 'Produto',
          unitPrice: 100,
          promoPrice: 80,
          active: true,
        } as any}
        variation={{
          id: 'variation-1',
          name: 'Variação incompleta',
          sku: 'PROD-01',
          unitPrice: 0,
          promoPrice: 80,
          syncUnitPrice: false,
          syncPromoPrice: true,
          active: false,
          stock: 0,
        } as any}
        index={0}
        readOnly
        canDeleteProducts={false}
        canManageCatalog={false}
        isDraft
        activeVarMenuId={null}
        checkingUsageId={null}
        usageCache={{}}
        onSetActiveVarMenuId={() => {}}
        onEdit={() => {}}
        onToggleActive={() => {}}
        onDeactivateCatalog={() => {}}
        onCheckAndAskDelete={() => {}}
      />
    );

    expect(screen.getByText(/R\$\s*0,00/)).toBeDefined();
    expect(screen.queryByText(/R\$\s*80,00/)).toBeNull();
  });

  it('combina preço regular herdado com promoção própria na linha da variação', () => {
    render(
      <ProductCardVariationItem
        product={{
          id: 'product-1',
          name: 'Produto',
          unitPrice: 100,
          promoPrice: 90,
          active: true,
        } as any}
        variation={{
          id: 'variation-2',
          name: 'Promoção própria',
          sku: 'PROD-02',
          unitPrice: 75,
          promoPrice: 65,
          syncUnitPrice: true,
          syncPromoPrice: false,
          active: true,
          stock: 3,
        } as any}
        index={1}
        readOnly
        canDeleteProducts={false}
        canManageCatalog={false}
        isDraft={false}
        activeVarMenuId={null}
        checkingUsageId={null}
        usageCache={{}}
        onSetActiveVarMenuId={() => {}}
        onEdit={() => {}}
        onToggleActive={() => {}}
        onDeactivateCatalog={() => {}}
        onCheckAndAskDelete={() => {}}
      />
    );

    expect(screen.getByText(/R\$\s*100,00/)).toBeDefined();
    expect(screen.getByText(/R\$\s*65,00/)).toBeDefined();
  });

  it('a linha da tabela apresenta o preço regular efetivo sem reclassificar promoção inválida', () => {
    const context = {
      product: {
        id: 'variation-1',
        name: 'Variação incompleta',
        unitPrice: 0,
        promoPrice: 80,
      } as any,
      visibilitySettings: { unitPrice: true } as any,
      isChildVar: false,
      canManageCatalog: false,
      canDeleteProducts: false,
      isDraft: true,
      onToggleActive: () => {},
      onDeactivateCatalog: () => {},
    } as any;

    render(
      <table>
        <tbody>
          <tr>{renderProductRowStandardCell('unitPrice', context)}</tr>
        </tbody>
      </table>
    );

    expect(screen.getByText(/R\$\s*0,00/)).toBeDefined();
    expect(screen.queryByText(/R\$\s*80,00/)).toBeNull();
  });
});
