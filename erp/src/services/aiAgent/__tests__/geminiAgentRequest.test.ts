import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ generate: vi.fn(), execute: vi.fn() }));
vi.mock('../geminiClient', () => ({ GeminiClient: { generateContent: mocks.generate } }));
vi.mock('../geminiToolDispatcher', () => ({ GeminiToolDispatcher: { execute: mocks.execute } }));
import { GeminiAgentService } from '../geminiAgentService';
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>(yes => { resolve = yes; }); return { promise, resolve }; };
const calls = { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'registrarFeedbackAgente', args: { feedback: 'teste' } } }, { functionCall: { name: 'buscarProdutos', args: {} } }] } }] };
const answer = { candidates: [{ content: { role: 'model', parts: [{ text: 'Resposta' }] } }] };
const record = { name: 'registrarFeedbackAgente', label: 'Feedback', args: {}, result: { success: true }, success: true };
beforeEach(() => { vi.resetAllMocks(); mocks.generate.mockResolvedValue(answer); mocks.execute.mockResolvedValue({ record, functionResponse: { name: record.name, response: { success: true } } }); });
afterEach(() => { vi.useRealTimers(); });
describe('Gemini agent request lifetime', () => {
  it('refuses an obsolete request before starting the model or a tool', async () => {
    await expect(GeminiAgentService.sendMessage('Consulta', [], undefined, { isCurrent: () => false })).rejects.toMatchObject({ knownFailure: true });
    expect(mocks.generate).not.toHaveBeenCalled(); expect(mocks.execute).not.toHaveBeenCalled();
  });
  it('aborts immediately during the model request and never dispatches late tool calls', async () => {
    const pending = deferred(); mocks.generate.mockReturnValue(pending.promise); const controller = new AbortController();
    const request = GeminiAgentService.sendMessage('Consulta', [], undefined, { signal: controller.signal });
    const rejected = expect(request).rejects.toMatchObject({ knownFailure: true }); controller.abort(); await rejected;
    pending.resolve(calls); await Promise.resolve(); expect(mocks.execute).not.toHaveBeenCalled();
  });
  it('checks context again after the model response and before dispatching tools', async () => {
    let current = true; mocks.generate.mockImplementation(async () => { current = false; return calls; });
    await expect(GeminiAgentService.sendMessage('Consulta', [], undefined, { isCurrent: () => current })).rejects.toMatchObject({ knownFailure: true });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it('stops before a second tool after a context change while the first tool executes', async () => {
    let current = true; mocks.generate.mockResolvedValue(calls); mocks.execute.mockImplementation(async () => { current = false; return { record, functionResponse: { name: record.name, response: {} } }; });
    await expect(GeminiAgentService.sendMessage('Consulta', [], undefined, { isCurrent: () => current })).rejects.toMatchObject({ knownFailure: false });
    expect(mocks.execute).toHaveBeenCalledOnce(); expect(mocks.generate).toHaveBeenCalledOnce();
  });
  it('marks cancellation during an already dispatched tool as uncertain', async () => {
    const pending = deferred(); mocks.generate.mockResolvedValue(calls); mocks.execute.mockReturnValue(pending.promise); const controller = new AbortController();
    const request = GeminiAgentService.sendMessage('Consulta', [], undefined, { signal: controller.signal });
    const rejected = expect(request).rejects.toMatchObject({ knownFailure: false });
    await vi.waitFor(() => expect(mocks.execute).toHaveBeenCalledOnce()); controller.abort(); await rejected;
    pending.resolve({ record, functionResponse: { name: record.name, response: {} } }); await Promise.resolve(); expect(mocks.execute).toHaveBeenCalledOnce();
  });
  it('bounds the model wait and ignores its late tool result', async () => {
    vi.useFakeTimers(); const pending = deferred(); mocks.generate.mockReturnValue(pending.promise);
    const request = GeminiAgentService.sendMessage('Consulta'); const rejected = expect(request).rejects.toMatchObject({ knownFailure: true });
    await vi.advanceTimersByTimeAsync(30_001); await rejected; pending.resolve(calls); await Promise.resolve(); expect(mocks.execute).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it('bounds a tool wait and does not start the next tool or model request after its late completion', async () => {
    vi.useFakeTimers(); const pending = deferred(); mocks.generate.mockResolvedValue(calls); mocks.execute.mockReturnValue(pending.promise);
    const request = GeminiAgentService.sendMessage('Consulta'); const rejected = expect(request).rejects.toMatchObject({ knownFailure: false });
    await vi.advanceTimersByTimeAsync(20_001); await rejected;
    pending.resolve({ record, functionResponse: { name: record.name, response: {} } }); await Promise.resolve(); expect(mocks.execute).toHaveBeenCalledOnce(); expect(mocks.generate).toHaveBeenCalledOnce();
  });
  it('rejects malformed model tool calls before executing them', async () => {
    mocks.generate.mockResolvedValue({ candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: '', args: [] } }] } }] });
    await expect(GeminiAgentService.sendMessage('Consulta')).rejects.toMatchObject({ knownFailure: true }); expect(mocks.execute).not.toHaveBeenCalled();
  });
  it('tracks dispatch and clears its deadline after a successful conversation', async () => {
    vi.useFakeTimers(); const onToolDispatch = vi.fn(); mocks.generate.mockResolvedValueOnce(calls).mockResolvedValue(answer);
    const result = await GeminiAgentService.sendMessage('Consulta', [], undefined, { onToolDispatch });
    expect(onToolDispatch).toHaveBeenCalledTimes(2); expect(result.result.executedTools).toHaveLength(2); expect(result.result.answer).toBe('Resposta'); expect(vi.getTimerCount()).toBe(0);
  });
  it('enforces a total deadline even when every individual request finishes before its own limit', async () => {
    vi.useFakeTimers(); mocks.generate.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(calls), 25_000)));
    const request = GeminiAgentService.sendMessage('Consulta'); const rejected = expect(request).rejects.toMatchObject({ knownFailure: false });
    await vi.advanceTimersByTimeAsync(90_001); await rejected; expect(mocks.generate).toHaveBeenCalledTimes(4); expect(mocks.execute).toHaveBeenCalledTimes(6);
  });
});
