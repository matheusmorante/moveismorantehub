// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRODUCT_LIST_PAGE_SIZES } from '../../../../../../../../shared-utils/listingFormSchemas';
import ProductListPageSizeSelect from './ProductListPageSizeSelect';

afterEach(cleanup);

describe('ProductListPageSizeSelect', () => {
  it.each(PRODUCT_LIST_PAGE_SIZES)('submits the validated page size %i', async (itemsPerPage) => {
    const onChange = vi.fn();
    render(
      <ProductListPageSizeSelect
        itemsPerPage={
          itemsPerPage === PRODUCT_LIST_PAGE_SIZES[0]
            ? PRODUCT_LIST_PAGE_SIZES[1]
            : PRODUCT_LIST_PAGE_SIZES[0]
        }
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Itens por página' }), {
      target: { value: String(itemsPerPage) },
    });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(itemsPerPage));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('blocks an unsupported value and shows a validation message', async () => {
    const onChange = vi.fn();
    render(<ProductListPageSizeSelect itemsPerPage={PRODUCT_LIST_PAGE_SIZES[0]} onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Itens por página' }), {
      target: { value: '11' },
    });

    expect((await screen.findByRole('alert')).textContent).toBe(
      `Escolha uma quantidade permitida por página (${PRODUCT_LIST_PAGE_SIZES.join(', ')}).`
    );
    expect(
      screen.getByRole('combobox', { name: 'Itens por página' }).getAttribute('aria-invalid')
    ).toBe('true');
    expect(onChange).not.toHaveBeenCalled();
  });
});
