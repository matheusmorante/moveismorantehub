// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OrderHeader from '../OrderHeader';
import ReceiptHeader from '../../ReceiptPage/Header';

describe('OrderHeader and ReceiptHeader Gradient & Logo Container Tests', () => {
  it('renderiza PEDIDO DE ENTREGA com degradê da cor esmeralda na direita e branco na esquerda cobrindo o logo', () => {
    const deliveryOrder = {
      id: '002098',
      orderNumber: 2098,
      date: '2026-10-20T14:00:00Z',
      orderType: 'sale',
      shipping: { deliveryMethod: 'delivery' },
    };

    const { container } = render(<OrderHeader order={deliveryOrder} isBudget={false} />);

    // Título correto
    expect(screen.getByText('PEDIDO DE ENTREGA')).toBeDefined();

    // Cabeçalho deve ter o degradê aplicado inline
    const headerEl = container.querySelector('.order-print-header') as HTMLElement;
    expect(headerEl).not.toBeNull();
    expect(headerEl.style.background).toBe(
      'linear-gradient(to right, #ffffff 0%, #ffffff 35%, #047857 55%, #047857 100%)'
    );

    // Logo container NÃO deve ter a classe bg-white
    const logoContainer = container.querySelector('.header-logo-container') as HTMLElement;
    expect(logoContainer).not.toBeNull();
    expect(logoContainer.className).not.toContain('bg-white');
  });

  it('renderiza PEDIDO DE RETIRADA com degradê roxo na direita e branco cobrindo o logo', () => {
    const pickupOrder = {
      id: '002099',
      orderNumber: 2099,
      date: '2026-10-20T14:00:00Z',
      orderType: 'sale',
      shipping: { deliveryMethod: 'pickup' },
    };

    const { container } = render(<OrderHeader order={pickupOrder} isBudget={false} />);

    expect(screen.getByText('PEDIDO DE RETIRADA')).toBeDefined();

    const headerEl = container.querySelector('.order-print-header') as HTMLElement;
    expect(headerEl.style.background).toBe(
      'linear-gradient(to right, #ffffff 0%, #ffffff 35%, #7e22ce 55%, #7e22ce 100%)'
    );

    const logoContainer = container.querySelector('.header-logo-container') as HTMLElement;
    expect(logoContainer.className).not.toContain('bg-white');
  });

  it('renderiza ORDEM DE SERVIÇO com degradê laranja na direita e branco cobrindo o logo', () => {
    const assistanceOrder = {
      id: '002100',
      orderNumber: 2100,
      date: '2026-10-20T14:00:00Z',
      orderType: 'assistance',
    };

    const { container } = render(<OrderHeader order={assistanceOrder} isBudget={false} />);

    expect(screen.getByText('ORDEM DE SERVIÇO')).toBeDefined();

    const headerEl = container.querySelector('.order-print-header') as HTMLElement;
    expect(headerEl.style.background).toBe(
      'linear-gradient(to right, #ffffff 0%, #ffffff 35%, #f97316 55%, #f97316 100%)'
    );

    const logoContainer = container.querySelector('.header-logo-container') as HTMLElement;
    expect(logoContainer.className).not.toContain('bg-white');
  });

  it('renderiza ORÇAMENTO / PROPOSTA com degradê slate escuro na direita e branco cobrindo o logo', () => {
    const budgetOrder = {
      id: '002101',
      orderNumber: 2101,
      date: '2026-10-20T14:00:00Z',
      orderType: 'budget',
    };

    const { container } = render(<OrderHeader order={budgetOrder} isBudget={true} />);

    expect(screen.getByText('ORÇAMENTO / PROPOSTA')).toBeDefined();

    const headerEl = container.querySelector('.order-print-header') as HTMLElement;
    expect(headerEl.style.background).toBe(
      'linear-gradient(to right, #ffffff 0%, #ffffff 35%, #1e293b 55%, #1e293b 100%)'
    );

    const logoContainer = container.querySelector('.header-logo-container') as HTMLElement;
    expect(logoContainer.className).not.toContain('bg-white');
  });

  it('remove o container branco da logo também no cabeçalho do Recibo', () => {
    const { container } = render(<ReceiptHeader seller="Matheus Morante" />);

    const logoContainer = container.querySelector('.header-logo-container') as HTMLElement;
    expect(logoContainer).not.toBeNull();
    expect(logoContainer.className).not.toContain('bg-white');
    expect(screen.getByText('Matheus Morante')).toBeDefined();
  });
});
