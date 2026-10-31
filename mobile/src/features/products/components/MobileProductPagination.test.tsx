import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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

describe('MobileProductPagination', () => {
  it('shows the fixed page size without offering a control to change it', () => {
    const markup = renderToStaticMarkup(
      <MobileProductPagination
        currentPage={1}
        totalPages={2}
        totalItems={20}
        itemsPerPage={15}
        onPageChange={vi.fn()}
      />,
    );

    expect(markup).toContain('15 por página');
    expect(markup).not.toContain('role="radio"');
  });
});
