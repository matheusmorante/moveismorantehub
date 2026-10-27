import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PRODUCT_LIST_PAGE_SIZES } from '../../../../../shared-utils/listingFormSchemas';

vi.mock('react-native', () => {
  const container = ({ children }: any) => React.createElement('div', null, children);
  return {
    Pressable: ({ children, accessibilityRole, accessibilityLabel, accessibilityState }: any) =>
      React.createElement(
        'button',
        {
          role: accessibilityRole,
          'aria-label': accessibilityLabel,
          'aria-checked': accessibilityState?.checked,
        },
        children,
      ),
    StyleSheet: { create: (styles: unknown) => styles },
    Text: ({ children }: any) => React.createElement('span', null, children),
    View: container,
  };
});

vi.mock('../../../components/shared/FixedPageSlots', () => ({
  FixedPageSlots: () => null,
}));

import { MobileProductPagination } from './MobileProductPagination';

describe('MobileProductPagination accessibility', () => {
  it('announces the page-size choices as radios with the checked value', () => {
    const selectedPageSize = PRODUCT_LIST_PAGE_SIZES[0];
    const markup = renderToStaticMarkup(
      <MobileProductPagination
        currentPage={1}
        totalPages={2}
        totalItems={20}
        itemsPerPage={selectedPageSize}
        onPageChange={vi.fn()}
        onItemsPerPageChange={vi.fn()}
      />,
    );

    for (const size of PRODUCT_LIST_PAGE_SIZES) {
      expect(markup).toContain(
        `<button role="radio" aria-label="Itens por página: ${size}" aria-checked="${size === selectedPageSize}">`,
      );
    }
  });
});
