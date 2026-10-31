// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PRODUCT_LIST_PAGE_SIZES } from '../../../../../../../../shared-utils/listingFormSchemas';
import ProductListPageSizeSelect from './ProductListPageSizeSelect';

afterEach(cleanup);

describe('ProductListPageSizeSelect', () => {
  it('shows the fixed page size without a selector', () => {
    render(<ProductListPageSizeSelect itemsPerPage={PRODUCT_LIST_PAGE_SIZES[0]} />);
    expect(screen.getByText('15 por página')).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Itens por página' })).toBeNull();
  });
});
