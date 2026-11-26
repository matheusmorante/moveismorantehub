/** A bounded wait with a caller-selected safe fallback; always releases its timer. */
export async function withTimeout<T>(
  promise: PromiseLike<T>, timeoutMs: number, fallbackValue: T, label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[Request] Timeout de ${timeoutMs}ms atingido em: ${label}.`);
      resolve(fallbackValue);
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
