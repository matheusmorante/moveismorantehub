// @vitest-environment happy-dom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductManufacturingTypeToggle } from './ProductManufacturingTypeToggle';

afterEach(cleanup);

describe('ProductManufacturingTypeToggle', () => {
  it('renderiza o estado padrão (adquirido de terceiros) corretamente', () => {
    const onChange = vi.fn();
    render(
      <ProductManufacturingTypeToggle
        isOwnProduction={false}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Origem Comercial do Produto')).toBeTruthy();
    expect(screen.getByText(/Mercadoria adquirida\/recebida de parceiros/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Adquirido de Terceiros' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fabricação Própria' })).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('renderiza o estado de fabricação própria corretamente', () => {
    const onChange = vi.fn();
    render(
      <ProductManufacturingTypeToggle
        isOwnProduction={true}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/Produção própria da empresa/i)).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('chama onChange com false ao selecionar "Adquirido de Terceiros"', () => {
    const onChange = vi.fn();
    render(
      <ProductManufacturingTypeToggle
        isOwnProduction={true}
        onChange={onChange}
      />
    );

    const btn = screen.getByRole('button', { name: 'Adquirido de Terceiros' });
    fireEvent.click(btn);

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('chama onChange com true ao selecionar "Fabricação Própria"', () => {
    const onChange = vi.fn();
    render(
      <ProductManufacturingTypeToggle
        isOwnProduction={false}
        onChange={onChange}
      />
    );

    const btn = screen.getByRole('button', { name: 'Fabricação Própria' });
    fireEvent.click(btn);

    expect(onChange).toHaveBeenCalledWith(true);
  });
});
