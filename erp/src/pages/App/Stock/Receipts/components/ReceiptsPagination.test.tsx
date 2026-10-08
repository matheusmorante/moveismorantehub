// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ReceiptsPagination } from './ReceiptsPagination';

afterEach(cleanup);

describe('ReceiptsPagination [TESTE_AUT]', () => {
  it('deve renderizar contagem e botões corretamente com 15 itens por página', () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <ReceiptsPagination
        currentPage={1}
        totalPages={3}
        totalItems={38}
        itemsPerPage={15}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByText(/Exibindo/i)).toBeDefined();
    expect(screen.getByText('1-15')).toBeDefined();
    expect(screen.getByText('38')).toBeDefined();
    expect(screen.getByText('(15 por página)')).toBeDefined();

    expect(container.querySelectorAll('[data-page-slot]')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Página 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('preserva os espaços vazios nas bordas e desloca a página atual ao navegar', () => {
    const onPageChange = vi.fn();
    const { container, rerender } = render(
      <ReceiptsPagination
        currentPage={1}
        totalPages={2}
        totalItems={25}
        itemsPerPage={15}
        onPageChange={onPageChange}
      />
    );

    expect(container.querySelectorAll('[data-page-slot]')).toHaveLength(5);
    expect(container.querySelector('[data-page-slot="1"] button')).toBeNull();
    expect(container.querySelector('[data-page-slot="2"] button')).toBeNull();
    expect(screen.getByRole('button', { name: 'Página 2' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(
      <ReceiptsPagination
        currentPage={2}
        totalPages={2}
        totalItems={25}
        itemsPerPage={15}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByRole('button', { name: 'Página 2, atual' }).getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('[data-page-slot="4"] button')).toBeNull();
    expect(container.querySelector('[data-page-slot="5"] button')).toBeNull();
  });

  it('continua mostrando a página única quando a lista não tem itens', () => {
    render(
      <ReceiptsPagination
        currentPage={1}
        totalPages={0}
        totalItems={0}
        itemsPerPage={15}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Página 1, atual' })).toBeTruthy();
  });
});
