export type AiModelErrorType =
  | 'quota_exhausted'       // insufficient_quota, credit_balance_exhausted
  | 'rate_limit_exceeded'   // HTTP 429 sem esgotamento financeiro (RPM / TPM atingidos)
  | 'provider_outage'       // HTTP 500, 502, 503, 504
  | 'timeout'               // Timeout na requisição / AbortError / ETIMEDOUT
  | 'auth_error'            // HTTP 401, 403 (chave inválida ou não autorizada)
  | 'bad_request'           // HTTP 400 (parâmetros inválidos ou contexto excedido)
  | 'unknown';

export interface AiModelErrorInfo {
  type: AiModelErrorType;
  message: string;
  statusCode?: number;
  code?: string;
  isRetryable: boolean;
  canFallback: boolean;
}

/**
 * Classifica detalhadamente os erros retornados pelo provedor OpenAI.
 * Permite distinguir cota financeira esgotada, rate limit por minuto, indisponibilidade temporária e timeout.
 */
export function classifyAiModelError(err: any): AiModelErrorInfo {
  const msg = String(err?.message || err || '').toLowerCase();
  const statusCode = Number(err?.statusCode || err?.status || 0);
  const code = String(err?.code || '').toLowerCase();

  // 1. Cota financeira esgotada
  if (
    code.includes('credit_balance_exhausted') ||
    code.includes('insufficient_quota') ||
    msg.includes('credit_balance_exhausted') ||
    msg.includes('insufficient_quota') ||
    msg.includes('no credits remaining') ||
    msg.includes('exceeded your current quota')
  ) {
    return {
      type: 'quota_exhausted',
      message: err?.message || 'Cota financeira esgotada no provedor.',
      statusCode: statusCode || 429,
      code: code || 'credit_balance_exhausted',
      isRetryable: false,
      canFallback: true,
    };
  }

  // 2. Limite de requisições por minuto (Rate Limit puro)
  if (
    statusCode === 429 ||
    code.includes('rate_limit') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  ) {
    return {
      type: 'rate_limit_exceeded',
      message: err?.message || 'Limite de requisições por minuto atingido (Rate Limit).',
      statusCode: 429,
      code: code || 'rate_limit_exceeded',
      isRetryable: true,
      canFallback: true,
    };
  }

  // 3. Autenticação e Permissão
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    msg.includes('invalid_api_key') ||
    msg.includes('unauthorized') ||
    msg.includes('invalid api key')
  ) {
    return {
      type: 'auth_error',
      message: err?.message || 'Erro de autenticação ou chave de API inválida.',
      statusCode: statusCode || 401,
      code: code || 'auth_error',
      isRetryable: false,
      canFallback: true,
    };
  }

  // 4. Timeout
  if (
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    code === 'etimedout' ||
    err?.name === 'AbortError'
  ) {
    return {
      type: 'timeout',
      message: err?.message || 'Timeout durante a chamada ao provedor de IA.',
      code: 'timeout',
      isRetryable: true,
      canFallback: true,
    };
  }

  // 5. Falha temporária do provedor (5xx)
  if (
    (statusCode >= 500 && statusCode < 600) ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('service unavailable')
  ) {
    return {
      type: 'provider_outage',
      message: err?.message || 'Instabilidade temporária nos servidores do provedor de IA.',
      statusCode: statusCode || 500,
      code: code || 'provider_outage',
      isRetryable: true,
      canFallback: true,
    };
  }

  // 6. Bad request (400)
  if (statusCode === 400 || msg.includes('bad request')) {
    return {
      type: 'bad_request',
      message: err?.message || 'Parâmetros inválidos enviados ao provedor de IA.',
      statusCode: 400,
      code: code || 'bad_request',
      isRetryable: false,
      canFallback: true,
    };
  }

  return {
    type: 'unknown',
    message: err?.message || String(err),
    statusCode: statusCode || undefined,
    code: code || undefined,
    isRetryable: false,
    canFallback: true,
  };
}
