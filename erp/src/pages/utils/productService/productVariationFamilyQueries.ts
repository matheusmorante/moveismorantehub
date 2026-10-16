import { z } from 'zod';
import { supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { parseVariationImages } from './productImageHelpers';
import { variationFamilyQuerySchema, variationFamilyConflictSchema, variationFamilyUuidSchema, toFamilyAttributes, sameFamilyAttributes } from '../../../../../shared-utils/variationFamilyFormSchemas';

const optionalText = z.string().trim().nullish().transform((value) => value ?? undefined);
const familySchema = z.object({ id: variationFamilyUuidSchema, name: optionalText, description: optionalText, code: z.string().trim().min(1) });
const imagesSchema = z.array(z.string().trim().min(1));
const ensureCurrent = (stillCurrent: () => boolean) => { if (!stillCurrent()) throw new Error('A consulta da mudança de família mudou.'); };

export async function fetchVariationFamilyContext(input: z.input<typeof variationFamilyQuerySchema>, expectedParentId: string | undefined, stillCurrent: () => boolean) {
  const { sourceId } = variationFamilyQuerySchema.parse(input); ensureCurrent(stillCurrent);
  const source = await withTimeout(supabase.from('product_variations').select('id, product_id, image_url, images').eq('id', sourceId).single(), 10000, null, 'mover-variacao:origem');
  ensureCurrent(stillCurrent);
  if (!source || source.error || source.data?.id !== sourceId) throw new Error('Não foi possível confirmar a variação de origem. Consulte novamente.');
  const sourceParentId = variationFamilyUuidSchema.parse(source.data.product_id);
  if (expectedParentId && sourceParentId !== variationFamilyUuidSchema.parse(expectedParentId)) throw new Error('A variação mudou de produto pai. Recarregue antes de continuar.');
  const count = await withTimeout(supabase.from('product_variations').select('id', { count: 'exact', head: true }).eq('product_id', sourceParentId), 10000, null, 'mover-variacao:contagem');
  ensureCurrent(stillCurrent);
  if (!count || count.error || !Number.isInteger(count.count) || count.count! < 1) throw new Error('Não foi possível confirmar as variações do produto de origem. Consulte novamente.');
  let images = imagesSchema.parse(parseVariationImages(source.data.image_url, source.data.images));
  if (!images.length) {
    const photos = await withTimeout(supabase.from('product_images').select('image_url').eq('product_id', sourceParentId), 10000, null, 'mover-variacao:fotos-origem');
    ensureCurrent(stillCurrent);
    if (!photos || photos.error || !Array.isArray(photos.data)) throw new Error('Não foi possível consultar as fotos da origem. Consulte novamente.');
    images = imagesSchema.parse(photos.data.map((photo) => photo.image_url));
  }
  return { sourceParentId, isOnlyVariation: count.count === 1, images: [...new Set(images)] };
}

export async function fetchVariationFamilies(input: z.input<typeof variationFamilyQuerySchema>, stillCurrent: () => boolean) {
  variationFamilyQuerySchema.parse(input); ensureCurrent(stillCurrent);
  const families: z.output<typeof familySchema>[] = [];
  for (let offset = 0; ; offset += 1000) {
  const result = await withTimeout(supabase.from('products').select('id, name, description, code').eq('deleted', false)
    .not('code', 'is', null).neq('code', '').order('name', { ascending: true }).order('id', { ascending: true }).range(offset, offset + 999), 10000, null, 'mover-variacao:familias');
  ensureCurrent(stillCurrent);
  if (!result || result.error || !Array.isArray(result.data)) throw new Error('Não foi possível carregar os produtos pai. Consulte novamente.');
  const page = z.array(familySchema).parse(result.data); families.push(...page);
  if (page.length < 1000) return families;
  }
}

export async function fetchVariationFamilyConflict(input: z.input<typeof variationFamilyConflictSchema>, stillCurrent: () => boolean) {
  const values = variationFamilyConflictSchema.parse(input); ensureCurrent(stillCurrent);
  for (let offset = 0; ; offset += 1000) {
  const result = await withTimeout(supabase.from('product_variations').select('id, attributes').eq('product_id', values.familyId)
    .order('id', { ascending: true }).range(offset, offset + 999), 10000, null, 'mover-variacao:conflitos');
  ensureCurrent(stillCurrent);
  if (!result || result.error || !Array.isArray(result.data)) throw new Error('Não foi possível validar as variações de destino. Consulte novamente.');
  const conflict = result.data.some((candidate) => {
    variationFamilyUuidSchema.parse(candidate.id);
    if (candidate.attributes != null && typeof candidate.attributes !== 'object') throw new Error('Os atributos do destino não puderam ser confirmados.');
    return candidate.id !== values.sourceId && sameFamilyAttributes(values.attributes,
      toFamilyAttributes(candidate.attributes).filter((attribute) => attribute.name.trim() && attribute.value.trim()));
  });
  if (conflict) return true;
  if (result.data.length < 1000) return false;
  }
}
