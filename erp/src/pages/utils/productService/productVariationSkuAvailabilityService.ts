import { supabase } from '@/pages/utils/supabaseConfig';
import {
  findNextAvailableVariationSku,
  generateVariationSku,
  type ProductVariationSkuSource,
} from '../../../../../shared-utils/productVariationSku';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

const SKU_LOOKUP_TIMEOUT_MS = 10000;
const SKU_UNIQUE_CONSTRAINT = 'product_variations_sku_key';

export interface ResolveVariationSkuInput {
  parentCode: string;
  variationId: string;
  requestedSku?: string | null;
  siblingVariations: readonly ProductVariationSkuSource[];
}

export interface ResolvedVariationSku {
  sku: string;
  generated: boolean;
}

const skuAlreadyUsedError = (sku: string) =>
  new Error(`O SKU "${sku}" já está cadastrado em outra variação. Altere o SKU e tente novamente.`);

const findFreeGeneratedSku = async (
  parentCode: string,
  variationId: string,
  siblingVariations: readonly ProductVariationSkuSource[]
): Promise<string> => {
  const locallyUsedSkus = new Set(
    siblingVariations.map((variation) => String(variation.sku || '').trim()).filter(Boolean)
  );

  return findNextAvailableVariationSku(
    parentCode,
    async (candidates) => {
      const response = await withTimeout(
        supabase
          .from('product_variations')
          .select('id, sku')
          .in('sku', [...candidates]),
        SKU_LOOKUP_TIMEOUT_MS,
        null,
        'variacao:consultar-skus-sequenciais-livres'
      );

      if (!response) {
        throw new Error('Não foi possível confirmar a disponibilidade do SKU. Tente novamente.');
      }
      if (response.error) throw response.error;

      return new Set(
        (response.data || [])
          .filter((variation) => String(variation.id) !== String(variationId))
          .map((variation) => String(variation.sku || '').trim())
          .filter(Boolean)
      );
    },
    locallyUsedSkus
  );
};

export const resolveVariationSkuForPersistence = async ({
  parentCode,
  variationId,
  requestedSku,
  siblingVariations,
}: ResolveVariationSkuInput): Promise<ResolvedVariationSku> => {
  const normalizedParentCode = String(parentCode || '').trim() || '000000';
  const submittedSku = String(requestedSku || '').trim();
  const generatedSku = generateVariationSku(normalizedParentCode, siblingVariations);
  const generated = !submittedSku || submittedSku === generatedSku;
  const sku = submittedSku || generatedSku;

  const localCollision = siblingVariations.some(
    (variation) =>
      String(variation.sku || '').trim().toLocaleUpperCase('pt-BR') ===
      sku.toLocaleUpperCase('pt-BR')
  );
  if (localCollision) {
    if (!generated) throw skuAlreadyUsedError(sku);
    return {
      sku: await findFreeGeneratedSku(normalizedParentCode, variationId, siblingVariations),
      generated: true,
    };
  }

  const ownerLookup = await withTimeout(
    supabase
      .from('product_variations')
      .select('id')
      .eq('sku', sku)
      .neq('id', variationId)
      .maybeSingle(),
    SKU_LOOKUP_TIMEOUT_MS,
    null,
    'variacao:verificar-sku'
  );

  if (!ownerLookup) {
    throw new Error('Não foi possível confirmar a disponibilidade do SKU. Tente novamente.');
  }
  if (ownerLookup.error) throw ownerLookup.error;

  if (!ownerLookup.data) return { sku, generated };
  if (!generated) throw skuAlreadyUsedError(sku);

  return {
    sku: await findFreeGeneratedSku(normalizedParentCode, variationId, siblingVariations),
    generated: true,
  };
};

export const isVariationSkuUniqueConstraintError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown; constraint?: unknown };
  if (candidate.code !== '23505') return false;

  return [candidate.message, candidate.details, candidate.constraint].some(
    (value) => typeof value === 'string' && value.includes(SKU_UNIQUE_CONSTRAINT)
  );
};
