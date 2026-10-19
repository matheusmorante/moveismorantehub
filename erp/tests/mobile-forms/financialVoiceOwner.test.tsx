import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ alert: vi.fn(), confirm: vi.fn(), create: vi.fn(), liveStart: vi.fn(), liveEnd: vi.fn(), pause: vi.fn(), resume: vi.fn(), mute: vi.fn(), record: vi.fn(), stop: vi.fn(), semantic: vi.fn(), sessions: [] as any[] }));
vi.mock('react-native', () => ({ Alert: { alert: mocks.alert }, ScrollView: 'div' }));
vi.mock('../../../mobile/src/services/mobileFinanceService', () => ({ confirmFinancialDraft: mocks.confirm, createFinancialTransaction: mocks.create }));
vi.mock('../../../mobile/src/services/financialAiAssistantService', () => ({ extractLocalSemanticDelta: mocks.semantic, PRE_ANALYSIS_DEBOUNCE_MS: 100, MAX_VOICE_INACTIVITY_MS: 1000 }));
vi.mock('../../../mobile/src/services/aiAgent/mobileAgentService', () => ({ MobileAgentService: { sendMessage: vi.fn() } }));
vi.mock('../../../mobile/src/services/geminiLiveService', () => ({ GeminiLiveSession: class {
  id: string; callbacks: any;
  constructor(callbacks: any) { this.id = 'live-' + mocks.sessions.length; this.callbacks = callbacks; mocks.sessions.push(this); }
  start() { return mocks.liveStart(this); } end() { return mocks.liveEnd(this); } pause() { return mocks.pause(this); } resume() { return mocks.resume(this); } toggleMute() { return mocks.mute(this); }
} }));
vi.mock('../../../mobile/src/services/voiceRecorderService', () => ({ startVoiceRecording: mocks.record, stopVoiceRecording: mocks.stop }));
import { useFinancialAiChat } from '../../../mobile/src/features/finance/hooks/useFinancialAiChat';
const pending = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
beforeEach(() => {
  vi.useFakeTimers(); vi.resetAllMocks(); mocks.sessions.length = 0;
  mocks.liveStart.mockImplementation(async session => { session.callbacks.onState('active'); }); mocks.liveEnd.mockResolvedValue(undefined); mocks.pause.mockImplementation(async session => { session.callbacks.onState('paused'); }); mocks.resume.mockImplementation(async session => { session.callbacks.onState('active'); }); mocks.mute.mockResolvedValue(undefined); mocks.record.mockResolvedValue(true); mocks.stop.mockResolvedValue(null);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('proprietário de voz do chat financeiro', () => {
  it('descarta transcrição da chamada encerrada após limpar o chat', async () => {
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { await result.current.handleStartLive(); }); const session = mocks.sessions[0];
    await act(async () => { const clearing = result.current.handleClearChat(); result.current.setInputText('Novo rascunho'); await clearing; });
    await act(async () => { session.callbacks.onTranscript('assistant', 'Resposta antiga'); session.callbacks.onState('active'); });
    expect(result.current.messages).toHaveLength(0); expect(result.current.liveState).toBeNull(); expect(result.current.inputText).toBe('Novo rascunho');
  });
  it('não duplica pausa enquanto a operação anterior está pendente', async () => {
    const pause = pending<void>(); mocks.pause.mockReturnValue(pause.promise); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { await result.current.handleStartLive(); });
    await act(async () => { result.current.handleToggleLivePause(); result.current.handleToggleLivePause(); });
    expect(mocks.pause).toHaveBeenCalledTimes(1); await act(async () => { pause.resolve(); });
  });
  it('limita o início Live sem resposta e descarta estado tardio', async () => {
    const start = pending<void>(); mocks.liveStart.mockReturnValue(start.promise); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { result.current.handleStartLive(); }); await act(async () => { vi.advanceTimersByTime(20000); });
    expect(result.current.liveState).toBeNull(); expect(mocks.liveEnd).toHaveBeenCalledTimes(1);
    await act(async () => { start.resolve(); mocks.sessions[0].callbacks.onState('active'); }); expect(result.current.liveState).toBeNull();
  });
  it('não abre duas gravações enquanto a permissão está pendente', async () => {
    const record = pending<boolean>(); mocks.record.mockReturnValue(record.promise); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { result.current.handleStartVoice(); result.current.handleStartVoice(); }); expect(mocks.record).toHaveBeenCalledTimes(1);
    await act(async () => { record.resolve(true); });
  });

  it('valida e normaliza a transcrição antes de publicar no histórico', async () => {
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { await result.current.handleStartLive(); }); const session = mocks.sessions[0];
    await act(async () => { session.callbacks.onTranscript('assistant', '   '); }); expect(result.current.messages).toHaveLength(0); expect(result.current.mediaError).toBeTruthy();
    await act(async () => { session.callbacks.onTranscript('assistant', '  Olá  '); }); expect(result.current.messages[0]).toMatchObject({ sender: 'assistant', text: 'Olá' });
  });
  it('recusa ação incompatível com o estado atual pelo resolver', async () => {
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { await result.current.handleStartLive(); }); await act(async () => { await result.current.handleToggleLivePause(); }); expect(result.current.liveState).toBe('paused');
    await act(async () => { await result.current.handleToggleLiveMute(); }); expect(mocks.mute).not.toHaveBeenCalled(); expect(result.current.mediaError).toContain('estado da chamada mudou');
    await act(async () => { await result.current.handleStartLive(); }); expect(mocks.resume).toHaveBeenCalledTimes(1); expect(mocks.liveStart).toHaveBeenCalledTimes(1);
  });
  it('encerra mesmo enquanto o início aguarda conexão, sem ressuscitar a chamada', async () => {
    const start = pending<void>(); mocks.liveStart.mockReturnValue(start.promise); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { result.current.handleStartLive(); });
    await act(async () => { await result.current.handleEndLive(); }); expect(result.current.liveState).toBeNull(); expect(mocks.liveEnd).toHaveBeenCalledTimes(1);
    await act(async () => { start.resolve(); mocks.sessions[0].callbacks.onState('active'); }); expect(result.current.liveState).toBeNull();
  });
  it('erro ao pausar encerra a sessão e apresenta falha em vez de rejeição solta', async () => {
    mocks.pause.mockRejectedValue(new Error('Sem conexão')); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { await result.current.handleStartLive(); }); await act(async () => { await result.current.handleToggleLivePause(); });
    expect(result.current.liveState).toBeNull(); expect(result.current.mediaError).toContain('Sem conexão'); expect(result.current.mediaBusy).toBe(false); expect(mocks.liveEnd).toHaveBeenCalledTimes(1);
  });
  it('limita controle pendente e não permite nova ação concorrente', async () => {
    const pause = pending<void>(); mocks.pause.mockReturnValue(pause.promise); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { await result.current.handleStartLive(); }); await act(async () => { result.current.handleToggleLivePause(); });
    await act(async () => { result.current.handleToggleLiveMute(); vi.advanceTimersByTime(15000); });
    expect(mocks.mute).not.toHaveBeenCalled(); expect(result.current.mediaBusy).toBe(false); expect(result.current.liveState).toBeNull(); expect(result.current.mediaError).toContain('não respondeu no prazo');
    await act(async () => { pause.resolve(); mocks.sessions[0].callbacks.onState('paused'); }); expect(result.current.liveState).toBeNull();
  });
  it('permite encerrar imediatamente enquanto uma pausa ainda não respondeu', async () => {
    const pause = pending<void>(); mocks.pause.mockReturnValue(pause.promise); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { await result.current.handleStartLive(); }); await act(async () => { result.current.handleToggleLivePause(); });
    await act(async () => { await result.current.handleEndLive(); }); expect(mocks.liveEnd).toHaveBeenCalledTimes(1); expect(result.current.liveState).toBeNull(); expect(result.current.mediaBusy).toBe(false);
    await act(async () => { pause.resolve(); mocks.sessions[0].callbacks.onState('paused'); }); expect(result.current.liveState).toBeNull(); expect(result.current.mediaError).toBe('');
  });
  it('ignora transcrição, estado, erro e cota de outro operador', async () => {
    const { result, rerender } = renderHook(({ userName }) => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn(), userName }), { initialProps: { userName: 'Ana' } });
    await act(async () => { await result.current.handleStartLive(); }); const old = mocks.sessions[0]; rerender({ userName: 'Bia' });
    await act(async () => { old.callbacks.onTranscript('user', 'Anterior'); old.callbacks.onState('active'); old.callbacks.onError(new Error('Antigo')); old.callbacks.onQuota({ remainingMs: 2 }); });
    expect(result.current.messages).toHaveLength(0); expect(result.current.liveState).toBeNull(); expect(result.current.liveQuota).toBeNull(); expect(result.current.mediaError).toBe(''); expect(mocks.liveEnd).toHaveBeenCalledTimes(1);
  });
  it('não publica callback de chamada desmontada', async () => {
    const { result, unmount } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { await result.current.handleStartLive(); }); await act(async () => { unmount(); }); expect(mocks.liveEnd).toHaveBeenCalledTimes(1);
    const old = mocks.sessions[0]; old.callbacks.onTranscript('assistant', 'Antiga'); old.callbacks.onError(new Error('Antigo')); expect(mocks.alert).not.toHaveBeenCalled();
  });
  it('cota inválida encerra a chamada sem usar saldo negativo', async () => {
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() })); await act(async () => { await result.current.handleStartLive(); });
    await act(async () => { mocks.sessions[0].callbacks.onQuota({ usedMs: 0, remainingMs: -1, limitMs: 30, active: true, usageDate: '2026-10-18' }); });
    expect(result.current.liveQuota).toBeNull(); expect(result.current.liveState).toBeNull(); expect(result.current.mediaError).toContain('cota inválida'); expect(mocks.liveEnd).toHaveBeenCalledTimes(1);
  });
  it('parada preserva o rascunho e cancelamento de captura recupera o texto anterior', async () => {
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() })); act(() => result.current.setInputText('Texto anterior'));
    await act(async () => { await result.current.handleStartVoice(); }); const first = mocks.record.mock.calls[0][0]; act(() => first.onSpeechResult('mais fala'));
    expect(result.current.inputText).toBe('Texto anterior mais fala'); await act(async () => { await result.current.handleStopVoice(); }); expect(result.current.inputText).toBe('Texto anterior mais fala');
    await act(async () => { await result.current.handleStartVoice(); }); const second = mocks.record.mock.calls[1][0]; act(() => second.onSpeechResult('descartar'));
    await act(async () => { await result.current.handleCancelVoice(); }); expect(result.current.inputText).toBe('Texto anterior mais fala');
  });
  it('descarta fala e pré-análise atrasadas após limpar o chat', async () => {
    mocks.semantic.mockReturnValue({ amount: 12 }); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { await result.current.handleStartVoice(); }); const callbacks = mocks.record.mock.calls[0][0]; await act(async () => { callbacks.onSpeechResult('Compra'); const clearing = result.current.handleClearChat(); result.current.setInputText('Novo'); await clearing; });
    await act(async () => { callbacks.onSpeechResult('Antiga'); callbacks.onError('Erro anterior'); vi.advanceTimersByTime(2000); });
    expect(result.current.inputText).toBe('Novo'); expect(result.current.livePill).toBeNull(); expect(result.current.voiceState).toBe('IDLE'); expect(result.current.mediaError).toBe('');
  });
  it('libera a captura após recusa de permissão e mostra a falha', async () => {
    mocks.record.mockResolvedValue(false); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { await result.current.handleStartVoice(); }); expect(result.current.voiceState).toBe('IDLE'); expect(result.current.mediaBusy).toBe(false); expect(result.current.mediaError).toContain('permissão');
  });
  it('microfone pendente não mantém a interface em STARTING indefinidamente', async () => {
    const start = pending<boolean>(); mocks.record.mockReturnValue(start.promise); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() }));
    await act(async () => { result.current.handleStartVoice(); }); await act(async () => { vi.advanceTimersByTime(15000); });
    expect(result.current.voiceState).toBe('IDLE'); expect(result.current.mediaBusy).toBe(false); expect(result.current.mediaError).toContain('não iniciou'); await act(async () => { start.resolve(true); mocks.record.mock.calls[0][0].onRecordingStart(); }); expect(result.current.voiceState).toBe('IDLE');
  });

  const preparedTool = (amount = 12) => ({ name: 'criarMovimentacaoFinanceira', timestamp: '2026-10-18T12:00:00Z', args: {}, result: { success: true, data: { tipo: 'expense', valor: amount, descricao: '  Compra por voz  ', finalidade: 'BUSINESS', formaPagamento: ' PIX ', categoriaId: 'category-1' } } });
  it('publica cartão de voz validado e só grava após confirmar no proprietário', async () => {
    mocks.confirm.mockResolvedValue({ success: true, recordId: 'saved-voice' }); const registered = vi.fn(); const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: registered }));
    await act(async () => { await result.current.handleStartLive(); }); await act(async () => { await mocks.sessions[0].callbacks.onToolExecuted(preparedTool()); });
    const card = result.current.timelineCards[0]; expect(card.intent).toMatchObject({ description: 'Compra por voz', amount: 12 }); expect(result.current.messages[0].id).toBe(card.afterMessageId); expect(mocks.confirm).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
    await act(async () => { await result.current.handleConfirmTimelineCard(card.id, card.intent); });
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ description: 'Compra por voz', paymentMethod: 'PIX', amount: 12 }), expect.any(String), 'Operador'); expect(registered).toHaveBeenCalledTimes(1);
  });
  it('rejeita resultado de preparação inválido antes de publicar cartão ou gravar', async () => {
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() })); await act(async () => { await result.current.handleStartLive(); });
    await act(async () => { await mocks.sessions[0].callbacks.onToolExecuted(preparedTool(-1)); });
    expect(result.current.timelineCards).toHaveLength(0); expect(result.current.messages).toHaveLength(0); expect(mocks.confirm).not.toHaveBeenCalled(); expect(mocks.alert).toHaveBeenCalledWith('Revise a movimentação preparada', expect.any(String));
  });
  it('não publica ferramenta recebida por uma chamada já limpa', async () => {
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() })); await act(async () => { await result.current.handleStartLive(); }); const old = mocks.sessions[0];
    await act(async () => { await result.current.handleClearChat(); }); await act(async () => { await old.callbacks.onToolExecuted(preparedTool()); }); expect(result.current.timelineCards).toHaveLength(0); expect(result.current.messages).toHaveLength(0);
  });
  it('conserva dois cartões de voz distintos sem confirmar automaticamente', async () => {
    const { result } = renderHook(() => useFinancialAiChat({ categories: [], onTransactionRegistered: vi.fn() })); await act(async () => { await result.current.handleStartLive(); });
    await act(async () => { await mocks.sessions[0].callbacks.onToolExecuted(preparedTool()); await mocks.sessions[0].callbacks.onToolExecuted(preparedTool(20)); });
    expect(result.current.timelineCards).toHaveLength(2); expect(result.current.timelineCards[0].id).not.toBe(result.current.timelineCards[1].id); expect(result.current.timelineCards.map(card => card.intent.amount)).toEqual([12, 20]); expect(mocks.confirm).not.toHaveBeenCalled();
  });
});
