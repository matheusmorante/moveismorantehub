import { afterEach, describe, expect, it, vi } from 'vitest';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';

afterEach(() => vi.useRealTimers());

describe('withAbortTimeout', () => {
  it('aborta a requisição e rejeita quando o prazo termina', async () => {
    vi.useFakeTimers();
    let receivedSignal: AbortSignal | undefined;
    const pendingRequest = new Promise<string>(() => undefined);
    const request = Object.assign(pendingRequest, {
      abortSignal: (signal: AbortSignal) => {
        receivedSignal = signal;
        return pendingRequest;
      },
    });
    const pending = withAbortTimeout(request, 'products:list', 25);
    const assertion = expect(pending).rejects.toThrow('limite de 25 ms');

    await vi.advanceTimersByTimeAsync(25);
    await assertion;

    expect(receivedSignal?.aborted).toBe(true);
  });

  it('encaminha o cancelamento do chamador ao sinal da requisição PostgREST', async () => {
    let rejectRequest: (reason?: unknown) => void = () => undefined;
    let receivedSignal: AbortSignal | undefined;
    const requestPromise = new Promise<string>((_resolve, reject) => {
      rejectRequest = reject;
    });
    const request = Object.assign(requestPromise, {
      abortSignal: (signal: AbortSignal) => {
        receivedSignal = signal;
        signal.addEventListener(
          'abort',
          () => rejectRequest(Object.assign(new Error('Consulta cancelada'), { name: 'AbortError' })),
          { once: true },
        );
        return requestPromise;
      },
    });
    const caller = new AbortController();
    const pending = withAbortTimeout(request, 'orders:linked', 5_000, caller.signal);
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });

    caller.abort();
    await assertion;

    expect(receivedSignal?.aborted).toBe(true);
  });

  it('retorna resposta concluída antes do prazo', async () => {
    const request = Promise.resolve({ data: [] });

    await expect(withAbortTimeout(request, 'products:list', 1_000)).resolves.toEqual({ data: [] });
  });

  it('propaga erro real da consulta sem convertê-lo em timeout', async () => {
    const queryError = new Error('Falha de rede');

    await expect(withAbortTimeout(Promise.reject(queryError), 'products:list', 1_000))
      .rejects.toBe(queryError);
  });
});
