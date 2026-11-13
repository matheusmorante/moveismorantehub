import type { SupabaseClient } from '@supabase/supabase-js';
import { releaseAiQuotaReservation } from './quotaReservationGuard.js';

export interface CallOpenAiResponsesApiParams {
  fetchOpenAi: typeof fetch;
  apiKey: string;
  model: string;
  requestBody: Record<string, any>;
  remainingMs: number;
  supabase: SupabaseClient;
  reservationId?: string;
  isSimulation: boolean;
  turnStartedAt: number;
  turnDeadlineMs: number;
}

export function estimateTurnTokens(requestBody: Record<string, any>): number {
  return Math.max(
    3072,
    Math.ceil(new TextEncoder().encode(JSON.stringify(requestBody)).length / 3) +
      Number(requestBody.max_output_tokens || 2048)
  );
}

export async function callOpenAiResponsesApi({
  fetchOpenAi,
  apiKey,
  model,
  requestBody,
  remainingMs,
  supabase,
  reservationId,
  isSimulation,
  turnStartedAt,
  turnDeadlineMs,
}: CallOpenAiResponsesApiParams): Promise<{ data: any; res: Response }> {
  let res: Response | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const currentRemainingMs = turnDeadlineMs - (Date.now() - turnStartedAt);
    if (currentRemainingMs <= 0) {
      throw new Error('O turno do agente excedeu o tempo máximo permitido.');
    }

    const controller = new AbortController();
    const timeoutMs = Math.max(1, Math.min(15_000, currentRemainingMs));
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      res = await fetchOpenAi('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (requestError) {
      clearTimeout(timeout);
      (requestError as any).preserveQuotaReservation = true;
      throw requestError;
    }
    clearTimeout(timeout);

    if (!res.ok && res.status < 500 && !isSimulation) {
      await releaseAiQuotaReservation(supabase, reservationId);
    }

    // A requisição de modelo ainda não executou ferramentas. Repetir uma vez
    // apenas em indisponibilidade transitória 502/503 é seguro antes do despacho externo.
    if (attempt === 0 && [502, 503].includes(res.status)) {
      await res.body?.cancel().catch(() => {});
      if (Date.now() - turnStartedAt < turnDeadlineMs - 1_000) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }
    }
    break;
  }

  if (!res) throw new Error('A OpenAI não retornou uma resposta.');

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as any;
    const rawError = errBody?.error;
    const errMsg = typeof rawError === 'string'
      ? rawError
      : rawError?.message || `HTTP ${res.status}`;
    const errCode = rawError?.code || errBody?.quota?.code;
    const errorPrefix = errBody?.quotaBlocked === true
      ? 'Cota da simulação de IA'
      : `OpenAI (${model}) error`;
    const quotaReason = typeof errBody?.quota?.reason === 'string'
      ? errBody.quota.reason
      : errMsg;
    const err = new Error(
      `${errorPrefix}: ${quotaReason}${errCode ? ` [${errCode}]` : ''}`
    );
    (err as any).statusCode = res.status;
    (err as any).code = errCode;
    (err as any).errorBody = errBody;
    throw err;
  }

  let data: any;
  try {
    data = await res.json();
  } catch (responseError) {
    (responseError as any).preserveQuotaReservation = true;
    throw responseError;
  }

  return { data, res };
}
