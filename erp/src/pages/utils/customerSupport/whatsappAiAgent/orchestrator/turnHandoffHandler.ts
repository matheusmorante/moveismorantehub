import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppConversationLike } from '../whatsappAiAgentTypes.js';

export async function handleImmediateSituationHandoff(
  supabase: SupabaseClient,
  conversationId: string,
  conv: WhatsAppConversationLike,
  situationName: string,
  now: Date
): Promise<void> {
  const currentTags = Array.isArray(conv.tags) ? [...conv.tags] : [];
  const newTags = Array.from(
    new Set([...currentTags, 'atendimento_humano', 'intervencao_necessaria'])
  );

  await supabase
    .from('whatsapp_conversations')
    .update({
      tags: newTags,
      ai_status: 'needs_human',
      ai_handoff_reason: `Solicitação identificada pela regra: ${situationName}`,
      ai_handoff_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', conversationId);
}
