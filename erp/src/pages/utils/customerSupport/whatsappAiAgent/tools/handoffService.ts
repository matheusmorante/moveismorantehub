import type { SupabaseClient } from '@supabase/supabase-js';

export interface HandoffOptions {
  conversationId: string;
  reason: string;
  isSilent?: boolean;
  isSimulation?: boolean;
}

export interface HandoffResult {
  success: boolean;
  simulated?: boolean;
  silentHandoff: boolean;
  motivo: string;
  mensagem: string;
  erro?: string;
}

/**
 * Registra o escalonamento para atendimento humano (silencioso ou com aviso)
 * Atualiza o status da conversa para 'needs_human', anexa notas internas e registra
 * uma mensagem interna em whatsapp_messages visível exclusivamente para atendentes do ERP.
 */
export async function recordHandoffToHuman(
  supabase: SupabaseClient,
  options: HandoffOptions
): Promise<HandoffResult> {
  const { conversationId, reason, isSilent = true, isSimulation = false } = options;

  // Guarda de isolamento: no ambiente de simulação/testes não altera registros reais do PostgreSQL
  if (!conversationId) {
    return { success: false, silentHandoff: isSilent, motivo: reason,
      mensagem: 'Falha ao registrar intervenção humana.', erro: 'Conversa não identificada.' };
  }
  if (isSimulation || conversationId.startsWith('simulated_')) {
    return {
      success: true,
      simulated: true,
      silentHandoff: isSilent,
      motivo: reason,
      mensagem: isSilent
        ? 'Intervenção humana silenciosa acionada com sucesso no ambiente de simulação.'
        : 'Atendimento transferido para a equipe humana com sucesso.',
    };
  }

  try {
    const { data, error } = await supabase.rpc('customer_support_record_ai_handoff', {
      p_conversation_id: conversationId, p_reason: reason, p_silent: isSilent,
    });
    if (error || data !== true) throw new Error('conversation_handoff_unconfirmed');

    return {
      success: true,
      silentHandoff: isSilent,
      motivo: reason,
      mensagem: isSilent
        ? 'Intervenção humana solicitada silenciosamente. A conversa foi sinalizada para a equipe e a IA foi pausada.'
        : 'Atendimento transferido para a equipe humana com sucesso.',
    };
  } catch (err: any) {
    return {
      success: false,
      silentHandoff: isSilent,
      motivo: reason,
      mensagem: 'Falha ao registrar intervenção humana.',
      erro: 'Não foi possível confirmar a transferência para atendente humano. Verifique a conversa no painel antes de continuar.',
    };
  }
}
