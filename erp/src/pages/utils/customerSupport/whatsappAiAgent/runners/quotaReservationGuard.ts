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
  toolContext?: SafeToolContext,
  estimatedTokens = 1500
): Promise<QuotaCheckResult> {
  if (typeof supabase?.rpc !== 'function') {
    throw new Error('A verificação de cota de IA está indisponível. O atendimento automático foi interrompido.');
  }

  try {
    const { data: quotaResult, error } = await supabase.rpc('customer_support_reserve_ai_quota', {
      p_provider: provider,
      p_service: 'whatsapp_ai_agent',
      p_estimated_tokens: estimatedTokens,
      p_module_source: 'whatsapp_commercial_agent',
    });

    if (error || !quotaResult || typeof quotaResult.allowed !== 'boolean') {
      throw new Error(error?.message || 'Resposta inválida da verificação de cota.');
    }

    if (quotaResult && !quotaResult.allowed) {
      const reason = quotaResult.reason || 'Limite de cota de IA atingido.';
      const code = quotaResult.code || 'quota_exhausted';

      // PONTO CRÍTICO: Executa diretamente a transição de atendimento humano no PostgreSQL
      // muta a conversa no banco sem acionar o modelo de IA.
      if (toolContext?.conversationId) {
        const handoffResult = await executeSafeTool(
          supabase,
          'encaminharParaAtendimentoHumano',
          { motivo: `Limite de cota de IA atingido: ${reason}` },
          toolContext
        );
        if (handoffResult?.success !== true) {
          throw new Error('A transferência humana não pôde ser confirmada.');
        }
      } else {
        throw new Error('A transferência humana não pôde ser confirmada.');
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
          handoffConfirmed: true,
          errorInfo: {
            type: 'quota_exhausted',
            message: reason,
            code,
            isRetryable: false,
            canFallback: false,
          },
        },
      };
    } else if (quotaResult.reservation_id) {
      return { blocked: false, reservationId: quotaResult.reservation_id };
    }
    throw new Error('A cota foi aprovada sem criar a reserva de segurança.');
  } catch (quotaErr) {
    console.error('[whatsappAiModelRunner] Não foi possível reservar a cota de IA:', quotaErr);
    throw new Error('A verificação de custo da IA está indisponível. O atendimento não enviou uma resposta automática.');
  }
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
