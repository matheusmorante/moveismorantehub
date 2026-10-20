import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEq = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../../../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  },
}));

const mockRecordEvent = vi.fn();
vi.mock('../../../../services/offline/offlineSyncManager', () => ({
  offlineSyncManager: {
    recordEvent: (...args: any[]) => mockRecordEvent(...args),
  },
}));

import { deliveryFlowService } from '../deliveryFlowService';

describe('deliveryFlowService — Persistência e Sincronização do Fluxo de Entrega', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockRecordEvent.mockResolvedValue(undefined);
  });

  it('startRoute registra saída para entrega e enfileira evento offline', async () => {
    const result = await deliveryFlowService.startRoute({
      orderId: 'ord-100',
      currentData: { totalValue: 150 },
      checklist: [{ id: 'chk-1', checked: true }],
      responsibles: [{ name: 'Carlos Motorista', id: 'usr-1' }],
      userProfileId: 'usr-1',
    });

    expect(result.responsibleName).toBe('Carlos Motorista');
    expect(result.updatedData.deliveryStatus).toBe('in_progress');
    expect(result.updatedData.deliveryResponsibles).toHaveLength(1);
    expect(result.updatedData.deliveryChecklist).toEqual([{ id: 'chk-1', checked: true }]);

    expect(mockRecordEvent).toHaveBeenCalledWith(
      'DELIVERY_START_ROUTE',
      'order',
      'ord-100',
      expect.objectContaining({
        deliveryStatus: 'in_progress',
        deliveryResponsibleName: 'Carlos Motorista',
      })
    );
  });

  it('arriveAtDestination atualiza status para in_service', async () => {
    const result = await deliveryFlowService.arriveAtDestination({
      orderId: 'ord-100',
      currentData: { deliveryStatus: 'in_progress' },
    });

    expect(result.updatedData.deliveryStatus).toBe('in_service');
    expect(result.updatedData.deliveryArrivedAt).toBeDefined();

    expect(mockRecordEvent).toHaveBeenCalledWith(
      'DELIVERY_ARRIVE_DESTINATION',
      'order',
      'ord-100',
      expect.objectContaining({ deliveryStatus: 'in_service' })
    );
  });

  it('finishDelivery consolida pagamentos e conclui entrega', async () => {
    const result = await deliveryFlowService.finishDelivery({
      orderId: 'ord-100',
      currentData: {
        paymentsSummary: { totalOrderValue: 200 },
      },
      payments: [{ method: 'Pix', amount: 200, status: 'pago' }],
    });

    expect(result.updatedData.status).toBe('fulfilled');
    expect(result.updatedData.deliveryStatus).toBe('completed');
    expect(result.updatedData.paymentsSummary.totalPaid).toBe(200);
    expect(result.updatedData.paymentsSummary.amountRemaining).toBe(0);

    expect(mockRecordEvent).toHaveBeenCalledWith(
      'DELIVERY_FINISH',
      'order',
      'ord-100',
      expect.objectContaining({
        status: 'fulfilled',
        deliveryStatus: 'completed',
      })
    );
  });

  it('recordUnattended registra motivo do insucesso da entrega', async () => {
    const result = await deliveryFlowService.recordUnattended({
      orderId: 'ord-100',
      currentData: { deliveryStatus: 'in_service' },
      reason: 'Cliente Ausente',
      notes: 'Tentado contato por interfone 3 vezes',
      proofUrls: ['https://storage.com/foto1.jpg'],
    });

    expect(result.updatedData.deliveryStatus).toBe('unattended');
    expect(result.updatedData.unattendedReason).toBe('Cliente Ausente');
    expect(result.updatedData.unattendedProofUrl).toBe('https://storage.com/foto1.jpg');

    expect(mockRecordEvent).toHaveBeenCalledWith(
      'DELIVERY_UNATTENDED',
      'order',
      'ord-100',
      expect.objectContaining({
        deliveryStatus: 'unattended',
        unattendedReason: 'Cliente Ausente',
      })
    );
  });

  it('stepBackToPreparation remove deliveryStatus e deliveryStartedAt', async () => {
    const result = await deliveryFlowService.stepBackToPreparation('ord-100', {
      deliveryStatus: 'in_progress',
      deliveryStartedAt: '2026-10-19T10:00:00Z',
      otherField: 'preserved',
    });

    expect(result.updatedData.deliveryStatus).toBeUndefined();
    expect(result.updatedData.deliveryStartedAt).toBeUndefined();
    expect(result.updatedData.otherField).toBe('preserved');
  });

  it('stepBackToRoute remove deliveryArrivedAt e restaura in_progress', async () => {
    const result = await deliveryFlowService.stepBackToRoute('ord-100', {
      deliveryStatus: 'in_service',
      deliveryArrivedAt: '2026-10-19T10:30:00Z',
    });

    expect(result.updatedData.deliveryStatus).toBe('in_progress');
    expect(result.updatedData.deliveryArrivedAt).toBeUndefined();
  });

  it('cancelDelivery remove atributos de entrega e atualiza status no banco para scheduled', async () => {
    const result = await deliveryFlowService.cancelDelivery('ord-100', {
      deliveryStatus: 'in_progress',
      deliveryStartedAt: '2026-10-19T10:00:00Z',
      unattendedReason: 'Cliente ausente',
      preservedNote: 'Nota original',
    });

    expect(result.updatedData.deliveryStatus).toBeUndefined();
    expect(result.updatedData.unattendedReason).toBeUndefined();
    expect(result.updatedData.preservedNote).toBe('Nota original');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'scheduled',
      })
    );
  });
});
