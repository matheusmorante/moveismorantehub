import type { VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface RecordAiUsageParams {
  provider: 'gemini' | 'openai';
  service: string;
  operation: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  moduleSource: string;
  responseTimeMs: number;
  ok: boolean;
  reservationId?: string;
  cachedTokens?: number;
}

export interface AiQuotaCheckResult {
  allowed: boolean;
  reservationId?: string;
  quotaCheck?: any;
}

/**
 * Validação autoritativa e atômica da cota de IA (orçamento mensal, limites e horário).
 * Rejeita com HTTP 429 se bloqueado.
 */
export async function checkAiQuotaOrReject(
  userDb: SupabaseClient,
  provider: 'gemini' | 'openai',
  service: string,
  estimatedTokens: number,
  moduleSource: string,
  res: VercelResponse
): Promise<AiQuotaCheckResult> {
  if (typeof userDb?.rpc !== 'function') return { allowed: true };
  try {
    const { data: quotaCheck } = await userDb.rpc('check_and_reserve_ai_quota', {
      p_provider: provider,
      p_service: service,
      p_estimated_tokens: estimatedTokens,
      p_module_source: moduleSource,
    });

    if (quotaCheck && !quotaCheck.allowed) {
      res.status(429).json({
        error: quotaCheck.reason || 'Limite de cota de IA excedido para este período.',
        quotaBlocked: true,
        quota: quotaCheck,
      });
      return { allowed: false, quotaCheck };
    }
    return {
      allowed: true,
      reservationId: quotaCheck?.reservation_id || undefined,
      quotaCheck,
    };
  } catch (quotaErr) {
    console.warn('[secure-integrations] Falha não bloqueante ao consultar quota no banco:', quotaErr);
  }
  return { allowed: true };
}

/**
 * Libera de forma segura uma reserva orçamentária de IA caso a requisição falhe ou seja abortada.
 */
export function releaseAiReservationSafe(userDb: SupabaseClient, reservationId?: string): void {
  if (!reservationId || typeof userDb?.rpc !== 'function') return;
  void Promise.resolve()
    .then(() => userDb.rpc('release_ai_reservation', { p_reservation_id: reservationId }))
    .catch(() => {});
}

/**
 * Gravação atômica da telemetria de tokens, tempo e custos oficiais em BRL.
 */
export function recordAiUsageTokensSafe(
  userDb: SupabaseClient,
  params: RecordAiUsageParams
): void {
  if (typeof userDb?.rpc !== 'function') return;
  void Promise.resolve()
    .then(() => userDb.rpc('record_ai_token_usage', {
      p_provider: params.provider,
      p_service: params.service,
      p_operation: params.operation,
      p_prompt_tokens: params.promptTokens,
      p_completion_tokens: params.completionTokens,
      p_total_tokens: params.totalTokens,
      p_module_source: params.moduleSource,
      p_environment: process.env.VERCEL_ENV || 'production',
      p_response_time_ms: params.responseTimeMs,
      p_status: params.ok ? 'SUCCESS' : 'ERROR',
      p_reservation_id: params.reservationId || null,
      p_cached_tokens: params.cachedTokens || 0,
    }))
    .catch(() => {});
}
