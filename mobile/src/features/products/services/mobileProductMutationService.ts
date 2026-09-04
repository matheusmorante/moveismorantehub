import { supabase } from '../../../services/supabaseClient';
import { getNextSequentialProductCode, generateVariationSku } from './mobileProductHelpers';

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
    opportunity_id: productData.opportunityId || null,
    observations: productData.observations || null,
    slug: productData.slug || null,
    item_type: productData.itemType || 'product',
    unit_price: Number(productData.unitPrice || 0),
    price: Number(productData.unitPrice || 0),
    promo_price: productData.promoPrice ? Number(productData.promoPrice) : null,
    cost_price: productData.costPrice ? Number(productData.costPrice) : 0,
    stock: Number(productData.stock || 0),
    min_stock: Number(productData.minStock || 0),
    images: Array.isArray(productData.images) ? productData.images : [],
    width: productData.width ? String(productData.width) : null,
    height: productData.height ? String(productData.height) : null,
    depth: productData.depth ? String(productData.depth) : null,
    active: productData.active ?? true,
    is_draft: Boolean(productData.isDraft),
    status: productData.isDraft ? 'draft' : (productData.status || 'published'),
    supplier_id: productData.mainSupplierId || productData.supplierId || null,
    main_supplier_id: productData.mainSupplierId || productData.supplierId || null,
    supplier_ids: Array.isArray(productData.supplierIds) && productData.supplierIds.length > 0
      ? productData.supplierIds
      : (productData.mainSupplierId || productData.supplierId ? [productData.mainSupplierId || productData.supplierId] : []),
    has_variations: Boolean(productData.variations && productData.variations.length > 0),
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

  // Sincronizar tabela intermediária N:N product_categories
  if (savedProductId && Array.isArray(productData.categoryIds)) {
    try {
      await supabase.from('product_categories').delete().eq('product_id', savedProductId);
      if (productData.categoryIds.length > 0) {
        const categoryRecords = productData.categoryIds.map((catId: string) => ({
          product_id: savedProductId,
          category_id: catId,
        }));
        await supabase.from('product_categories').insert(categoryRecords);
      }
    } catch (catErr) {
      console.warn('[MobileProductMutationService] Erro ao sincronizar product_categories:', catErr);
    }
  }

  // Persistir variações filhas se fornecidas
  if (savedProductId && Array.isArray(productData.variations) && productData.variations.length > 0) {
    const parentCode = (payload.code || '000000').trim();
    for (let vIdx = 0; vIdx < productData.variations.length; vIdx++) {
      const v = productData.variations[vIdx];
      // Garante SKU com sufixo sequencial gerado automaticamente na lógica do ERP
      const resolvedSku = generateVariationSku(parentCode, vIdx);
      const varPayload: any = {
        product_id: savedProductId,
        sku: resolvedSku,
        price: Number(v.price ?? payload.unit_price),
        cost_price: Number(v.costPrice ?? payload.cost_price),
        stock: Number(v.stock ?? 0),
        status: v.status || 'published',
        active: v.active ?? true,
        attributes: v.attributes || {},
        images: Array.isArray(v.images) ? v.images : (v.imageUrl ? [v.imageUrl] : []),
        updated_at: new Date().toISOString(),
      };
      if (v.id) {
        await supabase.from('product_variations').update(varPayload).eq('id', v.id);
      } else {
        await supabase.from('product_variations').insert([varPayload]);
      }
    }
  }

  return savedProductId;
};
