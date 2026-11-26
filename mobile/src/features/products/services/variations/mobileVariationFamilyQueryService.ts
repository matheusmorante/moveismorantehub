import { z } from 'zod';
import { normalizeSearchTerm } from '../../../../../../shared-utils/core/searchText';
import {
  sameFamilyAttributes,
  toFamilyAttributes,
  variationFamilyConflictSchema,
  variationFamilyUuidSchema,
} from '../../../../../../shared-utils/variationFamilyFormSchemas';
import { withTimeout } from '../../../../../../shared-utils/core/withTimeout';
import { supabase } from '../../../../services/supabaseClient';
import type {
  MobileVariationAttribute,
  MobileVariationFamily,
} from '../../domain/variationActionsDomain';

export const VARIATION_FAMILY_PAGE_SIZE = 1000;
export const VARIATION_FAMILY_QUERY_TIMEOUT_MS = 10_000;
export const VARIATION_FAMILY_MUTATION_TIMEOUT_MS = 20_000;

const mobileVariationFamilySchema = z.object({
  id: variationFamilyUuidSchema,
  name: z.string().trim().nullish(),
  description: z.string().trim().nullish(),
  code: z.string().trim().min(1),
});

export interface MobileVariationFamilyAttributeLookup {
  index: number;
  attributeId: string | null;
  name: string | null;
  value: string | null;
}

export const ensureQueryIsCurrent = (stillCurrent: () => boolean): void => {
  if (!stillCurrent()) throw new Error('A consulta da mudança de família mudou.');
};

export const searchMobileVariationFamilies = async (
  search: string,
  sourceParentId: string,
  stillCurrent: () => boolean = () => true
): Promise<MobileVariationFamily[]> => {
  const parentId = variationFamilyUuidSchema.parse(sourceParentId);
  const queryText = normalizeSearchTerm(search);
  ensureQueryIsCurrent(stillCurrent);
  if (queryText.length < 3) return [];

  const result = await withTimeout(
    supabase.rpc('search_variation_family_suggestions', {
      p_search: queryText,
      p_source_parent_id: parentId,
    }),
    VARIATION_FAMILY_QUERY_TIMEOUT_MS,
    null,
    'mover-variacao:buscar-familias'
  );
  ensureQueryIsCurrent(stillCurrent);
  if (!result || result.error || !Array.isArray(result.data)) {
    throw new Error('Não foi possível buscar os produtos pai. Consulte novamente.');
  }
  return z.array(mobileVariationFamilySchema).parse(result.data) as MobileVariationFamily[];
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
    throw new Error(
      'Não foi possível confirmar as variações do produto de origem. Consulte novamente.'
    );
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

    const page = z
      .array(z.object({ id: variationFamilyUuidSchema, attributes: z.unknown().nullish() }))
      .parse(result.data);
    const conflict = page.some((candidate) => {
      if (candidate.attributes != null && typeof candidate.attributes !== 'object') {
        throw new Error(
          'As características do destino não puderam ser confirmadas. Consulte novamente.'
        );
      }
      return (
        candidate.id !== values.sourceId &&
        sameFamilyAttributes(
          values.attributes,
          toFamilyAttributes(candidate.attributes).filter(
            (attribute) => attribute.name.trim() && attribute.value.trim()
          )
        )
      );
    });
    if (conflict) return true;
    if (page.length < VARIATION_FAMILY_PAGE_SIZE) return false;
  }
};

export const lookupMobileVariationFamilyAttributes = async (
  attributes: readonly { name: string; value: string }[],
  stillCurrent: () => boolean
): Promise<MobileVariationFamilyAttributeLookup[]> => {
  ensureQueryIsCurrent(stillCurrent);
  const response = await withTimeout(
    supabase.rpc('lookup_variation_family_attributes', { p_attributes: attributes }),
    VARIATION_FAMILY_QUERY_TIMEOUT_MS,
    null,
    'mover-variacao:atributos'
  );
  ensureQueryIsCurrent(stillCurrent);
  if (!response) throw new Error('A consulta de características excedeu o prazo.');
  if (response.error) throw response.error;
  if (!Array.isArray(response.data) || response.data.length !== attributes.length) {
    throw new Error('Não foi possível confirmar a consulta das características.');
  }

  return response.data.map((raw, index) => {
    const entry =
      raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
    if (
      !entry ||
      entry.index !== index ||
      (entry.attributeId !== null && typeof entry.attributeId !== 'string') ||
      (entry.name !== null && typeof entry.name !== 'string') ||
      (entry.value !== null && typeof entry.value !== 'string') ||
      (entry.attributeId === null) !== (entry.name === null) ||
      (entry.attributeId === null && entry.value !== null)
    ) {
      throw new Error('Não foi possível confirmar a consulta das características.');
    }
    return entry as unknown as MobileVariationFamilyAttributeLookup;
  });
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
    throw new Error(
      'A variação mudou de produto pai ou não pôde ser confirmada. Recarregue antes de continuar.'
    );
  }
};
