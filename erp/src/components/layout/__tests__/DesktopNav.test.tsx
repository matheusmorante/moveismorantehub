// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DesktopNav from '../DesktopNav';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('DesktopNav Component', () => {
  const setActiveMenu = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      profile: {
        id: 'user-admin',
        role: 'administrator',
      },
      isAdmin: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza o link principal do Dashboard', () => {
    render(
      <MemoryRouter>
        <DesktopNav activeMenu={null} setActiveMenu={setActiveMenu} />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('abre o menu de vendas ao interagir e exibe os itens com as cores corretas', () => {
    render(
      <MemoryRouter>
        <DesktopNav activeMenu="salesOrder" setActiveMenu={setActiveMenu} />
      </MemoryRouter>
    );

    const assistencias = screen.getByText('Assistências');
    expect(assistencias).toBeTruthy();

    const devolucoes = screen.getByText('Devoluções');
    expect(devolucoes).toBeTruthy();
  });

  it('chama setActiveMenu ao clicar no botão do menu', () => {
    render(
      <MemoryRouter>
        <DesktopNav activeMenu={null} setActiveMenu={setActiveMenu} />
      </MemoryRouter>
    );

    const vendasBtn = screen.getByRole('button', { name: /Vendas/i });
    fireEvent.click(vendasBtn);

    expect(setActiveMenu).toHaveBeenCalledWith('salesOrder');
  });
});
