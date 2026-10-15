import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForAuthOperation } from '../../../shared-utils/authOperationTimeout';
afterEach(() => vi.useRealTimers());
describe('prazo local da operação de autenticação', () => {
  it('preserva sucesso inclusive callback void e libera todos os timers', async () => {
    vi.useFakeTimers();
    expect(await waitForAuthOperation(Promise.resolve(undefined), 'teste')).toBeUndefined();
    expect(await waitForAuthOperation(Promise.resolve({ error: null }), 'teste')).toEqual({ error: null });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('preserva erro de serviço e libera o timer', async () => {
    vi.useFakeTimers();
    await expect(waitForAuthOperation(Promise.reject(new Error('Falha simulada')), 'teste')).rejects.toThrow('Falha simulada');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('encerra a espera sem repetir a chamada nem aplicar resposta tardia', async () => {
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    let finish!: (value: string) => void;
    const request = vi.fn(() => new Promise<string>((resolve) => { finish = resolve; })); const success = vi.fn();
    const operation = waitForAuthOperation(request(), 'teste').then(success).catch((error: Error) => error.message);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await operation).toContain('Confira o estado da sua conta'); expect(success).not.toHaveBeenCalled(); expect(request).toHaveBeenCalledTimes(1);
    finish('resposta tardia'); await Promise.resolve(); expect(success).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
});
