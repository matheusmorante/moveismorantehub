import { supabase } from '../../../../services/supabaseClient';
import { withMobileMutationTimeout } from './mobileProductMutationTimeout';
import { parseLocalizedNumber as parseLocalizedPrice } from '../../domain/productNumbers';
import { resolveProductVariationName } from '../../domain/productVariationName';
import {
  findNextAvailableVariationSku,
  generateVariationSku,
  normalizeVariationSku,
} from '../../domain/productSku';
import { omitAbsentCompositionVariationId } from '../../../../../../shared-utils/productCompositionSerialization';

export const isMobileProductUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const normalizeMobileComboItems = (items: unknown) =>
  (Array.isArray(items) ? items : []).map((item: any) => ({
    ...omitAbsentCompositionVariationId({
      productId: item.productId ?? item.product_id,
      variationId: item.variationId ?? item.variation_id ?? null,
      quantity: Math.max(1, parseLocalizedPrice(item.quantity || 1)),
      description: item.description || item.productName || item.name || '',
      unitPrice: parseLocalizedPrice(item.unitPrice ?? item.unit_price ?? 0),
      stock: parseLocalizedPrice(item.stock ?? item.currentStock ?? 0),
    }),
  }));

interface BuildMobileProductVariationPayloadsParams {
  savedProductId: string;
  isEditing: boolean;
  isSalvado: boolean;
  productData: any;
  payload: any;
  variationsToSave: any[];
}

/** Resolve SKUs disponíveis, preserva CMPM persistido e monta os payloads das variações para a RPC. */
export async function buildMobileProductVariationPayloads({
  savedProductId,
  isEditing,
  isSalvado,
  productData,
  payload,
  variationsToSave,
}: BuildMobileProductVariationPayloadsParams): Promise<any[]> {
  const variationPayloads: any[] = [];
  if (!savedProductId || variationsToSave.length === 0) return variationPayloads;

  const parentCode = (payload.code || '000000').trim();
  const requestedSkus = [
    ...new Set(
      variationsToSave.map(
        (variation: any, index: number) =>
          normalizeVariationSku(variation.sku, parentCode) ||
          generateVariationSku(parentCode, index)
      )
    ),
  ];
  const existingVariationsResult = await withMobileMutationTimeout(
    supabase.from('product_variations').select('id, sku').in('sku', requestedSkus),
    'mobile:produto:consultar-skus-solicitados'
  );
  const requestedVariationIds = new Set(
    variationsToSave.map((variation: any) => String(variation.id || '')).filter(Boolean)
  );
  const existingSkuOwners = new Map<string, string>();
  const usedSkus = new Set<string>();
  for (const existingVariation of existingVariationsResult.data || []) {
    const sku = String(existingVariation.sku || '').trim();
    const id = String(existingVariation.id || '');
    if (!sku) continue;
    existingSkuOwners.set(sku, id);
    if (!requestedVariationIds.has(id)) usedSkus.add(sku);
  }
  const findAvailableSequentialSku = (variationId: string): Promise<string> =>
    findNextAvailableVariationSku(
      parentCode,
      async (candidates) => {
        const result = await withMobileMutationTimeout(
          supabase
            .from('product_variations')
            .select('id, sku')
            .in('sku', [...candidates]),
          'mobile:produto:consultar-sku-sequencial-livre'
        );
        const persistedCollisions = new Set<string>();
        for (const existingVariation of result.data || []) {
          const sku = String(existingVariation.sku || '').trim();
          const id = String(existingVariation.id || '');
          if (!sku) continue;
          existingSkuOwners.set(sku, id);
          if (id !== variationId) {
            persistedCollisions.add(sku);
            usedSkus.add(sku);
          }
        }
        return persistedCollisions;
      },
      usedSkus
    );
  const persistedVariationIds = isEditing
    ? variationsToSave
        .map((variation: any) => variation.id)
        .filter((id: unknown): id is string => isMobileProductUuid(id))
    : [];
  const persistedVariationCosts = new Map<string, unknown>();
  if (persistedVariationIds.length > 0) {
    const existingCostResult = await withMobileMutationTimeout(
      supabase
        .from('product_variations')
        .select('id, cost_price')
        .eq('product_id', savedProductId)
        .in('id', [...new Set(persistedVariationIds)]),
      'mobile:produto:consultar-custo-medio-variacoes'
    );
    if (existingCostResult.error) throw existingCostResult.error;
    for (const variation of existingCostResult.data || []) {
      if (variation?.id) {
        persistedVariationCosts.set(String(variation.id), variation.cost_price ?? null);
      }
    }
  }
  for (let vIdx = 0; vIdx < variationsToSave.length; vIdx++) {
    const v = variationsToSave[vIdx];
    const variationAttributes = Array.isArray(v.attributes)
      ? v.attributes
          .filter(
            (attribute: any) =>
              attribute?.name &&
              attribute.value !== undefined &&
              (typeof attribute.value !== 'string' || attribute.value.trim() !== '')
          )
          .map((attribute: any) => ({
            name: attribute.name,
            value: attribute.value,
            showName: attribute.showName ?? true,
          }))
      : Object.entries(v.attributes || {})
          .filter(
            ([, value]) =>
              value !== undefined &&
              (value === null || typeof value !== 'string' || value.trim() !== '')
          )
          .map(([name, value]) => ({ name, value, showName: true }));
    const sourceSku = String(v.sku || '').trim();
    const rawSku = normalizeVariationSku(sourceSku, parentCode);
    const wasLegacySkuNormalized = Boolean(sourceSku && rawSku !== sourceSku);
    const defaultSku = generateVariationSku(parentCode, vIdx);
    let resolvedSku = rawSku || defaultSku;
    const existingOwnerId = existingSkuOwners.get(resolvedSku);
    const collidesWithAnotherVariation =
      usedSkus.has(resolvedSku) ||
      (existingOwnerId !== undefined && existingOwnerId !== String(v.id));
    if (collidesWithAnotherVariation) {
      if (rawSku && rawSku !== defaultSku && !productData.isDraft && !wasLegacySkuNormalized) {
        throw new Error(`O SKU da variação "${resolvedSku}" já está em uso.`);
      }
      resolvedSku = await findAvailableSequentialSku(String(v.id || ''));
    }
    usedSkus.add(resolvedSku);
    existingSkuOwners.set(resolvedSku, String(v.id || ''));
    const variationName = String(v.name || '').trim();
    const parentName = String(payload.name || '').trim();
    const shouldDeriveVariationName =
      !variationName ||
      (!productData.isDraft &&
        variationName.toLocaleLowerCase('pt-BR') === parentName.toLocaleLowerCase('pt-BR'));
    const persistedVariationCost = isMobileProductUuid(v.id)
      ? persistedVariationCosts.get(v.id)
      : null;
    const varPayload: any = {
      product_id: savedProductId,
      name: resolveProductVariationName({
        name: shouldDeriveVariationName ? undefined : variationName,
        productName: payload.name,
        attributes: variationAttributes,
      }),
      sku: resolvedSku,
      price: v.syncUnitPrice !== false ? payload.unit_price : parseLocalizedPrice(v.price),
      promo_price:
        v.syncPromoPrice !== false
          ? payload.promo_price === null
            ? null
            : parseLocalizedPrice(payload.promo_price)
          : v.promoPrice !== undefined && v.promoPrice !== null
            ? parseLocalizedPrice(v.promoPrice)
            : null,
      // O ERP deixa cost_price (custo médio materializado por estoque) fora do upsert
      // comercial. A RPC mobile substitui colunas omitidas por NULL, então reenviamos
      // o valor corrente das linhas existentes; variações novas começam sem CMPM.
      // O custo próprio/herdado editável continua em variationDetails.costPrice.
      cost_price:
        persistedVariationCost === null || persistedVariationCost === undefined
          ? null
          : parseLocalizedPrice(persistedVariationCost),
      ...(isSalvado ? { stock: null } : {}),
      description:
        v.syncDescription !== false ? payload.description || null : v.description || null,
      width: v.width ? String(v.width) : null,
      height: v.height ? String(v.height) : null,
      depth: v.depth ? String(v.depth) : null,
      use_parent_price: v.syncUnitPrice !== false,
      use_parent_promo_price: v.syncPromoPrice !== false,
      use_parent_dimensions: v.syncWidth !== false,
      use_parent_description: v.syncDescription !== false,
      use_parent_name: true,
      status: productData.isDraft ? 'draft' : v.status || payload.status || 'hidden',
      active: productData.isDraft ? false : (v.active ?? productData.active ?? true),
      attributes: variationAttributes,
      combo_items: normalizeMobileComboItems(v.comboItems),
      image_url:
        Array.isArray(v.images) && v.images.length > 0 ? v.images.join(',') : null,
      updated_at: new Date().toISOString(),
    };
    if (isMobileProductUuid(v.id)) varPayload.id = v.id;
    variationPayloads.push(varPayload);
  }

  return variationPayloads;
}
