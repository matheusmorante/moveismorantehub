// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AttentionPanel from './AttentionPanel';
import type { StockData } from '../hooks/useDashboardStock';

afterEach(cleanup);

const stock = (overrides: Partial<StockData> = {}): StockData => ({
  zeroStockCount: 0,
  lowStockCount: 0,
  lowStockItems: [],
  pendingInventory: null,
  loading: false,
  error: false,
  retry: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('Central de Atenção do Dashboard', () => {
  it('não anuncia que está tudo em ordem quando a leitura do estoque falhou', () => {
    render(<MemoryRouter><AttentionPanel stockData={stock({ error: true })} /></MemoryRouter>);

    expect(screen.getByRole('alert').textContent).toContain('Não foi possível verificar os alertas');
    expect(screen.queryByText('Tudo em ordem')).toBeNull();
  });

  it('permite repetir a leitura após falha', () => {
    const retry = vi.fn().mockResolvedValue(undefined);
    render(<MemoryRouter><AttentionPanel stockData={stock({ error: true, retry })} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('só mostra o estado verde depois de uma consulta bem-sucedida sem alertas', () => {
    render(<MemoryRouter><AttentionPanel stockData={stock()} /></MemoryRouter>);
    expect(screen.getByText('Tudo em ordem')).toBeTruthy();
  });
});
