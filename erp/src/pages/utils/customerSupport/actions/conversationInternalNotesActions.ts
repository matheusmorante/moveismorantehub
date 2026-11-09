import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppMessage } from '@/pages/App/CustomerSupport/types';
import { mapRowToMessage } from '../customerSupportMappers';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { supportInternalCommentSchema } from '../../../../../../shared-utils/customerSupportFormSchemas';

/** Authenticated identity and timestamp are derived by the RPC. */
export async function createInternalNoteMessage(
  supabase: SupabaseClient,
  conversationId: string,
  textContent: string,
  _author?: { id: string; name: string; role?: string }
): Promise<WhatsAppMessage | null> {
  const parsed = supportInternalCommentSchema.safeParse({ comment: textContent });
  if (!parsed.success) return null;
  const response = await withTimeout(
    supabase.rpc('customer_support_add_internal_note', {
      p_conversation_id: conversationId,
      p_text: parsed.data.comment,
    }),
    15_000,
    null,
    'central:comentario'
  );
  const row = Array.isArray(response?.data) ? response.data[0] : null;
  return !response?.error && row ? mapRowToMessage(row) : null;
}
