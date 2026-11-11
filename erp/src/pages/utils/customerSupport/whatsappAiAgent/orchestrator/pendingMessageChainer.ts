import type { SupabaseClient } from '@supabase/supabase-js';
import type { InboundMessageParams } from '../whatsappAiAgentTypes.js';
import { acquireDistributedAiTurnLock } from '../whatsappAiAgentSecurity.js';

interface CheckAndPrepareNextTurnOptions {
  supabase: SupabaseClient;
  conversationId: string;
  now: Date;
  targetModel: string;
}

export async function checkAndPrepareNextPendingTurn({
  supabase,
  conversationId,
  now,
  targetModel,
}: CheckAndPrepareNextTurnOptions): Promise<{
  nextLock?: { turnId: string; lockToken: string };
  chainedInbound?: Pick<InboundMessageParams, 'conversationId' | 'messageId' | 'wamid' | 'text'>;
} | null> {
  const { data: pendingMessages, error } = await supabase
    .from('whatsapp_messages')
    .select('id, text_content, api_message_id, timestamp')
    .eq('conversation_id', conversationId)
    .eq('direction', 'inbound')
    .gt('timestamp', now.toISOString())
    .order('timestamp', { ascending: true });

  if (error || !pendingMessages) throw new Error('Não foi possível consultar as mensagens pendentes.');
  if (pendingMessages.length === 0) return null;

  const latestPending = pendingMessages[pendingMessages.length - 1];
  const bundledText = pendingMessages.map((m) => m.text_content).filter(Boolean).join('\n');

  if (!bundledText.trim()) return null;

  const nextLock = await acquireDistributedAiTurnLock(supabase, {
    conversationId,
    triggerWamid: latestPending.api_message_id || `pending-${latestPending.id}`,
    triggerMessageId: latestPending.id,
    leaseSeconds: 60,
    modelRequested: targetModel,
  });

  if (!nextLock.acquired) return null;
  if (!nextLock.turnId || !nextLock.lockToken) throw new Error('A trava do próximo atendimento não foi confirmada.');

  return {
    nextLock: { turnId: nextLock.turnId, lockToken: nextLock.lockToken },
    chainedInbound: {
      conversationId,
      messageId: latestPending.id,
      wamid: latestPending.api_message_id || `pending-${latestPending.id}`,
      text: bundledText,
    },
  };
}
