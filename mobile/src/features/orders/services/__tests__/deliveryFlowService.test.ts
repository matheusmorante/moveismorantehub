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

  it('arriveAtDestination atualiza status para arrived e startService para in_service', async () => {
    const arrivedResult = await deliveryFlowService.arriveAtDestination({
      orderId: 'ord-100',
      currentData: { deliveryStatus: 'in_progress' },
    });

    expect(arrivedResult.updatedData.deliveryStatus).toBe('arrived');
    expect(arrivedResult.updatedData.deliveryArrivedAt).toBeDefined();

    expect(mockRecordEvent).toHaveBeenCalledWith(
      'DELIVERY_ARRIVE_DESTINATION',
      'order',
      'ord-100',
      expect.objectContaining({ deliveryStatus: 'arrived' })
    );

    const serviceResult = await deliveryFlowService.startService({
      orderId: 'ord-100',
      currentData: arrivedResult.updatedData,
    });

    expect(serviceResult.updatedData.deliveryStatus).toBe('in_service');
    expect(serviceResult.updatedData.deliveryServiceStartedAt).toBeDefined();

    expect(mockRecordEvent).toHaveBeenCalledWith(
      'DELIVERY_START_SERVICE',
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

  it('mantém a foto local somente na fila offline e não persiste a URI no pedido remoto', async () => {
    const proof = {
      uri: 'file:///documents/delivery-proofs/prova.png',
      fileName: 'prova.png',
      contentType: 'image/png',
    };

    await deliveryFlowService.recordUnattended({
      orderId: 'ord-offline-proof',
      currentData: { deliveryStatus: 'arrived' },
      reason: 'Ninguém Atendeu no Local',
      notes: 'Interfone sem resposta.',
      proofUrls: [proof.uri],
      proofMetadata: [proof],
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockRecordEvent).toHaveBeenCalledWith(
      'DELIVERY_UNATTENDED',
      'order',
      'ord-offline-proof',
      expect.objectContaining({
        unattendedProofUrls: [proof.uri],
        unattendedProofMetadata: [proof],
      })
    );
  });

  it('stepBackToPreparation remove deliveryStatus e deliveryStartedAt e limpa no banco e evento offline', async () => {
    const result = await deliveryFlowService.stepBackToPreparation('ord-100', {
      deliveryStatus: 'in_progress',
      deliveryStartedAt: '2026-10-19T10:00:00Z',
      deliveryArrivedAt: '2026-10-19T10:15:00Z',
      otherField: 'preserved',
    });

    expect(result.updatedData.deliveryStatus).toBeUndefined();
    expect(result.updatedData.deliveryStartedAt).toBeUndefined();
    expect(result.updatedData.deliveryArrivedAt).toBeUndefined();
    expect(result.updatedData.otherField).toBe('preserved');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        delivery_status: null,
        delivery_started_at: null,
        delivery_arrived_at: null,
      })
    );
    expect(mockRecordEvent).toHaveBeenCalledWith(
      'DELIVERY_STEP_BACK',
      'order',
      'ord-100',
      expect.objectContaining({
        deliveryStatus: null,
        deliveryStartedAt: null,
        deliveryArrivedAt: null,
        deliveryServiceStartedAt: null,
      })
    );
  });

  it('stepBackToRoute remove deliveryArrivedAt e deliveryServiceStartedAt e restaura in_progress', async () => {
    const result = await deliveryFlowService.stepBackToRoute('ord-100', {
      deliveryStatus: 'arrived',
      deliveryArrivedAt: '2026-10-19T10:30:00Z',
      deliveryServiceStartedAt: '2026-10-19T10:35:00Z',
    });

    expect(result.updatedData.deliveryStatus).toBe('in_progress');
    expect(result.updatedData.deliveryArrivedAt).toBeUndefined();
    expect(result.updatedData.deliveryServiceStartedAt).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        delivery_status: 'in_progress',
        delivery_arrived_at: null,
      })
    );
  });

  it('stepBackToArrival remove deliveryServiceStartedAt e restaura arrived (Etapa 4 -> Etapa 3)', async () => {
    const result = await deliveryFlowService.stepBackToArrival('ord-100', {
      deliveryStatus: 'in_service',
      deliveryArrivedAt: '2026-10-19T10:30:00Z',
      deliveryServiceStartedAt: '2026-10-19T10:35:00Z',
    });

    expect(result.updatedData.deliveryStatus).toBe('arrived');
    expect(result.updatedData.deliveryArrivedAt).toBe('2026-10-19T10:30:00Z');
    expect(result.updatedData.deliveryServiceStartedAt).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        delivery_status: 'arrived',
      })
    );
    expect(mockRecordEvent).toHaveBeenCalledWith(
      'DELIVERY_STEP_BACK',
      'order',
      'ord-100',
      expect.objectContaining({
        deliveryStatus: 'arrived',
        deliveryServiceStartedAt: null,
      })
    );
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
        delivery_status: null,
        delivery_started_at: null,
        delivery_arrived_at: null,
        delivery_finished_at: null,
      })
    );
  });

  it('resiliência offline: todas as etapas funcionam mesmo quando o Supabase lança erro de rede', async () => {
    mockUpdate.mockImplementation(() => {
      throw new Error('Network request failed');
    });

    const r1 = await deliveryFlowService.startRoute({
      orderId: 'ord-off-1',
      currentData: { totalValue: 300 },
      checklist: [{ id: 'chk-1', checked: true }],
      responsibles: [{ name: 'João', id: 'usr-2' }],
      userProfileId: 'usr-2',
    });
    expect(r1.updatedData.deliveryStatus).toBe('in_progress');

    const r2 = await deliveryFlowService.arriveAtDestination({
      orderId: 'ord-off-1',
      currentData: r1.updatedData,
    });
    expect(r2.updatedData.deliveryStatus).toBe('arrived');

    const r3 = await deliveryFlowService.startService({
      orderId: 'ord-off-1',
      currentData: r2.updatedData,
    });
    expect(r3.updatedData.deliveryStatus).toBe('in_service');

    const r4 = await deliveryFlowService.finishDelivery({
      orderId: 'ord-off-1',
      currentData: r3.updatedData,
      payments: [{ method: 'Pix', amount: 300, status: 'pago' }],
    });
    expect(r4.updatedData.status).toBe('fulfilled');
    expect(r4.updatedData.deliveryStatus).toBe('completed');
    expect(mockRecordEvent).toHaveBeenCalledTimes(4);
  });
});
