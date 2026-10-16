import { z } from 'zod';
import { supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { variationMergeSearchSchema, variationMergeOptionSchema } from '../../../../../shared-utils/variationMergeFormSchemas';

export async function searchCanonicalVariations(input: z.input<typeof variationMergeSearchSchema>, stillCurrent: () => boolean) {
  const values = variationMergeSearchSchema.parse(input);
  const check = () => { if (!stillCurrent()) throw new Error('A busca de variações mudou.'); };
  check();
  const pattern = JSON.stringify(values.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  let request = supabase.from('product_variations')
    .select('id, name, sku, merged_to_variation_id, product:products!inner(name, description, supplier_id, main_supplier_id)')
    .neq('id', values.sourceId).is('merged_to_variation_id', null)
    .or(`name.imatch.${pattern},sku.imatch.${pattern}`);
  if (values.supplierId) request = request.or(`supplier_id.eq.${values.supplierId},main_supplier_id.eq.${values.supplierId}`, { referencedTable: 'product' });
  const result = await withTimeout(request.order('name', { ascending: true }).order('id', { ascending: true }).limit(12), 10000, null, 'mesclar-variacao:buscar');
  check();
  if (!result) throw new Error('A busca de variações excedeu o prazo. Consulte novamente.');
  if (result.error || !Array.isArray(result.data)) throw new Error('Não foi possível buscar variações. Consulte novamente.');
  return z.array(variationMergeOptionSchema).parse(result.data).filter((option) => option.id !== values.sourceId && !option.merged_to_variation_id
    && (!values.supplierId || option.product?.supplier_id === values.supplierId || option.product?.main_supplier_id === values.supplierId));
}
