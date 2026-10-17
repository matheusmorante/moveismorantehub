// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import OrderCustomerSearchBar from './OrderCustomerSearchBar';

afterEach(() => {
  cleanup();
});

describe('OrderCustomerSearchBar', () => {
  it('renders input with default placeholder and search icon', () => {
    render(<OrderCustomerSearchBar value="" onChange={vi.fn()} />);

    const input = screen.getByPlaceholderText('Buscar pedido pelo nome do cliente (mín. 3 caracteres)...');
    expect(input).toBeDefined();
    expect(screen.queryByTitle('Limpar busca de cliente')).toBeNull();
  });

  it('renders clear button when value is present and triggers onClear / onChange', () => {
    const handleChange = vi.fn();
    const handleClear = vi.fn();

    const { rerender } = render(
      <OrderCustomerSearchBar
        value="João"
        onChange={handleChange}
        onClear={handleClear}
      />
    );

    const clearButton = screen.getByTitle('Limpar busca de cliente');
    expect(clearButton).toBeDefined();

    fireEvent.click(clearButton);
    expect(handleClear).toHaveBeenCalledTimes(1);

    // If onClear is not provided, defaults to onChange('')
    rerender(
      <OrderCustomerSearchBar
        value="João"
        onChange={handleChange}
      />
    );

    const clearBtnFallback = screen.getByTitle('Limpar busca de cliente');
    fireEvent.click(clearBtnFallback);
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('handles Escape key to clear search', () => {
    const handleClear = vi.fn();
    const handleKeyDown = vi.fn();

    render(
      <OrderCustomerSearchBar
        value="Carlos"
        onChange={vi.fn()}
        onClear={handleClear}
        onKeyDown={handleKeyDown}
      />
    );

    const input = screen.getByLabelText('Buscar pedido pelo nome do cliente (mín. 3 caracteres)...');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(handleClear).toHaveBeenCalledTimes(1);
    expect(handleKeyDown).toHaveBeenCalledTimes(1);
  });

  it('calls onChange directly on typing', () => {
    const handleChange = vi.fn();
    render(<OrderCustomerSearchBar value="" onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Mar' } });

    expect(handleChange).toHaveBeenCalledWith('Mar');
  });
});
