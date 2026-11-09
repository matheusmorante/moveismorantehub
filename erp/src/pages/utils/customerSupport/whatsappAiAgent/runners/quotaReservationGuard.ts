import type { SupabaseClient } from '@supabase/supabase-js';
import { executeSafeTool, type SafeToolContext } from '../whatsappAiAgentTools.js';
import type { RunAiTurnResult } from './modelTurnTypes.js';

export interface QuotaCheckResult {
  blocked: boolean;
  reservationId?: string;
  blockedResult?: RunAiTurnResult;
}

/**
 * Verificação autoritativa da Cota de IA (orçamento mensal R$ 30,00, limites de hora, dia e horário)
 */
export async function checkAndReserveAiQuota(
  supabase: SupabaseClient,
  provider: 'openai',
  modelToUse: string,
  toolContext?: SafeToolContext
): Promise<QuotaCheckResult> {
  if (typeof supabase?.rpc !== 'function') {
    return { blocked: false };
  }

  try {
    const { data: quotaResult } = await supabase.rpc('check_and_reserve_ai_quota', {
      p_provider: provider,
      p_service: 'whatsapp_ai_agent',
      p_estimated_tokens: 1500,
      p_module_source: 'whatsapp_commercial_agent',
    });

    if (quotaResult && !quotaResult.allowed) {
      const reason = quotaResult.reason || 'Limite de cota de IA atingido.';
      const code = quotaResult.code || 'quota_exhausted';

      // PONTO CRÍTICO: Executa diretamente a transição de atendimento humano no PostgreSQL
      // muta a conversa no banco sem acionar o modelo de IA.
      if (toolContext) {
        await executeSafeTool(
          supabase,
          'encaminharParaAtendimentoHumano',
          { motivo: `Limite de cota de IA atingido: ${reason}` },
          toolContext
        );
      }

      return {
        blocked: true,
        blockedResult: {
          text: 'Nosso assistente virtual atingiu o limite de atendimentos automáticos deste período. Já estou acionando nossa equipe para continuar seu atendimento com total atenção!',
          toolsCalled: ['encaminharParaAtendimentoHumano'],
          modelRequested: modelToUse,
          modelEffective: modelToUse,
          fallbackReason: `quota_blocked: ${reason}`,
          quotaBlocked: true,
          errorInfo: {
            type: 'quota_exhausted',
            message: reason,
            code,
            isRetryable: false,
            canFallback: false,
          },
        },
      };
    } else if (quotaResult?.reservation_id) {
      return { blocked: false, reservationId: quotaResult.reservation_id };
    }
  } catch (quotaErr) {
    console.warn('[whatsappAiModelRunner] Falha não bloqueante ao consultar quota no banco:', quotaErr);
  }

  return { blocked: false };
}

/**
 * Libera reserva pendente de cota caso o turno não tenha consumido tokens.
 */
export async function releaseAiQuotaReservation(
  supabase: SupabaseClient,
  reservationId?: string
): Promise<void> {
  if (reservationId && typeof supabase?.rpc === 'function') {
    await Promise.resolve()
      .then(() => supabase.rpc('release_ai_reservation', { p_reservation_id: reservationId }))
      .catch(() => {});
  }
}
