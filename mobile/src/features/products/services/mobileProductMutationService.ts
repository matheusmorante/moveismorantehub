import { supabase } from '../../../services/supabaseClient';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { withMobileMutationTimeout } from './mobileProductMutationTimeout';
import { getPersistableProductTechnicalValues } from '../domain/productCharacteristics';
import { parseLocalizedNumber as parseLocalizedPrice } from '../domain/productNumbers';
import {
  ensureAtLeastOneOperationalVariation,
  resolveProductVariationName,
} from '../domain/productVariationName';
import { generateVariationSku } from '../domain/productSku';
import { getNextSequentialProductCode } from './mobileProductCodeService';
import { triggerMobileProductMetaCatalogSync } from './mobileProductMetaCatalogSyncService';
import { resolveMobileVariationImages } from '../domain/mobileVariationImages';
import {
  parseMobileProductSaveAcknowledgement,
  type MobileProductSaveAcknowledgement,
} from '../../../../../shared-utils/mobileProductSaveAcknowledgement';
import {
  fetchRequiredProductCategoryAttributes,
  projectRequiredCategoryAttributesToVariations,
  type RequiredProductCategoryAttribute,
} from '../../../../../shared-utils/productCategoryRequiredAttributes';
import { createProductDraftSnapshot } from '../../../../../shared-utils/productDraftSnapshot';
import { omitAbsentCompositionVariationId } from '../../../../../shared-utils/productCompositionSerialization';

export {
  toggleMobileProductCatalog,
  toggleMobileProductActive,
} from './mobileProductStatusMutationService';

const normalizeVariationSku = (sku?: string) =>
  String(sku || '')
    .trim()
    .replace(/^(.*-\d{2})-[a-z0-9_-]+$/i, '$1');

const normalizeComboItems = (items: unknown) =>
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

const createOperationId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/** Impede a remoção de variações que já tenham estoque movimentado ou venda vinculada. */
export const checkMobileProductVariationHasMoves = async (
  productId: string,
  variationId: string
): Promise<boolean> => {
  const realProductId = String(productId).split('_')[0];
  if (!isUuid(realProductId) || !isUuid(variationId)) return true;

  const results = await withTimeout(Promise.all([
    supabase
      .from('inventory_moves')
      .select('id')
      .eq('variation_id', variationId)
      .limit(1),
    supabase
      .from('order_items')
      .select('id')
      .eq('variation_id', variationId)
      .limit(1),
    supabase
      .from('goods_receipt_items')
      .select('id')
      .eq('variation_id', variationId)
      .limit(1),
    supabase
      .from('inbound_invoices')
      .select('id')
      .filter('items', 'cs', `[{"variationId": "${variationId}"}]`)
      .limit(1),
  ]), 10_000, null, 'mobile:verificar-vinculos-variacao');

  if (!results) {
    throw new Error('A verificação de vínculos da variação expirou.');
  }

  const [movesResult, orderItemsResult, receiptItemsResult, inboundInvoicesResult] = results;

  if (movesResult.error) throw movesResult.error;
  if (orderItemsResult.error) throw orderItemsResult.error;
  if (receiptItemsResult.error) throw receiptItemsResult.error;
  if (inboundInvoicesResult.error) throw inboundInvoicesResult.error;
  return Boolean(
    movesResult.data?.length ||
    orderItemsResult.data?.length ||
    receiptItemsResult.data?.length ||
    inboundInvoicesResult.data?.length
  );
};

export const deleteMobileProduct = async (productId: string, isDraft = false) => {
  if (isDraft) {
    const realId = String(productId).split('_')[0];
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId)) {
      throw new Error('ID do produto inválido.');
    }

    const { data, error } = await withMobileMutationTimeout(
      supabase.rpc('delete_unreferenced_product', {
        p_product_id: realId,
      }),
      'mobile:descartar-rascunho'
    );
    if (error) throw error;

    const result = data as { success?: boolean; message?: string } | null;
    if (!result?.success) {
      throw new Error(result?.message || 'Não foi possível descartar o rascunho.');
    }
    return result;
  }

  const { error } = await supabase
    .from('products')
    .update({ deleted: true, active: false, updated_at: new Date().toISOString() })
    .eq('id', productId);
  if (error) throw error;
};

export const moveMobileProductToTrash = async (productId: string) => {
  const realId = String(productId).split('_')[0];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId)) {
    throw new Error('ID do produto inválido.');
  }
  const { data, error } = await withMobileMutationTimeout(
    supabase.rpc('move_product_to_trash', {
      p_product_id: realId,
    }),
    'mobile:mover-produto-para-lixeira'
  );
  if (error) throw error;
  const result = data as { success?: boolean; message?: string } | null;
  if (!result?.success) {
    throw new Error(result?.message || 'Não foi possível mover o produto para a lixeira.');
  }
  triggerMobileProductMetaCatalogSync(realId);
  return result;
};

export const restoreMobileProductFromTrash = async (productId: string) => {
  const realId = String(productId).split('_')[0];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId)) {
    throw new Error('ID do produto inválido.');
  }
  const { data, error } = await withMobileMutationTimeout(
    supabase.rpc('restore_product_from_trash', {
      p_product_id: realId,
    }),
    'mobile:restaurar-produto-da-lixeira'
  );
  if (error) throw error;
  const result = data as { success?: boolean; message?: string } | null;
  if (!result?.success) {
    throw new Error(result?.message || 'Não foi possível restaurar o produto da lixeira.');
  }
  triggerMobileProductMetaCatalogSync(realId);
  return result;
};

export function saveMobileProduct(productData: any): Promise<string>;
export function saveMobileProduct(
  productData: any,
  options: { returnVersionAcknowledgement: true }
): Promise<MobileProductSaveAcknowledgement>;
export async function saveMobileProduct(
  productData: any,
  options?: { returnVersionAcknowledgement?: boolean }
): Promise<string | MobileProductSaveAcknowledgement> {
  const isEditing = Boolean(productData.id);
  const operationId = isUuid(productData.operationId)
    ? productData.operationId
    : createOperationId();
  const savedProductId = isEditing
    ? productData.id
    : isUuid(productData.clientProductId)
      ? productData.clientProductId
      : createOperationId();
  const selectedCategoryIds: string[] =
    Array.isArray(productData.categoryIds) && productData.categoryIds.length > 0
      ? productData.categoryIds
      : productData.categoryId
        ? [productData.categoryId]
        : [];
  let requiredCategoryAttributes: RequiredProductCategoryAttribute[] = [];
  if (selectedCategoryIds.length > 0 && (productData.itemType || productData.item_type) !== 'service') {
    const fetchedAttributes = await withTimeout(
      fetchRequiredProductCategoryAttributes(supabase, selectedCategoryIds),
      15000,
      null,
      'mobile:produto:carregar-atributos-obrigatorios'
    );
    if (!fetchedAttributes) {
      throw new Error('Não foi possível confirmar as características obrigatórias da categoria. O produto não foi alterado.');
    }
    requiredCategoryAttributes = fetchedAttributes;
  }

  let productCode = productData.code?.trim() || productData.sku?.trim();
  if (!productCode && !isEditing) {
    productCode = await getNextSequentialProductCode();
  }
  const isSalvado =
    productData.productKind === 'salvado' ||
    productData.condition === 'salvado' ||
    productData.product_kind === 'salvado';
  const isUsado =
    productData.productKind === 'usado' ||
    productData.condition === 'usado' ||
    productData.product_kind === 'usado';
  const isComposition = (productData.itemType ?? productData.item_type) === 'composition';
  const forceInactive = Boolean(productData.isDraft) || isSalvado || isUsado;

  const operationalVariations = ensureAtLeastOneOperationalVariation(productData, productCode).map(
    (variation: any) => ({
      ...variation,
      id: isUuid(variation.id) ? variation.id : createOperationId(),
    })
  );
  const hasVariationFamily =
    (productData.itemType ?? productData.item_type) !== 'service' &&
    (Boolean(productData.hasVariations ?? productData.has_variations) ||
      operationalVariations.length > 1);
  const variationRows = operationalVariations.map((variation: any) => {
    const inheritsParentGallery =
      !productData.isDraft &&
      (productData.itemType ?? productData.item_type) !== 'service' &&
      !hasVariationFamily &&
      Array.isArray(productData.images) &&
      operationalVariations.length === 1;

    return {
      ...variation,
      images: inheritsParentGallery
        ? [...productData.images]
        : resolveMobileVariationImages(
            variation.imageUrl ?? variation.image_url,
            variation.images,
            hasVariationFamily
          ),
      ...(inheritsParentGallery ? { imageUrl: null } : {}),
      active: forceInactive ? false : variation.active !== false,
    };
  });
  const hasActiveVariation =
    variationRows.length > 0
      ? variationRows.some((variation: any) => variation.active !== false)
      : productData.active !== false;
  const technicalSpecs: Record<string, any> = {
    ...(productData.technical_specs || {}),
    technicalValues: getPersistableProductTechnicalValues(productData),
    ...(Array.isArray(productData.variableTechnicalFields)
      ? { variableTechnicalFields: productData.variableTechnicalFields }
      : {}),
    variationDetails: variationRows.map((variation: any) => {
      const detailsSource = { ...variation };
      // No ERP, composições concluídas não persistem o saldo derivado na projeção
      // técnica; o mobile também deve recalculá-lo a partir dos componentes.
      if (isComposition && !productData.isDraft) delete detailsSource.stock;
      const {
        launchInitialStock: _launchInitialStock,
        initialStock: _initialStock,
        initialCost: _initialCost,
        initialStockEntries: _initialStockEntries,
        discountPercent: _discountPercent,
        discountFixed: _discountFixed,
        ...details
      } = detailsSource;
      return details;
    }),
  };
  // O app pode reabrir um rascunho criado no ERP. Substitui o snapshot que veio
  // da consulta pelo formulário atual; ao concluir, remove o snapshot de rascunho.
  technicalSpecs.draftProduct = productData.isDraft
    ? createProductDraftSnapshot({
        ...productData,
        id: savedProductId,
        code: productCode || productData.code,
        isDraft: true,
        active: false,
        status: 'draft',
        variations: variationRows,
      })
    : null;
  const payload: any = {
    name: productData.name?.trim(),
    description: productData.description || null,
    code: productCode || null,
    category_id: selectedCategoryIds[0] || null,
    product_kind: isSalvado ? 'salvado' : isUsado ? 'usado' : 'normal',
    condition: isSalvado ? 'salvado' : isUsado ? 'usado' : productData.condition || 'novo',
    opportunity_id: productData.opportunityId || null,
    observations: productData.observations || null,
    slug: productData.slug || null,
    marketplace_title:
      productData.marketplaceTitle || productData.title || productData.name?.trim() || null,
    colors: productData.colors || null,
    no_colors: Boolean(productData.noColors ?? productData.no_colors),
    meta_title: productData.metaTitle ?? productData.meta_title ?? null,
    meta_description: productData.metaDescription ?? productData.meta_description ?? null,
    seo_description: productData.seoDescription ?? productData.seo_description ?? null,
    ecommerce_description:
      productData.ecommerceDescription ?? productData.ecommerce_description ?? null,
    whatsapp_description:
      productData.whatsappDescription ?? productData.whatsapp_description ?? null,
    ecommerce_template: productData.ecommerceTemplate ?? productData.ecommerce_template ?? null,
    whatsapp_template: productData.whatsappTemplate ?? productData.whatsapp_template ?? null,
    ...(productData.brand !== undefined ? { brand: productData.brand } : {}),
    environment: productData.environment || null,
    include_environment: productData.includeEnvironment !== false,
    include_brand: productData.includeBrand !== false,
    title_order: Array.isArray(productData.titleOrder) ? productData.titleOrder : undefined,
    featured: Boolean(productData.featured),
    item_type: productData.itemType || 'product',
    is_combo: productData.itemType === 'composition' || productData.isCombo === true,
    unit_price: parseLocalizedPrice(productData.unitPrice),
    price: parseLocalizedPrice(productData.unitPrice),
    promo_price: productData.promoPrice ? parseLocalizedPrice(productData.promoPrice) : null,
    cost_price: parseLocalizedPrice(productData.costPrice),
    freight_type: productData.freightType || 'fixed',
    freight_cost: parseLocalizedPrice(productData.freightCost),
    ipi_percent: parseLocalizedPrice(productData.ipiPercent),
    final_purchase_price: parseLocalizedPrice(productData.finalPurchasePrice),
    min_stock: parseLocalizedPrice(productData.minStock),
    unit: productData.unit || 'UN',
    depth_use_length: Boolean(productData.depthUseLength),
    technical_specs: technicalSpecs,
    fiscal: productData.fiscal || {},
    combo_items: normalizeComboItems(productData.comboItems),
    images: Array.isArray(productData.images) ? productData.images : [],
    width: productData.width ? String(productData.width) : null,
    height: productData.height ? String(productData.height) : null,
    depth: productData.depth ? String(productData.depth) : null,
    active: productData.isDraft ? false : hasActiveVariation,
    is_draft: Boolean(productData.isDraft),
    status: productData.isDraft ? 'draft' : productData.status || 'hidden',
    is_salvado: isSalvado,
    supplier_id: productData.mainSupplierId || productData.supplierId || null,
    main_supplier_id: productData.mainSupplierId || productData.supplierId || null,
    supplier_ids:
      Array.isArray(productData.supplierIds) && productData.supplierIds.length > 0
        ? productData.supplierIds
        : productData.mainSupplierId || productData.supplierId
          ? [productData.mainSupplierId || productData.supplierId]
          : [],
    has_variations: hasVariationFamily,
    updated_at:
      typeof productData.saveUpdatedAt === 'string' &&
      Number.isFinite(Date.parse(productData.saveUpdatedAt))
        ? productData.saveUpdatedAt
        : new Date().toISOString(),
  };

  // A gravação do produto, das categorias, das imagens e das variações é uma RPC
  // única, para que qualquer erro reverta o conjunto inteiro.
  const variationsToSave = projectRequiredCategoryAttributesToVariations(variationRows, {
    categoryIds: selectedCategoryIds,
    requiredAttributes: requiredCategoryAttributes,
    parentTechnicalValues: payload.technical_specs.technicalValues,
  });
  const variationPayloads: any[] = [];

  if (savedProductId && variationsToSave.length > 0) {
    const parentCode = (payload.code || '000000').trim();
    const requestedSkus = [
      ...new Set(
        variationsToSave.map(
          (variation: any, index: number) =>
            normalizeVariationSku(variation.sku) || generateVariationSku(parentCode, index)
        )
      ),
    ];
    const { data: existingVariations, error: existingVariationsError } = await supabase
      .from('product_variations')
      .select('sku')
      .neq('product_id', savedProductId)
      .in('sku', requestedSkus);
    if (existingVariationsError) throw existingVariationsError;
    const usedSkus = new Set(
      (existingVariations || [])
        .map((variation: any) => String(variation.sku || '').trim())
        .filter(Boolean)
    );
    const persistedVariationIds = isEditing
      ? variationsToSave
          .map((variation: any) => variation.id)
          .filter((id: unknown): id is string => isUuid(id))
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
            .filter((attribute: any) =>
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
            .filter(([, value]) =>
              value !== undefined &&
              (value === null || typeof value !== 'string' || value.trim() !== '')
            )
            .map(([name, value]) => ({ name, value, showName: true }));
      const rawSku = normalizeVariationSku(v.sku);
      const defaultSku = generateVariationSku(parentCode, vIdx);
      let resolvedSku = rawSku || defaultSku;
      if (usedSkus.has(resolvedSku)) {
        if (rawSku && rawSku !== defaultSku && !productData.isDraft) {
          throw new Error(`O SKU da variação "${resolvedSku}" já está em uso por outro produto.`);
        }
        let attempt = 0;
        do {
          const suffix = String(vIdx + 1).padStart(2, '0');
          resolvedSku = `${parentCode}_${Date.now().toString().slice(-4)}${attempt ? `_${attempt}` : ''}-${suffix}`;
          attempt += 1;
        } while (usedSkus.has(resolvedSku) && attempt < 10);
      }
      usedSkus.add(resolvedSku);
      const variationName = String(v.name || '').trim();
      const parentName = String(payload.name || '').trim();
      const shouldDeriveVariationName =
        !variationName ||
        (!productData.isDraft &&
          variationName.toLocaleLowerCase('pt-BR') === parentName.toLocaleLowerCase('pt-BR'));
      const persistedVariationCost = isUuid(v.id)
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
        combo_items: normalizeComboItems(v.comboItems),
        image_url:
          Array.isArray(v.images) && v.images.length > 0 ? v.images.join(',') : null,
        updated_at: new Date().toISOString(),
      };
      if (isUuid(v.id)) varPayload.id = v.id;
      variationPayloads.push(varPayload);
    }
  }

  const rpcParameters = {
    p_operation_id: operationId,
    p_expected_updated_at: isEditing
      ? productData.updated_at || productData.updatedAt || null
      : null,
    p_is_edit: isEditing,
    p_product_id: savedProductId,
    p_product: payload,
    p_images: payload.images,
    p_category_ids: selectedCategoryIds,
    p_variations: variationPayloads,
  };
  const response = options?.returnVersionAcknowledgement
    ? await withMobileMutationTimeout(
        supabase.rpc('save_mobile_product_transaction_with_version', rpcParameters),
        'mobile:produto:saving-version-ack'
      )
    : await supabase.rpc('save_mobile_product_transaction', rpcParameters);
  const { data, error } = response;
  if (error) throw error;
  if (options?.returnVersionAcknowledgement) {
    const acknowledgement = parseMobileProductSaveAcknowledgement(data);
    if (acknowledgement.productId !== savedProductId) {
      throw new Error('O banco confirmou um produto diferente do solicitado.');
    }
    return acknowledgement;
  }
  if (typeof data !== 'string') throw new Error('O banco não retornou o produto salvo.');
  return data;
}
