// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrderFiscalBadge } from './OrderFiscalBadge';

afterEach(() => {
  cleanup();
});

describe('OrderFiscalBadge', () => {
  it('renderiza o badge de produção autorizada normalmente quando loading é false', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="issued" variant="production" loading={false} />
      </MemoryRouter>
    );

    expect(container.textContent).toContain('NF');
    expect(container.querySelector('.order-fiscal-badge-shimmer-beam')).toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();
    expect(container.querySelector('.bi-check')).not.toBeNull();
  });

  it('exibe a faixa de luz (shimmer beam) e remove o spinner de rotação quando loading é true', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="issued" variant="production" loading={true} />
      </MemoryRouter>
    );

    // O texto do rótulo está presente e com z-index acima da faixa
    const label = container.querySelector('.relative.z-10');
    expect(label).not.toBeNull();
    expect(label?.textContent).toBe('NF');

    // A faixa de luz passa pelo background do rótulo
    expect(container.querySelector('.order-fiscal-badge-shimmer-container')).not.toBeNull();
    expect(container.querySelector('.order-fiscal-badge-shimmer-beam')).not.toBeNull();

    // O ícone girando foi completamente removido
    expect(container.querySelector('.animate-spin')).toBeNull();
    expect(container.querySelector('.bi-arrow-repeat')).toBeNull();

    // Atributos de acessibilidade estão corretos
    const badgeElement = container.querySelector('[aria-busy="true"]');
    expect(badgeElement).not.toBeNull();
    expect(badgeElement?.getAttribute('title')).toBe('Atualizando status fiscal do pedido');
  });

  it('exibe a faixa de luz no rótulo de homologação (NFH) em carregamento', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="issued" variant="homologation" loading={true} />
      </MemoryRouter>
    );

    const label = container.querySelector('.relative.z-10');
    expect(label).not.toBeNull();
    expect(label?.textContent).toBe('NFH');

    expect(container.querySelector('.order-fiscal-badge-shimmer-container')).not.toBeNull();
    expect(container.querySelector('.order-fiscal-badge-shimmer-beam')).not.toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();
    expect(container.querySelector('.bi-arrow-repeat')).toBeNull();
  });

  it('renderiza o rótulo de homologação em loading mesmo com status not_issued', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="not_issued" variant="homologation" loading={true} />
      </MemoryRouter>
    );

    expect(container.textContent).toContain('NFH');
    expect(container.querySelector('.order-fiscal-badge-shimmer-beam')).not.toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();
    expect(container.querySelector('.bi-arrow-repeat')).toBeNull();
  });

  it('não renderiza o rótulo de homologação se not_issued e loading for false', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="not_issued" variant="homologation" loading={false} />
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });
});
