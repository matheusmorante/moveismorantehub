// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AssemblyListPage from './AssemblyListPage';

const fixtures = vi.hoisted(() => {
  const date = new Date();
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return Array.from({ length: 20 }, (_, index) => ({
    id: `assembly-${index + 1}`, origin: 'order', title: `Produto ${index + 1}`,
    customerName: 'Cliente', date: today, status: 'scheduled', item: { quantity: 1 }, fullData: {},
  }));
});
vi.mock('./hooks/useAssemblyListQuery', () => ({
  useAssemblyListQuery: () => ({ assemblies: fixtures, loading: false, refetchAssemblies: vi.fn() }),
}));
vi.mock('./components/ShowcaseAssemblyModal', () => ({ default: () => null }));
vi.mock('./components/AssemblyCard', () => ({ default: () => null }));
vi.mock('../DeliverySchedule/OrderDetailsModal', () => ({ default: () => null }));

afterEach(cleanup);

describe('AssemblyListPage pagination', () => {
  it('paginates assemblies and resets when searching while retaining the full daily count', async () => {
    render(<AssemblyListPage />);
    expect(screen.getByRole('button', { name: 'Abrir pedido: Produto 1 — Cliente' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Abrir pedido: Produto 16 — Cliente' })).toBeNull();
    expect(screen.getByText('20 montagens')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    expect(screen.getByRole('button', { name: 'Abrir pedido: Produto 16 — Cliente' })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'Produto 1' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir pedido: Produto 1 — Cliente' })).toBeTruthy());
  });
});
