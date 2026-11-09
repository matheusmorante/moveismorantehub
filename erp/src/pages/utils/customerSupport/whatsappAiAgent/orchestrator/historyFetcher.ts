import type { SupabaseClient } from '@supabase/supabase-js';
import { buildCustomerFacingOpenAiHistory } from '../whatsappAiAgentHistory.js';

export interface FormattedHistories {
  historyForOpenAi: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Busca as últimas 10 mensagens da conversa e formata o histórico para OpenAI.
 */
export async function fetchAndFormatConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
  currentInboundText: string
): Promise<FormattedHistories> {
  const { data: historyRows } = await supabase
    .from('whatsapp_messages')
    .select('direction, message_type, text_content, raw_payload, timestamp')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: false })
    .limit(10);

  const chronologicalHistory = (historyRows || []).slice().reverse();
  const historyForOpenAi = buildCustomerFacingOpenAiHistory(chronologicalHistory);

  // Adiciona o turno do usuário atual se ainda não estiver presente no histórico
  if (
    historyForOpenAi.length === 0 ||
    historyForOpenAi[historyForOpenAi.length - 1].role !== 'user'
  ) {
    historyForOpenAi.push({ role: 'user', content: currentInboundText });
  }

  return { historyForOpenAi };
}
