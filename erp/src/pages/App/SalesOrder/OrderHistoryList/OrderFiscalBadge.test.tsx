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

  it('renderiza o rótulo NF com status reversed (estornada) em produção', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="reversed" variant="production" loading={false} />
      </MemoryRouter>
    );

    expect(container.textContent).toContain('NF');
    expect(container.querySelector('.bi-arrow-counterclockwise')).not.toBeNull();
    const badge = container.querySelector('span[title="Nota fiscal estornada"]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain('bg-indigo-600');
  });

  it('renderiza o rótulo NFH com status reversed (estornada) em homologação', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="reversed" variant="homologation" loading={false} />
      </MemoryRouter>
    );

    expect(container.textContent).toContain('NFH');
    expect(container.querySelector('.bi-arrow-counterclockwise')).not.toBeNull();
    const badge = container.querySelector('span[title="Nota fiscal de homologação estornada"]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain('bg-indigo-600');
  });

  it('renderiza o rótulo NF cancelado em vermelho com ícone bi-x', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="cancelled" variant="production" loading={false} />
      </MemoryRouter>
    );

    expect(container.textContent).toContain('NF');
    expect(container.querySelector('.bi-x')).not.toBeNull();
    const badge = container.querySelector('span[title="Nota fiscal cancelada"]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain('bg-rose-600');
  });

  it('renderiza o rótulo NF com status reissue_required em amarelo com texto escuro e ícone de exclamação', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="reissue_required" variant="production" loading={false} />
      </MemoryRouter>
    );

    expect(container.textContent).toContain('NF');
    expect(container.querySelector('.bi-exclamation-lg')).not.toBeNull();
    const badge = container.querySelector('span[title*="Nova nota fiscal necessária"]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain('bg-amber-500');
    expect(badge?.className).toContain('text-[#3b1900]');
    expect(badge?.className).toContain('border-amber-700');
  });

  it('renderiza o rótulo NFH com status reissue_required em homologação', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="reissue_required" variant="homologation" loading={false} />
      </MemoryRouter>
    );

    expect(container.textContent).toContain('NFH');
    expect(container.querySelector('.bi-exclamation-lg')).not.toBeNull();
    const badge = container.querySelector('span[title*="Nova nota fiscal de homologação necessária"]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain('bg-amber-500');
  });

  it('renderiza o rótulo com status regularization_failed em vermelho com octágono de alerta', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="regularization_failed" variant="production" loading={false} />
      </MemoryRouter>
    );

    expect(container.textContent).toContain('NF');
    expect(container.querySelector('.bi-exclamation-octagon-fill')).not.toBeNull();
    const badge = container.querySelector('span[title*="Erro na regularização fiscal"]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain('bg-red-600');
  });

  it('renderiza o rótulo com status regularization_uncertain em laranja com ícone de interrogação', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="regularization_uncertain" variant="production" loading={false} />
      </MemoryRouter>
    );

    expect(container.textContent).toContain('NF');
    expect(container.querySelector('.bi-question-lg')).not.toBeNull();
    const badge = container.querySelector('span[title*="Regularização fiscal pendente"]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain('bg-orange-600');
  });

  it('renderiza o ícone de devolução discreto no rótulo quando hasReturn é true', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="issued" variant="production" hasReturn={true} />
      </MemoryRouter>
    );

    expect(container.textContent).toContain('NF');
    expect(container.querySelector('.bi-arrow-return-left')).not.toBeNull();
    const badge = container.querySelector('[title*="com devolução"]');
    expect(badge).not.toBeNull();
  });

  it('mantém contraste alto do ícone de devolução quando em status reissue_required', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalBadge status="reissue_required" variant="production" hasReturn={true} />
      </MemoryRouter>
    );

    const returnIcon = container.querySelector('.bi-arrow-return-left');
    expect(returnIcon).not.toBeNull();
    expect(returnIcon?.className).toContain('text-[#3b1900]');
  });
});
