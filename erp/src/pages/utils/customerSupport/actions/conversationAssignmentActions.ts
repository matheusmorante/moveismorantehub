import type { SupabaseClient } from '@supabase/supabase-js';
import type { AssignedProfileSummary } from '@/pages/App/CustomerSupport/types';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

/** Assignment and its persisted event are a single server command. */
export async function assignConversation(
  supabase: SupabaseClient,
  conversationId: string,
  profileId: string | null,
  _profileName?: string,
  _currentUserName?: string
): Promise<boolean> {
  const response = await withTimeout(
    supabase.rpc('customer_support_assign_conversation', {
      p_conversation_id: conversationId,
      p_assignee_id: profileId,
    }),
    15_000,
    null,
    'central:atribuir'
  );
  return !response?.error && response?.data === true;
}

export async function fetchTeamProfiles(
  supabase: SupabaseClient
): Promise<AssignedProfileSummary[]> {
  const response = await withTimeout<any>(
    supabase.rpc('customer_support_list_agents'),
    15_000,
    null,
    'central:atendentes'
  );
  const { data, error } = response || { data: null, error: new Error('Timeout ao carregar atendentes') };

  if (error || !Array.isArray(data)) {
    throw new Error('Não foi possível carregar os atendentes. Tente novamente.');
  }

  return (data as Array<{ id: string; full_name: string | null; role: string | null }>).map((p) => ({
    id: p.id,
    fullName: p.full_name || 'Atendente',
    role: p.role || undefined,
  }));
}
