export interface OpenAiProviderError extends Error {
  provider: 'openai';
  statusCode: number;
  code: string;
  retryable: boolean;
}

/** Keeps provider status structured for diagnostics while giving users a safe message. */
export const createOpenAiHttpError = (statusCode: number): OpenAiProviderError => {
  const isTemporary = statusCode === 429 || statusCode >= 500;
  const message = statusCode === 429
    ? 'O assistente está recebendo muitas consultas. Aguarde um pouco e tente novamente.'
    : statusCode >= 500
      ? 'O assistente está temporariamente indisponível. Tente novamente em instantes.'
      : 'Não foi possível concluir a consulta ao assistente. Tente novamente ou peça ajuda à equipe.';
  const error = new Error(message) as OpenAiProviderError;
  error.name = 'OpenAiProviderError';
  error.provider = 'openai';
  error.statusCode = statusCode;
  error.code = `OPENAI_HTTP_${statusCode}`;
  error.retryable = isTemporary;
  return error;
};
