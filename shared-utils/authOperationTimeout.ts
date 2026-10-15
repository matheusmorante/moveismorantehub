import { withTimeout } from './withTimeout';

/** A local deadline does not cancel the provider request or retry it. */
export async function waitForAuthOperation<T>(pending: PromiseLike<T>, label: string, timeoutMs = 20_000): Promise<T> {
  const expired = Symbol('auth-timeout');
  const result = await withTimeout<T | typeof expired>(pending, timeoutMs, expired, label);
  if (result === expired) {
    throw new Error('Não foi possível confirmar a operação no prazo esperado. Confira o estado da sua conta antes de tentar novamente.');
  }
  return result;
}
