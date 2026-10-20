// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import type { FiscalPendencyItem } from '../types/fiscalPendencies.types';
import { FiscalPendencyTypeBadge } from '../components/pendencies/FiscalPendencyTypeBadge';
import { FiscalPendenciesTable } from '../components/pendencies/FiscalPendenciesTable';
import { FiscalPendenciesView } from '../components/pendencies/FiscalPendenciesView';
import { FiscalDocumentsHeader } from '../components/FiscalDocumentsHeader';
import { useFiscalPendencies } from '../hooks/useFiscalPendencies';
import * as pendenciesService from '../services/fiscalPendenciesService';

const mockPendencies: FiscalPendencyItem[] = [
  {
    id: 'order-1-2',
    orderId: 'order-1',
    orderIndex: '#4268',
    customerName: 'Cliente Homologação',
    customerDocument: '123.456.789-00',
    pendencyType: 'awaiting_new_invoice',
    environment: 2,
    model: '55',
    originalDocumentId: 'doc-orig-1',
    originalDocumentNumber: 124,
    originalDocumentClosure: 'estornada',
    identifiedAt: '2026-10-20T14:30:00.000Z',
    situationStatus: 'reissue_required',
    actionKind: 'awaiting_new_invoice',
    actionLabel: 'Emitir nova NF',
    actionIcon: 'bi-receipt',
  },
  {
    id: 'order-2-1',
    orderId: 'order-2',
    orderIndex: '#4269',
    customerName: 'Cliente Produção',
    customerDocument: '987.654.321-99',
    pendencyType: 'rejected',
    environment: 1,
    model: '65',
    currentDocumentId: 'doc-rej-1',
    currentDocumentNumber: 501,
    currentAttemptStatus: 'rejeitada',
    identifiedAt: '2026-10-20T15:00:00.000Z',
    situationStatus: 'rejected',
    reason: '539 - Rejeição: Duplicidade de NF-e',
    actionKind: 'rejected',
    actionLabel: 'Corrigir emissão',
    actionIcon: 'bi-wrench-adjustable',
  },
  {
    id: 'order-3-1',
    orderId: 'order-3',
    orderIndex: '#4270',
    customerName: 'Cliente Incerteza',
    customerDocument: '111.222.333-44',
    pendencyType: 'transmission_uncertain',
    environment: 1,
    model: '55',
    identifiedAt: '2026-10-20T16:00:00.000Z',
    situationStatus: 'regularization_uncertain',
    reason: 'Timeout de rede na transmissão',
    actionKind: 'transmission_uncertain',
    actionLabel: 'Consultar situação',
    actionIcon: 'bi-arrow-repeat',
  },
];

describe('Central de Pendências Fiscais - Submódulos e Componentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FiscalPendencyTypeBadge', () => {
    it('renderiza o badge de nova emissão necessária corretamente', () => {
      render(<FiscalPendencyTypeBadge type="awaiting_new_invoice" />);
      expect(screen.getByText('Nova emissão necessária')).toBeTruthy();
    });

    it('renderiza o badge de emissão rejeitada', () => {
      render(<FiscalPendencyTypeBadge type="rejected" />);
      expect(screen.getByText('Emissão rejeitada')).toBeTruthy();
    });

    it('renderiza o badge de transmissão incerta', () => {
      render(<FiscalPendencyTypeBadge type="transmission_uncertain" />);
      expect(screen.getByText('Transmissão incerta')).toBeTruthy();
    });

    it('renderiza o badge de regularização com erro', () => {
      render(<FiscalPendencyTypeBadge type="prior_regularization_failed" />);
      expect(screen.getByText('Regularização com erro')).toBeTruthy();
    });
  });

  describe('FiscalPendenciesTable', () => {
    it('renderiza empty state quando não há pendências abertas', () => {
      render(
        <FiscalPendenciesTable
          pendencies={[]}
          loading={false}
          onOpenAction={vi.fn()}
          onViewDetails={vi.fn()}
        />
      );

      expect(screen.getByText('Nenhuma pendência fiscal aberta')).toBeTruthy();
      expect(
        screen.getByText(/Todas as notas fiscais emitidas, estornadas e canceladas estão devidamente regularizadas/)
      ).toBeTruthy();
    });

    it('renderiza as linhas de pendências com dados e botões de ação', () => {
      const onOpenAction = vi.fn();
      const onViewDetails = vi.fn();

      render(
        <FiscalPendenciesTable
          pendencies={mockPendencies}
          loading={false}
          onOpenAction={onOpenAction}
          onViewDetails={onViewDetails}
        />
      );

      expect(screen.getByText('#4268')).toBeTruthy();
      expect(screen.getByText('Cliente Homologação')).toBeTruthy();
      expect(screen.getByText('NFH')).toBeTruthy();
      expect(screen.getByText(/NF 124/)).toBeTruthy();
      expect(screen.getByText(/^estornada$/i)).toBeTruthy();

      expect(screen.getByText('#4269')).toBeTruthy();
      expect(screen.getByText('Cliente Produção')).toBeTruthy();
      expect(screen.getByText('539 - Rejeição: Duplicidade de NF-e')).toBeTruthy();

      // Botões de ação
      const emitBtn = screen.getByRole('button', { name: /Emitir nova NF/i });
      expect(emitBtn).toBeTruthy();
      fireEvent.click(emitBtn);
      expect(onOpenAction).toHaveBeenCalledWith(mockPendencies[0], 'awaiting_new_invoice');

      // Clique na linha abre detalhes
      const row = screen.getByText('#4270').closest('tr');
      expect(row).toBeTruthy();
      fireEvent.click(row!);
      expect(onViewDetails).toHaveBeenCalledWith(mockPendencies[2]);
    });
  });

  describe('FiscalPendenciesView', () => {
    it('mostra falha de carregamento sem afirmar que está tudo regularizado', () => {
      const reload = vi.fn();
      const state = {
        pendencies: [],
        allPendencies: [],
        loading: false,
        error: 'Não foi possível carregar a lista de pendências fiscais.',
        metrics: {
          openCount: 0,
          productionCount: 0,
          homologationCount: 0,
          reissueCount: 0,
          rejectionCount: 0,
          uncertainCount: 0,
        },
        filters: {
          pendencyType: 'all',
          situation: 'all',
          environment: 'all',
          model: 'all',
          period: 'all',
          search: '',
        },
        setFilterField: vi.fn(),
        resetFilters: vi.fn(),
        reload,
      } as any;

      const { container } = render(
        <FiscalPendenciesView
          state={state}
          onOpenPendencyAction={vi.fn()}
          onViewPendencyDetails={vi.fn()}
        />
      );

      expect(screen.getByRole('alert').textContent).toMatch(/não deve ser considerada vazia/i);
      expect(container.textContent).not.toContain('Nenhuma pendência fiscal aberta');
      fireEvent.click(container.querySelector('button')!);
      expect(reload).toHaveBeenCalledOnce();
    });
  });

  describe('FiscalDocumentsHeader com Abas de Navegação', () => {
    it('renderiza tabs e exibe o contador de pendências abertas', () => {
      const onTabChange = vi.fn();

      render(
        <FiscalDocumentsHeader
          activeTab="documents"
          onTabChange={onTabChange}
          openPendenciesCount={3}
        />
      );

      expect(screen.getByText('Documentos Fiscais')).toBeTruthy();
      expect(screen.getByText('Pendências Fiscais')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();

      fireEvent.click(screen.getByText('Pendências Fiscais'));
      expect(onTabChange).toHaveBeenCalledWith('pendencies');
    });
  });

  describe('useFiscalPendencies hook', () => {
    it('carrega pendências e calcula métricas corretamente', async () => {
      vi.spyOn(pendenciesService, 'fetchFiscalPendencies').mockResolvedValue(mockPendencies);

      const { result } = renderHook(() => useFiscalPendencies(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.pendencies.length).toBe(3);
      expect(result.current.metrics.openCount).toBe(3);
      expect(result.current.metrics.productionCount).toBe(2);
      expect(result.current.metrics.homologationCount).toBe(1);
      expect(result.current.metrics.reissueCount).toBe(1);
      expect(result.current.metrics.rejectionCount).toBe(1);
      expect(result.current.metrics.uncertainCount).toBe(1);
    });

    it('filtra pendências por tipo de pendência', async () => {
      vi.spyOn(pendenciesService, 'fetchFiscalPendencies').mockResolvedValue(mockPendencies);

      const { result } = renderHook(() => useFiscalPendencies(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilterField('pendencyType', 'rejected');
      });

      expect(result.current.pendencies.length).toBe(1);
      expect(result.current.pendencies[0].orderIndex).toBe('#4269');
    });

    it('filtra pendências por ambiente', async () => {
      vi.spyOn(pendenciesService, 'fetchFiscalPendencies').mockResolvedValue(mockPendencies);

      const { result } = renderHook(() => useFiscalPendencies(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilterField('environment', '2');
      });

      expect(result.current.pendencies.length).toBe(1);
      expect(result.current.pendencies[0].orderIndex).toBe('#4268');
    });

    it('filtra pendências por busca textual de cliente ou pedido', async () => {
      vi.spyOn(pendenciesService, 'fetchFiscalPendencies').mockResolvedValue(mockPendencies);

      const { result } = renderHook(() => useFiscalPendencies(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilterField('search', 'Incerteza');
      });

      expect(result.current.pendencies.length).toBe(1);
      expect(result.current.pendencies[0].customerName).toBe('Cliente Incerteza');
    });

    it('reseta os filtros para o estado inicial', async () => {
      vi.spyOn(pendenciesService, 'fetchFiscalPendencies').mockResolvedValue(mockPendencies);

      const { result } = renderHook(() => useFiscalPendencies(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilterField('environment', '2');
      });
      expect(result.current.pendencies.length).toBe(1);

      act(() => {
        result.current.resetFilters();
      });
      expect(result.current.pendencies.length).toBe(3);
    });
  });
});
