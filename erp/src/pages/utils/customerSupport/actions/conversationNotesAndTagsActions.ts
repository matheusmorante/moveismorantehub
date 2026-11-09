import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import {
  supportNotesSchema,
  supportTagSchema,
} from '../../../../../../shared-utils/customerSupportFormSchemas';

/** Change only notes, with optimistic conflict detection; never overwrite tags. */
export async function updateConversationNotes(
  supabase: SupabaseClient,
  conversationId: string,
  notes: string,
  expectedNotes: string | null
): Promise<boolean> {
  const parsed = supportNotesSchema.safeParse({ notes });
  if (!parsed.success) return false;
  const response = await withTimeout(
    supabase.rpc('customer_support_set_internal_notes', {
      p_conversation_id: conversationId,
      p_notes: parsed.data.notes,
      p_expected_notes: expectedNotes,
    }),
    15_000,
    null,
    'central:salvar-notas'
  );
  if (
    response?.error?.code === '40001' ||
    (response?.error?.code === 'P0001' &&
      response.error.message?.startsWith('CUSTOMER_SUPPORT_NOTES_CONFLICT:'))
  ) {
    throw new Error('As notas foram alteradas por outro atendimento. Atualize antes de salvar.');
  }
  return !response?.error && response?.data === true;
}

/** Add/remove a single tag on the server, preserving concurrent status/notes. */
export async function updateConversationTag(
  supabase: SupabaseClient,
  conversationId: string,
  tag: string,
  remove: boolean
): Promise<string[] | null> {
  const parsed = supportTagSchema.safeParse({ tagInput: tag });
  if (!parsed.success) return null;
  const response = await withTimeout(
    supabase.rpc('customer_support_update_tag', {
      p_conversation_id: conversationId,
      p_tag: parsed.data.tagInput,
      p_remove: remove,
    }),
    15_000,
    null,
    'central:salvar-marcador'
  );
  return !response?.error && Array.isArray(response?.data) ? (response.data as string[]) : null;
}
