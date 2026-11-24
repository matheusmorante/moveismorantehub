import type { SupabaseClient } from '@supabase/supabase-js';

interface DeletionBatch {
  runId: string;
  catalogId: string;
  retailerIds: string[];
}

export async function recordDeletionAttempts(
  db: SupabaseClient,
  { runId, catalogId, retailerIds, trigger }: DeletionBatch & { trigger: string },
): Promise<void> {
  const { error } = await db.from('meta_catalog_sync_deletions').insert(retailerIds.map((retailerId) => ({
    run_id: runId,
    catalog_id: catalogId,
    retailer_id: retailerId,
    trigger,
  })));
  if (error) throw new Error('O histórico de exclusões não pôde ser registrado no Supabase.');
}

export async function confirmDeletionHistory(
  db: SupabaseClient,
  { runId, catalogId, retailerIds }: DeletionBatch,
): Promise<void> {
  const { error, count } = await db.from('meta_catalog_sync_deletions')
    .update({ confirmed_at: new Date().toISOString() }, { count: 'exact' })
    .eq('run_id', runId).eq('catalog_id', catalogId).in('retailer_id', retailerIds);
  if (error || count !== retailerIds.length) {
    throw new Error('A Meta confirmou a exclusão, mas o histórico ainda não pôde ser atualizado.');
  }
}
