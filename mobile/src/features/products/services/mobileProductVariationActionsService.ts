import { z } from 'zod';
import { toTitleCase } from '../../../../../shared-utils/productText';
import {
  sameFamilyAttributes,
  toFamilyAttributes,
  VariationFamilyUnconfirmedError,
  variationFamilyAckSchema,
  variationFamilyAttributeSchema,
  variationFamilyCommandSchema,
  variationFamilyConflictSchema,
  variationFamilyUuidSchema,
  type FamilyAttribute,
} from '../../../../../shared-utils/variationFamilyFormSchemas';
import { parseVariationImages } from '../../../../../shared-utils/productVariationImages';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { supabase } from '../../../services/supabaseClient';
import { MAX_VARIATION_IMAGES } from '../domain/productImageLimits';

export type MobileVariationAttribute = FamilyAttribute;

export interface MobileVariationFamily {
  id: string;
  name?: string | null;
  description?: string | null;
  code?: string | null;
}

export interface MobileCanonicalVariation {
  id: string;
  name: string;
  sku?: string | null;
  product?: {
    name?: string | null;
    description?: string | null;
  } | null;
}

const VARIATION_FAMILY_PAGE_SIZE = 1000;
const VARIATION_FAMILY_QUERY_TIMEOUT_MS = 10_000;
const VARIATION_FAMILY_MUTATION_TIMEOUT_MS = 20_000;
const mobileVariationFamilySchema = z.object({
  id: variationFamilyUuidSchema,
  name: z.string().trim().nullish(),
  description: z.string().trim().nullish(),
  code: z.string().trim().min(1),
});

const ensureQueryIsCurrent = (stillCurrent: () => boolean) => {
  if (!stillCurrent()) throw new Error('A consulta da mudança de família mudou.');
};

export const toMobileVariationAttributes = (value: unknown): MobileVariationAttribute[] => {
  let attributes = value;
  if (typeof attributes === 'string') {
    try {
      attributes = JSON.parse(attributes);
    } catch {
      return [];
    }
  }

  if (Array.isArray(attributes)) {
    return attributes.filter(Boolean).map((item: any) => ({
      name: String(item?.name || item?.attribute || item?.key || ''),
      value: String(item?.value || item?.val || ''),
      showName: item?.showName,
    }));
  }

  if (attributes && typeof attributes === 'object') {
    return Object.entries(attributes as Record<string, unknown>).map(([name, rawValue]) => {
      const item = rawValue && typeof rawValue === 'object' ? (rawValue as any) : null;
      return {
        name,
        value: String(item?.value ?? item?.val ?? rawValue ?? ''),
        showName: item?.showName,
      };
    });
  }

  return [];
};

export const getMobileVariationActionRequirements = (
  parentProduct:
    | { supplierId?: unknown; supplier_id?: unknown; main_supplier_id?: unknown }
    | null
    | undefined,
  variation: { attributes?: unknown } | null | undefined
): { hasSupplier: boolean; hasValidAttributes: boolean } => ({
  hasSupplier: Boolean(
    parentProduct?.supplierId || parentProduct?.supplier_id || parentProduct?.main_supplier_id
  ),
  hasValidAttributes: toMobileVariationAttributes(variation?.attributes).some(
    (attribute) => attribute.name.trim() && attribute.value.trim()
  ),
});

export const mobileVariationAttributesConflict = (
  first: readonly MobileVariationAttribute[],
  second: readonly MobileVariationAttribute[]
): boolean => sameFamilyAttributes(first, second);

export const fetchMobileVariationFamilies = async (
  sourceParentId?: string,
  stillCurrent: () => boolean = () => true
): Promise<MobileVariationFamily[]> => {
  const parentId = sourceParentId ? variationFamilyUuidSchema.parse(sourceParentId) : undefined;
  ensureQueryIsCurrent(stillCurrent);
  const families: MobileVariationFamily[] = [];

  for (let offset = 0; ; offset += VARIATION_FAMILY_PAGE_SIZE) {
    let query = supabase
      .from('products')
      .select('id, name, description, code')
      .eq('deleted', false)
      .not('code', 'is', null)
      .neq('code', '')
      .order('name', { ascending: true })
      .order('id', { ascending: true });
    if (parentId) query = query.neq('id', parentId);

    const result = await withTimeout(
      query.range(offset, offset + VARIATION_FAMILY_PAGE_SIZE - 1),
      VARIATION_FAMILY_QUERY_TIMEOUT_MS,
      null,
      'mover-variacao:familias'
    );
    ensureQueryIsCurrent(stillCurrent);
    if (!result || result.error || !Array.isArray(result.data)) {
      throw new Error('Não foi possível carregar os produtos pai. Consulte novamente.');
    }

    const page = z.array(mobileVariationFamilySchema).parse(result.data) as MobileVariationFamily[];
    families.push(...page);
    if (page.length < VARIATION_FAMILY_PAGE_SIZE) return families;
  }
};

export const countMobileParentVariations = async (
  parentId: string,
  stillCurrent: () => boolean = () => true
): Promise<number> => {
  const validatedParentId = variationFamilyUuidSchema.parse(parentId);
  ensureQueryIsCurrent(stillCurrent);
  const result = await withTimeout(
    supabase
      .from('product_variations')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', validatedParentId),
    VARIATION_FAMILY_QUERY_TIMEOUT_MS,
    null,
    'mover-variacao:contagem'
  );
  ensureQueryIsCurrent(stillCurrent);
  if (!result || result.error || !Number.isInteger(result.count) || (result.count ?? 0) < 1) {
    throw new Error('Não foi possível confirmar as variações do produto de origem. Consulte novamente.');
  }
  return result.count!;
};

export const checkMobileVariationAttributeConflict = async (
  sourceVariationId: string,
  targetFamilyId: string,
  attributes: readonly MobileVariationAttribute[],
  stillCurrent: () => boolean = () => true
): Promise<boolean> => {
  const values = variationFamilyConflictSchema.parse({
    sourceId: sourceVariationId,
    familyId: targetFamilyId,
    attributes,
  });
  ensureQueryIsCurrent(stillCurrent);

  for (let offset = 0; ; offset += VARIATION_FAMILY_PAGE_SIZE) {
    const result = await withTimeout(
      supabase
        .from('product_variations')
        .select('id, attributes')
        .eq('product_id', values.familyId)
        .order('id', { ascending: true })
        .range(offset, offset + VARIATION_FAMILY_PAGE_SIZE - 1),
      VARIATION_FAMILY_QUERY_TIMEOUT_MS,
      null,
      'mover-variacao:conflitos'
    );
    ensureQueryIsCurrent(stillCurrent);
    if (!result || result.error || !Array.isArray(result.data)) {
      throw new Error('Não foi possível validar as variações do produto pai. Consulte novamente.');
    }

    const page = z.array(z.object({ id: variationFamilyUuidSchema, attributes: z.unknown().nullish() })).parse(result.data);
    const conflict = page.some((candidate) => {
      if (candidate.attributes != null && typeof candidate.attributes !== 'object') {
        throw new Error('As características do destino não puderam ser confirmadas. Consulte novamente.');
      }
      return candidate.id !== values.sourceId && sameFamilyAttributes(
        values.attributes,
        toFamilyAttributes(candidate.attributes).filter(
          (attribute) => attribute.name.trim() && attribute.value.trim()
        )
      );
    });
    if (conflict) return true;
    if (page.length < VARIATION_FAMILY_PAGE_SIZE) return false;
  }
};

export const ensureMobileAttributeValue = async (
  name: string,
  value: string,
  stillCurrent: () => boolean = () => true
): Promise<MobileVariationAttribute> => {
  const input = variationFamilyAttributeSchema.parse({ name, value });
  const normalizedName = toTitleCase(input.name);
  const normalizedValue = toTitleCase(input.value);
  const literal = (text: string) => `^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
  const check = () => ensureQueryIsCurrent(stillCurrent);
  const wait = async <T,>(query: PromiseLike<T>, write = false): Promise<T> => {
    check();
    let result: T | null;
    try {
      result = await withTimeout(query, VARIATION_FAMILY_QUERY_TIMEOUT_MS, null, 'mover-variacao:atributo');
    } catch (error) {
      if (write) throw new VariationFamilyUnconfirmedError('O cadastro da característica pode ter sido gravado. Consulte as características antes de repetir.');
      throw error;
    }
    if (result === null) {
      if (write) throw new VariationFamilyUnconfirmedError('O cadastro da característica não foi confirmado. Consulte as características antes de repetir.');
      throw new Error('A consulta de características excedeu o prazo.');
    }
    if (!stillCurrent()) {
      if (write) throw new VariationFamilyUnconfirmedError('O cadastro da característica pode ter sido gravado. Consulte as características antes de repetir.');
      check();
    }
    return result;
  };
  const handleWriteError = (error: { code?: string; message?: string; status?: number } | null | undefined) => {
    if (!error) return;
    if (!error.code || error.status === 0 || (error.status ?? 0) >= 500) {
      throw new VariationFamilyUnconfirmedError('O cadastro da característica pode ter sido gravado. Consulte as características antes de repetir.');
    }
    throw new Error(error.message || 'Não foi possível cadastrar a característica. Confira os dados e as permissões.');
  };

  const attributeResult = await wait(supabase
    .from('attributes')
    .select('id, name')
    .filter('name', 'imatch', literal(normalizedName))
    .limit(1));
  if (attributeResult.error) throw attributeResult.error;
  if (!Array.isArray(attributeResult.data)) throw new Error('Não foi possível confirmar a consulta da característica.');

  let attribute = attributeResult.data[0];
  if (!attribute) {
    const response = await wait(supabase
      .from('attributes')
      .insert({ name: normalizedName, active: true })
      .select('id, name')
      .single(), true);
    handleWriteError(response.error);
    if (!response.data) {
      throw new VariationFamilyUnconfirmedError('O cadastro da característica não foi confirmado. Consulte as características antes de repetir.');
    }
    attribute = response.data;
  }
  if (!attribute?.id || typeof attribute.name !== 'string'
    || attribute.name.trim().toLocaleLowerCase('pt-BR') !== normalizedName.toLocaleLowerCase('pt-BR')) {
    throw new VariationFamilyUnconfirmedError('O cadastro da característica não foi confirmado. Consulte as características antes de repetir.');
  }

  const valueResult = await wait(supabase
    .from('attribute_values')
    .select('value')
    .eq('attribute_id', attribute.id)
    .filter('value', 'imatch', literal(normalizedValue))
    .limit(1));
  if (valueResult.error) throw valueResult.error;
  if (!Array.isArray(valueResult.data)) throw new Error('Não foi possível confirmar a consulta do valor da característica.');

  let canonicalValue = valueResult.data[0]?.value;
  if (!valueResult.data.length) {
    const response = await wait(supabase
      .from('attribute_values')
      .insert({ attribute_id: attribute.id, value: normalizedValue })
      .select('value')
      .single(), true);
    handleWriteError(response.error);
    canonicalValue = response.data?.value;
  }
  if (typeof canonicalValue !== 'string'
    || canonicalValue.trim().toLocaleLowerCase('pt-BR') !== normalizedValue.toLocaleLowerCase('pt-BR')) {
    throw new VariationFamilyUnconfirmedError('O valor da característica não foi confirmado. Consulte as características antes de repetir.');
  }

  return variationFamilyAttributeSchema.parse({ name: attribute.name, value: canonicalValue });
};

export const verifyMobileVariationParent = async (
  variationId: string,
  sourceParentId: string,
  stillCurrent: () => boolean = () => true
): Promise<void> => {
  const sourceId = variationFamilyUuidSchema.parse(variationId);
  const parentId = variationFamilyUuidSchema.parse(sourceParentId);
  ensureQueryIsCurrent(stillCurrent);
  const result = await withTimeout(
    supabase.from('product_variations').select('id, product_id').eq('id', sourceId).maybeSingle(),
    VARIATION_FAMILY_QUERY_TIMEOUT_MS,
    null,
    'mover-variacao:confirmar-origem'
  );
  ensureQueryIsCurrent(stillCurrent);
  if (!result || result.error || result.data?.id !== sourceId || result.data.product_id !== parentId) {
    throw new Error('A variação mudou de produto pai ou não pôde ser confirmada. Recarregue antes de continuar.');
  }
};

export const moveMobileVariationToFamily = async (
  variationId: string,
  targetFamilyId: string,
  attributes: readonly MobileVariationAttribute[],
  name: string,
  imageUrls: readonly string[],
  sourceParentId?: string,
  stillCurrent: () => boolean = () => true
): Promise<{ newSku: string; sourceParentRemoved: boolean }> => {
  const parsedSourceId = variationFamilyUuidSchema.safeParse(variationId);
  if (!parsedSourceId.success) {
    throw new Error('A variação precisa ter um UUID válido para ser movida. Atualize o cadastro legado antes de continuar.');
  }
  const command = variationFamilyCommandSchema.parse({
    sourceId: parsedSourceId.data,
    familyId: targetFamilyId,
    sourceParentId: sourceParentId || '',
    attributes,
    name,
    images: imageUrls,
  });
  const variationImages = Array.from(new Set(command.images));
  if (variationImages.length > MAX_VARIATION_IMAGES) {
    throw new Error(`Cada variação pode vincular no máximo ${MAX_VARIATION_IMAGES} fotos.`);
  }

  await verifyMobileVariationParent(command.sourceId, command.sourceParentId, stillCurrent);
  const check = () => ensureQueryIsCurrent(stillCurrent);
  let dispatched = false;
  let moved = false;
  try {
    check();
    dispatched = true;
    const response = await withTimeout(supabase.rpc('move_variation_to_parent', {
      p_variation_id: command.sourceId,
      p_target_parent_id: command.familyId,
      p_attributes: command.attributes,
      p_name: command.name,
      p_images: variationImages,
      p_source_parent_id: command.sourceParentId,
    }), VARIATION_FAMILY_MUTATION_TIMEOUT_MS, null, 'mover-variacao:rpc');
    if (!response) throw new VariationFamilyUnconfirmedError();
    if (response.error) {
      const { error, status } = response;
      if (status === 0 || (status ?? 0) >= 500 || !error.code || error.code === '40003' || error.code.startsWith('08')) {
        throw new VariationFamilyUnconfirmedError();
      }
      dispatched = false;
      throw new Error('Não foi possível mover a variação. Confira os dados, o destino e as permissões.');
    }

    const acknowledgement = variationFamilyAckSchema.parse(response.data);
    check();
    const confirmation = await withTimeout(
      supabase.from('product_variations')
        .select('id, product_id, sku, name, attributes, image_url, images')
        .eq('id', command.sourceId)
        .single(),
      VARIATION_FAMILY_QUERY_TIMEOUT_MS,
      null,
      'mover-variacao:confirmar'
    );
    const row = confirmation?.data;
    const storedAttributes = toFamilyAttributes(row?.attributes);
    const storedImages = parseVariationImages(row?.image_url, row?.images);
    if (!confirmation || confirmation.error || row?.id !== command.sourceId
      || row.product_id !== command.familyId || row.sku !== acknowledgement.newSku
      || row.name !== command.name || !sameFamilyAttributes(command.attributes, storedAttributes)
      || command.attributes.some((attribute) => attribute.showName !== undefined
        && !storedAttributes.some((stored) => stored.name.trim().toLocaleLowerCase('pt-BR') === attribute.name.toLocaleLowerCase('pt-BR')
          && (stored.showName ?? true) === attribute.showName))
      || storedImages.length !== variationImages.length
      || variationImages.some((url) => !storedImages.includes(url))) {
      throw new VariationFamilyUnconfirmedError();
    }
    moved = true;
    check();

    if (acknowledgement.sourceParentRemoved) {
      const parent = await withTimeout(
        supabase.from('products').select('id, deleted').eq('id', command.sourceParentId).maybeSingle(),
        VARIATION_FAMILY_QUERY_TIMEOUT_MS,
        null,
        'mover-variacao:confirmar-origem'
      );
      if (!parent || parent.error || (parent.data
        && (parent.data.id !== command.sourceParentId || parent.data.deleted !== true))) {
        throw new VariationFamilyUnconfirmedError();
      }
    }
    check();

    if (variationImages.length > 0) {
      const photos = await withTimeout(
        supabase.from('product_images').select('image_url').eq('product_id', command.familyId),
        VARIATION_FAMILY_QUERY_TIMEOUT_MS,
        null,
        'mover-variacao:fotos-destino'
      );
      if (!photos || photos.error || !Array.isArray(photos.data)) throw new VariationFamilyUnconfirmedError();
      const existingUrls = new Set(photos.data.map((image: { image_url: string }) => image.image_url));
      const missingUrls = variationImages.filter((url) => !existingUrls.has(url));
      if (missingUrls.length > 0) {
        check();
        const inserted = await withTimeout(
          supabase.from('product_images').insert(missingUrls.map((image_url) => ({
            product_id: command.familyId,
            image_url,
            is_main: false,
          }))).select('product_id, image_url'),
          VARIATION_FAMILY_QUERY_TIMEOUT_MS,
          null,
          'mover-variacao:vincular-fotos'
        );
        if (!inserted || inserted.error || !Array.isArray(inserted.data)
          || inserted.data.length !== missingUrls.length
          || missingUrls.some((url) => !inserted.data.some((image: { product_id: string; image_url: string }) =>
            image.product_id === command.familyId && image.image_url === url))) {
          throw new VariationFamilyUnconfirmedError();
        }
      }
    }
    check();
    return acknowledgement;
  } catch (error) {
    if (dispatched) {
      throw moved
        ? new VariationFamilyUnconfirmedError('A variação foi movida, mas nem todas as etapas foram confirmadas. Confira o cadastro antes de repetir.')
        : new VariationFamilyUnconfirmedError();
    }
    throw error;
  }
};

export const searchMobileCanonicalVariations = async (
  term: string,
  sourceId: string,
  supplierId?: string
): Promise<MobileCanonicalVariation[]> => {
  const safeTerm = term
    .trim()
    .replace(/[%(),]/g, ' ')
    .replace(/"/g, '""');
  if (safeTerm.length < 2) return [];

  let query = supabase
    .from('product_variations')
    .select('id, name, sku, product:products!inner(name, description, supplier_id)')
    .neq('id', sourceId)
    .is('merged_to_variation_id', null)
    .or(`name.ilike."%${safeTerm}%",sku.ilike."%${safeTerm}%"`);
  if (supplierId) query = query.eq('products.supplier_id', supplierId);

  const { data, error } = await query.limit(12);
  if (error) throw new Error('Não foi possível buscar variações.');
  return (data || []) as unknown as MobileCanonicalVariation[];
};

export const mergeMobileVariationIntoCanonical = async (
  nonCanonicalVariationId: string,
  canonicalVariationId: string
): Promise<{ transferredSupplierIds: string[]; canonicalSupplierIds: string[] }> => {
  const { data, error } = await supabase.rpc('merge_product_variation_into_canonical', {
    p_non_canonical_variation_id: nonCanonicalVariationId,
    p_canonical_variation_id: canonicalVariationId,
  });
  if (error) throw new Error(`Falha ao fundir variações no banco: ${error.message}`);

  // O ERP aplica esta atualização após a RPC; falha aqui não desfaz o vínculo
  // canônico já confirmado pelo banco.
  const { error: statusError } = await supabase
    .from('product_variations')
    .update({ active: false, status: 'hidden' })
    .eq('id', nonCanonicalVariationId);
  if (statusError) console.error('Falha ao atualizar o estado da variação mesclada:', statusError);

  const result = data as any;
  return {
    transferredSupplierIds: Array.isArray(result?.transferredSupplierIds)
      ? result.transferredSupplierIds
      : [],
    canonicalSupplierIds: Array.isArray(result?.canonicalSupplierIds)
      ? result.canonicalSupplierIds
      : [],
  };
};
