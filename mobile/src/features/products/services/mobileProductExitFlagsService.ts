import { INVENTORY_EXIT_QUERY_TYPES } from '../../../../../shared-utils/inventoryMoveToDb';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';
import { supabase } from '../../../services/supabaseClient';

const VARIATION_ID_BATCH_SIZE = 100;

interface InventoryMoveVariationRow {
  readonly variation_id?: string | null;
}

export async function fetchMobileProductExitFlags(
  variationIds: readonly string[]
): Promise<Set<string>> {
  const requestedIds = [...new Set(variationIds.map((id) => id.trim()).filter(Boolean))];
  const exitedVariationIds = new Set<string>();

  for (let offset = 0; offset < requestedIds.length; offset += VARIATION_ID_BATCH_SIZE) {
    const batch = requestedIds.slice(offset, offset + VARIATION_ID_BATCH_SIZE);
    const requestedBatch = new Set(batch);
    const query = supabase
      .from('inventory_moves')
      .select('variation_id')
      .in('variation_id', batch)
      .in('type', [...INVENTORY_EXIT_QUERY_TYPES])
      .not('order_id', 'is', null)
      .not('variation_id', 'is', null);
    const { data, error } = await withAbortTimeout(query, 'mobile:product-exit-flags');

    if (error) throw error;

    ((data || []) as readonly InventoryMoveVariationRow[]).forEach((row) => {
      const variationId = row.variation_id ? String(row.variation_id) : '';
      if (requestedBatch.has(variationId)) exitedVariationIds.add(variationId);
    });
  }

  return exitedVariationIds;
}
