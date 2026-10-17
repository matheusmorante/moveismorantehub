// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import SupabaseAnomalyBanner from '../SupabaseAnomalyBanner';

describe('SupabaseAnomalyBanner Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('não deve renderizar nada se anomaly for null', () => {
    const { container } = render(
      <MemoryRouter>
        <SupabaseAnomalyBanner anomaly={null} onDismiss={vi.fn()} />
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar banner crítico com estilo vermelho e informações da anomalia', () => {
    const onDismiss = vi.fn();
    render(
      <MemoryRouter>
        <SupabaseAnomalyBanner
          anomaly={{
            level: 'CRITICAL',
            title: 'Pool de Conexões Esgotado',
            message: 'O banco de dados atingiu o limite de sessões ativas.',
          }}
          onDismiss={onDismiss}
        />
      </MemoryRouter>
    );

    const alertEl = screen.getByRole('alert');
    expect(alertEl).toBeTruthy();
    expect(screen.getByText('Pool de Conexões Esgotado')).toBeTruthy();
    expect(
      screen.getByText('O banco de dados atingiu o limite de sessões ativas.')
    ).toBeTruthy();
    expect(alertEl.className).toContain('bg-red-600');
  });

  it('deve renderizar banner de aviso com estilo amarelo/amber quando não for crítico', () => {
    const onDismiss = vi.fn();
    render(
      <MemoryRouter>
        <SupabaseAnomalyBanner
          anomaly={{
            level: 'WARNING',
            title: 'Latência Elevada',
            message: 'Consultas lentas detectadas.',
          }}
          onDismiss={onDismiss}
        />
      </MemoryRouter>
    );

    const alertEl = screen.getByRole('alert');
    expect(alertEl).toBeTruthy();
    expect(screen.getByText('Latência Elevada')).toBeTruthy();
    expect(alertEl.className).toContain('bg-amber-500');
  });

  it('deve disparar onDismiss ao clicar no botão fechar ou no link de diagnóstico', () => {
    const onDismiss = vi.fn();
    render(
      <MemoryRouter>
        <SupabaseAnomalyBanner
          anomaly={{
            level: 'CRITICAL',
            title: 'Falha',
            message: 'Erro',
          }}
          onDismiss={onDismiss}
        />
      </MemoryRouter>
    );

    const closeBtn = screen.getByLabelText('Fechar alerta');
    fireEvent.click(closeBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    const diagLink = screen.getByText('Ver Diagnóstico');
    fireEvent.click(diagLink);
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
