import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getProductKind } from '../productKindRules';
import { getLocalProducts, notifySubscribers, saveLocalProducts } from './productLocalCache';
import type { ProductMutationOptions } from './productMutationService';
import { updateProduct } from './productMutationService';
import { triggerProductMetaCatalogSync } from './productMetaCatalogSync';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

export const checkProductLinkedToSales = async (id: string | number): Promise<string | null> => {
  const realId = String(id).split('_')[0];

  try {
    const normalizedItems = await supabase
      .from('order_items')
      .select('id, order_id')
      .eq('product_id', realId)
      .limit(1);

    if (!normalizedItems.error && normalizedItems.data?.[0]?.order_id) {
      return String(normalizedItems.data[0].order_id);
    }

    if (normalizedItems.error) throw normalizedItems.error;

    return null;
  } catch (error) {
    // Falha fechada: sem confirmar a ausência de vínculo na fonte
    // normalizada, nenhuma rotina de exclusão em massa deve continuar.
    console.error('Erro ao verificar vínculo do produto com vendas:', error);
    throw error;
  }
};

export const checkProductHasMoves = async (
  productId: string,
  variationId?: string
): Promise<boolean> => {
  try {
    const realId = String(productId).split('_')[0];
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
    if (!isUUID) return false;

    let query = supabase.from('inventory_moves').select('id').eq('product_id', realId).limit(1);

    if (variationId) {
      query = query.eq('variation_id', variationId);
    }

    const { data: movesData, error: movesErr } = await query;
    if (movesErr) throw movesErr;
    if (movesData && movesData.length > 0) {
      return true;
    }

    let orderItemsQuery = supabase
      .from('order_items')
      .select('id')
      .eq('product_id', realId)
      .limit(1);

    if (variationId) {
      orderItemsQuery = orderItemsQuery.eq('variation_id', variationId);
    }

    const { data: orderItemsData, error: orderItemsErr } = await orderItemsQuery;
    if (orderItemsErr) throw orderItemsErr;
    if (orderItemsData && orderItemsData.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erro ao verificar movimentações do produto:', error);
    return true;
  }
};

export const checkProductIsUnreferenced = async (productId: string): Promise<boolean> => {
  const realId = String(productId).split('_')[0];
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
  if (!isUUID) return false;

  const { data, error } = await supabase.rpc('product_is_unreferenced', {
    p_product_id: realId,
  });
  if (error) {
    console.error('Erro ao verificar uso do produto:', error);
    throw error;
  }

  return data === true;
};

export const checkProductIsUsed = async (productId: string): Promise<boolean> => {
  try {
    const realId = String(productId).split('_')[0];
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
    if (!isUUID) return false;

    const [movesRes, orderItemsRes, receiptsRes, inboundRes] = await Promise.all([
      supabase.from('inventory_moves').select('id').eq('product_id', realId).limit(1),
      supabase.from('order_items').select('id').eq('product_id', realId).limit(1),
      supabase.from('goods_receipt_items').select('id').eq('product_id', realId).limit(1),
      supabase
        .from('inbound_invoices')
        .select('id')
        .filter('items', 'cs', `[{"productId": "${realId}"}]`)
        .limit(1),
    ]);

    if (movesRes.error || orderItemsRes.error || receiptsRes.error || inboundRes.error) {
      throw movesRes.error || orderItemsRes.error || receiptsRes.error || inboundRes.error;
    }

    return ((movesRes.data && movesRes.data.length > 0) ||
      (orderItemsRes.data && orderItemsRes.data.length > 0) ||
      (receiptsRes.data && receiptsRes.data.length > 0) ||
      (inboundRes.data && inboundRes.data.length > 0)) as boolean;
  } catch (error) {
    console.error('Erro ao verificar uso do produto:', error);
    return true;
  }
};

import { invalidateProductCatalogStatsCache } from '@/pages/App/Products/ProductList/services/productCatalogStatsService';

const invalidateProductQueries = () => {
  try {
    invalidateProductCatalogStatsCache();
    queryClient.invalidateQueries({ queryKey: ['products'] });
  } catch {
    // Cache invalidation is best effort after the product update has committed.
  }
};

export const deactivateProduct = async (
  id: string,
  options: ProductMutationOptions = {}
): Promise<void> => {
  await updateProduct(id, { active: false, deleted: false }, { deferQueryInvalidation: true });
  const realId = String(id).split('_')[0];
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
  if (isUUID) {
    await supabase.from('product_variations').update({ active: false }).eq('product_id', realId);
  }
  if (!options.deferQueryInvalidation) invalidateProductQueries();
};

export const activateProduct = async (
  id: string,
  options: ProductMutationOptions = {}
): Promise<void> => {
  const realId = String(id).split('_')[0];
  const { data: product, error } = await supabase
    .from('products')
    .select('product_kind')
    .eq('id', realId)
    .maybeSingle();
  if (error) throw error;
  if (getProductKind({ productKind: product?.product_kind }) === 'salvado') {
    throw new Error('Produtos do tipo Salvado permanecem desativados no ERP.');
  }

  await updateProduct(id, { active: true, deleted: false }, { deferQueryInvalidation: true });
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
  if (isUUID) {
    await supabase.from('product_variations').update({ active: true }).eq('product_id', realId);
  }
  if (!options.deferQueryInvalidation) invalidateProductQueries();
};

export const moveProductToTrash = async (
  id: string,
  options: ProductMutationOptions = {}
): Promise<{ success: boolean; message: string; code?: string }> => {
  const realId = String(id).split('_')[0];
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
  if (!isUUID) {
    return { success: false, message: 'ID do produto inválido.', code: 'invalid_id' };
  }

  const { data, error } = await supabase.rpc('move_product_to_trash', {
    p_product_id: realId,
  });

  if (error) {
    console.error('Erro ao mover produto para a lixeira:', error);
    throw error;
  }

  const result = data as { success: boolean; message: string; code?: string };
  if (!result?.success) {
    return {
      success: false,
      message: result?.message || 'Não foi possível mover o produto para a lixeira.',
      code: result?.code,
    };
  }

  const products = getLocalProducts();
  const idx = products.findIndex((p) => String(p.id).split('_')[0] === realId);
  if (idx >= 0) {
    products[idx].deleted = true;
    products[idx].active = false;
    products[idx].status = 'hidden';
    if (products[idx].variations) {
      products[idx].variations = products[idx].variations.map((v) => ({
        ...v,
        active: false,
        status: 'hidden',
      }));
    }
    saveLocalProducts(products);
    notifySubscribers();
  }

  if (!options.deferQueryInvalidation) invalidateProductQueries();
  triggerProductMetaCatalogSync(realId);
  return result;
};

export const moveToTrash = async (id: string): Promise<void> => {
  const result = await moveProductToTrash(id);
  if (!result.success) {
    throw new Error(result.message);
  }
};

export const physicalDeleteProduct = async (
  id: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const realId = String(id).split('_')[0];
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
    if (!isUUID) return { success: false, message: 'ID do produto inválido.' };

    const { data, error } = await supabase.rpc('delete_unreferenced_product', {
      p_product_id: realId,
    });
    if (error) throw error;

    const result = data as { success?: boolean; message?: string } | null;
    if (!result?.success) {
      return {
        success: false,
        message: result?.message || 'Produto possui vínculos ou histórico e não pode ser excluído.',
      };
    }

    invalidateProductQueries();
    const products = getLocalProducts().filter(
      (product) => String(product.id).split('_')[0] !== realId
    );
    saveLocalProducts(products);
    notifySubscribers();

    return { success: true, message: result.message || 'Produto excluído com sucesso.' };
  } catch (error: any) {
    console.error('Erro ao excluir produto fisicamente:', error);
    return { success: false, message: error.message || 'Erro ao excluir o produto.' };
  }
};

export const restoreProductFromTrash = async (
  id: string,
  options: ProductMutationOptions = {}
): Promise<{ success: boolean; message: string; code?: string }> => {
  const realId = String(id).split('_')[0];
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
  if (!isUUID) {
    return { success: false, message: 'ID do produto inválido.', code: 'invalid_id' };
  }

  const { data, error } = await supabase.rpc('restore_product_from_trash', {
    p_product_id: realId,
  });

  if (error) {
    console.error('Erro ao restaurar produto da lixeira:', error);
    throw error;
  }

  const result = data as { success: boolean; message: string; code?: string };
  if (!result?.success) {
    return {
      success: false,
      message: result?.message || 'Não foi possível restaurar o produto da lixeira.',
      code: result?.code,
    };
  }

  const products = getLocalProducts();
  const idx = products.findIndex((p) => String(p.id).split('_')[0] === realId);
  if (idx >= 0) {
    products[idx].deleted = false;
    saveLocalProducts(products);
    notifySubscribers();
  }

  if (!options.deferQueryInvalidation) invalidateProductQueries();
  triggerProductMetaCatalogSync(realId);
  return result;
};

export const restoreProduct = async (
  id: string,
  _options: ProductMutationOptions = {}
): Promise<void> => {
  const result = await restoreProductFromTrash(id);
  if (!result.success) {
    throw new Error(result.message);
  }
};

export const deleteProduct = async (
  id: string,
  options: ProductMutationOptions = {}
): Promise<{ success: boolean; message?: string }> => {
  try {
    const realId = String(id).split('_')[0];
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);

    if (isUUID) {
      await deactivateProduct(realId, options);
    }

    return {
      success: true,
      message:
        'Produto desativado com sucesso. Deleções físicas não são permitidas para preservar o histórico do sistema.',
    };
  } catch (error: any) {
    console.error('Erro ao desativar produto:', error);
    return {
      success: false,
      message: error.message || 'Erro ao desativar o produto.',
    };
  }
};

export const checkVariationIsUsed = async (variationId: string): Promise<boolean> => {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      variationId
    );
    if (!isUUID) return true;

    const results = await withTimeout(Promise.all([
      supabase.from('inventory_moves').select('id').eq('variation_id', variationId).limit(1),
      supabase.from('order_items').select('id').eq('variation_id', variationId).limit(1),
      supabase.from('goods_receipt_items').select('id').eq('variation_id', variationId).limit(1),
      supabase
        .from('inbound_invoices')
        .select('id')
        .filter('items', 'cs', `[{"variationId": "${variationId}"}]`)
        .limit(1),
    ]), 10000, null, 'produto:verificar-vinculos-variacao');
    if (!results) return true;
    const [movesRes, orderItemsRes, receiptsRes, inboundRes] = results;

    if (movesRes.error || orderItemsRes.error || receiptsRes.error || inboundRes.error) {
      throw movesRes.error || orderItemsRes.error || receiptsRes.error || inboundRes.error;
    }

    return ((movesRes.data && movesRes.data.length > 0) ||
      (orderItemsRes.data && orderItemsRes.data.length > 0) ||
      (receiptsRes.data && receiptsRes.data.length > 0) ||
      (inboundRes.data && inboundRes.data.length > 0)) as boolean;
  } catch (error) {
    console.error('Erro ao verificar uso da variação:', error);
    return true;
  }
};

export const physicalDeleteVariation = async (
  productId: string,
  variationId: string
): Promise<{
  success: boolean;
  message?: string;
  parentDeactivated?: boolean;
  inUse?: boolean;
}> => {
  try {
    const realProductId = String(productId).split('_')[0];
    const isVarUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      variationId
    );
    const isProductUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      realProductId
    );

    if (!isProductUUID || !isVarUUID) {
      return { success: false, message: 'ID de produto ou variação inválido.' };
    }

    const { data, error } = await supabase.rpc('delete_unreferenced_product_variation', {
      p_product_id: realProductId,
      p_variation_id: variationId,
    });
    if (error) throw error;

    const result = data as {
      success?: boolean;
      message?: string;
      code?: string;
      parent_deactivated?: boolean;
    } | null;
    if (!result?.success) {
      return {
        success: false,
        message: result?.message || 'Não foi possível excluir a variação.',
        inUse: result?.code === 'variation_in_use',
      };
    }

    const products = getLocalProducts();
    const parentIdx = products.findIndex((p) => String(p.id).split('_')[0] === realProductId);
    if (parentIdx >= 0) {
      const parent = products[parentIdx];
      if (result.parent_deactivated) {
        parent.active = false;
        parent.deleted = false;
        parent.variations = parent.variations?.map((variation) => ({
          ...variation,
          active: false,
        }));
      } else if (Array.isArray(parent.variations)) {
        parent.variations = parent.variations.filter((v) => v.id !== variationId);
      }
      saveLocalProducts(products);
    }
    invalidateProductQueries();
    notifySubscribers();
    return {
      success: true,
      message: result.parent_deactivated
        ? 'Produto e única variação desativados com sucesso.'
        : 'Variação excluída com sucesso.',
      parentDeactivated: Boolean(result.parent_deactivated),
    };
  } catch (error: any) {
    console.error('Erro ao excluir variação fisicamente:', error);
    return { success: false, message: error.message || 'Erro ao excluir a variação.' };
  }
};
