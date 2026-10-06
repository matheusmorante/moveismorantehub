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
    const badge = screen.getByTestId('origin-status-badge');
    expect(badge.textContent).toContain('Adquirido ou Recebido de Terceiros (Padrão)');
    expect(screen.getByText(/Mercadoria adquirida\/recebida de parceiros/i)).toBeTruthy();

    const switchBtn = screen.getByRole('switch');
    expect(switchBtn.getAttribute('aria-checked')).toBe('false');
  });

  it('renderiza o estado de fabricação própria corretamente', () => {
    const onChange = vi.fn();
    render(
      <ProductManufacturingTypeToggle
        isOwnProduction={true}
        onChange={onChange}
      />
    );

    const badge = screen.getByTestId('origin-status-badge');
    expect(badge.textContent).toContain('Produção do Próprio Estabelecimento (Fabricação Própria)');
    expect(screen.getByText(/Produção própria da empresa/i)).toBeTruthy();

    const switchBtn = screen.getByRole('switch');
    expect(switchBtn.getAttribute('aria-checked')).toBe('true');
  });

  it('chama onChange com true ao clicar no switch quando está em terceiros', () => {
    const onChange = vi.fn();
    render(
      <ProductManufacturingTypeToggle
        isOwnProduction={false}
        onChange={onChange}
      />
    );

    const switchBtn = screen.getByRole('switch');
    fireEvent.click(switchBtn);

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('chama onChange com false ao clicar no botão "Adquirido de Terceiros"', () => {
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

  it('chama onChange com true ao clicar no botão "Fabricação Própria"', () => {
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
