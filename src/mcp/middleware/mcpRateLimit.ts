export class McpRateLimitError extends Error {
  public readonly statusCode = 429;
  public readonly code = 'RATE_LIMITED';
  public readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds = 60) {
    super(message);
    this.name = 'McpRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

/**
 * Obtém o limite máximo por minuto configurado.
 */
export function getRateLimitLimit(): number {
  const envLimit = process.env.MCP_RATE_LIMIT_PER_MINUTE;
  if (envLimit) {
    const parsed = parseInt(envLimit, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 60; // Padrão: 60 requisições por minuto por cliente
}

/**
 * Verifica e aplica rate limiting por cliente.
 */
export function checkRateLimit(clientId: string, windowMs = 60_000): { remaining: number; resetAt: number } {
  const now = Date.now();
  const maxRequests = getRateLimitLimit();
  const bucket = buckets.get(clientId);

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(clientId, { count: 1, resetAt });
    return { remaining: maxRequests - 1, resetAt };
  }

  if (bucket.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    throw new McpRateLimitError(
      `Limite de requisições excedido para o cliente "${clientId}". Tente novamente em ${retryAfterSeconds} segundos.`,
      retryAfterSeconds,
    );
  }

  bucket.count += 1;
  return { remaining: maxRequests - bucket.count, resetAt: bucket.resetAt };
}

/**
 * Limpa buckets expirados para controle de memória.
 */
export function resetRateLimitBuckets(): void {
  buckets.clear();
}
