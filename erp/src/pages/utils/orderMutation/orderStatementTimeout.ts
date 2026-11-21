export function isOrderStatementTimeout(error: unknown): boolean {
  return error !== null
    && typeof error === 'object'
    && 'code' in error
    && error.code === '57014'
    && 'message' in error
    && typeof error.message === 'string'
    && error.message.includes('statement timeout');
}

export async function retryRolledBackOrderWrite<T extends { error: unknown }>(
  write: () => PromiseLike<T>,
  retry: () => PromiseLike<T> = write,
): Promise<T> {
  const result = await write();
  if (!isOrderStatementTimeout(result.error)) return result;

  // O PostgreSQL cancelou a transação. Repita a mesma intenção uma única vez.
  await new Promise((resolve) => setTimeout(resolve, 250));
  return retry();
}
