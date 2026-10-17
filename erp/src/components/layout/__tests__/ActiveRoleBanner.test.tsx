// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import ActiveRoleBanner from '../ActiveRoleBanner';

describe('ActiveRoleBanner Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('não deve renderizar nada se activeRoleMode for null', () => {
    const { container } = render(
      <ActiveRoleBanner activeRoleMode={null} onExitRoleMode={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar rótulo correto do modo de simulação de cargo', () => {
    render(
      <ActiveRoleBanner activeRoleMode="seller" onExitRoleMode={vi.fn()} />
    );

    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeTruthy();
    expect(screen.getByText('Modo Vendedor')).toBeTruthy();
  });

  it('deve chamar onExitRoleMode ao clicar no botão "Sair do modo"', () => {
    const onExitRoleMode = vi.fn();
    render(
      <ActiveRoleBanner activeRoleMode="stockist" onExitRoleMode={onExitRoleMode} />
    );

    const exitBtn = screen.getByText('Sair do modo');
    fireEvent.click(exitBtn);

    expect(onExitRoleMode).toHaveBeenCalledTimes(1);
  });
});
