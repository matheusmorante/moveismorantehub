import { withTimeout } from './withTimeout';

export const PRODUCT_LIST_QUERY_TIMEOUT_MS = 10_000;

type AbortablePromiseLike<T> = PromiseLike<T> & {
  abortSignal?: (signal: AbortSignal) => PromiseLike<T>;
};

export const withAbortTimeout = async <T,>(
  request: PromiseLike<T>,
  label: string,
  timeoutMs = PRODUCT_LIST_QUERY_TIMEOUT_MS,
): Promise<T> => {
  const controller = new AbortController();
  const abortableRequest = request as AbortablePromiseLike<T>;
  const boundedRequest = typeof abortableRequest.abortSignal === 'function'
    ? abortableRequest.abortSignal(controller.signal)
    : request;
  const timeoutMarker = Symbol('request-timeout');
  const result = await withTimeout<T | typeof timeoutMarker>(
    boundedRequest,
    timeoutMs,
    timeoutMarker,
    label,
  );

  if (result === timeoutMarker) {
    controller.abort();
    throw new Error(`A consulta ultrapassou o limite de ${timeoutMs} ms.`);
  }

  return result;
};
