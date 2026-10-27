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
vi.mock('lucide-react-native', () => ({ Eye: () => null, MoreVertical: () => null, Package: () => null }));
vi.mock('../../../services/supabaseClient', () => ({ WEB_URL: 'https://example.invalid' }));
vi.mock('../../../components/shared/ProductImage', () => ({ ProductImage: () => null }));
vi.mock('../services/mobileProductVariationActionsService', () => ({
  toMobileVariationAttributes: vi.fn(() => []),
}));
vi.mock('./MobileChannelBadges', () => ({ MobileChannelBadges: () => null }));
vi.mock('./MobileProductVariationActionsMenu', () => ({ MobileProductVariationActionsMenu: () => null }));
vi.mock('./MergedBadge', () => ({ MergedBadge: () => null }));

import { MobileProductVariationCard } from './MobileProductVariationCard';

const renderCard = () => renderToStaticMarkup(
  <MobileProductVariationCard
    variation={{ id: 'row-id', variationId: 'variation-1', name: 'Mesa Azul', sku: 'SKU-1' }}
    index={0}
    dark={false}
    onToggleCatalog={() => undefined}
    parentProduct={{ id: 'product-1', name: 'Mesa' }}
  />
);

describe('MobileProductVariationCard — indicador de saída', () => {
  it('não mostra selo de saída no card da variação', () => {
    expect(renderCard()).not.toContain('Saída Lançada');
  });
});
