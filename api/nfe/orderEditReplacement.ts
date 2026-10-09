import type { FiscalDatabase } from './fiscalDatabaseTypes';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Only a committed fiscal edit can reuse estorno while the sale stays scheduled. */
export async function hasPendingOrderEditEstorno(
  db: SupabaseClient<FiscalDatabase>, orderId: string, documentId: string, environment: number
) {
  const { data, error } = await db.from('nfe_order_edit_replacements').select('id')
    .eq('order_id', orderId).eq('original_document_id', documentId).eq('environment', environment)
    .eq('reversal_kind', 'estorno').eq('status', 'awaiting_reversal').maybeSingle();
  return !error && Boolean(data);
}
