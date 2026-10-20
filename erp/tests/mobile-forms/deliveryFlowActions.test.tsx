import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  startRoute: vi.fn(),
  arriveAtDestination: vi.fn(),
  startService: vi.fn(),
  stepBackToPreparation: vi.fn(),
  stepBackToRoute: vi.fn(),
  stepBackToArrival: vi.fn(),
  finishDelivery: vi.fn(),
  broadcastMyLocation: vi.fn(),
  stopDeliveringBroadcast: vi.fn(),
}));

vi.mock('react-native', () => ({
  Alert: { alert: mocks.alert },
  View: 'div',
  Text: 'span',
  StyleSheet: { create: (v: unknown) => v },
  Platform: { OS: 'web' },
}));

vi.mock('../../../mobile/src/services/supabaseClient', () => ({
  supabase: {},
}));

vi.mock('../../../mobile/src/services/offline/offlineSyncManager', () => ({
  offlineSyncManager: { recordEvent: vi.fn() },
}));

vi.mock('../../../mobile/src/features/orders/components/delivery/DeliveryPaymentSection', () => ({
  areDeliveryPaymentsPaid: vi.fn(() => true),
  DeliveryPaymentSection: () => null,
}));

vi.mock('../../../mobile/src/services/teamLocationService', () => ({
  broadcastMyLocation: mocks.broadcastMyLocation,
  stopDeliveringBroadcast: mocks.stopDeliveringBroadcast,
}));

vi.mock('../../../mobile/src/features/orders/services/deliveryFlowService', () => ({
  deliveryFlowService: {
    startRoute: mocks.startRoute,
    arriveAtDestination: mocks.arriveAtDestination,
    startService: mocks.startService,
    stepBackToPreparation: mocks.stepBackToPreparation,
    stepBackToRoute: mocks.stepBackToRoute,
    stepBackToArrival: mocks.stepBackToArrival,
    finishDelivery: mocks.finishDelivery,
  },
}));

import { useDeliveryFlowActions } from '../../../mobile/src/features/orders/screens/delivery-preparation/useDeliveryFlowActions';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useDeliveryFlowActions — Transição Fluida de Etapas sem Alertas Bloqueantes', () => {
  it('transita para Etapa 2 (Em Rota) sem disparar Alert.alert de notificação', async () => {
    const updatedData = {
      deliveryStatus: 'in_progress',
      deliveryStartedAt: '2026-10-20T10:00:00Z',
    };
    mocks.startRoute.mockResolvedValue({ updatedData, responsibleName: 'Motorista' });

    const order = { id: 'ord-101', order_data: { items: [] } };
    const onBack = vi.fn();

    const { result } = renderHook(() =>
      useDeliveryFlowActions({
        order,
        responsibles: [{ id: 'resp-1', name: 'Motorista' }],
        onBack,
        fulfillmentSuccessMessage: 'Entrega finalizada com sucesso',
      })
    );

    expect(result.current.currentStep).toBe(1);

    // Marca o item do checklist para completar a conferência
    act(() => {
      result.current.handleToggleChecklist('loaded');
    });
    expect(result.current.isChecklistComplete).toBe(true);

    await act(async () => {
      await result.current.handleStartRoute();
    });

    expect(mocks.startRoute).toHaveBeenCalled();
    expect(result.current.currentStep).toBe(2);
    // Invariante: Não deve existir pop-up/alerta JavaScript de transição de etapa
    expect(mocks.alert).not.toHaveBeenCalledWith('Em Rota', expect.anything());
  });

  it('transita para Etapa 3 (Chegada) e depois Etapa 4 (Em Atendimento) sem disparar Alert.alert', async () => {
    const arrivedData = {
      deliveryStatus: 'arrived',
      deliveryArrivedAt: '2026-10-20T10:30:00Z',
    };
    mocks.arriveAtDestination.mockResolvedValue({ updatedData: arrivedData });

    const inServiceData = {
      ...arrivedData,
      deliveryStatus: 'in_service',
      deliveryServiceStartedAt: '2026-10-20T10:35:00Z',
    };
    mocks.startService.mockResolvedValue({ updatedData: inServiceData });

    const order = {
      id: 'ord-102',
      order_data: {
        deliveryStatus: 'in_progress',
        deliveryStartedAt: '2026-10-20T10:00:00Z',
      },
    };
    const onBack = vi.fn();

    const { result } = renderHook(() =>
      useDeliveryFlowActions({
        order,
        responsibles: [],
        onBack,
        fulfillmentSuccessMessage: 'Entrega finalizada com sucesso',
      })
    );

    expect(result.current.currentStep).toBe(2);

    // 1. Chegada no local (Etapa 2 -> 3)
    await act(async () => {
      await result.current.handleArriveAtDestination();
    });

    expect(mocks.arriveAtDestination).toHaveBeenCalled();
    expect(result.current.currentStep).toBe(3);
    expect(result.current.isInArrival).toBe(true);
    expect(result.current.isInService).toBe(false);
    // Invariante: Não deve disparar alerta de chegada confirmada
    expect(mocks.alert).not.toHaveBeenCalledWith('Chegada Confirmada', expect.anything());

    // 2. Iniciar Atendimento (Etapa 3 -> 4)
    await act(async () => {
      await result.current.handleStartService();
    });

    expect(mocks.startService).toHaveBeenCalled();
    expect(result.current.currentStep).toBe(4);
    expect(result.current.isInArrival).toBe(false);
    expect(result.current.isInService).toBe(true);
    expect(mocks.alert).not.toHaveBeenCalledWith('Atendimento Iniciado', expect.anything());
  });

  it('retrocede da Etapa 4 para 3, da 3 para 2 e da 2 para 1 sem alertas bloqueantes', async () => {
    mocks.stepBackToArrival.mockResolvedValue({ updatedData: { deliveryStatus: 'arrived' } });
    mocks.stepBackToRoute.mockResolvedValue({ updatedData: { deliveryStatus: 'in_progress' } });
    mocks.stepBackToPreparation.mockResolvedValue({ updatedData: {} });

    const order = {
      id: 'ord-103',
      order_data: {
        deliveryStatus: 'in_service',
        deliveryStartedAt: '2026-10-20T10:00:00Z',
        deliveryArrivedAt: '2026-10-20T10:30:00Z',
        deliveryServiceStartedAt: '2026-10-20T10:35:00Z',
      },
    };
    const onBack = vi.fn();

    const { result } = renderHook(() =>
      useDeliveryFlowActions({
        order,
        responsibles: [],
        onBack,
        fulfillmentSuccessMessage: 'Entrega finalizada com sucesso',
      })
    );

    // 4 -> 3
    await act(async () => {
      await result.current.handleStepBackToArrival();
    });
    expect(mocks.stepBackToArrival).toHaveBeenCalled();
    expect(mocks.alert).not.toHaveBeenCalledWith('Etapa Retrocedida', expect.anything());

    // 3 -> 2
    await act(async () => {
      await result.current.handleStepBackToRoute();
    });
    expect(mocks.stepBackToRoute).toHaveBeenCalled();
    expect(mocks.alert).not.toHaveBeenCalledWith('Etapa Retrocedida', expect.anything());

    // 2 -> 1
    await act(async () => {
      await result.current.handleStepBackToPreparation();
    });
    expect(mocks.stepBackToPreparation).toHaveBeenCalled();
    expect(mocks.alert).not.toHaveBeenCalledWith('Etapa Retrocedida', expect.anything());
  });

  it('preserva alertas de validação crítica (ex: checklist incompleto)', async () => {
    // Pedido com item físico que gera checklist
    const order = {
      id: 'ord-104',
      order_data: {
        items: [{ id: 'item-1', name: 'Sofá Retrátil', quantity: 1 }],
      },
    };
    const onBack = vi.fn();

    const { result } = renderHook(() =>
      useDeliveryFlowActions({
        order,
        responsibles: [{ id: 'resp-1', name: 'Motorista' }],
        onBack,
        fulfillmentSuccessMessage: 'Entrega finalizada',
      })
    );

    expect(result.current.isChecklistComplete).toBe(false);

    await act(async () => {
      await result.current.handleStartRoute();
    });

    // Operação não deve prosseguir e deve alertar a pendência
    expect(mocks.startRoute).not.toHaveBeenCalled();
    expect(mocks.alert).toHaveBeenCalledWith(
      'Checklist incompleto',
      expect.stringContaining('confira e marque todos os itens')
    );
  });
});
