// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Order from '@/pages/types/order.type';
const mocks = vi.hoisted(() => ({ save: vi.fn(), ensure: vi.fn(), generate: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock('@/pages/utils/orderHistoryService', async () => ({
  saveOrder: mocks.save,
  ...await import('@/pages/utils/orderSchedulingStatus'),
}));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({ requiredFields: {} }) }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('./useOrderDistanceCalculator', () => ({ useOrderDistanceCalculator: () => ({ isCalculatingDistance: false, handleAutoCalculateDistance: vi.fn() }) }));
vi.mock('./useOrderProductSelection', () => ({ useOrderProductSelection: () => ({ handleSelectProduct: vi.fn(), handleItemChange: vi.fn() }) }));
vi.mock('@/pages/utils/orderCode', () => ({ getOrderIndex: (order: any) => order?.orderIndex || null }));
vi.mock('./useOrderCodeGenerator', () => ({ useOrderCodeGenerator: (_id: unknown, latest: any) => {
  const [orderIndex, setOrderIndex] = React.useState<number | null>(1201);
  return { orderIndex, setOrderIndex, isGeneratingCode: false, generateCodeForCopyOrNew: mocks.generate,
    ensureOrderCode: async () => { const code = await mocks.ensure(); if (code) latest.current.orderIndex = code; return code; },
  };
} }));
import { useSalesOrderForm } from './useSalesOrderForm';

const valid = () => ({
  orderType: 'sale', status: 'draft', date: '2026-10-15T12:00:00.000Z', seller: 'Atendente',
  customerData: { fullName: 'Cliente', phone: '', noPhone: true, fullAddress: { street: '', cep: '' } },
  items: [{ productId: 'produto', description: 'Mesa', quantity: 1, unitPrice: 100, handlingType: 'Na caixa', condition: 'novo', fiscalSnapshot: { historical: true } }],
  payments: [{ method: 'Dinheiro', status: 'Pago', amount: 100 }],
  shipping: { value: 0, deliveryMethod: 'pickup', noAddress: true, scheduling: { date: '', notInformed: true, immediatePickup: true } },
  observation: 'Observação preservada',
} as unknown as Order);
type Owner = ReturnType<typeof useSalesOrderForm>;
const fill = (owner: Owner) => {
  const order = valid();
  owner.actions.setItems(order.items); owner.actions.setCustomerData(order.customerData);
  owner.actions.setShipping(order.shipping); owner.actions.setPayments(order.payments); owner.actions.setSeller(order.seller);
  owner.actions.setSellerId('atendente-id'); owner.actions.setObservation(order.observation!);
};
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue('pedido-id'); mocks.ensure.mockResolvedValue(1201); mocks.generate.mockResolvedValue(1202); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('proprietário do pedido, rascunho e finalização', () => {
  it('salva rascunho manual incompleto com o mesmo contrato básico do autosave', async () => {
    const { result } = renderHook(() => useSalesOrderForm());
    let saved: unknown; await act(async () => { saved = await result.current.actions.handleSaveOrder(); });
    expect(saved).toBe('pedido-id'); expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft', seller: '', customerData: expect.objectContaining({ fullName: '' }) }));
    expect(result.current.state.currentOrderId).toBe('pedido-id'); expect(result.current.state.isSaving).toBe(false);
  });

  it('bloqueia finalização incompleta antes da reserva ou persistência e apresenta o motivo', async () => {
    const { result } = renderHook(() => useSalesOrderForm());
    let saved: unknown; await act(async () => { saved = await result.current.actions.handleCompleteOrder(); });
    expect(saved).toBe(false); expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.ensure).not.toHaveBeenCalled();
    expect(result.current.state.errors.seller).toBeTruthy(); expect(mocks.error).toHaveBeenCalledWith(expect.any(String));
  });

  it('usa valores parseados na conclusão e preserva informações e snapshots dos campos filhos', async () => {
    const { result } = renderHook(() => useSalesOrderForm()); act(() => { fill(result.current); });
    let saved: any; await act(async () => { saved = await result.current.actions.handleCompleteOrder(); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'fulfilled', orderIndex: 1201, sellerId: 'atendente-id', observation: 'Observação preservada',
      items: [expect.objectContaining({ unitDiscount: 0, discountType: 'fixed', condition: 'novo', fiscalSnapshot: { historical: true } })],
      payments: [expect.objectContaining({ fee: 0, feeType: 'fixed', amount: 100 })],
    }));
    expect(saved).toMatchObject({ id: 'pedido-id', status: 'fulfilled', orderNumber: 1201 }); expect(result.current.state.status).toBe('fulfilled');
  });

  it('mantém o snapshot validado durante reserva lenta, sem misturar edições posteriores', async () => {
    let finish!: (code: number) => void; mocks.ensure.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useSalesOrderForm()); act(() => { fill(result.current); });
    let pending!: Promise<unknown>; await act(async () => { pending = result.current.actions.handleCompleteOrder(); });
    expect(mocks.ensure).toHaveBeenCalledTimes(1); act(() => { result.current.actions.setObservation('Edição posterior'); });
    await act(async () => { finish(1201); await pending; });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ observation: 'Observação preservada' }));
  });

  it.each(['draft', 'complete'] as const)('bloqueia número inválido em %s com erro na chave usada pelo campo filho', async (intent) => {
    const { result } = renderHook(() => useSalesOrderForm()); act(() => { fill(result.current); result.current.actions.setItems([{ ...valid().items[0], quantity: -1 }]); });
    await act(async () => { await (intent === 'draft' ? result.current.actions.handleSaveOrder() : result.current.actions.handleCompleteOrder()); });
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.ensure).not.toHaveBeenCalled(); expect(result.current.state.errors.item_0_quantity).toBeTruthy();
  });

  it('segura salvar e concluir simultâneos até terminar a persistência, preservando edição após erro', async () => {
    let finish!: (value: string) => void; mocks.save.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useSalesOrderForm()); act(() => { fill(result.current); });
    let pending!: Promise<unknown>; await act(async () => { pending = result.current.actions.handleSaveOrder(); await result.current.actions.handleCompleteOrder(); });
    expect(mocks.save).toHaveBeenCalledTimes(1); expect(result.current.state.isSaving).toBe(true);
    await act(async () => { await result.current.actions.handleSaveOrder(); finish('rascunho-id'); await pending; });
    await act(async () => { await result.current.actions.handleCompleteOrder(); });
    expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'rascunho-id', status: 'fulfilled' }));
  });

  it('preserva os campos e libera a ação após falha do serviço, sem reenvio automático', async () => {
    mocks.save.mockRejectedValueOnce(new Error('Não salvou')); const { result } = renderHook(() => useSalesOrderForm()); act(() => { fill(result.current); });
    await act(async () => { await result.current.actions.handleCompleteOrder(); });
    expect(mocks.error).toHaveBeenCalledWith('Não salvou'); expect(mocks.save).toHaveBeenCalledTimes(1); expect(result.current.state.observation).toBe('Observação preservada'); expect(result.current.state.isSaving).toBe(false);
    await act(async () => { await result.current.actions.handleCompleteOrder(); }); expect(mocks.save).toHaveBeenCalledTimes(2);
  });

  it('não rebaixa um pedido já cadastrado para rascunho nem ignora os requisitos da edição', async () => {
    const { result } = renderHook(() => useSalesOrderForm()); act(() => { result.current.actions.loadOrderForEditing({ ...valid(), id: 'existente', orderIndex: 1201, status: 'scheduled' }); result.current.actions.setSeller(''); });
    await act(async () => { await result.current.actions.handleSaveOrder(); }); expect(mocks.save).not.toHaveBeenCalled();
    act(() => { result.current.actions.setSeller('Atendente'); }); await act(async () => { await result.current.actions.handleSaveOrder(); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'existente', status: 'scheduled' }));
  });

  it('finaliza orçamento como quoted preservando a dispensa de pagamento', async () => {
    const { result } = renderHook(() => useSalesOrderForm('pickup', 'budget')); act(() => { fill(result.current); result.current.actions.setPayments([]); });
    await act(async () => { await result.current.actions.handleCompleteOrder(); }); expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ orderType: 'budget', status: 'quoted', payments: [] }));
  });

  it('reabre artefato de teste persistido sem código comercial e mantém sua identidade ao concluir', async () => {
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => { result.current.actions.loadOrderForEditing({ ...valid(), id: 'teste-id', is_test: true, testArtifact: { runId: 'execucao' } as any }); });
    expect(result.current.state.currentOrderId).toBe('teste-id'); expect(mocks.generate).not.toHaveBeenCalled();
    let saved: any; await act(async () => { saved = await result.current.actions.handleCompleteOrder(); });
    expect(mocks.ensure).not.toHaveBeenCalled(); expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'teste-id', is_test: true, orderIndex: undefined, orderNumber: undefined }));
    expect(saved).toMatchObject({ id: 'pedido-id', orderIndex: undefined, orderNumber: undefined });
  });

  it('aguarda o autosave real, reutiliza seu ID e impede que um rascunho posterior reverta a conclusão', async () => {
    vi.useFakeTimers(); let finish!: (value: string) => void; mocks.save.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useSalesOrderForm()); act(() => { fill(result.current); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); }); expect(result.current.state.draftAutoSaveStatus).toBe('saving');
    let pending!: Promise<unknown>; await act(async () => { pending = result.current.actions.handleCompleteOrder(); }); expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => { finish('rascunho-id'); await pending; }); expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'rascunho-id', status: 'fulfilled' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); }); expect(mocks.save).toHaveBeenCalledTimes(2);
  });
});
