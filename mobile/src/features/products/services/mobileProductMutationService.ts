import { supabase } from '../../../services/supabaseClient';
import {
  getNextSequentialProductCode,
  generateVariationSku,
  parseLocalizedPrice,
} from './mobileProductHelpers';
import {
  ensureAtLeastOneOperationalVariation,
  resolveProductVariationName,
} from '../domain/productVariationName';

const normalizeVariationSku = (sku?: string) =>
  String(sku || '')
    .trim()
    .replace(/^(.*-\d{2})-[a-z0-9_-]+$/i, '$1');

const normalizeComboItems = (items: unknown) =>
  (Array.isArray(items) ? items : []).map((item: any) => ({
    productId: item.productId ?? item.product_id,
    variationId: item.variationId ?? item.variation_id ?? null,
    quantity: Math.max(1, Number(item.quantity || 1)),
    description: item.description || item.productName || item.name || '',
    unitPrice: Number(item.unitPrice ?? item.unit_price ?? 0),
    stock: Number(item.stock ?? item.currentStock ?? 0),
  }));

const createOperationId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const toggleMobileProductCatalog = async (
  productId: string,
  currentStatus: string,
  isVariation = false,
  variationId?: string
) => {
  const nextStatus = currentStatus === 'published' ? 'hidden' : 'published';
  if (isVariation && variationId) {
    const { error } = await supabase
      .from('product_variations')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', variationId);
    if (error) throw error;
    return nextStatus;
  }

  const { error } = await supabase
    .from('products')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', productId);
  if (error) throw error;
  return nextStatus;
};

export const toggleMobileProductActive = async (
  productId: string,
  currentActive: boolean,
  isVariation = false,
  variationId?: string
) => {
  const nextActive = !currentActive;
  if (nextActive) {
    const { data: prod } = await supabase
      .from('products')
      .select('product_kind')
      .eq('id', productId)
      .maybeSingle();
    if (prod?.product_kind === 'salvado') {
      throw new Error(
        'Produtos com origem do estoque Salvados permanecem desativados no ERP (exige origem Convencional).'
      );
    }
  }
  if (isVariation && variationId) {
    const { error } = await supabase
      .from('product_variations')
      .update({ active: nextActive, updated_at: new Date().toISOString() })
      .eq('id', variationId);
    if (error) throw error;
    return nextActive;
  }
  const { error } = await supabase
    .from('products')
    .update({ active: nextActive, updated_at: new Date().toISOString() })
    .eq('id', productId);
  if (error) throw error;
  return nextActive;
};

export const deleteMobileProduct = async (productId: string, isDraft = false) => {
  if (isDraft) {
    try {
      await supabase.from('product_variations').delete().eq('product_id', productId);
    } catch (_) {}
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      await supabase
        .from('products')
        .update({ deleted: true, active: false, updated_at: new Date().toISOString() })
        .eq('id', productId);
    }
    return;
  }

  const { error } = await supabase
    .from('products')
    .update({ deleted: true, active: false, updated_at: new Date().toISOString() })
    .eq('id', productId);
  if (error) throw error;
};

export const saveMobileProduct = async (productData: any) => {
  const isEditing = Boolean(productData.id);
  const operationId = isUuid(productData.operationId) ? productData.operationId : createOperationId();
  const savedProductId = isEditing
    ? productData.id
    : isUuid(productData.clientProductId)
      ? productData.clientProductId
      : createOperationId();
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
  const forceInactive = Boolean(productData.isDraft) || isSalvado;

  const variationRows = ensureAtLeastOneOperationalVariation(productData, productCode).map(
    (variation: any) => ({
      ...variation,
      active: forceInactive ? false : variation.active !== false,
    })
  );
  const hasActiveVariation =
    variationRows.length > 0
      ? variationRows.some((variation: any) => variation.active !== false)
      : productData.active !== false;

  const payload: any = {
    name: productData.name?.trim(),
    description: productData.description || null,
    code: productCode || null,
    category: productData.category || null,
    category_id:
      productData.categoryId ||
      (Array.isArray(productData.categoryIds) ? productData.categoryIds[0] : null),
    product_kind: isSalvado ? 'salvado' : isUsado ? 'usado' : 'normal',
    condition: isSalvado ? 'salvado' : isUsado ? 'usado' : productData.condition || 'novo',
    opportunity_id: productData.opportunityId || null,
    observations: productData.observations || null,
    slug: productData.slug || null,
    marketplace_title:
      productData.marketplaceTitle || productData.title || productData.name?.trim() || null,
    brand: productData.brand || null,
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
    technical_specs: {
      ...(productData.technical_specs || {}),
      technicalValues:
        productData.technicalValues || productData.technical_specs?.technicalValues || {},
    },
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
    has_variations: productData.itemType === 'service' ? false : true,
    updated_at: new Date().toISOString(),
  };

  // A gravação do produto, das categorias, das imagens e das variações é uma RPC
  // única, para que qualquer erro reverta o conjunto inteiro.
  const variationsToSave = [...variationRows];
  const variationPayloads: any[] = [];

  if (savedProductId && variationsToSave.length > 0) {
    const parentCode = (payload.code || '000000').trim();
    const { data: existingVariations, error: existingVariationsError } = await supabase
      .from('product_variations')
      .select('id, sku')
      .neq('product_id', savedProductId);
    if (existingVariationsError) throw existingVariationsError;
    const usedSkus = new Set(
      (existingVariations || [])
        .map((variation: any) => String(variation.sku || '').trim())
        .filter(Boolean)
    );
    for (let vIdx = 0; vIdx < variationsToSave.length; vIdx++) {
      const v = variationsToSave[vIdx];
      const variationAttributes = Array.isArray(v.attributes)
        ? v.attributes
            .filter((attribute: any) => attribute?.name && attribute?.value)
            .map((attribute: any) => ({
              name: attribute.name,
              value: String(attribute.value),
              showName: attribute.showName ?? true,
            }))
        : Object.entries(v.attributes || {})
            .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
            .map(([name, value]) => ({ name, value: String(value), showName: true }));
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
      const varPayload: any = {
        product_id: savedProductId,
        name: resolveProductVariationName({
          name: v.name,
          productName: payload.name,
          attributes: Object.fromEntries(
            variationAttributes.map((attribute: any) => [attribute.name, attribute.value])
          ),
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
        cost_price: parseLocalizedPrice(v.costPrice ?? payload.cost_price),
        description:
          v.syncDescription !== false ? payload.description || null : v.description || null,
        width: v.width ? String(v.width) : null,
        height: v.height ? String(v.height) : null,
        depth: v.depth ? String(v.depth) : null,
        use_parent_price: v.syncUnitPrice !== false,
        use_parent_promo_price: v.syncPromoPrice !== false,
        use_parent_dimensions: v.syncWidth !== false,
        use_parent_description: v.syncDescription !== false,
        status: productData.isDraft ? 'draft' : v.status || payload.status || 'hidden',
        active: productData.isDraft ? false : (v.active ?? productData.active ?? true),
        attributes: variationAttributes,
        combo_items: normalizeComboItems(v.comboItems),
        image_url:
          Array.isArray(v.images) && v.images.length > 0 ? v.images.join(',') : v.imageUrl || null,
        updated_at: new Date().toISOString(),
      };
      if (isUuid(v.id)) varPayload.id = v.id;
      variationPayloads.push(varPayload);
    }
  }

  const { data, error } = await supabase.rpc('save_mobile_product_transaction', {
    p_operation_id: operationId,
    p_expected_updated_at: isEditing ? productData.updated_at || productData.updatedAt || null : null,
    p_is_edit: isEditing,
    p_product_id: savedProductId,
    p_product: payload,
    p_images: payload.images,
    p_category_ids: Array.isArray(productData.categoryIds) ? productData.categoryIds : [],
    p_variations: variationPayloads,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('O banco não retornou o produto salvo.');
  return data;
};

export const duplicateMobileProduct = async (product: any) => {
  const copy = {
    ...product,
    id: undefined,
    name: `${product.name || 'Produto'} (Cópia)`,
    code: undefined,
    sku: undefined,
    status: 'hidden',
    isDraft: true,
    active: false,
    variations: (product.allVariations || product.variations || []).map((variation: any) => ({
      ...variation,
      id: undefined,
      sku: undefined,
      status: 'draft',
      active: false,
    })),
  };
  return saveMobileProduct(copy);
};
