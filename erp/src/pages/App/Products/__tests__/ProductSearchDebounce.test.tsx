// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockProductListProps = vi.fn();

const flushSearchValidation = () => act(async () => {
  await vi.advanceTimersByTimeAsync(0);
});
vi.mock('../ProductList', () => ({
  default: React.forwardRef((props: any, _ref: any) => {
    mockProductListProps(props);
    return <div data-testid="mock-product-list">ProductList</div>;
  }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: { role: 'admin' }, isAdministrator: true }),
}));

vi.mock('@/pages/utils/permissionService', () => ({
  canPerform: () => true,
}));

vi.mock('@/pages/utils/accessRoles', () => ({
  getProfileRoles: () => ['admin'],
}));

vi.mock('../ProductList/services/productCatalogStatsService', () => ({
  loadProductCatalogStats: vi.fn().mockResolvedValue({
    total: 0,
    published: 0,
    hidden: 0,
    active: 0,
    disabled: 0,
    drafts: 0,
  }),
}));

vi.mock('../ProductFilters', () => ({
  default: () => <div data-testid="mock-product-filters" />,
}));

vi.mock('../modals/ProductFormModal', () => ({ default: () => null }));
vi.mock('../modals/VariationFormModal', () => ({ default: () => null }));
vi.mock('../modals/PriceHistoryModal', () => ({ default: () => null }));
vi.mock('../../Stock/modals/StockLaunchModal', () => ({ default: () => null }));
vi.mock('../modals/ProductDetailsModal', () => ({ default: () => null }));

import Products from '../Index';

describe('Products - search debounce and minimum 3 chars', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    mockProductListProps.mockClear();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('updates input value on typing but does not trigger search filter for < 3 characters', async () => {
    render(<Products />);

    const input = screen.getByPlaceholderText('Pesquisar produtos (mín. 3 caracteres)...') as HTMLInputElement;

    act(() => {
      fireEvent.change(input, { target: { value: 'Gu' } });
    });

    expect(input.value).toBe('Gu');

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(500);
    });
    await flushSearchValidation();

    const lastCall = mockProductListProps.mock.calls[mockProductListProps.mock.calls.length - 1][0];
    expect(lastCall.filters.search).toBeUndefined();
  });

  it('triggers search filter after 350ms debounce when 3 or more characters are entered', async () => {
    render(<Products />);

    const input = screen.getByPlaceholderText('Pesquisar produtos (mín. 3 caracteres)...') as HTMLInputElement;

    act(() => {
      fireEvent.change(input, { target: { value: 'Guarda' } });
    });

    expect(input.value).toBe('Guarda');

    // Before debounce (200ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    await flushSearchValidation();
    let lastCall = mockProductListProps.mock.calls[mockProductListProps.mock.calls.length - 1][0];
    expect(lastCall.filters.search).toBeUndefined();

    // After debounce (total 400ms > 350ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    await flushSearchValidation();
    lastCall = mockProductListProps.mock.calls[mockProductListProps.mock.calls.length - 1][0];
    expect(lastCall.filters.search).toBe('Guarda');
  });

  it('clears the applied search after a debounced input becomes shorter than 3 characters', async () => {
    render(<Products />);
    const input = screen.getByPlaceholderText('Pesquisar produtos (mín. 3 caracteres)...') as HTMLInputElement;

    act(() => {
      fireEvent.change(input, { target: { value: 'Cadeira' } });
      vi.advanceTimersByTime(400);
    });
    await flushSearchValidation();
    expect(mockProductListProps.mock.calls.at(-1)?.[0].filters.search).toBe('Cadeira');

    act(() => {
      fireEvent.change(input, { target: { value: 'Ca' } });
      vi.advanceTimersByTime(400);
    });
    await flushSearchValidation();
    expect(input.value).toBe('Ca');
    expect(mockProductListProps.mock.calls.at(-1)?.[0].filters.search).toBe('');
  });

  it('ignores Enter with 1–2 characters and keeps the previous applied search', async () => {
    render(<Products />);
    const input = screen.getByPlaceholderText('Pesquisar produtos (mín. 3 caracteres)...') as HTMLInputElement;

    act(() => {
      fireEvent.change(input, { target: { value: 'Mesa' } });
      vi.advanceTimersByTime(400);
    });
    await flushSearchValidation();
    expect(mockProductListProps.mock.calls.at(-1)?.[0].filters.search).toBe('Mesa');

    act(() => {
      fireEvent.change(input, { target: { value: 'Me' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    await flushSearchValidation();
    expect(input.value).toBe('Me');
    expect(mockProductListProps.mock.calls.at(-1)?.[0].filters.search).toBe('Mesa');
  });

  it('renders clear button when text is present and clears search on click', async () => {
    render(<Products />);

    const input = screen.getByPlaceholderText('Pesquisar produtos (mín. 3 caracteres)...') as HTMLInputElement;

    act(() => {
      fireEvent.change(input, { target: { value: 'Cadeira' } });
      vi.advanceTimersByTime(400);
    });
    await flushSearchValidation();

    const clearButton = screen.getByTitle('Limpar pesquisa');
    expect(clearButton).toBeDefined();

    act(() => {
      fireEvent.click(clearButton);
    });
    await flushSearchValidation();

    expect(input.value).toBe('');
    const lastCall = mockProductListProps.mock.calls[mockProductListProps.mock.calls.length - 1][0];
    expect(lastCall.filters.search).toBe('');
    expect(screen.queryByTitle('Limpar pesquisa')).toBeNull();
  });

  it('triggers search immediately on Enter key for 3+ characters', async () => {
    render(<Products />);

    const input = screen.getByPlaceholderText('Pesquisar produtos (mín. 3 caracteres)...') as HTMLInputElement;

    act(() => {
      fireEvent.change(input, { target: { value: 'Mesa' } });
    });

    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    await flushSearchValidation();

    const lastCall = mockProductListProps.mock.calls[mockProductListProps.mock.calls.length - 1][0];
    expect(lastCall.filters.search).toBe('Mesa');
  });

  it('clears input and search immediately on Escape key', async () => {
    render(<Products />);

    const input = screen.getByPlaceholderText('Pesquisar produtos (mín. 3 caracteres)...') as HTMLInputElement;

    act(() => {
      fireEvent.change(input, { target: { value: 'Mesa' } });
      vi.advanceTimersByTime(400);
    });
    await flushSearchValidation();

    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });
    await flushSearchValidation();

    expect(input.value).toBe('');
    const lastCall = mockProductListProps.mock.calls[mockProductListProps.mock.calls.length - 1][0];
    expect(lastCall.filters.search).toBe('');
  });
});
