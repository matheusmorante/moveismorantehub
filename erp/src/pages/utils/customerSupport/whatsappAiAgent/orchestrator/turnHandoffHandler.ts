import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppConversationLike } from '../whatsappAiAgentTypes.js';
import { recordHandoffToHuman } from '../tools/handoffService.js';

export async function handleImmediateSituationHandoff(
  supabase: SupabaseClient,
  conversationId: string,
  _conv: WhatsAppConversationLike,
  situationName: string,
  _now: Date
): Promise<void> {
  const result = await recordHandoffToHuman(supabase, {
    conversationId, reason: `Solicitação identificada pela regra: ${situationName}`, isSilent: true,
  });
  if (!result.success) {
    throw new Error('Falha ao registrar a solicitação de atendimento humano.');
  }
}
