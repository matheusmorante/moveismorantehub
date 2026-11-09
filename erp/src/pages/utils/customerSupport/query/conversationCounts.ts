import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

export async function fetchConversationCounts(
  supabase: SupabaseClient
): Promise<{ all: number; mine: number; unassigned: number; unread: number }> {
  const response = await withTimeout<any>(
    supabase.rpc('customer_support_conversation_counts'),
    15_000,
    null,
    'central:contagens'
  );
  const { data, error } = response || { data: null, error: new Error('Timeout nas contagens da Central') };
  if (error || !data?.[0]) {
    throw new Error('Não foi possível atualizar as contagens da Inbox.');
  }
  return {
    all: Number(data[0].all_count) || 0,
    mine: Number(data[0].mine_count) || 0,
    unassigned: Number(data[0].unassigned_count) || 0,
    unread: Number(data[0].unread_count) || 0,
  };
}
