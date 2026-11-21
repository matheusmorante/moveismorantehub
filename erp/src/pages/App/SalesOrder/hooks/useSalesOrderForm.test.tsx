// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Order from '@/pages/types/order.type';
import { assertValidMutationScheduling } from '@/pages/utils/orderMutation/orderUpdateSchema';
const mocks = vi.hoisted(() => ({ save: vi.fn(), update: vi.fn(), ensure: vi.fn(), generate: vi.fn(), route: vi.fn(), error: vi.fn(), success: vi.fn(), warn: vi.fn() }));
vi.mock('@/pages/utils/orderHistoryService', async () => ({
  saveOrder: mocks.save,
  updateOrder: mocks.update,
  ...await import('@/pages/utils/orderSchedulingStatus'),
}));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({ requiredFields: {} }) }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: mocks.success, warn: mocks.warn } }));
vi.mock('@/pages/utils/maps', () => ({ autoCalculateRouteDistance: mocks.route }));
vi.mock('@/pages/utils/shippingPricing', () => ({ calculateFreightByDistance: (distance: number) => distance * 10 }));
vi.mock('./useOrderProductSelection', () => ({ useOrderProductSelection: () => ({ handleSelectProduct: vi.fn(), handleItemChange: vi.fn() }) }));
vi.mock('../ShippingComponents/Agendamento', () => ({ default: () => null }));
vi.mock('../ShippingComponents/AppointmentHandling', () => ({ AppointmentHandling: () => null }));
vi.mock('@/pages/utils/orderCode', () => ({ getOrderIndex: (order: any) => order?.orderIndex || null }));
vi.mock('./useOrderCodeGenerator', () => ({ useOrderCodeGenerator: (_id: unknown, latest: any) => {
  const [orderIndex, setOrderIndex] = React.useState<number | null>(1201);
  return { orderIndex, setOrderIndex, isGeneratingCode: false, generateCodeForCopyOrNew: mocks.generate,
    ensureOrderCode: async () => { const code = await mocks.ensure(); if (code) latest.current.orderIndex = code; return code; },
  };
} }));
import { useSalesOrderForm } from './useSalesOrderForm';
import { OrderAppointments } from '../ShippingComponents/OrderAppointments';

const valid = () => ({
  orderType: 'sale', status: 'draft', date: '2026-10-15T12:00:00.000Z', seller: 'Atendente',
  customerData: { fullName: 'Cliente', phone: '', noPhone: true, fullAddress: { street: '', cep: '' } },
  items: [{ productId: 'produto', description: 'Mesa', quantity: 1, unitPrice: 100, handlingType: 'Na caixa', condition: 'novo', fiscalSnapshot: { historical: true } }],
  payments: [{ method: 'Dinheiro', status: 'Pago', amount: 100 }],
  shipping: { value: 0, deliveryMethod: 'pickup', noAddress: true, scheduling: { date: '', notInformed: true, immediatePickup: true } },
  observation: 'Observação preservada',
} as unknown as Order);
type Owner = ReturnType<typeof useSalesOrderForm>;
const creationOptions = { idempotencyKey: expect.any(String) };
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
    expect(saved).toBe('pedido-id'); expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft', seller: '', customerData: expect.objectContaining({ fullName: '' }) }), creationOptions);
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
    }), creationOptions);
    expect(saved).toMatchObject({ id: 'pedido-id', status: 'fulfilled', orderNumber: 1201 }); expect(result.current.state.status).toBe('fulfilled');
  });

  it.each(['', 'data inválida'])('não inventa a data atual ao concluir com data vazia ou inválida: %s', async (date) => {
    const { result } = renderHook(() => useSalesOrderForm()); act(() => { fill(result.current); result.current.actions.setOrderDate(date); });
    await act(async () => { await result.current.actions.handleCompleteOrder(); });
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.ensure).not.toHaveBeenCalled(); expect(result.current.state.errors.order_date).toBeTruthy();
  });

  it('permite rascunho com data não preenchida sem trocar pelo horário atual', async () => {
    const { result } = renderHook(() => useSalesOrderForm()); act(() => { result.current.actions.setOrderDate(''); });
    await act(async () => { await result.current.actions.handleSaveOrder(); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft', date: '' }), creationOptions);
  });

  it('preserva a data vazia ao reabrir o rascunho e continua impedindo a conclusão', async () => {
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => { result.current.actions.loadOrderForEditing({ ...valid(), id: 'rascunho-id', orderIndex: 1201, date: '' }); });
    expect(result.current.state.orderDate).toBe('');
    await act(async () => { await result.current.actions.handleCompleteOrder(); }); expect(mocks.save).not.toHaveBeenCalled();
  });

  it('mantém o snapshot validado durante reserva lenta, sem misturar edições posteriores', async () => {
    let finish!: (code: number) => void; mocks.ensure.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useSalesOrderForm()); act(() => { fill(result.current); });
    let pending!: Promise<unknown>; await act(async () => { pending = result.current.actions.handleCompleteOrder(); });
    expect(mocks.ensure).toHaveBeenCalledTimes(1); act(() => { result.current.actions.setObservation('Edição posterior'); });
    await act(async () => { finish(1201); await pending; });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ observation: 'Observação preservada' }), creationOptions);
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

  it.each([new Error('Não salvou'), { message: 'Não salvou' }])('preserva os campos e libera a ação após falha do serviço, sem reenvio automático: %s', async (failure) => {
    mocks.save.mockRejectedValueOnce(failure); const { result } = renderHook(() => useSalesOrderForm()); act(() => { fill(result.current); });
    await act(async () => { await result.current.actions.handleCompleteOrder(); });
    expect(mocks.error).toHaveBeenCalledWith('Não salvou'); expect(mocks.save).toHaveBeenCalledTimes(1); expect(result.current.state.observation).toBe('Observação preservada'); expect(result.current.state.isSaving).toBe(false);
    await act(async () => { await result.current.actions.handleCompleteOrder(); }); expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(mocks.save.mock.calls[1][1]).toEqual(mocks.save.mock.calls[0][1]);
  });

  it('não rebaixa um pedido já cadastrado para rascunho nem ignora os requisitos da edição', async () => {
    const { result } = renderHook(() => useSalesOrderForm()); act(() => { result.current.actions.loadOrderForEditing({ ...valid(), id: 'existente', orderIndex: 1201, status: 'scheduled' }); result.current.actions.setSeller(''); });
    await act(async () => { await result.current.actions.handleSaveOrder(); }); expect(mocks.save).not.toHaveBeenCalled();
    act(() => { result.current.actions.setSeller('Atendente'); }); await act(async () => { await result.current.actions.handleSaveOrder(); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'existente', status: 'scheduled' }));
  });

  it('finaliza orçamento como quoted preservando a dispensa de pagamento', async () => {
    const { result } = renderHook(() => useSalesOrderForm('pickup', 'budget')); act(() => { fill(result.current); result.current.actions.setPayments([]); });
    await act(async () => { await result.current.actions.handleCompleteOrder(); }); expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ orderType: 'budget', status: 'quoted', payments: [] }), creationOptions);
  });

  it('mantém entrega com agendamento pendente como scheduled, sem convertê-la em retirada concluída', async () => {
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => {
      fill(result.current);
      result.current.actions.setShipping({
        ...valid().shipping,
        deliveryMethod: 'delivery',
        distance: 1,
        callBeforeDelivery: false,
        bringCardMachine: false,
        callOnArrival: false,
        scheduling: { date: '', pendingScheduling: true },
      });
    });
    await act(async () => { await result.current.actions.handleCompleteOrder(); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'scheduled', shipping: expect.objectContaining({ deliveryMethod: 'delivery' }) }), creationOptions);
    expect(result.current.state.status).toBe('scheduled');
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
    await act(async () => {
      finish('rascunho-id');
      expect(await pending).toMatchObject({ id: 'rascunho-id', status: 'fulfilled' });
    });
    expect(mocks.update).toHaveBeenCalledWith('rascunho-id', { status: 'fulfilled' });
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(mocks.save).toHaveBeenCalledOnce();
  });

  it('conclui após um timeout confirmado do autosave, com a mesma identidade e sem novo clique', async () => {
    vi.useFakeTimers();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    let rejectDraft!: (reason: unknown) => void;
    mocks.save.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectDraft = reject; }));
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => fill(result.current));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

    let completion!: Promise<unknown>;
    await act(async () => { completion = result.current.actions.handleCompleteOrder(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(18_000); });
    expect(result.current.state.isSaving).toBe(true);
    expect(mocks.save).toHaveBeenCalledOnce();

    await act(async () => {
      rejectDraft({ code: '57014', message: 'canceling statement due to statement timeout' });
      expect(await completion).toMatchObject({ id: 'pedido-id', status: 'fulfilled' });
    });
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(mocks.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'fulfilled' }),
      mocks.save.mock.calls[0][1]
    );
    expect(mocks.error).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('reabre o rascunho sem gravá-lo e salva um segundo agendamento incompleto', async () => {
    vi.useFakeTimers();
    const order = valid();
    const item = { ...order.items[0], orderItemId: 'item-1' };
    const first = {
      id: 'principal', deliveryMethod: 'pickup' as const, itemIds: ['item-1'],
      itemQuantities: { 'item-1': 1 }, scheduling: order.shipping.scheduling,
    };
    const second = {
      id: 'segundo', itemIds: [], itemQuantities: {},
      scheduling: { date: '', time: '', type: 'fixed' as const },
    };
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => result.current.actions.loadOrderForEditing({
      ...order, id: 'rascunho-id', orderIndex: 1201, items: [item],
      shipping: { ...order.shipping, orderType: 'Na caixa', scheduling: { ...order.shipping.scheduling, appointments: [first] } },
    }));
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(mocks.save).not.toHaveBeenCalled();

    act(() => result.current.actions.setShipping((previous) => ({
      ...previous,
      scheduling: { ...previous.scheduling, appointments: [first, second] },
    })));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'rascunho-id', status: 'draft',
      shipping: expect.objectContaining({ scheduling: expect.objectContaining({
        appointments: [expect.objectContaining(first), expect.objectContaining(second)],
      }) }),
    }));
    expect(() => assertValidMutationScheduling(mocks.save.mock.calls[0][0])).not.toThrow();
  });

  it('salva o segundo agendamento criado pelo botão da logística em um rascunho reaberto', async () => {
    vi.useFakeTimers();
    const order = valid();
    const item = { ...order.items[0], orderItemId: 'item-1' };
    const first = {
      id: 'principal', deliveryMethod: 'pickup' as const, itemIds: ['item-1'],
      itemQuantities: { 'item-1': 1 }, scheduling: order.shipping.scheduling,
    };
    const existing = {
      ...order, id: 'rascunho-id', orderIndex: 1201, items: [item],
      shipping: { ...order.shipping, orderType: 'Na caixa', scheduling: { ...order.shipping.scheduling, appointments: [first] } },
    };
    const DraftHarness = () => {
      const form = useSalesOrderForm();
      React.useEffect(() => { form.actions.loadOrderForEditing(existing); }, []);
      if (!form.state.currentOrderId) return null;
      return <OrderAppointments shipping={form.state.shipping} setShipping={form.actions.setShipping}
        items={form.state.items} errors={{}} isNewSale={form.state.isNewSaleFlow} />;
    };
    render(<DraftHarness />);
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/ }));
    expect(screen.getAllByRole('button', { name: /Operação 2/ }).length).toBeGreaterThan(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'rascunho-id', status: 'draft',
      shipping: expect.objectContaining({ scheduling: expect.objectContaining({
        appointments: [expect.objectContaining({ id: 'principal' }), expect.objectContaining({ itemIds: [] })],
      }) }),
    }));
  });

  it.each([
    ['o identificador do vendedor', (owner: Owner) => owner.actions.setSellerId('vendedor-id'), { sellerId: 'vendedor-id' }],
    ['a opção de telefone', (owner: Owner) => owner.actions.setCustomerData((current) => ({ ...current, noPhone: true })), { customerData: expect.objectContaining({ noPhone: true }) }],
    ['a forma de pagamento', (owner: Owner) => owner.actions.setPayments((current) => [{ ...current[0], method: 'Pix' }]), { payments: [expect.objectContaining({ method: 'Pix' })] }],
    ['o endereço de entrega', (owner: Owner) => owner.actions.setShipping((current) => ({ ...current, noAddress: true })), { shipping: expect.objectContaining({ noAddress: true }) }],
  ])('salva automaticamente quando apenas %s muda', async (_label, change, expected) => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => change(result.current));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining(expected), expect.objectContaining({ idempotencyKey: expect.any(String) }));
  });

  it('salva a remoção do último campo preenchido de um rascunho existente', async () => {
    vi.useFakeTimers();
    const order = valid();
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => result.current.actions.loadOrderForEditing({
      ...order, id: 'rascunho-id', orderIndex: 1201, seller: '', observation: 'Anotação',
      items: [{ description: '', unitPrice: 0, unitDiscount: 0, discountType: 'fixed', handlingType: '', quantity: 1, orderItemId: 'item-1' }],
      customerData: { fullName: '', phone: '', fullAddress: { street: '', cep: '' } } as any,
      payments: [{ amount: 0 }] as any,
      shipping: { ...order.shipping, orderType: '', scheduling: { date: '', time: '', type: 'fixed' } },
    }));
    act(() => result.current.actions.setObservation(''));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'rascunho-id', observation: '' }));
  });

  it('mostra o campo inválido quando a validação impede o autosave', async () => {
    vi.useFakeTimers();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => result.current.actions.setItems([{ ...valid().items[0], quantity: -1 }]));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.save).not.toHaveBeenCalled();
    expect(result.current.state.draftAutoSaveStatus).toBe('error');
    expect(result.current.state.errors.item_0_quantity).toBeTruthy();
    error.mockRestore();
  });

  it('ao fechar, espera a gravação ativa e salva a alteração mais recente', async () => {
    vi.useFakeTimers();
    let finishFirst!: (id: string) => void;
    mocks.save.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }));
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => result.current.actions.setObservation('Primeira alteração'));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    act(() => result.current.actions.setObservation('Alteração antes de fechar'));
    let closing!: Promise<boolean>;
    await act(async () => { closing = result.current.actions.flushDraftAutoSave(); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => { finishFirst('rascunho-id'); expect(await closing).toBe(true); });
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({
      id: 'rascunho-id', observation: 'Alteração antes de fechar', status: 'draft',
    }));
  });

  it('ao fechar antes do debounce, grava a alteração pendente uma única vez', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => result.current.actions.setObservation('Fechamento imediato'));
    await act(async () => { expect(await result.current.actions.flushDraftAutoSave()).toBe(true); });
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.save.mock.calls[0][0]).toEqual(expect.objectContaining({
      status: 'draft', observation: 'Fechamento imediato',
    }));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(mocks.save).toHaveBeenCalledOnce();
  });

  it('retoma o autosave quando a conclusão é recusada pela validação', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => result.current.actions.setObservation('Informação do rascunho'));
    await act(async () => { expect(await result.current.actions.handleCompleteOrder()).toBe(false); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      status: 'draft', observation: 'Informação do rascunho',
    }), expect.objectContaining({ idempotencyKey: expect.any(String) }));
  });

  it('não fecha nem repete a gravação enquanto a resposta do salvamento está pendente', async () => {
    vi.useFakeTimers();
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.save.mockImplementationOnce(() => new Promise(() => {}));
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => result.current.actions.setObservation('Alteração pendente'));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    let closing!: Promise<boolean>;
    await act(async () => { closing = result.current.actions.flushDraftAutoSave(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(await closing).toBe(false);
    expect(result.current.state.draftAutoSaveStatus).toBe('error');
    expect(mocks.save).toHaveBeenCalledTimes(1);
    warning.mockRestore();
  });

  it('reusa a mesma identidade ao tentar salvar novamente uma criação sem confirmação', async () => {
    vi.useFakeTimers();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.save.mockRejectedValueOnce(new Error('Conexão interrompida'));
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => result.current.actions.setObservation('Rascunho'));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    const firstKey = mocks.save.mock.calls[0][1]?.idempotencyKey;
    expect(firstKey).toEqual(expect.any(String));
    await act(async () => { await result.current.actions.handleSaveOrder(); });
    expect(mocks.save.mock.calls[1][1]).toEqual({ idempotencyKey: firstKey });
    error.mockRestore();
  });

  it('não finaliza enquanto a criação automática falha e retoma o rascunho com a mesma identidade', async () => {
    vi.useFakeTimers();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail!: (reason: Error) => void;
    mocks.save.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => fill(result.current));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    const firstKey = mocks.save.mock.calls[0][1]?.idempotencyKey;
    let completion!: Promise<unknown>;
    await act(async () => { completion = result.current.actions.handleCompleteOrder(); });
    await act(async () => { fail(new Error('Resposta não confirmada')); expect(await completion).toBe(false); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(mocks.save.mock.calls[1][0]).toEqual(expect.objectContaining({ status: 'draft' }));
    expect(mocks.save.mock.calls[1][1]).toEqual({ idempotencyKey: firstKey });
    error.mockRestore();
  });

  it('salva alterações de um rascunho de teste reaberto sem código comercial', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => result.current.actions.loadOrderForEditing({
      ...valid(), id: 'teste-id', is_test: true, testArtifact: { runId: 'execucao' } as any,
      shipping: { ...valid().shipping, orderType: 'Na caixa' },
    }));
    act(() => result.current.actions.setObservation('Alteração do teste'));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'teste-id', is_test: true, orderIndex: undefined, observation: 'Alteração do teste',
    }));
  });

  it('mantém a identidade de um rascunho antigo que não tem código comercial', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => result.current.actions.loadOrderForEditing({
      ...valid(), id: 'rascunho-antigo', shipping: { ...valid().shipping, orderType: 'Na caixa' },
    }));
    expect(result.current.state.currentOrderId).toBe('rascunho-antigo');
    expect(mocks.generate).not.toHaveBeenCalled();
    act(() => result.current.actions.setObservation('Atualização do rascunho antigo'));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'rascunho-antigo', status: 'draft', observation: 'Atualização do rascunho antigo',
    }));
  });

  it('conserva o frete do pedido carregado quando o cálculo do pedido anterior termina depois', async () => {
    let finish!: (value: unknown) => void; mocks.route.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useSalesOrderForm()); act(() => { fill(result.current); }); let pending!: Promise<void>;
    await act(async () => { pending = result.current.actions.handleAutoCalculateDistance({ street: 'Rua A' }); });
    act(() => { result.current.actions.loadOrderForEditing({ ...valid(), id: 'pedido-B', orderIndex: 1301, shipping: { ...valid().shipping, value: 50, distance: 5 } }); });
    await act(async () => { finish({ distanceKm: 10, durationMinutes: 15, destinationCoords: [-49, -25], routeGeoJSON: null }); await pending; });
    expect(result.current.state.shipping.value).toBe(50); expect(result.current.state.shipping.distance).toBe(5); expect(result.current.state.currentOrderId).toBe('pedido-B');
  });
});

describe('vinculação de cliente e toggle de usar mesmo endereço (useCustomerAddress)', () => {
  const customerWithAddress = {
    id: 'cliente-com-endereco',
    fullName: 'Carlos Eduardo',
    phone: '41999998888',
    noPhone: false,
    noAddress: false,
    fullAddress: {
      street: 'Rua Marechal Deodoro',
      number: '500',
      neighborhood: 'Centro',
      city: 'Curitiba',
      cep: '80010-010',
      complement: '',
      observation: '',
    },
  };

  const customerWithoutAddress = {
    id: 'cliente-sem-endereco',
    fullName: 'Ana Beatriz',
    phone: '41988887777',
    noPhone: false,
    noAddress: true,
    fullAddress: {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      cep: '',
      complement: '',
      observation: '',
    },
  };

  it('liga automaticamente useCustomerAddress quando vincula cliente com endereço preenchido', () => {
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => {
      result.current.actions.setCustomerData(customerWithAddress);
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(true);
  });

  it.each(['novo pedido', 'troca de cliente'])('salva o endereço do cliente no snapshot de entrega durante %s', async (scenario) => {
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => {
      fill(result.current);
      result.current.actions.setShipping({
        ...valid().shipping,
        deliveryMethod: 'delivery',
        noAddress: true,
        useCustomerAddress: false,
      });
      if (scenario === 'troca de cliente') {
        result.current.actions.setCustomerData(customerWithoutAddress);
      }
      result.current.actions.setCustomerData(customerWithAddress);
    });

    expect(result.current.state.shipping.noAddress).toBe(false);
    expect(result.current.state.shipping.useCustomerAddress).toBe(true);

    await act(async () => {
      await result.current.actions.handleSaveOrder();
    });

    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        customerData: expect.objectContaining({
          id: customerWithAddress.id,
          fullAddress: expect.objectContaining({ street: 'Rua Marechal Deodoro' }),
        }),
        shipping: expect.objectContaining({
          deliveryMethod: 'delivery',
          useCustomerAddress: true,
          noAddress: false,
        }),
      }),
      creationOptions
    );
  });

  it('desliga automaticamente useCustomerAddress quando vincula cliente com endereço "Não informar" (noAddress: true)', () => {
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => {
      result.current.actions.setCustomerData(customerWithoutAddress);
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(false);
  });

  it('desliga automaticamente useCustomerAddress quando cliente tem flag legada fullAddress.noAddress: true', () => {
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => {
      result.current.actions.setCustomerData({
        ...customerWithoutAddress,
        noAddress: false,
        fullAddress: {
          ...customerWithoutAddress.fullAddress,
          noAddress: true,
        } as any,
      });
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(false);
  });

  it('desliga automaticamente useCustomerAddress quando cliente não tem noAddress marcado mas todos os campos de endereço estão vazios', () => {
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => {
      result.current.actions.setCustomerData({
        id: 'cliente-vazio',
        fullName: 'Cliente Vazio',
        phone: '41911112222',
        noPhone: false,
        noAddress: false,
        fullAddress: {
          street: '',
          number: '',
          neighborhood: '',
          city: '',
          cep: '',
          complement: '',
          observation: '',
        },
      });
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(false);
  });

  it('desliga automaticamente ao vincular Consumidor Final', () => {
    const { result } = renderHook(() => useSalesOrderForm());
    act(() => {
      result.current.actions.setCustomerData(customerWithAddress);
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(true);

    act(() => {
      result.current.actions.setCustomerData({
        fullName: 'Consumidor Final',
        phone: '',
        noPhone: true,
        noAddress: true,
        fullAddress: {
          street: '',
          number: '',
          neighborhood: '',
          city: '',
          cep: '',
          complement: '',
          observation: '',
        },
      });
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(false);
  });

  it('alterna automaticamente entre clientes com e sem endereço', () => {
    const { result } = renderHook(() => useSalesOrderForm());

    // 1. Vincula cliente com endereço -> Liga
    act(() => {
      result.current.actions.setCustomerData(customerWithAddress);
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(true);

    // 2. Troca para cliente sem endereço -> Desliga
    act(() => {
      result.current.actions.setCustomerData(customerWithoutAddress);
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(false);

    // 3. Volta para cliente com endereço -> Liga novamente
    act(() => {
      result.current.actions.setCustomerData(customerWithAddress);
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(true);
  });

  it('permite desligar manualmente e preserva o estado ao preencher outros campos da venda', () => {
    const { result } = renderHook(() => useSalesOrderForm());

    // Vincula cliente com endereço
    act(() => {
      result.current.actions.setCustomerData(customerWithAddress);
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(true);

    // Operador desliga manualmente o toggle
    act(() => {
      result.current.actions.setShipping((prev) => ({
        ...prev,
        useCustomerAddress: false,
      }));
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(false);

    // Operador preenche outros dados da venda
    act(() => {
      result.current.actions.setSeller('Vendedor Teste');
      result.current.actions.setObservation('Entrega em outro local');
      result.current.actions.setPayments([{ method: 'Pix', amount: 100, fee: 0, feeType: 'fixed', status: 'Pago' }]);
    });

    // O toggle manual do operador deve continuar desligado
    expect(result.current.state.shipping.useCustomerAddress).toBe(false);
  });

  it('permite ligar manualmente mesmo com cliente sem endereço e preserva', () => {
    const { result } = renderHook(() => useSalesOrderForm());

    // Vincula cliente sem endereço
    act(() => {
      result.current.actions.setCustomerData(customerWithoutAddress);
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(false);

    // Operador liga manualmente o toggle
    act(() => {
      result.current.actions.setShipping((prev) => ({
        ...prev,
        useCustomerAddress: true,
      }));
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(true);

    // Operador atualiza vendedor
    act(() => {
      result.current.actions.setSeller('Outro Vendedor');
    });

    // O toggle manual do operador deve continuar ligado
    expect(result.current.state.shipping.useCustomerAddress).toBe(true);
  });

  it('atualiza useCustomerAddress quando o cadastro do cliente vinculado é editado no modal', () => {
    const { result } = renderHook(() => useSalesOrderForm());

    // Vincula cliente com endereço
    act(() => {
      result.current.actions.setCustomerData(customerWithAddress);
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(true);

    // Cliente é editado via modal para marcar "Não Informar"
    act(() => {
      result.current.actions.setCustomerData((prev) => ({
        ...prev,
        noAddress: true,
      }));
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(false);

    // Cliente é editado novamente para desmarcar "Não Informar" e preencher endereço
    act(() => {
      result.current.actions.setCustomerData((prev) => ({
        ...prev,
        noAddress: false,
        fullAddress: {
          ...prev.fullAddress,
          street: 'Avenida Sete de Setembro',
          city: 'Curitiba',
        },
      }));
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(true);
  });

  it('preserva preferência explícita salva ao carregar pedido existente', () => {
    const { result } = renderHook(() => useSalesOrderForm());

    // Carrega pedido com useCustomerAddress explicitamente false
    act(() => {
      result.current.actions.loadOrderForEditing({
        ...valid(),
        customerData: customerWithAddress,
        shipping: {
          ...valid().shipping,
          useCustomerAddress: false,
        },
      });
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(false);

    // Carrega pedido com useCustomerAddress explicitamente true
    act(() => {
      result.current.actions.loadOrderForEditing({
        ...valid(),
        customerData: customerWithoutAddress,
        shipping: {
          ...valid().shipping,
          useCustomerAddress: true,
        },
      });
    });
    expect(result.current.state.shipping.useCustomerAddress).toBe(true);
  });
});

