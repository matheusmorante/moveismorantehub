// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ send: vi.fn(), path: '/finance', user: { id: 'operator' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: mocks.path }) }));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({}), subscribeToSettings: () => () => {} }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/services/aiAgent/geminiAgentService', () => ({ GeminiAgentService: { sendMessage: mocks.send } }));
import AIChatAssistant from './AIChatAssistant';
const deferred = () => { let resolve!: (value: any) => void; let reject!: (value: any) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const response = (answer = 'Resposta confirmada') => ({ result: { answer, executedTools: [] }, updatedHistory: [{ role: 'user', parts: [{ text: 'Consulta' }] }, { role: 'model', parts: [{ text: answer }] }] });
const input = () => screen.getByRole('textbox');
const send = (text = '  Consulta  ') => { fireEvent.change(input(), { target: { value: text } }); fireEvent.keyDown(input(), { key: 'Enter' }); };
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); mocks.path = '/finance'; mocks.user = { id: 'operator' }; mocks.send.mockResolvedValue(response()); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('AIChatAssistant owner', () => {
  it('does not lose the draft before the asynchronous operation confirms', async () => {
    const pending = deferred(); mocks.send.mockReturnValue(pending.promise); render(<AIChatAssistant isOpen />); send();
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce()); expect(input()).toHaveProperty('value', '  Consulta  ');
    await act(async () => { pending.resolve(response()); }); expect(input()).toHaveProperty('value', '');
  });
  it('survives inaccessible local history and presents the failure', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('storage denied'); });
    render(<AIChatAssistant isOpen />); expect(screen.getByRole('alert').textContent).toMatch(/histórico/i);
  });
  it('displays invalid cached data without overwriting the unread history', async () => {
    localStorage.setItem('lisandro_chat_history_v2', '{"broken":true}'); const writes = vi.spyOn(localStorage, 'setItem');
    render(<AIChatAssistant isOpen />); await screen.findByRole('alert'); expect(writes).not.toHaveBeenCalled();
  });
  it('runs the resolver for Enter and buttons and serializes duplicate submits until confirmation', async () => {
    const pending = deferred(); mocks.send.mockReturnValue(pending.promise); render(<AIChatAssistant isOpen />);
    send('   '); await screen.findByRole('alert'); expect(mocks.send).not.toHaveBeenCalled();
    act(() => { send(); fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' })); fireEvent.keyDown(input(), { key: 'Enter' }); });
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
    expect(mocks.send.mock.calls[0].slice(0, 3)).toEqual(['Consulta', [], { currentModule: 'Financeiro', currentPage: 'finance', currentPath: '/finance' }]);
    expect(screen.getByRole('status').textContent).toMatch(/consultando ERP/);
    expect(screen.getByRole('button', { name: 'Limpar histórico da conversa' })).toHaveProperty('disabled', true);
    await act(async () => { pending.resolve(response()); }); await screen.findByText('Resposta confirmada');
    expect(JSON.parse(localStorage.getItem('lisandro_chat_history_v2')!)).toHaveLength(3);
    expect(JSON.parse(localStorage.getItem('lisandro_gemini_raw_history_v2')!)).toEqual(response().updatedHistory);
  });
  it('preserves edits made while waiting for a confirmed answer', async () => {
    const pending = deferred(); mocks.send.mockReturnValue(pending.promise); render(<AIChatAssistant isOpen />); send();
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce()); fireEvent.change(input(), { target: { value: 'Próxima pergunta' } });
    await act(async () => { pending.resolve(response()); }); expect(input()).toHaveProperty('value', 'Próxima pergunta');
  });
  it('keeps the draft and permits retry after a known refusal before tools', async () => {
    mocks.send.mockRejectedValueOnce(Object.assign(new Error('Chave não configurada'), { knownFailure: true })); render(<AIChatAssistant isOpen />); send();
    await screen.findByRole('alert'); expect(input()).toHaveProperty('value', '  Consulta  ');
    fireEvent.keyDown(input(), { key: 'Enter' }); await screen.findByText('Resposta confirmada'); expect(mocks.send).toHaveBeenCalledTimes(2);
  });
  it('blocks a repeat of an uncertain command, including after clearing the visible history', async () => {
    mocks.send.mockRejectedValueOnce(new Error('Resposta perdida')); vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AIChatAssistant isOpen />); send('Paguei 230'); await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Limpar histórico da conversa' })); await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    send('  PAGUEI   230 '); await screen.findByRole('alert'); expect(mocks.send).toHaveBeenCalledOnce();
    send('Consulte os últimos lançamentos'); await screen.findByText('Resposta confirmada'); expect(mocks.send).toHaveBeenCalledTimes(2);
  });
  it('treats an invalid service receipt as unconfirmed and prevents history persistence', async () => {
    mocks.send.mockResolvedValueOnce({ result: { answer: '', executedTools: [] }, updatedHistory: [] }); const writes = vi.spyOn(localStorage, 'setItem');
    render(<AIChatAssistant isOpen />); send(); await screen.findByRole('alert'); expect(writes).not.toHaveBeenCalled(); expect(input()).toHaveProperty('value', '  Consulta  ');
    fireEvent.keyDown(input(), { key: 'Enter' }); await screen.findByText(/sem confirmação/); expect(mocks.send).toHaveBeenCalledOnce();
  });
  it('does not turn a confirmed answer into a failed send when history persistence fails', async () => {
    render(<AIChatAssistant isOpen />); vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); }); send();
    await screen.findByText('Resposta confirmada'); await screen.findByRole('alert'); expect(input()).toHaveProperty('value', ''); expect(mocks.send).toHaveBeenCalledOnce();
  });
  it('detects unconfirmed local writes', async () => {
    render(<AIChatAssistant isOpen />); vi.spyOn(localStorage, 'setItem').mockImplementation(() => {}); send();
    await screen.findByRole('alert'); expect(screen.getByText('Resposta confirmada')).toBeTruthy(); expect(mocks.send).toHaveBeenCalledOnce();
  });
  it('clears only after confirmation and preserves the visible chat if local removal fails', async () => {
    render(<AIChatAssistant isOpen />); send(); await screen.findByText('Resposta confirmada');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false); const remove = vi.spyOn(localStorage, 'removeItem');
    fireEvent.click(screen.getByRole('button', { name: 'Limpar histórico da conversa' })); expect(remove).not.toHaveBeenCalled();
    confirm.mockReturnValue(true); remove.mockImplementation(() => { throw new Error('denied'); });
    fireEvent.click(screen.getByRole('button', { name: 'Limpar histórico da conversa' })); await screen.findByRole('alert'); expect(screen.getByText('Resposta confirmada')).toBeTruthy();
  });
  it.each(['route', 'user', 'close'] as const)('invalidates an in-flight request on %s without publishing late results', async change => {
    const pending = deferred(); mocks.send.mockReturnValue(pending.promise); const view = render(<AIChatAssistant isOpen />); send();
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce()); const options = mocks.send.mock.calls[0][3];
    if (change === 'route') mocks.path = '/orders'; if (change === 'user') mocks.user = { id: 'another' };
    view.rerender(<AIChatAssistant isOpen={change !== 'close'} />); expect(options.signal.aborted).toBe(true); expect(options.isCurrent()).toBe(false);
    await act(async () => { pending.resolve(response('Resposta antiga')); }); view.rerender(<AIChatAssistant isOpen />);
    expect(screen.queryByText('Resposta antiga')).toBeNull(); expect(input()).toHaveProperty('value', '  Consulta  ');
  });
  it('aborts on the close button even before a controlled parent closes', async () => {
    const pending = deferred(); mocks.send.mockReturnValue(pending.promise); const onClose = vi.fn(); render(<AIChatAssistant isOpen onClose={onClose} />); send();
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce()); fireEvent.click(screen.getByRole('button', { name: 'Fechar assistente' }));
    expect(onClose).toHaveBeenCalledOnce(); expect(mocks.send.mock.calls[0][3].signal.aborted).toBe(true);
    await act(async () => { pending.resolve(response('Antiga')); }); expect(screen.queryByText('Antiga')).toBeNull();
  });
  it('releases loading after the deadline, preserves the draft and blocks an uncertain replay', async () => {
    vi.useFakeTimers(); const pending = deferred(); mocks.send.mockImplementation((_text, _history, _page, options) => { options.onToolDispatch(); return pending.promise; });
    render(<AIChatAssistant isOpen />); await act(async () => { send('Paguei 230'); }); expect(mocks.send).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(90_001); }); expect(screen.queryByRole('status')).toBeNull(); expect(input()).toHaveProperty('value', 'Paguei 230');
    await act(async () => { fireEvent.keyDown(input(), { key: 'Enter' }); }); expect(mocks.send).toHaveBeenCalledOnce();
    await act(async () => { pending.resolve(response('Tardia')); }); expect(screen.queryByText('Tardia')).toBeNull();
  });
  it('uses the same owner and local-history controls in floating presentation', async () => {
    render(<AIChatAssistant isOpen mode="floating" />); send(); await screen.findByText('Resposta confirmada'); expect(mocks.send.mock.calls[0][0]).toBe('Consulta');
    expect(screen.getByRole('button', { name: 'Limpar histórico da conversa' })).toBeTruthy();
  });
  it('refuses to send without an authenticated operator', async () => {
    mocks.user = null as any; render(<AIChatAssistant isOpen />); send(); await screen.findByRole('alert'); expect(mocks.send).not.toHaveBeenCalled();
  });
});

describe('voice ownership', () => {
  const recognition = { current: null as any };
  beforeEach(() => {
    class Recognition {
      onstart: any; onend: any; onresult: any; onerror: any;
      start = vi.fn(() => this.onstart?.()); stop = vi.fn(() => this.onend?.()); abort = vi.fn();
      constructor() { recognition.current = this; }
    }
    vi.stubGlobal('SpeechRecognition', Recognition);
  });
  const transcript = (text: string) => recognition.current.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
  it('awaits the preference resolver and sends the current spoken draft only once', async () => {
    vi.useFakeTimers(); const pending = deferred(); mocks.send.mockReturnValue(pending.promise); const view = render(<AIChatAssistant isOpen />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Iniciar Chamada de Voz' })); }); expect(localStorage.getItem('lisandro_auto_speak')).toBe('true');
    await act(async () => { transcript('Consulta por voz'); }); await act(async () => { await vi.advanceTimersByTimeAsync(1201); });
    expect(mocks.send).toHaveBeenCalledOnce(); expect(mocks.send.mock.calls[0][0]).toBe('Consulta por voz');
    await act(async () => { transcript('Duplicada durante espera'); await vi.advanceTimersByTimeAsync(1201); }); expect(mocks.send).toHaveBeenCalledOnce();
    view.unmount(); expect(recognition.current.onresult).toBeNull(); expect(recognition.current.abort).toHaveBeenCalled();
    await act(async () => { pending.resolve(response()); });
  });
  it('uses the latest history after a previous typed message', async () => {
    render(<AIChatAssistant isOpen />); send(); await screen.findByText('Resposta confirmada');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Iniciar Chamada de Voz' })); });
    act(() => { transcript('E agora?'); }); await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(2), { timeout: 2500 });
    expect(mocks.send.mock.calls[1][1]).toEqual(response().updatedHistory);
  });
  it('does not start a voice call if its preference was not persisted', async () => {
    render(<AIChatAssistant isOpen />); vi.spyOn(localStorage, 'setItem').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Chamada de Voz' })); await screen.findByRole('alert'); expect(recognition.current.start).not.toHaveBeenCalled();
  });
  it('cancels the silence timer, callbacks and recognition on closing', async () => {
    vi.useFakeTimers(); const view = render(<AIChatAssistant isOpen />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Iniciar Chamada de Voz' })); transcript('Não enviar'); });
    view.rerender(<AIChatAssistant isOpen={false} />); await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(mocks.send).not.toHaveBeenCalled(); expect(recognition.current.onresult).toBeNull(); expect(recognition.current.stop).toHaveBeenCalled();
  });
  it('waits for the spoken answer to finish before restarting the microphone', async () => {
    vi.useFakeTimers(); let utterance: any;
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), getVoices: () => [], speak: vi.fn(value => { utterance = value; }) });
    const view = render(<AIChatAssistant isOpen />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Iniciar Chamada de Voz' })); });
    await act(async () => { transcript('Consulta por voz'); await vi.advanceTimersByTimeAsync(1201); });
    expect(mocks.send).toHaveBeenCalledOnce(); expect(recognition.current.start).toHaveBeenCalledOnce();
    act(() => { transcript('A própria resposta não deve ser reenviada'); }); await act(async () => { await vi.advanceTimersByTimeAsync(1201); });
    expect(mocks.send).toHaveBeenCalledOnce(); act(() => { utterance.onend(); }); expect(recognition.current.start).toHaveBeenCalledTimes(2);
    view.unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it('bounds unavailable speech completion and stops the call with a visible error', async () => {
    vi.useFakeTimers(); vi.stubGlobal('SpeechSynthesisUtterance', class {});
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), getVoices: () => [], speak: vi.fn() });
    render(<AIChatAssistant isOpen />); await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Iniciar Chamada de Voz' })); });
    await act(async () => { transcript('Consulta por voz'); await vi.advanceTimersByTimeAsync(1201); });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_001); }); expect(screen.getByRole('alert').textContent).toMatch(/reprodução de voz/);
    expect(screen.getByRole('button', { name: 'Iniciar Chamada de Voz' })).toBeTruthy(); expect(mocks.send).toHaveBeenCalledOnce();
  });
  it('clears speech timers on close even when recognition is unsupported', async () => {
    vi.useFakeTimers(); vi.stubGlobal('SpeechRecognition', undefined); localStorage.setItem('lisandro_auto_speak', 'true');
    vi.stubGlobal('SpeechSynthesisUtterance', class {}); vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), getVoices: () => [], speak: vi.fn() });
    const view = render(<AIChatAssistant isOpen />); await act(async () => { send(); }); view.rerender(<AIChatAssistant isOpen={false} />); expect(vi.getTimerCount()).toBe(0);
  });
});
