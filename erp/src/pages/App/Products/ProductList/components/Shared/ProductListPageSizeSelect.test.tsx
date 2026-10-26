// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProductListPageSizeSelect from './ProductListPageSizeSelect';

afterEach(cleanup);

describe('ProductListPageSizeSelect', () => {
  it.each([10, 15] as const)('submits the validated page size %i', async (itemsPerPage) => {
    const onChange = vi.fn();
    render(
      <ProductListPageSizeSelect itemsPerPage={itemsPerPage === 15 ? 10 : 15} onChange={onChange} />
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Itens por página' }), {
      target: { value: String(itemsPerPage) },
    });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(itemsPerPage));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('blocks an unsupported value and shows a validation message', async () => {
    const onChange = vi.fn();
    render(<ProductListPageSizeSelect itemsPerPage={15} onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Itens por página' }), {
      target: { value: '11' },
    });

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Selecione 10 ou 15 itens por página.'
    );
    expect(
      screen.getByRole('combobox', { name: 'Itens por página' }).getAttribute('aria-invalid')
    ).toBe('true');
    expect(onChange).not.toHaveBeenCalled();
  });
});
