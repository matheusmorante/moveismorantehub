import { toTitleCase } from '../../../../../shared-utils/productText';
import { supabase } from '../../../services/supabaseClient';
import { MAX_VARIATION_IMAGES } from '../domain/productImageLimits';

export interface MobileVariationAttribute {
  name: string;
  value: string;
  showName?: boolean;
}

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export const mobileVariationAttributesConflict = (
  first: readonly MobileVariationAttribute[],
  second: readonly MobileVariationAttribute[]
): boolean => {
  if (first.length !== second.length) return false;
  const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR');
  const secondMap = new Map(
    second.map((attribute) => [normalize(attribute.name), normalize(attribute.value)])
  );
  return first.every(
    (attribute) => secondMap.get(normalize(attribute.name)) === normalize(attribute.value)
  );
};

export const fetchMobileVariationFamilies = async (
  sourceParentId?: string
): Promise<MobileVariationFamily[]> => {
  let query = supabase
    .from('products')
    .select('id, name, description, code')
    .eq('deleted', false)
    .not('code', 'is', null)
    .neq('code', '')
    .order('name', { ascending: true });
  if (sourceParentId) query = query.neq('id', sourceParentId);

  const { data, error } = await query;
  if (error) throw new Error('Não foi possível carregar os produtos pai.');
  return (data || []) as MobileVariationFamily[];
};

export const countMobileParentVariations = async (parentId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('product_variations')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', parentId);
  if (error) throw new Error('Não foi possível confirmar as variações do produto de origem.');
  return count || 0;
};

export const checkMobileVariationAttributeConflict = async (
  targetFamilyId: string,
  attributes: readonly MobileVariationAttribute[]
): Promise<boolean> => {
  const validAttributes = attributes.filter(
    (attribute) => attribute.name.trim() && attribute.value.trim()
  );
  const { data, error } = await supabase
    .from('product_variations')
    .select('id, attributes')
    .eq('product_id', targetFamilyId);
  if (error) throw new Error('Não foi possível validar as variações do produto pai.');

  return (data || []).some((candidate: any) =>
    mobileVariationAttributesConflict(
      validAttributes,
      toMobileVariationAttributes(candidate.attributes).filter(
        (attribute) => attribute.name.trim() && attribute.value.trim()
      )
    )
  );
};

export const ensureMobileAttributeValue = async (
  name: string,
  value: string
): Promise<MobileVariationAttribute> => {
  const normalizedName = toTitleCase(name.trim());
  const normalizedValue = toTitleCase(value.trim());
  const { data: attributes, error: attributeError } = await supabase
    .from('attributes')
    .select('id, name')
    .ilike('name', normalizedName)
    .limit(1);
  if (attributeError) throw attributeError;

  let attribute = attributes?.[0];
  if (!attribute) {
    const { data, error } = await supabase
      .from('attributes')
      .insert({ name: normalizedName, active: true })
      .select('id, name')
      .single();
    if (error) throw error;
    attribute = data;
  }

  const { data: values, error: valueError } = await supabase
    .from('attribute_values')
    .select('value')
    .eq('attribute_id', attribute.id)
    .ilike('value', normalizedValue)
    .limit(1);
  if (valueError) throw valueError;

  let canonicalValue = values?.[0]?.value;
  if (!canonicalValue) {
    const { data, error } = await supabase
      .from('attribute_values')
      .insert({ attribute_id: attribute.id, value: normalizedValue })
      .select('value')
      .single();
    if (error) throw error;
    canonicalValue = data.value;
  }

  return { name: attribute.name, value: canonicalValue };
};

export const moveMobileVariationToFamily = async (
  variationId: string,
  targetFamilyId: string,
  attributes: readonly MobileVariationAttribute[],
  name: string,
  imageUrls: readonly string[],
  sourceParentId?: string
): Promise<{ newSku: string; sourceParentRemoved: boolean }> => {
  if (!UUID_PATTERN.test(variationId)) {
    throw new Error(
      'A variação precisa ter um UUID válido para ser movida. Atualize o cadastro legado antes de continuar.'
    );
  }
  const variationImages = Array.from(new Set(imageUrls.filter(Boolean)));
  if (variationImages.length > MAX_VARIATION_IMAGES) {
    throw new Error(`Cada variação pode vincular no máximo ${MAX_VARIATION_IMAGES} fotos.`);
  }

  const { data, error } = await supabase.rpc('move_variation_to_parent', {
    p_variation_id: variationId,
    p_target_parent_id: targetFamilyId,
    p_attributes: attributes,
    p_name: name,
    p_images: variationImages,
    p_source_parent_id: sourceParentId || null,
  });
  if (error) throw new Error(`Falha ao mover variação no banco: ${error.message}`);

  // A RPC atualiza o JSON principal em transação; a relação normalizada de fotos
  // acompanha o contrato existente do ERP e é reparável sem reverter o movimento.
  if (variationImages.length > 0) {
    const { data: existingImages, error: fetchError } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', targetFamilyId);
    if (fetchError) {
      console.warn('Não foi possível reconciliar as fotos do produto pai após mover a variação.');
    } else {
      const existingUrls = new Set((existingImages || []).map((image: any) => image.image_url));
      const records = variationImages
        .filter((url) => !existingUrls.has(url))
        .map((image_url) => ({ product_id: targetFamilyId, image_url, is_main: false }));
      if (records.length > 0) {
        const { error: insertError } = await supabase.from('product_images').insert(records);
        if (insertError) {
          console.warn(
            'Não foi possível reconciliar as fotos do produto pai após mover a variação.'
          );
        }
      }
    }
  }

  return {
    newSku: String((data as any)?.newSku || ''),
    sourceParentRemoved: Boolean((data as any)?.sourceParentRemoved),
  };
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
