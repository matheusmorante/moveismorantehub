import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ permission: vi.fn(), mode: vi.fn(), constructor: vi.fn(), prepare: vi.fn(), record: vi.fn(), release: vi.fn(), stop: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-audio', () => ({ requestRecordingPermissionsAsync: mocks.permission, setAudioModeAsync: mocks.mode, RecordingPresets: { HIGH_QUALITY: { ios: {}, android: {}, web: {} } }, AudioModule: { AudioRecorder: class { uri = 'local-test'; constructor() { mocks.constructor(); } prepareToRecordAsync() { return mocks.prepare(); } record() { mocks.record(); } stop() { return mocks.stop(); } release() { mocks.release(); } } } }));
import { startVoiceRecording, stopVoiceRecording } from './voiceRecorderService';
const pending = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
beforeEach(async () => { vi.useFakeTimers(); await stopVoiceRecording(); vi.resetAllMocks(); mocks.permission.mockResolvedValue({ granted: true }); mocks.mode.mockResolvedValue(undefined); mocks.prepare.mockResolvedValue(undefined); mocks.stop.mockResolvedValue(undefined); });
afterEach(async () => { await stopVoiceRecording(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('cancelamento da gravação de voz', () => {
  it('não abre gravador após encerrar durante a permissão nativa', async () => {
    const permission = pending<any>(); mocks.permission.mockReturnValue(permission.promise); const onRecordingStart = vi.fn(); const start = startVoiceRecording({ onSpeechResult: vi.fn(), onRecordingStart });
    await flush(); await stopVoiceRecording(); permission.resolve({ granted: true }); await start;
    expect(mocks.constructor).not.toHaveBeenCalled(); expect(onRecordingStart).not.toHaveBeenCalled();
  });
  it('libera gravador preparado depois de cancelar sem iniciar captura', async () => {
    const preparation = pending<void>(); mocks.prepare.mockReturnValue(preparation.promise); const start = startVoiceRecording({ onSpeechResult: vi.fn() }); await flush();
    await stopVoiceRecording(); preparation.resolve(); await start; expect(mocks.record).not.toHaveBeenCalled(); expect(mocks.release).toHaveBeenCalledTimes(1);
  });
  it('libera o recurso se a preparação nativa falhar', async () => {
    mocks.prepare.mockRejectedValue(new Error('Falha ao preparar')); const onError = vi.fn(); await expect(startVoiceRecording({ onSpeechResult: vi.fn(), onError })).resolves.toBe(false);
    expect(mocks.record).not.toHaveBeenCalled(); expect(mocks.release).toHaveBeenCalledTimes(1); expect(onError).toHaveBeenCalled();
  });
  it('limita a parada nativa e libera o gravador mesmo sem confirmação', async () => {
    await startVoiceRecording({ onSpeechResult: vi.fn() }); mocks.stop.mockReturnValue(new Promise(() => {})); const operation = stopVoiceRecording(); const assertion = expect(operation).rejects.toThrow('não confirmou');
    await vi.advanceTimersByTimeAsync(5000); await assertion; expect(mocks.release).toHaveBeenCalledTimes(1);
  });
  it('desliga tracks de uma permissão web entregue após cancelar', async () => {
    const permission = pending<any>(); const stop = vi.fn(); vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(() => permission.promise) } });
    const operation = startVoiceRecording({ onSpeechResult: vi.fn() }); await flush(); await stopVoiceRecording(); permission.resolve({ getTracks: () => [{ stop }] });
    await expect(operation).resolves.toBe(false); expect(stop).toHaveBeenCalledTimes(1); expect(mocks.constructor).not.toHaveBeenCalled();
  });
});
