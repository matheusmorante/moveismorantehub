import { supabase } from '../../../services/supabaseClient';
import { getNextSequentialProductCode, generateVariationSku } from './mobileProductHelpers';
import { resolveProductVariationName } from '../domain/productVariationName';

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

export const toggleMobileProductActive = async (productId: string, currentActive: boolean) => {
  const nextActive = !currentActive;
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
  let productCode = productData.code?.trim() || productData.sku?.trim();
  if (!productCode && !isEditing) {
    productCode = await getNextSequentialProductCode();
  }

  const payload: any = {
    name: productData.name?.trim(),
    description: productData.description || null,
    code: productCode || null,
    category: productData.category || null,
    category_id: productData.categoryId || (Array.isArray(productData.categoryIds) ? productData.categoryIds[0] : null),
    condition: productData.condition || 'novo',
    opportunity_id: productData.opportunityId || null,
    observations: productData.observations || null,
    slug: productData.slug || null,
    item_type: productData.itemType || 'product',
    unit_price: Number(productData.unitPrice || 0),
    price: Number(productData.unitPrice || 0),
    promo_price: productData.promoPrice ? Number(productData.promoPrice) : null,
    cost_price: productData.costPrice ? Number(productData.costPrice) : 0,
    freight_type: productData.freightType || 'fixed',
    freight_cost: Number(productData.freightCost || 0),
    ipi_percent: Number(productData.ipiPercent || 0),
    final_purchase_price: Number(productData.finalPurchasePrice || 0),
    initial_stock: Number(productData.initialStock ?? productData.stock ?? 0),
    stock: Number(productData.stock || 0),
    min_stock: Number(productData.minStock || 0),
    unit: productData.unit || 'UN',
    weight: productData.weight === '' || productData.weight == null ? null : Number(productData.weight),
    depth_use_length: Boolean(productData.depthUseLength),
    technical_specs: {
      ...(productData.technical_specs || {}),
      technicalValues: productData.technicalValues || productData.technical_specs?.technicalValues || {},
    },
    fiscal: productData.fiscal || {},
    combo_items: Array.isArray(productData.comboItems) ? productData.comboItems : [],
    ecommerce_description: productData.ecommerceDescription || null,
    whatsapp_description: productData.whatsappDescription || null,
    meta_title: productData.metaTitle || null,
    meta_description: productData.metaDescription || null,
    seo_description: productData.seoDescription || null,
    images: Array.isArray(productData.images) ? productData.images : [],
    width: productData.width ? String(productData.width) : null,
    height: productData.height ? String(productData.height) : null,
    depth: productData.depth ? String(productData.depth) : null,
    active: productData.isDraft ? false : (productData.active ?? true),
    is_draft: Boolean(productData.isDraft),
    status: productData.isDraft ? 'draft' : (productData.status || 'hidden'),
    supplier_id: productData.mainSupplierId || productData.supplierId || null,
    main_supplier_id: productData.mainSupplierId || productData.supplierId || null,
    supplier_ids: Array.isArray(productData.supplierIds) && productData.supplierIds.length > 0
      ? productData.supplierIds
      : (productData.mainSupplierId || productData.supplierId ? [productData.mainSupplierId || productData.supplierId] : []),
    has_variations: Boolean(productData.hasVariations || (productData.variations && productData.variations.length > 1)),
    updated_at: new Date().toISOString(),
  };

  let savedProductId = productData.id;
  if (isEditing) {
    const { error } = await supabase.from('products').update(payload).eq('id', productData.id);
    if (error) throw error;
  } else {
    payload.created_at = new Date().toISOString();
    payload.deleted = false;
    const { data, error } = await supabase.from('products').insert([payload]).select('id').single();
    if (error) throw error;
    savedProductId = data?.id;
  }

  if (savedProductId && Array.isArray(productData.images)) {
    const { error: deleteImagesError } = await supabase.from('product_images').delete().eq('product_id', savedProductId);
    if (deleteImagesError) throw deleteImagesError;
    if (productData.images.length > 0) {
      const imageRecords = productData.images.map((imageUrl: string, index: number) => ({
        product_id: savedProductId,
        image_url: imageUrl,
        is_main: index === 0,
      }));
      const { error: insertImagesError } = await supabase.from('product_images').insert(imageRecords);
      if (insertImagesError) throw insertImagesError;
    }
  }

  // Sincronizar tabela intermediária N:N product_categories
  if (savedProductId && Array.isArray(productData.categoryIds)) {
    const { error: deleteCategoriesError } = await supabase
      .from('product_categories').delete().eq('product_id', savedProductId);
    if (deleteCategoriesError) throw deleteCategoriesError;
    if (productData.categoryIds.length > 0) {
      const categoryRecords = productData.categoryIds.map((catId: string) => ({
        product_id: savedProductId,
        category_id: catId,
      }));
      const { error: insertCategoriesError } = await supabase.from('product_categories').insert(categoryRecords);
      if (insertCategoriesError) throw insertCategoriesError;
    }
  }

  // Persistir variações filhas se fornecidas ou se for uma composição
  let variationsToSave = Array.isArray(productData.variations) ? [...productData.variations] : [];

  if (savedProductId && variationsToSave.length > 0) {
    const parentCode = (payload.code || '000000').trim();
    for (let vIdx = 0; vIdx < variationsToSave.length; vIdx++) {
      const v = variationsToSave[vIdx];
      const variationAttributes = Array.isArray(v.attributes)
        ? v.attributes.filter((attribute: any) => attribute?.name && attribute?.value).map((attribute: any) => ({
            name: attribute.name,
            value: String(attribute.value),
            showName: attribute.showName ?? true,
          }))
        : Object.entries(v.attributes || {})
            .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
            .map(([name, value]) => ({ name, value: String(value), showName: true }));
      // Garante SKU com sufixo sequencial gerado automaticamente na lógica do ERP
      const resolvedSku = generateVariationSku(parentCode, vIdx);
      const varPayload: any = {
        product_id: savedProductId,
        name: resolveProductVariationName({
          name: v.name,
          productName: payload.name,
          attributes: Object.fromEntries(variationAttributes.map((attribute: any) => [attribute.name, attribute.value])),
        }),
        sku: resolvedSku,
        price: v.syncUnitPrice !== false ? payload.unit_price : Number(v.price ?? 0),
        promo_price: v.syncPromoPrice !== false
          ? (payload.promo_price === null ? null : Number(payload.promo_price))
          : (v.promoPrice !== undefined && v.promoPrice !== null ? Number(v.promoPrice) : null),
        cost_price: Number(v.costPrice ?? payload.cost_price),
        stock: Number(v.stock ?? 0),
        description: v.syncDescription !== false ? (payload.description || null) : (v.description || null),
        width: v.width ? String(v.width) : null,
        height: v.height ? String(v.height) : null,
        depth: v.depth ? String(v.depth) : null,
        use_parent_price: v.syncUnitPrice !== false,
        use_parent_promo_price: v.syncPromoPrice !== false,
        use_parent_dimensions: v.syncWidth !== false,
        use_parent_description: v.syncDescription !== false,
        status: productData.isDraft ? 'draft' : (v.status || payload.status || 'hidden'),
        active: productData.isDraft ? false : (v.active ?? productData.active ?? true),
        attributes: variationAttributes,
        image_url: Array.isArray(v.images) && v.images.length > 0
          ? v.images.join(',')
          : (v.imageUrl || null),
        updated_at: new Date().toISOString(),
      };
      // A listagem cria um id sintético para a variação padrão quando o produto
      // ainda não tem registro filho. Resolva pelo SKU antes de inserir, evitando
      // atualização silenciosa de um id inexistente ou duplicação da variação.
      let variationId = v.id && !String(v.id).includes('_') ? v.id : undefined;
      if (!variationId && vIdx === 0) {
        const { data: existingVariation, error: lookupError } = await supabase
          .from('product_variations').select('id').eq('product_id', savedProductId).eq('sku', resolvedSku).maybeSingle();
        if (lookupError) throw lookupError;
        variationId = existingVariation?.id;
      }
      if (variationId) {
        const { error } = await supabase.from('product_variations').update(varPayload).eq('id', variationId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('product_variations').insert([varPayload]);
        if (error) throw error;
      }
    }
  }

  return savedProductId;
};
