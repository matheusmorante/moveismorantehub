import { describe, expect, it } from 'vitest';
import { createOpenAiHttpError } from '../../../../../shared-utils/openAiProviderError';

describe('erros HTTP do transporte OpenAI', () => {
  it('mantém HTTP 502 para diagnóstico e mostra uma mensagem temporária sem detalhe técnico', () => {
    const error = createOpenAiHttpError(502);

    expect(error.message).toBe(
      'O assistente está temporariamente indisponível. Tente novamente em instantes.'
    );
    expect(error.message).not.toContain('502');
    expect(error).toMatchObject({
      name: 'OpenAiProviderError',
      provider: 'openai',
      statusCode: 502,
      code: 'OPENAI_HTTP_502',
      retryable: true,
    });
  });

  it('distingue rate limit e não marca erros de solicitação como recuperáveis', () => {
    expect(createOpenAiHttpError(429)).toMatchObject({
      retryable: true,
      message: expect.stringContaining('muitas consultas'),
    });
    expect(createOpenAiHttpError(400)).toMatchObject({ retryable: false });
  });
});
