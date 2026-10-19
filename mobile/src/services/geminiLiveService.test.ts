import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ permission: vi.fn(), activity: vi.fn(), context: vi.fn(), close: vi.fn(), recorder: vi.fn(), stop: vi.fn(), invoke: vi.fn(), dispatch: vi.fn(), sockets: [] as any[] }));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove: vi.fn() }) } }));
vi.mock('react-native-audio-api', () => ({
  AudioManager: { requestRecordingPermissions: mocks.permission, setAudioSessionOptions: vi.fn(), setAudioSessionActivity: mocks.activity },
  AudioContext: class { destination = {}; constructor() { mocks.context(); } createBufferQueueSource() { return { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), pause: vi.fn() }; } close() { return mocks.close(); } resume() { return Promise.resolve(); } },
  AudioRecorder: class { constructor() { mocks.recorder(); } onAudioReady() {} clearOnAudioReady() {} start() { return Promise.resolve({ status: 'success' }); } stop() { return mocks.stop(); } pause() {} resume() {} },
}));
vi.mock('./supabaseClient', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock('./aiAgent/mobileToolDeclarations', () => ({ mobileAgentTools: [] }));
vi.mock('./aiAgent/mobileToolDispatcher', () => ({ MobileToolDispatcher: { execute: mocks.dispatch } }));
import { GeminiLiveSession } from './geminiLiveService';
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const quota = { usedMs: 0, remainingMs: 10000, limitMs: 10000, active: true, usageDate: '2026-10-18' };
const response = { data: { token: 'fake-test-token', model: 'fake-model', config: {}, quota }, error: null };
const callbacks = () => ({ onState: vi.fn(), onTranscript: vi.fn(), onQuota: vi.fn(), onError: vi.fn(), onToolExecuted: vi.fn() });
beforeEach(() => {
  vi.useFakeTimers(); vi.resetAllMocks(); mocks.sockets.length = 0;
  mocks.permission.mockResolvedValue('Granted'); mocks.activity.mockResolvedValue(undefined); mocks.close.mockResolvedValue(undefined); mocks.stop.mockResolvedValue(undefined); mocks.invoke.mockResolvedValue(response);
  vi.stubGlobal('WebSocket', class { static OPEN = 1; readyState = 1; onopen: any; onmessage: any; onclose: any; onerror: any; send = vi.fn(); close = vi.fn(); constructor() { mocks.sockets.push(this); } });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const start = async (session: GeminiLiveSession) => { const operation = session.start(); await flush(); const socket = mocks.sockets.at(-1); socket.onopen(); socket.onmessage({ data: JSON.stringify({ setupComplete: {} }) }); await operation; return socket; };
describe('ciclo de vida do serviço Gemini Live', () => {
  it('não abre áudio após encerrar enquanto a permissão ainda está pendente', async () => {
    const permission = deferred<string>(); mocks.permission.mockReturnValue(permission.promise); const session = new GeminiLiveSession(callbacks());
    void session.start().catch(() => undefined); await flush(); await session.end(); permission.resolve('Granted'); await flush();
    expect(mocks.context).not.toHaveBeenCalled(); expect(mocks.sockets).toHaveLength(0);
  });
  it('não abre socket após receber token de uma chamada já encerrada', async () => {
    const token = deferred<any>(); mocks.invoke.mockImplementation((_name, options) => options.body.action === 'start' ? token.promise : Promise.resolve(response));
    const session = new GeminiLiveSession(callbacks()); void session.start().catch(() => undefined); await flush(); await session.end(); token.resolve(response); await flush();
    expect(mocks.sockets).toHaveLength(0); expect(mocks.recorder).not.toHaveBeenCalled();
  });
  it('descarta chamada de ferramenta e transcrição entregues depois de encerrar', async () => {
    const listener = callbacks(); const session = new GeminiLiveSession(listener); const socket = await start(session); await session.end();
    socket.onmessage({ data: JSON.stringify({ serverContent: { modelTurn: { parts: [{ text: 'Antiga', functionCall: { name: 'write', args: {} } }] } } }) }); await flush();
    expect(listener.onTranscript).not.toHaveBeenCalled(); expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it('fecha socket e contexto mesmo sem resposta do stop do microfone', async () => {
    const session = new GeminiLiveSession(callbacks()); const socket = await start(session); mocks.stop.mockReturnValue(new Promise(() => {}));
    void session.end(); await vi.advanceTimersByTimeAsync(10000);
    expect(socket.close).toHaveBeenCalled(); expect(mocks.close).toHaveBeenCalled(); expect(mocks.activity).toHaveBeenCalledWith(false);
  });
  it('entrega resultado da ferramenta ao proprietário antes de responder ao modelo', async () => {
    const record = { name: 'criarMovimentacaoFinanceira', args: {}, result: { success: true }, timestamp: '2026-10-18T12:00:00Z' }; mocks.dispatch.mockResolvedValue({ record, functionResponse: { name: record.name, response: record.result } });
    const listener = callbacks(); const session = new GeminiLiveSession(listener); const socket = await start(session);
    socket.onmessage({ data: JSON.stringify({ serverContent: { modelTurn: { parts: [{ functionCall: { id: 'tool-1', name: record.name, args: {} } }] } } }) }); await flush();
    expect(listener.onToolExecuted).toHaveBeenCalledWith(record); expect(socket.send).toHaveBeenCalledTimes(2); await session.end();
  });
  it('não inicia a segunda ferramenta nem publica resultado da primeira após encerrar', async () => {
    const result = deferred<any>(); mocks.dispatch.mockReturnValue(result.promise); const listener = callbacks(); const session = new GeminiLiveSession(listener); const socket = await start(session);
    const call = { name: 'preparar', args: {} }; socket.onmessage({ data: JSON.stringify({ serverContent: { modelTurn: { parts: [{ functionCall: call }, { functionCall: call }] } } }) }); await flush();
    expect(mocks.dispatch).toHaveBeenCalledTimes(1); await session.end(); result.resolve({ record: { name: 'preparar', args: {}, result: { success: true }, timestamp: '' }, functionResponse: {} }); await flush();
    expect(mocks.dispatch).toHaveBeenCalledTimes(1); expect(listener.onToolExecuted).not.toHaveBeenCalled(); expect(socket.send).toHaveBeenCalledTimes(1);
  });
  it('reconcilia uma cota de início que respondeu depois do prazo e encerramento', async () => {
    const result = deferred<any>(); mocks.invoke.mockImplementation((_name, options) => options.body.action === 'start' ? result.promise : Promise.resolve(response));
    const session = new GeminiLiveSession(callbacks()); const operation = session.start(); const assertion = expect(operation).rejects.toThrow('excedeu o prazo'); await flush(); await vi.advanceTimersByTimeAsync(10000); await assertion;
    await session.end(); result.resolve(response); await flush();
    expect(mocks.sockets).toHaveLength(0); expect(mocks.invoke.mock.calls.filter(call => call[1].body.action === 'pause')).toHaveLength(2);
  });
  it('encerrar repetidamente conserva a mesma limpeza de recursos', async () => {
    const session = new GeminiLiveSession(callbacks()); const socket = await start(session); const first = session.end(); const second = session.end();
    expect(first).toBe(second); await first; expect(socket.close).toHaveBeenCalledTimes(1); expect(mocks.close).toHaveBeenCalledTimes(1); expect(mocks.stop).toHaveBeenCalledTimes(1);
  });
  it('repete a resposta de uma ferramenta com mesmo ID sem executar ou publicar novamente', async () => {
    const dispatched = deferred<any>(); mocks.dispatch.mockReturnValue(dispatched.promise); const listener = callbacks(); const session = new GeminiLiveSession(listener); const socket = await start(session);
    const publication = deferred<void>(); listener.onToolExecuted.mockReturnValue(publication.promise);
    const call = { id: 'tool-1', name: 'preparar', args: { valor: 10 } }; const event = { data: JSON.stringify({ serverContent: { modelTurn: { parts: [{ functionCall: call }] } } }) };
    socket.onmessage(event); socket.onmessage(event); await flush(); expect(mocks.dispatch).toHaveBeenCalledTimes(1);
    dispatched.resolve({ record: { name: call.name, args: call.args, result: { success: true }, timestamp: '' }, functionResponse: { name: call.name, response: { success: true } } }); await flush();
    expect(socket.send).toHaveBeenCalledTimes(1); publication.resolve(); await flush();
    expect(listener.onToolExecuted).toHaveBeenCalledTimes(1); expect(socket.send).toHaveBeenCalledTimes(3); await session.end();
  });
  it('recusa reutilizar o ID da ferramenta com outro payload', async () => {
    mocks.dispatch.mockResolvedValue({ record: { name: 'preparar', args: {}, result: { success: true }, timestamp: '' }, functionResponse: {} });
    const listener = callbacks(); const session = new GeminiLiveSession(listener); const socket = await start(session);
    const message = (valor: number) => ({ data: JSON.stringify({ serverContent: { modelTurn: { parts: [{ functionCall: { id: 'tool-1', name: 'preparar', args: { valor } } }] } } }) });
    socket.onmessage(message(10)); await flush(); socket.onmessage(message(20)); await flush();
    expect(mocks.dispatch).toHaveBeenCalledTimes(1); expect(listener.onError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('outros dados') })); await session.end();
  });
});
