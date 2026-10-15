// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ShowMergedProductsToggle from './ShowMergedProductsToggle';

afterEach(cleanup);

describe('ShowMergedProductsToggle', () => {
  it('renderiza desativado por padrão', () => {
    const onChange = vi.fn();
    render(<ShowMergedProductsToggle checked={false} onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Mostrar mesclados' }) as HTMLInputElement;
    expect(checkbox).toBeDefined();
    expect(checkbox.checked).toBe(false);
    expect(screen.getByText('Mostrar mesclados')).toBeDefined();
  });

  it('chama onChange com true quando clicado', () => {
    const onChange = vi.fn();
    render(<ShowMergedProductsToggle checked={false} onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Mostrar mesclados' });
    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('chama onChange com false quando desmarcado', () => {
    const onChange = vi.fn();
    render(<ShowMergedProductsToggle checked={true} onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Mostrar mesclados' });
    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(false);
  });
});
