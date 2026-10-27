import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Alert: { alert: vi.fn() },
  Linking: { openURL: vi.fn() },
  StyleSheet: { create: (styles: unknown) => styles },
  Text: ({ children, accessibilityLabel }: any) =>
    React.createElement('span', accessibilityLabel ? { 'aria-label': accessibilityLabel } : null, children),
  TouchableOpacity: ({ children }: any) => React.createElement('button', null, children),
  View: ({ children }: any) => React.createElement('div', null, children),
}));
vi.mock('lucide-react-native', () => {
  const Icon = () => null;
  return {
    ChevronDown: Icon,
    ChevronRight: Icon,
    Eye: Icon,
    MoreVertical: Icon,
    Package: Icon,
    Pencil: Icon,
    RotateCcw: Icon,
    Truck: Icon,
  };
});
vi.mock('../../../services/supabaseClient', () => ({ WEB_URL: 'https://example.invalid' }));
vi.mock('../../../components/shared/ProductImage', () => ({ ProductImage: () => null }));
vi.mock('../hooks/useMobileProductCardState', () => ({
  useMobileProductCardState: ({ product }: any) => {
    const variations = product.allVariations || [];
    const singleVariation = variations.length === 1 ? variations[0] : null;
    return {
      variations,
      isParent: variations.length > 0,
      singleVariation,
      isSingleVariationCard: Boolean(singleVariation),
      hasExpandableVars: variations.length > 1,
      isSingleVariationMerged: false,
      isMerged: false,
      isDraft: false,
      cardActionAvailability: { canShowLinkedOrders: false, canDuplicate: false },
      cardStatus: 'published',
      isPublished: true,
      isActive: true,
      displayTitle: 'Mesa Azul',
      cardImage: null,
      cardUnitPrice: 20,
      cardPromoPrice: 0,
      hasCardPromo: false,
      cardPrice: 20,
      cardStock: 1,
      isLowStock: false,
      cardUnit: 'UN',
      canShowVariationMenu: false,
      canPrintIdentificationLabel: false,
      oppName: null,
      supplierNames: [],
      isSalvado: false,
      isNonConventional: false,
      oppBadgeInfo: null,
      displaySku: 'SKU-1',
    };
  },
}));
vi.mock('./MobileChannelBadges', () => ({ MobileChannelBadges: () => null }));
vi.mock('./MobileProductActionsMenu', () => ({ MobileProductActionsMenu: () => null }));
vi.mock('./MobileProductVariationActionsMenu', () => ({ MobileProductVariationActionsMenu: () => null }));
vi.mock('./MobileProductVariationList', () => ({ MobileProductVariationList: () => null }));
vi.mock('./StockOriginBadge', () => ({ StockOriginBadge: () => null }));
vi.mock('./MergedBadge', () => ({ MergedBadge: () => null }));
vi.mock('../../../hooks/useZodForm', () => ({
  flattenFormErrors: () => ({}),
  useZodForm: () => ({ validateAndRun: vi.fn() }),
}));
vi.mock('../domain/mobileProductCardDisplay', () => ({
  getMobileProductCompositionCardItems: () => [],
}));
vi.mock('../domain/mobileProductCardRules', () => ({
  canShowMobileProductPriceLabel: () => false,
  canShowMobileSingleVariationReorganizationActions: () => false,
  canToggleProductActivationFromCardMenu: () => false,
}));
vi.mock('../services/mobileProductVariationActionsService', () => ({
  getMobileVariationActionRequirements: () => ({ hasSupplier: false, hasValidAttributes: true }),
}));

import { MobileProductCard } from './MobileProductCard';

const renderCard = (variation = { id: 'variation-1', sku: 'SKU-1' }) =>
  renderToStaticMarkup(
    <MobileProductCard
      product={{
        id: 'product-1',
        name: 'Mesa',
        itemType: 'product',
        allVariations: [variation],
      }}
      dark={false}
      onEdit={() => undefined}
      onToggleCatalog={() => undefined}
      onToggleActive={() => undefined}
      onDelete={() => undefined}
    />
  );

describe('MobileProductCard — indicador de saída', () => {
  it('não mostra selo de saída para variação persistida', () => {
    expect(renderCard()).not.toContain('Saída Lançada');
  });

  it('não mostra selo de saída para variação virtual', () => {
    const html = renderCard({
      id: 'virtual-variation',
      sku: 'SKU-1',
      isVirtual: true,
    });
    expect(html).not.toContain('Saída Lançada');
  });
});
