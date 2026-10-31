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
vi.mock('./components/AssemblyCard', () => ({
  default: ({ item }: { item: { title: string } }) => <span data-testid="assembly-item">{item.title}</span>,
}));
vi.mock('../DeliverySchedule/OrderDetailsModal', () => ({ default: () => null }));

afterEach(cleanup);

describe('AssemblyListPage', () => {
  it('renders all assemblies without pagination and filters the full list', async () => {
    render(<AssemblyListPage />);
    expect(screen.getAllByTestId('assembly-item')).toHaveLength(20);
    expect(screen.getByText('Produto 1')).toBeTruthy();
    expect(screen.getByText('Produto 20')).toBeTruthy();
    expect(screen.getByText('20 montagens')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Página 2' })).toBeNull();
    expect(screen.queryByText('15 por página')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'Produto 1' } });
    await waitFor(() => expect(screen.getAllByTestId('assembly-item')).toHaveLength(11));
    expect(screen.getByText('Produto 1')).toBeTruthy();
    expect(screen.queryByText('Produto 20')).toBeNull();
  });
});
