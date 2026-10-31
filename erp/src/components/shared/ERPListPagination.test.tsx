// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ERPListPagination, getERPListPageItems } from './ERPListPagination';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('ERPListPagination', () => {
  it('includes the first and last pages with ellipses around a compact window', () => {
    expect(getERPListPageItems(9, 40)).toEqual([1, 'ellipsis', 7, 8, 9, 10, 11, 'ellipsis', 40]);
    expect(getERPListPageItems(1, 3)).toEqual([1, 2, 3]);
  });

  it('shows a fixed page size of 15 and keeps page navigation available', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <ERPListPagination
        ariaLabel="Paginação de produtos"
        page={1}
        pageSize={50}
        totalItems={31}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    expect(screen.getByText('1–15 de 31 registros')).toBeTruthy();
    expect(screen.getByText('15 por página')).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Registros por página' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Página anterior' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(onPageSizeChange).not.toHaveBeenCalled();
  });

  it('ignores a previously saved page size', () => {
    window.localStorage.setItem('erp-page-size:user-1:products', '50');
    const onPageSizeChange = vi.fn();
    render(
      <ERPListPagination
        ariaLabel="Paginação"
        page={1}
        pageSize={15}
        totalItems={80}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
        preferenceKey="products"
      />
    );
    expect(screen.getByText('15 por página')).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Registros por página' })).toBeNull();
    expect(onPageSizeChange).not.toHaveBeenCalled();
  });

  it('hides pagination for an empty result and keeps a disabled control while loading', () => {
    const props = { ariaLabel: 'Paginação', page: 1, pageSize: 15, totalItems: 0, onPageChange: vi.fn() };
    const { rerender } = render(<ERPListPagination {...props} />);
    expect(screen.queryByRole('navigation')).toBeNull();
    rerender(<ERPListPagination {...props} loading />);
    expect(screen.getByRole('navigation', { name: 'Paginação' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Próxima página' }).hasAttribute('disabled')).toBe(true);
  });
});
