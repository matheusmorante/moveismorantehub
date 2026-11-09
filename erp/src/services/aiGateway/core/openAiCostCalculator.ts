import type { AiCategory } from '../types/aiGatewayTypes';
import type { OpenAiRequestKind } from './openAiPayloadBuilder';

const USD_TO_BRL_RATE = 5.6;
const PRICE_PER_MILLION_USD = {
  lunaInput: 0.1,
  lunaOutput: 0.5,
  embeddingInput: 0.02,
} as const;

export function calculateOpenAiCost(
  category: AiCategory,
  kind: OpenAiRequestKind,
  payload: unknown,
  usage?: Record<string, any>
) {
  const promptTokens = Number(usage?.input_tokens ?? usage?.prompt_tokens ?? 0);
  const completionTokens = Number(usage?.output_tokens ?? usage?.completion_tokens ?? 0);
  const totalTokens = Number(usage?.total_tokens ?? 0) || promptTokens + completionTokens;
  const units = Math.max(
    1,
    totalTokens || Math.ceil((typeof payload === 'string' ? payload.length : 100) / 4)
  );

  let costEstimated = 0;
  if (category === 'IMAGE') {
    // Reserva conservadora compatível com o teto mensal histórico de R$ 30,00 para imagens.
    costEstimated = 0.2;
  } else if (kind === 'embeddings') {
    costEstimated = (promptTokens * PRICE_PER_MILLION_USD.embeddingInput * USD_TO_BRL_RATE) / 1_000_000;
  } else {
    costEstimated =
      ((promptTokens * PRICE_PER_MILLION_USD.lunaInput +
        completionTokens * PRICE_PER_MILLION_USD.lunaOutput) *
        USD_TO_BRL_RATE) /
      1_000_000;
  }

  return {
    units,
    costEstimated: Number(costEstimated.toFixed(6)),
    promptTokens,
    completionTokens,
    totalTokens,
  };
}
