import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/pages/utils/supabaseConfig';
import { triggerProductMetaCatalogSync } from './productMetaCatalogSync';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import {
  duplicateProductMergeAckSchema,
  duplicateProductMergeCommandSchema,
  duplicateProductMergeOptionSchema,
  duplicateProductMergeSearchSchema,
  DuplicateProductMergeUnconfirmedError,
} from '../../../../../shared-utils/productDuplicateMergeFormSchemas';

export type DuplicateProductMergeOption = ReturnType<typeof duplicateProductMergeOptionSchema.parse>;

export async function searchDuplicateProductMergeTargets(
  sourceId: string,
  query: string,
  stillCurrent: () => boolean = () => true,
): Promise<DuplicateProductMergeOption[]> {
  const parsed = duplicateProductMergeSearchSchema.safeParse({ sourceId, query });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Confira a busca do produto canônico.');

  const term = parsed.data.query.replace(/[\\%_]/g, '\\$&');
  const pattern = `%${term}%`;
  const readTargets = async (column: 'code' | 'name') => withTimeout(
    supabase.from('products')
      .select('id, code, name, stock')
      .eq('active', true)
      .eq('deleted', false)
      .eq('has_variations', true)
      .eq('is_combo', false)
      .neq('id', parsed.data.sourceId)
      .ilike(column, pattern)
      .limit(12),
    10000,
    null,
    `mesclar-produto:buscar-${column}`,
  );

  const [byCode, byName] = await Promise.all([readTargets('code'), readTargets('name')]);
  if (!stillCurrent()) return [];
  if (!byCode || !byName) throw new Error('A busca de produtos excedeu o prazo. Tente novamente.');
  if (byCode.error || byName.error) throw byCode.error || byName.error;

  const unique = new Map<string, DuplicateProductMergeOption>();
  for (const row of [...(byCode.data ?? []), ...(byName.data ?? [])]) {
    const option = duplicateProductMergeOptionSchema.safeParse(row);
    if (option.success) unique.set(option.data.id, option.data);
  }
  return [...unique.values()].slice(0, 12);
}

export async function mergeDuplicateProductIntoCanonical(
  sourceId: string,
  canonicalId: string,
): Promise<ReturnType<typeof duplicateProductMergeAckSchema.parse>> {
  const command = duplicateProductMergeCommandSchema.parse({ sourceId, canonicalId });
  const identities = await withTimeout(
    supabase.from('products').select('id, deleted, active, has_variations').in('id', [command.sourceId, command.canonicalId]),
    10000,
    null,
    'mesclar-produto:identidades',
  );
  if (!identities || identities.error || identities.data?.length !== 2) {
    throw new Error('Não foi possível confirmar os produtos. Recarregue a lista.');
  }
  const source = identities.data.find((row) => row.id === command.sourceId);
  const canonical = identities.data.find((row) => row.id === command.canonicalId);
  if (!source || !canonical || source.deleted || canonical.deleted || canonical.active !== true
    || source.has_variations !== true || canonical.has_variations !== true) {
    throw new Error('Os produtos mudaram ou não são compatíveis para mesclagem. Recarregue a lista.');
  }

  let dispatched = false;
  try {
    dispatched = true;
    const response = await withTimeout(
      supabase.rpc('merge_duplicate_product_into_canonical', {
        p_source_product_id: command.sourceId,
        p_canonical_product_id: command.canonicalId,
      }),
      60000,
      null,
      'mesclar-produto:rpc',
    );
    if (!response) throw new DuplicateProductMergeUnconfirmedError();
    if (response.error) {
      const { error, status } = response;
      if (status === 0 || status >= 500 || !error.code || error.code === '40003' || error.code.startsWith('08')) {
        throw new DuplicateProductMergeUnconfirmedError();
      }
      dispatched = false;
      throw new Error(error.message || 'Não foi possível mesclar os produtos. Confira as referências e permissões.');
    }
    if ((response.data as { success?: boolean } | null)?.success !== true) {
      dispatched = false;
      throw new Error((response.data as { message?: string } | null)?.message || 'Não foi possível mesclar estes produtos.');
    }

    const ack = duplicateProductMergeAckSchema.parse(response.data);
    const [sourceAfter, canonicalAfter, variationsAfter] = await Promise.all([
      withTimeout(supabase.from('products').select('id, deleted').eq('id', command.sourceId).maybeSingle(), 10000, null, 'mesclar-produto:confirmar-origem'),
      withTimeout(supabase.from('products').select('id, stock').eq('id', command.canonicalId).maybeSingle(), 10000, null, 'mesclar-produto:confirmar-destino'),
      withTimeout(supabase.from('product_variations').select('merged_to_variation_id, active, status, stock').eq('product_id', command.sourceId), 10000, null, 'mesclar-produto:confirmar-variacoes'),
    ]);
    const sourceRow = sourceAfter?.data;
    const canonicalRow = canonicalAfter?.data;
    const sourceVariations = variationsAfter?.data;
    if (!sourceAfter || sourceAfter.error || sourceRow?.deleted !== true
      || !canonicalAfter || canonicalAfter.error || Number(canonicalRow?.stock) !== ack.canonical_stock
      || !variationsAfter || variationsAfter.error || !Array.isArray(sourceVariations)
      || sourceVariations.length !== ack.merged_variation_count
      || sourceVariations.some((variation) => !variation.merged_to_variation_id || variation.active !== false
        || variation.status !== 'hidden' || Number(variation.stock) !== 0)) {
      throw new DuplicateProductMergeUnconfirmedError();
    }

    triggerProductMetaCatalogSync(command.sourceId);
    triggerProductMetaCatalogSync(command.canonicalId);
    queryClient.invalidateQueries({ queryKey: ['products'] });
    return ack;
  } catch (error) {
    if (dispatched) {
      throw error instanceof DuplicateProductMergeUnconfirmedError
        ? error
        : new DuplicateProductMergeUnconfirmedError();
    }
    throw error;
  }
}
