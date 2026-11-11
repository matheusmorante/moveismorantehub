import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VercelResponse } from '@vercel/node';

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

let quotaServiceDb: SupabaseClient | null = null;

function getQuotaServiceDb(): SupabaseClient {
  if (quotaServiceDb) return quotaServiceDb;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    '';
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Credenciais internas de banco indisponíveis.');
  quotaServiceDb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return quotaServiceDb;
}

/**
 * Validação autoritativa e atômica da cota de IA (orçamento mensal, limites e horário).
 * Rejeita com HTTP 429 se bloqueado.
 */
export async function checkAiQuotaOrReject(
  _userDb: SupabaseClient,
  provider: 'gemini' | 'openai',
  service: string,
  estimatedTokens: number,
  moduleSource: string,
  res: VercelResponse
): Promise<AiQuotaCheckResult> {
  try {
    const quotaFunction = moduleSource === 'whatsapp_ai_simulator'
      ? 'customer_support_reserve_ai_quota' : 'check_and_reserve_ai_quota';
    const { data: quotaCheck, error } = await getQuotaServiceDb().rpc(quotaFunction, {
      p_provider: provider,
      p_service: service,
      p_estimated_tokens: estimatedTokens,
      p_module_source: moduleSource,
    });

    if (error || !quotaCheck || typeof quotaCheck.allowed !== 'boolean') {
      throw new Error(error?.message || 'Resposta inválida da reserva de cota.');
    }

    if (quotaCheck && !quotaCheck.allowed) {
      res.status(429).json({
        error: quotaCheck.reason || 'Limite de cota de IA excedido para este período.',
        quotaBlocked: true,
        quota: quotaCheck,
      });
      return { allowed: false, quotaCheck };
    }
    if (!quotaCheck.reservation_id) {
      throw new Error('A reserva de cota não foi confirmada.');
    }
    return {
      allowed: true,
      reservationId: quotaCheck.reservation_id || undefined,
      quotaCheck,
    };
  } catch (quotaErr) {
    console.error('[secure-integrations] Não foi possível reservar a cota de IA:', quotaErr);
    res.status(503).json({ error: 'Não foi possível validar a cota de IA. Tente novamente.' });
    return { allowed: false };
  }
}

/**
 * Libera de forma segura uma reserva orçamentária de IA caso a requisição falhe ou seja abortada.
 */
export async function releaseAiReservationSafe(_userDb: SupabaseClient, reservationId?: string): Promise<void> {
  if (!reservationId) return;
  try {
    const { error } = await getQuotaServiceDb().rpc('release_ai_reservation', { p_reservation_id: reservationId });
    if (error) console.error('[secure-integrations] Não foi possível liberar a reserva de IA:', error.message);
  } catch (error) {
    console.error('[secure-integrations] Não foi possível liberar a reserva de IA:', error);
  }
}

/**
 * Gravação atômica da telemetria de tokens, tempo e custos oficiais em BRL.
 */
export async function recordAiUsageTokensSafe(
  _userDb: SupabaseClient,
  params: RecordAiUsageParams
): Promise<boolean> {
  try {
    const { error } = await getQuotaServiceDb().rpc('record_ai_token_usage', {
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
    });
    if (error) {
      console.error('[secure-integrations] Não foi possível registrar o consumo de IA:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[secure-integrations] Não foi possível registrar o consumo de IA:', error);
    return false;
  }
}
