// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CancelledOrderBadge from './CancelledOrderBadge';

describe('CancelledOrderBadge', () => {
  it('deve renderizar somente o fundo escurecido, sem carimbo de texto', () => {
    const { container } = render(<CancelledOrderBadge text="Cancelado" />);

    expect(container.querySelector('[data-testid="cancelled-order-overlay"]')).not.toBeNull();
    expect(screen.queryByText('Cancelado')).toBeNull();
    expect(container.querySelector('.bi-x-lg')).toBeNull();
  });

  it('não deve renderizar carimbo mesmo com rótulo customizado e flags', () => {
    const { container } = render(<CancelledOrderBadge text="Estornado" large tilted />);

    expect(container.querySelector('[data-testid="cancelled-order-overlay"]')).not.toBeNull();
    expect(screen.queryByText('Estornado')).toBeNull();
    expect(container.querySelector('.bi-x-lg')).toBeNull();
  });
});
