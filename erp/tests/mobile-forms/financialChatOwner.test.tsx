import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ alert: vi.fn(), send: vi.fn(), confirm: vi.fn(), create: vi.fn() }));
vi.mock('react-native', () => ({ Alert: { alert: mocks.alert }, ScrollView: 'div' }));
vi.mock('../../../mobile/src/services/mobileFinanceService', () => ({ confirmFinancialDraft: mocks.confirm, createFinancialTransaction: mocks.create }));
vi.mock('../../../mobile/src/services/financialAiAssistantService', () => ({ extractLocalSemanticDelta: vi.fn(), PRE_ANALYSIS_DEBOUNCE_MS: 100, MAX_VOICE_INACTIVITY_MS: 1000 }));
vi.mock('../../../mobile/src/services/aiAgent/mobileAgentService', () => ({ MobileAgentService: { sendMessage: mocks.send } }));
vi.mock('../../../mobile/src/services/geminiLiveService', () => ({ GeminiLiveSession: class {} }));
vi.mock('../../../mobile/src/services/voiceRecorderService', () => ({ startVoiceRecording: vi.fn(), stopVoiceRecording: vi.fn() }));
import { useFinancialAiChat } from '../../../mobile/src/features/finance/hooks/useFinancialAiChat';

const valid = { description: '  Compra  ', totalAmount: 100, type: 'expense' as const, paymentMethod: ' PIX ', businessPurpose: 'BUSINESS' as const };
const response = { result: { answer: 'Rascunho pronto', executedTools: [] }, updatedHistory: [] };
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>((done) => { resolve = done; }); return { promise, resolve }; };
beforeEach(() => { vi.resetAllMocks(); mocks.send.mockResolvedValue(response); mocks.confirm.mockResolvedValue({ success: true, recordId: 'saved' }); mocks.create.mockResolvedValue({ success: true, data: { id: 'saved' } }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('financial chat submission boundaries', () => {
  it('validates empty input and keeps message until confirmed analysis', async () => {
    const pending = deferred(); mocks.send.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { await result.current.handleSendMessage('  '); }); expect(mocks.send).not.toHaveBeenCalled();
    act(() => result.current.setInputText('  Compra  ')); let operation!: Promise<unknown>;
    await act(async () => { operation = result.current.handleSendMessage(); });
    expect(result.current.loading).toBe(true); expect(result.current.inputText).toBe('  Compra  ');
    expect(mocks.send).toHaveBeenCalledWith('Compra', []);
    await act(async () => { await result.current.handleSendMessage(); }); expect(mocks.send).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve(response); await operation; });
    expect(result.current.inputText).toBe(''); expect(result.current.messages).toHaveLength(2);
  });
  it('validates edited resend before changing the original branch and preserves failed edit', async () => {
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { await result.current.handleSendMessage('Primeira mensagem'); });
    const original = result.current.messages[0];
    act(() => { result.current.handleStartEditMessage(original); result.current.setEditText('  '); });
    await act(async () => { await result.current.handleSaveAndResend(original); }); expect(mocks.send).toHaveBeenCalledTimes(1);
    act(() => result.current.setEditText('  Nova mensagem  ')); mocks.send.mockRejectedValueOnce(new Error('Sem rede'));
    await act(async () => { await result.current.handleSaveAndResend(original); });
    expect(result.current.editText).toBe('  Nova mensagem  '); expect(result.current.messages[0].status).not.toBe('SUPERSEDED');
    await act(async () => { await result.current.handleSaveAndResend(original); });
    expect(mocks.send).toHaveBeenLastCalledWith('Nova mensagem', []); expect(result.current.messages[0].status).toBe('SUPERSEDED');
  });
  it('blocks incomplete confirmation before the service and sends parsed final values', async () => {
    const registered = vi.fn(); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: registered }));
    act(() => result.current.setPendingIntent({ ...valid, paymentMethod: '' }));
    await act(async () => { await result.current.handleConfirmRegister(); }); expect(mocks.confirm).not.toHaveBeenCalled();
    act(() => result.current.setPendingIntent(valid));
    await act(async () => { await result.current.handleConfirmRegister(); });
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ description: 'Compra', paymentMethod: 'PIX' }), expect.any(String), 'Operador');
    expect(registered).toHaveBeenCalledOnce(); expect(result.current.pendingIntent).toBeNull();
  });
  it('shares one guard across analysis and financial confirmation', async () => {
    const pending = deferred(); mocks.send.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    act(() => result.current.setPendingIntent(valid)); let operation!: Promise<unknown>;
    await act(async () => { operation = result.current.handleSendMessage('Compra'); });
    await act(async () => { await result.current.handleConfirmRegister(); }); expect(mocks.confirm).not.toHaveBeenCalled();
    await act(async () => { pending.resolve(response); await operation; });
  });
  it('preserves unconfirmed success without receipt and blocks replay', async () => {
    mocks.confirm.mockResolvedValue({ success: true }); const registered = vi.fn();
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: registered }));
    act(() => result.current.setPendingIntent(valid));
    await act(async () => { await result.current.handleConfirmRegister(); await result.current.handleConfirmRegister(); });
    expect(mocks.confirm).toHaveBeenCalledTimes(1); expect(registered).not.toHaveBeenCalled(); expect(result.current.pendingIntent).toBeTruthy();
    expect(mocks.alert).toHaveBeenCalledWith('Registro não confirmado', expect.any(String));
  });
  it('does not announce single transaction success when the service returns false', async () => {
    mocks.create.mockResolvedValue({ success: false, error: 'Recusado' }); const registered = vi.fn();
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: registered }));
    await act(async () => { await result.current.handleConfirmRegisterSingle(valid, 0); });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 100, description: 'Compra', payment_method: 'PIX', purpose: 'BUSINESS' }));
    expect(registered).not.toHaveBeenCalled(); expect(mocks.alert).toHaveBeenCalledWith('Erro ao Salvar', 'Recusado');
  });
  it('confirms each timeline record once with a distinct key and rejects replay from saved card', async () => {
    mocks.send.mockResolvedValue({ ...response, result: { ...response.result, executedTools: [{ name: 'criarMovimentacaoFinanceira', result: { success: true }, args: { tipo: 'expense', valor: 100, descricao: 'Compra', finalidade: 'BUSINESS', formaPagamento: 'PIX' } }] } });
    const registered = vi.fn();
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: registered }));
    await act(async () => { await result.current.handleSendMessage('Compra'); });
    const card = result.current.timelineCards[0];
    await act(async () => { await result.current.handleConfirmTimelineCard(card.id, card.intent); await result.current.handleConfirmTimelineCard(card.id, card.intent); });
    expect(mocks.confirm).toHaveBeenCalledTimes(1); expect(result.current.timelineCards[0].cardState).toBe('SAVED'); expect(registered).toHaveBeenCalledOnce();
  });
  it('bounds analysis and preserves the input for explicit retry', async () => {
    vi.useFakeTimers(); mocks.send.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    act(() => result.current.setInputText('Compra')); let operation!: Promise<unknown>;
    await act(async () => { operation = result.current.handleSendMessage(); await vi.advanceTimersByTimeAsync(45_001); await operation; });
    expect(result.current.loading).toBe(false); expect(result.current.inputText).toBe('Compra');
    expect(mocks.alert).toHaveBeenCalledWith('Erro ao consultar o assistente', expect.stringContaining('demorou demais'));
  });
  it('bounds uncertain writes and rejects a late response after clearing chat', async () => {
    vi.useFakeTimers(); const pending = deferred(); mocks.confirm.mockReturnValue(pending.promise); const registered = vi.fn();
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: registered }));
    act(() => result.current.setPendingIntent(valid)); let operation!: Promise<unknown>;
    await act(async () => { operation = result.current.handleConfirmRegister(); await vi.advanceTimersByTimeAsync(20_001); await operation; });
    expect(result.current.registering).toBe(false);
    await act(async () => { await result.current.handleConfirmRegister(); }); expect(mocks.confirm).toHaveBeenCalledTimes(1);
    act(() => result.current.handleClearChat());
    await act(async () => { pending.resolve({ success: true, recordId: 'late' }); }); expect(registered).not.toHaveBeenCalled();
  });
  it('ignores analysis from an earlier cleared chat without erasing the new draft', async () => {
    const pending = deferred(); mocks.send.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() })); let operation!: Promise<unknown>;
    await act(async () => { operation = result.current.handleSendMessage('Mensagem antiga'); });
    act(() => { result.current.handleClearChat(); result.current.setInputText('Nova mensagem'); });
    await act(async () => { pending.resolve(response); await operation; });
    expect(result.current.messages).toHaveLength(0); expect(result.current.inputText).toBe('Nova mensagem');
  });
  it('remembers a confirmed write from a cleared chat without replaying it or notifying the new owner', async () => {
    const pending = deferred(); mocks.create.mockReturnValue(pending.promise); const registered = vi.fn();
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: registered })); let operation!: Promise<unknown>;
    await act(async () => { operation = result.current.handleConfirmRegisterSingle(valid, 0); });
    act(() => result.current.handleClearChat());
    await act(async () => { pending.resolve({ success: true, data: { id: 'confirmed-old' } }); await operation; });
    await act(async () => { await result.current.handleConfirmRegisterSingle(valid, 0); });
    expect(mocks.create).toHaveBeenCalledTimes(1); expect(registered).not.toHaveBeenCalled();
  });
});
