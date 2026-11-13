import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeToolContext } from '../whatsappAiAgentTools.js';
import { checkAndReserveAiQuota, releaseAiQuotaReservation } from './quotaReservationGuard.js';
import type { RunAiTurnResult } from './modelTurnTypes.js';

export { checkAndReserveAiQuota, releaseAiQuotaReservation };

export interface TurnUsageAuditResult {
  reservationCommitted: boolean;
}

export async function auditAndRecordTurnUsage({
  supabase,
  usage,
  reservationId,
  toolContext,
}: {
  supabase: SupabaseClient;
  usage: any;
  reservationId?: string;
  toolContext: SafeToolContext;
}): Promise<TurnUsageAuditResult> {
  if (toolContext.isSimulation) {
    return { reservationCommitted: false };
  }

  if (
    !Number.isFinite(usage?.input_tokens) ||
    !Number.isFinite(usage?.output_tokens) ||
    usage.input_tokens < 0 ||
    usage.output_tokens < 0
  ) {
    throw new Error('A OpenAI não informou o consumo necessário para registrar a chamada.');
  }

  const promptTokens = Number(usage?.input_tokens || 0);
  const completionTokens = Number(usage?.output_tokens || 0);
  const totalTokens = Number(usage?.total_tokens || 0) || (promptTokens + completionTokens);
  const cachedTokens = Number(usage?.input_tokens_details?.cached_tokens ?? 0);

  if (typeof supabase?.rpc === 'function') {
    const { data: usageRecord, error: usageError } = await Promise.resolve().then(() =>
      supabase.rpc('record_ai_token_usage', {
        p_provider: 'openai',
        p_service: 'whatsapp_ai_agent',
        p_operation: 'responses',
        p_prompt_tokens: promptTokens,
        p_completion_tokens: completionTokens,
        p_total_tokens: totalTokens,
        p_module_source: 'customer_support',
        p_environment: 'production',
        p_status: 'SUCCESS',
        p_reservation_id: reservationId || null,
        p_cached_tokens: cachedTokens,
      })
    );

    if (usageError || !usageRecord?.log_id || usageRecord.reservation_committed !== true) {
      const usageRecordError: any = new Error('A utilização da IA não pôde ser registrada.');
      usageRecordError.preserveQuotaReservation = true;
      throw usageRecordError;
    }

    return { reservationCommitted: true };
  }

  return { reservationCommitted: false };
}
