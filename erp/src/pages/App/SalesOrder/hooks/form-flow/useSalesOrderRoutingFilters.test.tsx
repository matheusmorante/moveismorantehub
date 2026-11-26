// @vitest-environment happy-dom
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useSalesOrderRoutingFilters } from './useSalesOrderRoutingFilters';

describe('useSalesOrderRoutingFilters - customer search debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/sales-order']}>{children}</MemoryRouter>
  );

  it('updates customerSearchInput immediately but does not trigger filter for less than 3 characters', () => {
    const { result } = renderHook(
      () =>
        useSalesOrderRoutingFilters({
          setHighlightOrderId: vi.fn(),
          setOrderModalType: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.handleCustomerSearchChange('Jo');
    });

    expect(result.current.customerSearchInput).toBe('Jo');
    expect(result.current.filters.customerName).toBe('');

    // Advance time past debounce
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.customerSearchInput).toBe('Jo');
    expect(result.current.filters.customerName).toBe('');
  });

  it('triggers filters.customerName after 350ms debounce when input has 3 or more characters', () => {
    const { result } = renderHook(
      () =>
        useSalesOrderRoutingFilters({
          setHighlightOrderId: vi.fn(),
          setOrderModalType: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.handleCustomerSearchChange('João');
    });

    expect(result.current.customerSearchInput).toBe('João');
    // Not triggered yet before debounce
    expect(result.current.filters.customerName).toBe('');

    // Advance 200ms (still waiting)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.filters.customerName).toBe('');

    // Advance another 200ms (total 400ms > 350ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.filters.customerName).toBe('João');
  });

  it('debounces rapid keystrokes without redundant filter updates', () => {
    const { result } = renderHook(
      () =>
        useSalesOrderRoutingFilters({
          setHighlightOrderId: vi.fn(),
          setOrderModalType: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.handleCustomerSearchChange('Car');
    });
    act(() => {
      vi.advanceTimersByTime(100);
      result.current.handleCustomerSearchChange('Carl');
    });
    act(() => {
      vi.advanceTimersByTime(100);
      result.current.handleCustomerSearchChange('Carlos');
    });

    expect(result.current.customerSearchInput).toBe('Carlos');
    expect(result.current.filters.customerName).toBe('');

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current.filters.customerName).toBe('Carlos');
  });

  it('triggers search immediately on Enter key for 3+ characters', () => {
    const { result } = renderHook(
      () =>
        useSalesOrderRoutingFilters({
          setHighlightOrderId: vi.fn(),
          setOrderModalType: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.handleCustomerSearchChange('Maria');
    });
    expect(result.current.filters.customerName).toBe('');

    act(() => {
      result.current.handleCustomerSearchKeyDown({
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });

    // Immediately committed without waiting for timer
    expect(result.current.filters.customerName).toBe('Maria');
  });

  it('immediately clears filter and input on handleClearCustomerSearch or Escape', () => {
    const { result } = renderHook(
      () =>
        useSalesOrderRoutingFilters({
          setHighlightOrderId: vi.fn(),
          setOrderModalType: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.handleCustomerSearchChange('Maria');
      vi.advanceTimersByTime(400);
    });
    expect(result.current.filters.customerName).toBe('Maria');

    act(() => {
      result.current.handleClearCustomerSearch();
    });

    expect(result.current.customerSearchInput).toBe('');
    expect(result.current.filters.customerName).toBe('');
  });

  it('resets filter when deleting down to less than 3 chars after debounce without wiping input', () => {
    const { result } = renderHook(
      () =>
        useSalesOrderRoutingFilters({
          setHighlightOrderId: vi.fn(),
          setOrderModalType: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.handleCustomerSearchChange('Silva');
      vi.advanceTimersByTime(400);
    });
    expect(result.current.filters.customerName).toBe('Silva');

    // User backspaces to 'Si' (2 chars)
    act(() => {
      result.current.handleCustomerSearchChange('Si');
    });
    expect(result.current.customerSearchInput).toBe('Si');
    // Still 'Silva' until debounce passes
    expect(result.current.filters.customerName).toBe('Silva');

    act(() => {
      vi.advanceTimersByTime(400);
    });
    // Filter is reset to '' so stale results are cleared
    expect(result.current.filters.customerName).toBe('');
    // Input text is preserved
    expect(result.current.customerSearchInput).toBe('Si');
  });
});
