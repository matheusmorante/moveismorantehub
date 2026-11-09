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
  if (!conversationId || isSimulation || conversationId.startsWith('simulated_')) {
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
    const { data: currentConv } = await supabase
      .from('whatsapp_conversations')
      .select('tags, internal_notes, ai_status')
      .eq('id', conversationId)
      .maybeSingle();

    const tags = Array.isArray(currentConv?.tags) ? currentConv.tags : [];
    const newTags = Array.from(new Set([...tags, 'atendimento_humano', 'intervencao_necessaria', 'aguardando_atendente']));

    const nowIso = new Date().toISOString();
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const noteLine = `[${dateStr} ${timeStr}] Intervenção humana necessária: ${reason}`;
    const updatedNotes = [currentConv?.internal_notes, noteLine].filter(Boolean).join('\n');

    // 1. Atualiza estado da IA na conversa no banco
    await supabase
      .from('whatsapp_conversations')
      .update({
        ai_status: 'needs_human',
        ai_handoff_reason: reason,
        ai_handoff_at: nowIso,
        tags: newTags,
        internal_notes: updatedNotes,
        updated_at: nowIso,
      })
      .eq('id', conversationId);

    // 2. Grava nota interna em whatsapp_messages visível exclusivamente para atendentes
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      direction: 'outbound',
      message_type: 'internal_note',
      text_content: `⚠️ Intervenção humana necessária: ${reason}\nAviso interno — não enviado ao cliente.`,
      status: 'delivered',
      raw_payload: {
        origin: 'customer_support_ai_agent',
        is_internal_note: true,
        author_name: 'Lizandro (IA)',
        author_role: 'Assistente IA',
        silent_handoff: isSilent,
        handoff_reason: reason,
      },
      timestamp: nowIso,
    });

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
      erro: 'Não foi possível transferir para atendente humano automaticamente no momento: ' + (err?.message || err),
    };
  }
}
