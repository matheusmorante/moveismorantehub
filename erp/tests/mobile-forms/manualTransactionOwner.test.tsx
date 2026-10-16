import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ alert: vi.fn(), create: vi.fn(), update: vi.fn(), limit: vi.fn() }));
vi.mock('react-native', () => ({ Alert: { alert: mocks.alert } }));
vi.mock('../../../mobile/src/services/mobileFinanceService', () => ({ createFinancialTransaction: mocks.create, updateFinancialTransaction: mocks.update }));
vi.mock('../../../mobile/src/services/supabaseClient', () => ({ supabase: { from: () => ({ select: () => ({ limit: mocks.limit }) }) } }));
vi.mock('../../../mobile/src/services/financial/mobileCategoryService', () => ({ sortCategoriesWithOthersAtEnd: (items: unknown) => items }));
import { useTransactionForm } from '../../../mobile/src/features/finance/hooks/useTransactionForm';

const categories = [{ id: 'category', name: 'Combustível', type: 'expense' as const, result_nature: 'DESPESA' as const }];
const base = { visible: true, categories, userName: ' Operador ', onSuccess: vi.fn(), onClose: vi.fn() };
const fill = (form: ReturnType<typeof useTransactionForm>) => {
  form.handleTypeChange('expense'); form.setAmount(20.5); form.setDescription('  Gasolina  ');
  form.setSelectedCatId('category'); form.setPaymentMethod('  PIX  '); form.setVehicleId('  Strada  ');
};
beforeEach(() => { vi.clearAllMocks(); mocks.limit.mockResolvedValue({ data: [] }); mocks.create.mockResolvedValue({ success: true, data: { id: 'new' } }); mocks.update.mockResolvedValue({ success: true }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('proprietário do lançamento manual móvel', () => {
  it('aguarda atualização do proprietário e impede fechar até concluir sem repetir criação', async () => {
    let release!: () => void;
    const owner = { ...base, onSuccess: vi.fn(() => new Promise<void>((resolve) => { release = resolve; })) };
    const { result } = renderHook(() => useTransactionForm(owner)); act(() => fill(result.current)); let operation!: Promise<unknown>;
    await act(async () => { operation = result.current.handleSave(); });
    act(() => result.current.handleClose());
    expect(base.onClose).not.toHaveBeenCalled(); expect(result.current.saving).toBe(true);
    await act(async () => { release(); await operation; });
    expect(base.onClose).toHaveBeenCalledOnce(); expect(mocks.create).toHaveBeenCalledOnce();
  });
  it('valida todos os campos e entrega payload parseado antes de confirmar criação', async () => {
    const { result } = renderHook(() => useTransactionForm(base));
    act(() => fill(result.current)); await act(async () => { await result.current.handleSave(); });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 20.5, description: 'Gasolina', payment_method: 'PIX', vehicle_id: 'Strada', category_id: 'category', created_by: 'Operador', purpose: 'BUSINESS' }));
    expect(base.onSuccess).toHaveBeenCalledOnce(); expect(base.onClose).toHaveBeenCalledOnce();
  });
  it('bloqueia categoria ausente e dados financeiros inválidos antes do serviço', async () => {
    const { result } = renderHook(() => useTransactionForm(base));
    act(() => { fill(result.current); result.current.setSelectedCatId(''); });
    await act(async () => { await result.current.handleSave(); });
    expect(mocks.create).not.toHaveBeenCalled(); expect(result.current.fieldErrors.category).toBe(true); expect(mocks.alert).toHaveBeenCalled();
    act(() => { result.current.setSelectedCatId('category'); result.current.setAmount(0.001); });
    await act(async () => { await result.current.handleSave(); }); expect(mocks.create).not.toHaveBeenCalled();
  });
  it('mantém uma única operação desde a validação até o recibo', async () => {
    let finish!: (value: unknown) => void; mocks.create.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useTransactionForm(base)); act(() => fill(result.current));
    let first!: Promise<unknown>;
    await act(async () => { first = result.current.handleSave(); void result.current.handleSave(); });
    expect(result.current.saving).toBe(true); await act(async () => { await result.current.handleSave(); }); expect(mocks.create).toHaveBeenCalledOnce();
    await act(async () => { finish({ success: true, data: { id: 'new' } }); await first; });
    expect(base.onSuccess).toHaveBeenCalledOnce(); expect(result.current.saving).toBe(false);
  });
  it('preserva o rascunho e libera nova tentativa após falha confirmada', async () => {
    mocks.create.mockResolvedValueOnce({ success: false, error: 'Sem permissão' });
    const { result } = renderHook(() => useTransactionForm(base)); act(() => fill(result.current));
    await act(async () => { await result.current.handleSave(); });
    expect(result.current.description).toBe('  Gasolina  '); expect(result.current.saving).toBe(false); expect(base.onClose).not.toHaveBeenCalled(); expect(mocks.alert).toHaveBeenCalledWith('Erro ao criar', 'Sem permissão');
    await act(async () => { await result.current.handleSave(); }); expect(mocks.create).toHaveBeenCalledTimes(2); expect(base.onClose).toHaveBeenCalledOnce();
  });
  it('não confirma criação sem recibo nem permite duplicá-la', async () => {
    mocks.create.mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useTransactionForm(base)); act(() => fill(result.current));
    await act(async () => { await result.current.handleSave(); await result.current.handleSave(); });
    expect(mocks.create).toHaveBeenCalledOnce(); expect(base.onClose).not.toHaveBeenCalled(); expect(mocks.alert).toHaveBeenCalledWith('Registro não confirmado', expect.stringMatching(/confira/i));
  });
  it('limita espera, preserva relato e bloqueia reenvio inclusive após resposta tardia', async () => {
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    let finish!: (value: unknown) => void; mocks.create.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useTransactionForm(base)); act(() => fill(result.current));
    let first!: Promise<unknown>; await act(async () => { first = result.current.handleSave(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20_001); await first; });
    expect(result.current.saving).toBe(false); expect(result.current.description).toBe('  Gasolina  '); expect(base.onClose).not.toHaveBeenCalled();
    await act(async () => { finish({ success: true, data: { id: 'new' } }); await result.current.handleSave(); });
    expect(mocks.create).toHaveBeenCalledOnce(); expect(base.onSuccess).not.toHaveBeenCalled();
  });
  it('ignora recibo de outro contexto sem apagar os campos do novo lançamento', async () => {
    let finish!: (value: unknown) => void; mocks.create.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result, rerender } = renderHook((props) => useTransactionForm(props), { initialProps: base }); act(() => fill(result.current));
    let first!: Promise<unknown>; await act(async () => { first = result.current.handleSave(); });
    rerender({ ...base, visible: false }); rerender(base); act(() => result.current.setDescription('Novo lançamento'));
    await act(async () => { finish({ success: true, data: { id: 'new' } }); await first; });
    expect(result.current.description).toBe('Novo lançamento'); expect(base.onClose).not.toHaveBeenCalled(); expect(base.onSuccess).not.toHaveBeenCalled();
  });
  it('preserva edição quando apenas a lista de categorias é atualizada', () => {
    const { result, rerender } = renderHook((props) => useTransactionForm(props), { initialProps: base }); act(() => fill(result.current));
    rerender({ ...base, categories: [...categories] }); expect(result.current.description).toBe('  Gasolina  '); expect(result.current.amount).toBe(20.5);
  });
  it('respeita edição e finalidade pessoal sem transformar em criação', async () => {
    const transaction = { id: 'existing', type: 'expense' as const, purpose: 'PERSONAL_PARTNER', amount: 30, date: '2026-10-16', description: ' Retirada ', payment_method: ' PIX ' } as any;
    const { result } = renderHook(() => useTransactionForm({ ...base, transaction }));
    await act(async () => { await result.current.handleSave(); });
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.update).toHaveBeenCalledWith('existing', expect.objectContaining({ purpose: 'PERSONAL_PARTNER', category_id: null, category_name: 'Pró-labore', description: 'Retirada', payment_method: 'PIX' })); expect(base.onClose).toHaveBeenCalledOnce();
  });
  it('libera indicador e informa resultado incerto quando o transporte rejeita', async () => {
    mocks.create.mockRejectedValueOnce(new Error('Conexão interrompida'));
    const { result } = renderHook(() => useTransactionForm(base)); act(() => fill(result.current));
    await act(async () => { await result.current.handleSave(); });
    expect(result.current.saving).toBe(false); expect(result.current.description).toBe('  Gasolina  '); expect(base.onClose).not.toHaveBeenCalled(); expect(mocks.alert).toHaveBeenCalledWith('Registro não confirmado', expect.stringMatching(/confira/i));
  });
  it('mantém categoria virtual de entrada e natureza financeira no payload parseado', async () => {
    const { result } = renderHook(() => useTransactionForm(base));
    act(() => {
      result.current.handleTypeChange('income'); result.current.setAmount(100); result.current.setDescription(' Entrada ');
      result.current.setPaymentMethod(' Dinheiro '); result.current.setSelectedCatId('cat_income_loan_default');
    });
    await act(async () => { await result.current.handleSave(); });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'income', description: 'Entrada', payment_method: 'Dinheiro', category_id: null, category_name: 'Empréstimos', result_nature: 'NAO_AFETA_RESULTADO', purpose: null }));
  });
  it('não chama serviço quando o contexto sai antes de concluir a validação', async () => {
    const { result, rerender } = renderHook((props) => useTransactionForm(props), { initialProps: base }); act(() => fill(result.current));
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.handleSave(); rerender({ ...base, visible: false }); });
    await act(async () => { await pending; }); expect(mocks.create).not.toHaveBeenCalled(); expect(base.onSuccess).not.toHaveBeenCalled();
  });
  it('não aplica recibo nem callbacks depois de desmontar o proprietário', async () => {
    let finish!: (value: unknown) => void; mocks.create.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result, unmount } = renderHook(() => useTransactionForm(base)); act(() => fill(result.current));
    let pending!: Promise<unknown>; await act(async () => { pending = result.current.handleSave(); }); unmount();
    await act(async () => { finish({ success: true, data: { id: 'new' } }); await pending; });
    expect(base.onSuccess).not.toHaveBeenCalled(); expect(base.onClose).not.toHaveBeenCalled();
  });
  it('mantém os dados da edição e erro do serviço sem fechar ou criar registro', async () => {
    mocks.update.mockResolvedValueOnce({ success: false, error: 'Edição recusada' });
    const transaction = { id: 'existing', type: 'expense' as const, category_id: 'category', amount: 30, date: '2026-10-16', description: 'Gasolina', payment_method: 'PIX' } as any;
    const { result } = renderHook(() => useTransactionForm({ ...base, transaction }));
    await act(async () => { await result.current.handleSave(); });
    expect(mocks.create).not.toHaveBeenCalled(); expect(result.current.amount).toBe(30); expect(result.current.saving).toBe(false); expect(base.onClose).not.toHaveBeenCalled();
    expect(mocks.alert).toHaveBeenCalledWith('Erro ao editar', 'Edição recusada');
  });
});
