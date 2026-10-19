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
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('financial chat submission boundaries', () => {
  it('copies the exact current message only after validating its identity and text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('navigator', { clipboard: { writeText } });
    mocks.send.mockResolvedValue({ ...response, result: { ...response.result, answer: '  Resposta com espaços  ' } });
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() })); await act(async () => { await result.current.handleSendMessage('Mensagem'); }); const message = result.current.messages[1];
    await act(async () => { await result.current.handleCopyMessage(message); }); expect(writeText).toHaveBeenCalledWith('  Resposta com espaços  '); expect(result.current.copiedMessageId).toBe(message.id);
    await act(async () => { await result.current.handleCopyMessage({ ...message, text: 'Texto diferente' }); }); expect(writeText).toHaveBeenCalledTimes(1);
  });
  it('rejects an unidentified message in the resolver before using the clipboard', async () => {
    const writeText = vi.fn(); vi.stubGlobal('navigator', { clipboard: { writeText } }); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { await result.current.handleCopyMessage({ id: '', text: 'Texto' } as any); }); expect(writeText).not.toHaveBeenCalled(); expect(mocks.alert).toHaveBeenCalledWith('Não foi possível copiar', expect.stringContaining('identificada'));
  });
  it('bounds clipboard work and does not show copied state after a late response', async () => {
    vi.useFakeTimers(); const copy = deferred(); const writeText = vi.fn(() => copy.promise); vi.stubGlobal('navigator', { clipboard: { writeText } }); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() })); await act(async () => { await result.current.handleSendMessage('Mensagem'); }); let operation!: Promise<unknown>;
    await act(async () => { operation = result.current.handleCopyMessage(result.current.messages[0]); }); await act(async () => { vi.advanceTimersByTime(5000); await operation; }); expect(result.current.copiedMessageId).toBeNull(); expect(mocks.alert).toHaveBeenCalledWith('Não foi possível copiar', expect.stringContaining('prazo'));
    await act(async () => { copy.resolve(undefined); }); expect(result.current.copiedMessageId).toBeNull();
  });
  it('serializes repeated clear commands and preserves a newly typed draft', async () => {
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() })); await act(async () => { await result.current.handleSendMessage('Mensagem'); });
    await act(async () => { const first = result.current.handleClearChat(); const second = result.current.handleClearChat(); result.current.setInputText('Novo rascunho'); await Promise.all([first, second]); });
    expect(result.current.messages).toHaveLength(0); expect(result.current.inputText).toBe('Novo rascunho'); expect(result.current.utilityBusy).toBe(false);
  });
  it('awaits refresh of a retained single confirmation without replaying a saved write', async () => {
    const refresh = deferred(); const registered = vi.fn(() => refresh.promise); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: registered })); let operation!: Promise<unknown>;
    await act(async () => { operation = result.current.handleConfirmRegisterSingle(valid, 0); }); expect(result.current.registering).toBe(true);
    await act(async () => { await result.current.handleConfirmRegisterSingle(valid, 0); }); expect(mocks.create).toHaveBeenCalledTimes(1);
    await act(async () => { refresh.resolve(undefined); await operation; }); expect(result.current.registering).toBe(false);
    await act(async () => { await result.current.handleConfirmRegisterSingle(valid, 0); }); expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it('selects a candidate only for its timeline card and preserves the rest of the batch', async () => {
    const candidate = { id: 'account-1', amount: 35, counterparty: 'Fornecedor', due_date: '2026-10-18' };
    const first = { ...valid, intentType: 'MATCH_EXISTING' as const, candidateAccounts: [candidate], isReadyForConfirmation: false };
    const second = { ...valid, description: 'Segunda' };
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    act(() => { result.current.publishTimelineCard({ ...first, batchDraftsList: [first, second] }, 'NEEDS_INPUT', 'message-1'); });
    const id = result.current.timelineCards[0].id;
    await act(async () => { await result.current.handleSelectTimelineCandidate(id, candidate); });
    const card = result.current.timelineCards[0];
    expect(card.intent.batchDraftsList).toHaveLength(2); expect(card.intent.batchDraftsList?.[0]).toMatchObject({ matchedAccount: candidate, amount: 35 }); expect(card.intent.batchDraftsList?.[1]).toEqual(second);
    expect(card.cardState).toBe('READY_TO_CONFIRM'); expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('rejects an injected candidate before changing the owner', async () => {
    const candidate = { id: 'account-1', amount: 35, description: 'Conta' };
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    act(() => { result.current.publishTimelineCard({ ...valid, candidateAccounts: [candidate] }, 'NEEDS_INPUT', 'message-1'); });
    const original = result.current.timelineCards[0];
    await act(async () => { await result.current.handleSelectTimelineCandidate(original.id, { ...candidate, amount: 500 }); });
    expect(result.current.timelineCards[0]).toEqual(original); expect(mocks.alert).toHaveBeenCalledWith('Revise a conta selecionada', expect.any(String));
  });

  it('requires an existing account before calling confirmation for a matching intent', async () => {
    const intent = { ...valid, intentType: 'MATCH_EXISTING' as const }; const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    act(() => { result.current.publishTimelineCard(intent, 'READY_TO_CONFIRM', 'message-1'); }); const card = result.current.timelineCards[0];
    await act(async () => { await result.current.handleConfirmTimelineCard(card.id, intent); });
    expect(mocks.confirm).not.toHaveBeenCalled(); expect(mocks.alert).toHaveBeenCalledWith('Revise a movimentação', expect.stringContaining('conta existente'));
  });

  it('does not select a candidate while another submission is pending', async () => {
    const read = deferred(); mocks.send.mockReturnValue(read.promise); const candidate = { id: 'account-1', amount: 35, description: 'Conta' };
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() })); act(() => { result.current.publishTimelineCard({ ...valid, candidateAccounts: [candidate] }, 'NEEDS_INPUT', 'message-1'); }); const card = result.current.timelineCards[0];
    let operation!: Promise<unknown>; await act(async () => { operation = result.current.handleSendMessage('Outra mensagem'); });
    await act(async () => { await result.current.handleSelectTimelineCandidate(card.id, candidate); }); expect(result.current.timelineCards[0]).toEqual(card);
    await act(async () => { read.resolve(response); await operation; });
  });

  it('does not change a saved card or another card when choosing a candidate', async () => {
    const candidate = { id: 'account-1', amount: 35, description: 'Conta' }; const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    act(() => { result.current.publishTimelineCard({ ...valid, candidateAccounts: [candidate] }, 'SAVED', 'message-1'); result.current.publishTimelineCard({ ...valid, candidateAccounts: [candidate] }, 'NEEDS_INPUT', 'message-1'); });
    const [saved, editable] = result.current.timelineCards; await act(async () => { await result.current.handleSelectTimelineCandidate(saved.id, candidate); }); expect(result.current.timelineCards).toEqual([saved, editable]);
    await act(async () => { await result.current.handleSelectTimelineCandidate(editable.id, candidate); }); expect(result.current.timelineCards[0]).toEqual(saved); expect(result.current.timelineCards[1].intent.matchedAccount?.id).toBe('account-1');
  });

  it('does not promote an incomplete candidate selection to a finalizable card', async () => {
    const candidate = { id: 'account-1', amount: 35, description: 'Conta' };
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    act(() => { result.current.publishTimelineCard({ ...valid, paymentMethod: '', candidateAccounts: [candidate] }, 'NEEDS_INPUT', 'message-1'); });
    const card = result.current.timelineCards[0]; await act(async () => { await result.current.handleSelectTimelineCandidate(card.id, candidate); });
    expect(result.current.timelineCards[0].cardState).toBe('NEEDS_INPUT'); expect(result.current.timelineCards[0].intent.matchedAccount?.id).toBe('account-1');
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('confirms equal batch entries with distinct keys and advances only after each receipt', async () => {
    const pending = deferred(); mocks.confirm.mockReturnValueOnce(pending.promise).mockResolvedValue({ success: true, recordId: 'second' }); const registered = vi.fn();
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: registered }));
    act(() => { result.current.publishTimelineCard({ ...valid, batchDraftsList: [valid, valid] }, 'READY_TO_CONFIRM', 'message-1'); });
    const id = result.current.timelineCards[0].id; let operation!: Promise<unknown>;
    await act(async () => { operation = result.current.handleConfirmTimelineCard(id, valid); });
    expect(result.current.timelineCards[0].intent.batchDraftsList).toHaveLength(2);
    await act(async () => { await result.current.handleConfirmTimelineCard(id, valid); }); expect(mocks.confirm).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve({ success: true, recordId: 'first' }); await operation; });
    expect(result.current.timelineCards[0].intent.batchDraftsList).toHaveLength(1);
    await act(async () => { await result.current.handleConfirmTimelineCard(id, result.current.timelineCards[0].intent.batchDraftsList![0]); });
    expect(mocks.confirm).toHaveBeenCalledTimes(2); expect(mocks.confirm.mock.calls[0][1]).not.toBe(mocks.confirm.mock.calls[1][1]); expect(result.current.timelineCards[0].cardState).toBe('SAVED'); expect(registered).toHaveBeenCalledTimes(2);
    await act(async () => { await result.current.handleConfirmTimelineCard(id, valid); }); expect(mocks.confirm).toHaveBeenCalledTimes(2);
  });

  it('resumes a rejected second entry without writing the first entry again', async () => {
    mocks.confirm.mockResolvedValueOnce({ success: true, recordId: 'first' }).mockResolvedValueOnce({ success: false, error: 'Recusada' }).mockResolvedValueOnce({ success: true, recordId: 'second' });
    const second = { ...valid, description: 'Segunda', totalAmount: 50 }; const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    act(() => { result.current.publishTimelineCard({ ...valid, batchDraftsList: [valid, second] }, 'READY_TO_CONFIRM', 'message-1'); }); const id = result.current.timelineCards[0].id;
    await act(async () => { await result.current.handleConfirmTimelineCard(id, valid); });
    await act(async () => { await result.current.handleConfirmTimelineCard(id, second); }); expect(result.current.timelineCards[0].intent.batchDraftsList).toEqual([second]); expect(result.current.timelineCards[0].cardState).toBe('ERROR');
    await act(async () => { await result.current.handleConfirmTimelineCard(id, second); });
    expect(mocks.confirm).toHaveBeenCalledTimes(3); expect(mocks.confirm.mock.calls[1][1]).toBe(mocks.confirm.mock.calls[2][1]); expect(mocks.confirm.mock.calls[0][1]).not.toBe(mocks.confirm.mock.calls[1][1]); expect(result.current.timelineCards[0].cardState).toBe('SAVED');
  });

  it('keeps incomplete next entry until candidate selection and final resolver succeed', async () => {
    const candidate = { id: 'account-2', amount: 50, description: 'Segunda' }; const second = { ...valid, description: 'Segunda', totalAmount: 50, candidateAccounts: [candidate], isReadyForConfirmation: false };
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    act(() => { result.current.publishTimelineCard({ ...valid, batchDraftsList: [valid, second] }, 'READY_TO_CONFIRM', 'message-1'); }); const id = result.current.timelineCards[0].id;
    await act(async () => { await result.current.handleConfirmTimelineCard(id, valid); }); expect(result.current.timelineCards[0].cardState).toBe('NEEDS_INPUT');
    await act(async () => { await result.current.handleSelectTimelineCandidate(id, candidate); }); const next = result.current.timelineCards[0];
    expect(next.cardState).toBe('READY_TO_CONFIRM'); expect(next.intent.batchDraftsList).toHaveLength(1);
    await act(async () => { await result.current.handleConfirmTimelineCard(id, next.intent.batchDraftsList![0]); });
    expect(mocks.confirm.mock.calls[1][0]).toMatchObject({ amount: 50, paymentMethod: 'PIX', matchedAccount: { id: 'account-2', amount: 50 } }); expect(result.current.timelineCards[0].cardState).toBe('SAVED');
  });

  it('does not advance or repeat an uncertain batch entry', async () => {
    mocks.confirm.mockResolvedValue({ success: true }); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    act(() => { result.current.publishTimelineCard({ ...valid, batchDraftsList: [valid, { ...valid, description: 'Segunda' }] }, 'READY_TO_CONFIRM', 'message-1'); }); const card = result.current.timelineCards[0];
    await act(async () => { await result.current.handleConfirmTimelineCard(card.id, valid); });
    await act(async () => { await result.current.handleConfirmTimelineCard(card.id, valid); });
    expect(mocks.confirm).toHaveBeenCalledTimes(1); expect(result.current.timelineCards[0].intent.batchDraftsList).toHaveLength(2); expect(result.current.timelineCards[0].cardState).toBe('ERROR');
  });

  it('failure only in refresh preserves confirmed queue progress without replay', async () => {
    const registered = vi.fn().mockRejectedValue(new Error('Lista indisponível')); const second = { ...valid, description: 'Segunda' };
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: registered }));
    act(() => { result.current.publishTimelineCard({ ...valid, batchDraftsList: [valid, second] }, 'READY_TO_CONFIRM', 'message-1'); }); const id = result.current.timelineCards[0].id;
    await act(async () => { await result.current.handleConfirmTimelineCard(id, valid); });
    await act(async () => { await result.current.handleConfirmTimelineCard(id, valid); }); expect(mocks.confirm).toHaveBeenCalledTimes(1); expect(result.current.timelineCards[0].intent.batchDraftsList).toEqual([second]);
    expect(mocks.alert).toHaveBeenCalledWith('Registro salvo', expect.any(String));
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 12.345])('rejects invalid candidate amount %s in the resolver', async amount => {
    const candidate = { id: 'account-1', amount, description: 'Conta' }; const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    act(() => { result.current.publishTimelineCard({ ...valid, candidateAccounts: [candidate] }, 'NEEDS_INPUT', 'message-1'); }); const card = result.current.timelineCards[0];
    await act(async () => { await result.current.handleSelectTimelineCandidate(card.id, candidate); });
    expect(result.current.timelineCards[0]).toEqual(card); expect(mocks.alert).toHaveBeenCalledWith('Revise a conta selecionada', expect.any(String)); expect(mocks.confirm).not.toHaveBeenCalled();
  });

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
    await act(async () => { await result.current.handleClearChat(); });
    await act(async () => { pending.resolve({ success: true, recordId: 'late' }); }); expect(registered).not.toHaveBeenCalled();
  });
  it('ignores analysis from an earlier cleared chat without erasing the new draft', async () => {
    const pending = deferred(); mocks.send.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() })); let operation!: Promise<unknown>;
    await act(async () => { operation = result.current.handleSendMessage('Mensagem antiga'); });
    await act(async () => { const clearing = result.current.handleClearChat(); result.current.setInputText('Nova mensagem'); await clearing; });
    await act(async () => { pending.resolve(response); await operation; });
    expect(result.current.messages).toHaveLength(0); expect(result.current.inputText).toBe('Nova mensagem');
  });
  it('remembers a confirmed write from a cleared chat without replaying it or notifying the new owner', async () => {
    const pending = deferred(); mocks.create.mockReturnValue(pending.promise); const registered = vi.fn();
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: registered })); let operation!: Promise<unknown>;
    await act(async () => { operation = result.current.handleConfirmRegisterSingle(valid, 0); });
    await act(async () => { await result.current.handleClearChat(); });
    await act(async () => { pending.resolve({ success: true, data: { id: 'confirmed-old' } }); await operation; });
    await act(async () => { await result.current.handleConfirmRegisterSingle(valid, 0); });
    expect(mocks.create).toHaveBeenCalledTimes(1); expect(registered).not.toHaveBeenCalled();
  });
});
