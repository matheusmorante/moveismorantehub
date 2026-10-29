// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from: () => ({ insert: mocks.insert }) },
}));

describe('fila do histórico de alertas', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    localStorage.clear();
    mocks.insert.mockReset();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('guarda alertas de loop e repete após falha temporária sem evento online', async () => {
    const abortSignal = vi.fn()
      .mockResolvedValueOnce({ error: { code: '503', message: 'indisponível' } })
      .mockResolvedValueOnce({ error: null });
    mocks.insert.mockImplementation(() => ({ abortSignal }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = await import('./massLoadHistoryService');
    const stop = service.startMassLoadHistorySync('user-a');
    await service.flushPendingMassLoadHistory('user-a');

    service.recordSupabaseAnomaly({ title: 'Circuit Breaker Acionado', message: 'Repetição', level: 'CRITICAL' }, 'user-a');
    await service.flushPendingMassLoadHistory('user-a');
    expect(service.getPendingMassLoadHistory('user-a')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.insert).toHaveBeenCalledTimes(2);
    expect(service.getPendingMassLoadHistory('user-a')).toHaveLength(0);
    stop();
  });

  it('preserva e sincroniza avisos pendentes do formato anterior', async () => {
    const oldRecord = {
      id: 'old-id', user_id: 'user-a', occurred_at: '2026-10-29T00:00:00Z',
      title: 'Carga Massiva em attributes', message: 'Volume alto', metric: null,
    };
    localStorage.setItem('supabase_mass_load_history_outbox_v1', JSON.stringify([oldRecord]));
    mocks.insert.mockReturnValue({ abortSignal: vi.fn().mockResolvedValue({ error: null }) });
    const service = await import('./massLoadHistoryService');
    const stop = service.startMassLoadHistorySync('user-a');
    await service.flushPendingMassLoadHistory('user-a');
    expect(mocks.insert).toHaveBeenCalledWith(oldRecord);
    expect(service.getPendingMassLoadHistory('user-a')).toHaveLength(0);
    stop();
  });

  it('libera a fila quando o envio não responde e tenta novamente', async () => {
    const abortSignal = vi.fn()
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce({ error: null });
    mocks.insert.mockImplementation(() => ({ abortSignal }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const service = await import('./massLoadHistoryService');
    const stop = service.startMassLoadHistorySync('user-a');
    await service.flushPendingMassLoadHistory('user-a');
    service.recordSupabaseAnomaly({ title: 'Carga Massiva em attributes', message: 'Volume alto' }, 'user-a');
    await vi.advanceTimersByTimeAsync(10000);
    expect(service.getPendingMassLoadHistory('user-a')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.insert).toHaveBeenCalledTimes(2);
    expect(service.getPendingMassLoadHistory('user-a')).toHaveLength(0);
    stop();
  });

  it('continua enviando outros alertas quando um registro falha', async () => {
    const abortSignal = vi.fn()
      .mockResolvedValueOnce({ error: { code: '400', message: 'registro inválido' } })
      .mockResolvedValueOnce({ error: null });
    mocks.insert.mockImplementation(() => ({ abortSignal }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = await import('./massLoadHistoryService');
    const stop = service.startMassLoadHistorySync('user-a');
    await service.flushPendingMassLoadHistory('user-a');
    service.recordSupabaseAnomaly({ title: 'Primeiro', message: 'Falha' }, 'user-a');
    service.recordSupabaseAnomaly({ title: 'Segundo', message: 'Deve salvar' }, 'user-a');
    await service.flushPendingMassLoadHistory('user-a');
    expect(mocks.insert).toHaveBeenCalledTimes(2);
    expect(service.getPendingMassLoadHistory('user-a').map((item) => item.title)).toEqual(['Primeiro']);
    stop();
  });
});
