// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ReceiptsPagination } from './ReceiptsPagination';

afterEach(cleanup);

describe('ReceiptsPagination', () => {
  it('mostra o intervalo atual e permite mudar de página', () => {
    const onPageChange = vi.fn();
    render(
      <ReceiptsPagination
        currentPage={1}
        totalPages={3}
        totalItems={38}
        itemsPerPage={15}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByText('1–15 de 38 recebimentos')).toBeTruthy();
    expect(screen.getByText('15 por página')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Página 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('não apresenta paginação quando a lista está vazia', () => {
    render(
      <ReceiptsPagination
        currentPage={1}
        totalPages={0}
        totalItems={0}
        itemsPerPage={15}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
