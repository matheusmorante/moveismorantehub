import { expect, it, vi } from 'vitest';
import type { executeSaveOrder } from '../orderCreationService';
import type { bindTestArtifactContext } from '../../../../../../shared-utils/testArtifactContext';

type OrderTestArtifactIdentity = {
  runId: string;
  ownerId: string;
};

type OrderTestArtifactGuardDependencies = {
  mocks: any;
  scheduledSale: any;
  testIdentity: OrderTestArtifactIdentity;
  executeSaveOrder: typeof executeSaveOrder;
  bindTestArtifactContext: typeof bindTestArtifactContext;
};

export function registerOrderTestArtifactGuardCases({
  mocks,
  scheduledSale,
  testIdentity,
  executeSaveOrder,
  bindTestArtifactContext,
}: OrderTestArtifactGuardDependencies) {
  it('não marca um pedido comum quando o contexto de teste existe e o modo está OFF', async () => {
    bindTestArtifactContext(testIdentity);
    mocks.rpc.mockResolvedValue({
      data: { id: 'pedido-normal', order_index: 123, order_data: scheduledSale },
      error: null,
    });

    await executeSaveOrder(scheduledSale as any, vi.fn());

    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_data).not.toHaveProperty('is_test');
    expect(mocks.dispatchNotifications).toHaveBeenCalledTimes(1);
  });

  it('persiste artefato sem número comercial e não notifica nem atualiza contato operacional', async () => {
    bindTestArtifactContext(testIdentity);
    const orderId = '550e8400-e29b-41d4-a716-446655440011';
    const syntheticOrder = {
      ...scheduledSale,
      orderIndex: 123,
      orderNumber: 123,
      customerData: { id: '550e8400-e29b-41d4-a716-446655440012' },
      is_test: true,
    };
    mocks.rpc.mockResolvedValue({
      data: {
        id: orderId,
        order_number: `T-${orderId}`,
        order_index: null,
        order_data: { ...syntheticOrder, orderIndex: undefined, orderNumber: undefined },
      },
      error: null,
    });

    await executeSaveOrder(syntheticOrder as any, vi.fn(), {
      idempotencyKey: orderId,
    });

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_data.is_test).toBe(true);
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_index).toBeNull();
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_number).toBe('');
    expect(mocks.getNextOrderIndex).not.toHaveBeenCalled();
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_data.testArtifact).toEqual({
      is_test: true,
      ...testIdentity,
    });
    expect(mocks.syncCustomer).not.toHaveBeenCalled();
    expect(mocks.dispatchNotifications).not.toHaveBeenCalled();
  });

  it('bloqueia artefato com chave de idempotência que não seja UUID antes da RPC', async () => {
    bindTestArtifactContext(testIdentity);
    const syntheticOrder = {
      ...scheduledSale,
      customerData: { id: '550e8400-e29b-41d4-a716-446655440012' },
      is_test: true,
    };

    await expect(
      executeSaveOrder(syntheticOrder as any, vi.fn(), { idempotencyKey: 'pedido-de-teste' })
    ).rejects.toThrow('O pedido de teste exige um UUID válido');
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.getNextOrderIndex).not.toHaveBeenCalled();
  });
}
