// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type Order from '@/pages/types/order.type';
import { useOrderEditLoader } from '../hooks/useOrderEditLoader';
import { useOrderEditPersistence } from '../hooks/useOrderEditPersistence';
import { useOrderEditJsonImport } from '../hooks/useOrderEditJsonImport';
import { useOrderEditActions } from '../hooks/useOrderEditActions';
import { buildUpdatedOrder } from '../utils/orderEditPayload';

import { prepareOrderFiscalSnapshotForEmission } from '@/pages/utils/nfeEmissionSnapshotService';
import { fetchOrderById, updateOrder } from '@/pages/utils/orderHistoryService';

// Mocks
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'order-123' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/pages/utils/orderHistoryService', () => ({
  fetchOrderById: vi.fn(),
  updateOrder: vi.fn(),
  shouldAutoFulfillScheduledSaleOnEdit: vi.fn().mockReturnValue(false),
}));

vi.mock('@/pages/utils/nfe/nfeEmissionRequestState', () => ({
  clearFiscalEmissionRequest: vi.fn(),
}));

vi.mock('@/pages/utils/nfe/cancellationEligibility', () => ({
  getGoodsCirculationState: vi.fn().mockReturnValue('none'),
}));

vi.mock('@/pages/utils/nfeEmissionSnapshotService', () => ({
  prepareOrderFiscalSnapshotForEmission: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('OrderEditModal Modular Architecture', () => {
  const mockOrder: Order = {
    id: 'ord-test-1',
    orderNumber: 1001,
    status: 'scheduled',
    customerData: { fullName: 'Cliente Teste' },
    items: [
      {
        orderItemId: 'item-1',
        productId: 'prod-1',
        description: 'Sofá 3 Lugares',
        quantity: 1,
        unitPrice: 1500,
      },
    ],
    payments: [],
    shipping: { deliveryMethod: 'delivery' },
  };

  const createMockFormActions = () => ({
    loadOrderForEditing: vi.fn(),
    jumpToStep: vi.fn(),
    setSeller: vi.fn(),
    setCustomerData: vi.fn(),
    setMarketingOrigin: vi.fn(),
    setObservation: vi.fn(),
    setOrderDate: vi.fn(),
    setDeliveryMethod: vi.fn(),
    setShipping: vi.fn(),
    setItems: vi.fn(),
    setPayments: vi.fn(),
    validateOrder: vi.fn().mockReturnValue({}),
    setErrors: vi.fn(),
    handleSelectProduct: vi.fn(),
    handleCompleteOrder: vi.fn().mockResolvedValue('ord-test-1'),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateOrder).mockResolvedValue({ success: true } as any);
    vi.mocked(fetchOrderById).mockResolvedValue(mockOrder);
    vi.mocked(prepareOrderFiscalSnapshotForEmission).mockImplementation(async (order) => order);
  });

  describe('useOrderEditLoader', () => {
    it('recarrega a versão persistida do pedido passado via prop e gerencia overflow do body', async () => {
      const formActions = createMockFormActions();
      const onClose = vi.fn();
      const onSaveSuccess = vi.fn();
      const freshOrder = { ...mockOrder, updatedAt: '2026-10-27T12:00:00.000Z' };
      vi.mocked(fetchOrderById).mockResolvedValue(freshOrder);

      const { result, unmount } = renderHook(() =>
        useOrderEditLoader({
          order: mockOrder,
          propOnClose: onClose,
          propOnSaveSuccess: onSaveSuccess,
          initialStep: 2,
          formActions: formActions as any,
        })
      );

      expect(result.current.isLoadingOrder).toBe(true);
      await waitFor(() => expect(result.current.effectiveOrder).toBe(freshOrder));
      expect(result.current.isLoadingOrder).toBe(false);
      expect(fetchOrderById).toHaveBeenCalledWith(mockOrder.id);
      expect(formActions.loadOrderForEditing).toHaveBeenCalledWith(freshOrder);
      expect(formActions.jumpToStep).toHaveBeenCalledWith(2);

      // Overflow do body
      expect(document.body.style.overflow).toBe('hidden');
      unmount();
      expect(document.body.style.overflow).toBe('');
    });

    it('executa onClose customizado quando fornecido', () => {
      const formActions = createMockFormActions();
      const onClose = vi.fn();

      const { result } = renderHook(() =>
        useOrderEditLoader({
          order: mockOrder,
          propOnClose: onClose,
          formActions: formActions as any,
        })
      );

      result.current.onClose();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('useOrderEditPersistence', () => {
    it('executa persistUpdate com sucesso chamando onSaveSuccess e onClose', async () => {
      const onClose = vi.fn();
      const onSaveSuccess = vi.fn();
      const setFiscalReissue = vi.fn();

      const { result } = renderHook(() =>
        useOrderEditPersistence({
          effectiveOrder: mockOrder,
          onClose,
          onSaveSuccess,
          setFiscalReissue,
        })
      );

      const savedId = await result.current.persistUpdate(mockOrder, '2026-10-20T10:00:00Z');
      expect(savedId).toBe('ord-test-1');
      expect(onSaveSuccess).toHaveBeenCalledWith('ord-test-1', mockOrder);
      expect(onClose).toHaveBeenCalled();
    });

    it('executa persistReadyFiscalEdit preparando a reemissão e definindo o estado de fiscalReissue', async () => {
      const onClose = vi.fn();
      const onSaveSuccess = vi.fn();
      const setFiscalReissue = vi.fn();

      const { result } = renderHook(() =>
        useOrderEditPersistence({
          effectiveOrder: mockOrder,
          onClose,
          onSaveSuccess,
          setFiscalReissue,
        })
      );

      const replacements = [
        {
          id: 'rep-1',
          orderId: 'ord-test-1',
          environment: 2 as const,
          action: 'estorno' as const,
          status: 'ready_to_reissue' as const,
          reversalConfirmed: true,
          reversalDocumentId: 'rev-doc-1',
          replacementDocumentId: null,
          createdAt: '2026-10-20T10:00:00Z',
          completedAt: null,
        },
      ];

      const savedId = await result.current.persistReadyFiscalEdit(
        mockOrder,
        '2026-10-20T10:00:00Z',
        replacements
      );

      expect(savedId).toBe('ord-test-1');
      expect(setFiscalReissue).toHaveBeenCalledWith({
        order: mockOrder,
        replacement: replacements[0],
        remaining: [],
      });
    });
  });

  describe('useOrderEditJsonImport', () => {
    it('detecta cliente no JSON e abre modal de cadastro de cliente', () => {
      const formActions = createMockFormActions();

      const { result } = renderHook(() =>
        useOrderEditJsonImport({
          formActions: formActions as any,
        })
      );

      act(() => {
        const success = result.current.handleLoadJSON({
          client: {
            fullName: 'Cliente Importado',
            phone: '41999998888',
          },
          order: {
            observation: 'Entrega urgente',
          },
        });
        expect(success).toBe(true);
      });

      expect(result.current.isCustomerRegistrationOpen).toBe(true);
      expect(result.current.pendingCustomerData.fullName).toBe('Cliente Importado');
    });

    it('registra o cliente preenchendo o formulário com dados importados', () => {
      const formActions = createMockFormActions();

      const { result } = renderHook(() =>
        useOrderEditJsonImport({
          formActions: formActions as any,
        })
      );

      act(() => {
        result.current.handleCustomerRegistered({
          id: 'cli-99',
          fullName: 'Maria Silva',
          phone: '41988887777',
          marketingOrigin: 'instagram',
        });
      });

      expect(formActions.setCustomerData).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cli-99',
          fullName: 'Maria Silva',
          phone: '41988887777',
        })
      );
      expect(formActions.setMarketingOrigin).toHaveBeenCalledWith('instagram');
      expect(result.current.isCustomerRegistrationOpen).toBe(false);
    });
  });

  describe('useOrderEditActions', () => {
    it('handleSaveReconciliation bloqueia quando há produto temporário sem produto cadastrado selecionado', async () => {
      const formActions = createMockFormActions();
      const saveWithFiscalAudit = vi.fn();
      const onClose = vi.fn();
      const onSaveSuccess = vi.fn();
      const setPendingUpdate = vi.fn();

      const orderWithTempItem: Order = {
        ...mockOrder,
        items: [
          {
            orderItemId: 'temp-item-1',
            productId: '',
            isTemporaryProduct: true,
            description: 'Item sem cadastro',
            quantity: 1,
            unitPrice: 100,
          },
        ],
      };

      const formState = {
        items: [
          {
            orderItemId: 'temp-item-1',
            productId: '', // ainda sem produto selecionado
            description: 'Item sem cadastro',
          },
        ],
        currentOrder: orderWithTempItem,
        currentStep: 1,
        errors: {},
        isSaving: false,
      };

      const { result } = renderHook(() =>
        useOrderEditActions({
          effectiveOrder: orderWithTempItem,
          formState: formState as any,
          formActions: formActions as any,
          saveWithFiscalAudit,
          setPendingUpdate,
          onSaveSuccess,
          onClose,
        })
      );

      await act(async () => {
        await result.current.handleSaveReconciliation();
      });

      expect(saveWithFiscalAudit).not.toHaveBeenCalled();
    });

    it('handleFinalize conclui o pedido e chama onSaveSuccess e onClose', async () => {
      const formActions = createMockFormActions();
      const saveWithFiscalAudit = vi.fn();
      const onClose = vi.fn();
      const onSaveSuccess = vi.fn();
      const setPendingUpdate = vi.fn();

      const formState = {
        items: mockOrder.items,
        currentOrder: mockOrder,
        currentStep: 1,
        errors: {},
        isSaving: false,
      };

      const { result } = renderHook(() =>
        useOrderEditActions({
          effectiveOrder: mockOrder,
          formState: formState as any,
          formActions: formActions as any,
          saveWithFiscalAudit,
          setPendingUpdate,
          onSaveSuccess,
          onClose,
        })
      );

      await act(async () => {
        const finalizeResult = await result.current.handleFinalize();
        expect(finalizeResult).toBe('ord-test-1');
      });

      expect(onSaveSuccess).toHaveBeenCalledWith('ord-test-1', expect.objectContaining({ id: 'ord-test-1' }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('buildUpdatedOrder', () => {
    it('constrói payload do pedido com id preservado e itens atualizados', () => {
      const formState = {
        items: mockOrder.items,
        shipping: {
          deliveryMethod: 'delivery',
          scheduling: { date: '2026-10-25' },
        },
        currentOrder: mockOrder,
      };

      const updated = buildUpdatedOrder({
        effectiveOrder: mockOrder,
        formState: formState as any,
      });

      expect(updated.id).toBe('ord-test-1');
      expect(updated.items).toBe(mockOrder.items);
      expect(updated.shipping.scheduling?.date).toBe('2026-10-25');
    });
  });
});
