import { supabase } from '@/pages/utils/supabaseConfig';
import Product from '../../types/product.type';
import { isProductDraft } from './productDraftSnapshot';
import { persistProductDraft } from './productDraftPersistence';
import { ensureDefaultVariation } from '../productVariationDefaults';
import { validateProductImageLimits } from './productImageHelpers';
import { getLocalProducts, saveLocalProducts, notifySubscribers } from './productLocalCache';
import { TABLE_NAME, generateUniqueCode, checkSkusUniquenessBatch } from './productSkuService';
import { mapToDB, mapFromDB } from './productMapper';
import { isNonConventionalProduct } from '../productKindRules';
import { ensureUuidFormat, syncProductToSupabase } from './productPersistenceService';
import { formatProductTextData } from './productValidation';
import {
  checkProductLinkedToSales,
  checkProductHasMoves,
  checkProductIsUsed,
  deactivateProduct,
  activateProduct,
  moveToTrash,
  physicalDeleteProduct,
  restoreProduct,
  deleteProduct,
} from './productDependencyCheck';

export const saveProduct = async (product: Product, forceInsert = false): Promise<string> => {
  validateProductImageLimits(product);
  formatProductTextData(product);
  Object.assign(product, ensureDefaultVariation(product));
  const legacyId = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    product.id || ''
  )
    ? product.id
    : undefined;
  const resolvedId = ensureUuidFormat(product);

  if (!product.code || product.code === '000000') {
    product.code = generateUniqueCode(resolvedId, product.itemType);
  }

  if (isProductDraft(product)) {
    product.id = resolvedId;
    await persistProductDraft(product);
    const drafts = getLocalProducts();
    const index = drafts.findIndex((draft) => draft.id === resolvedId);
    if (index === -1) drafts.push(product);
    else drafts[index] = product;
    saveLocalProducts(drafts);
    notifySubscribers();
    return resolvedId;
  }

  const skusToValidate: string[] = [];
  if (product.code) skusToValidate.push(product.code);
  if (product.variations?.length) {
    product.variations.forEach((v) => {
      if (v.sku) skusToValidate.push(v.sku);
    });
  }

  if (skusToValidate.length > 0) {
    const duplicates = await checkSkusUniquenessBatch(skusToValidate, resolvedId, legacyId);
    const duplicateSkus = Object.keys(duplicates);
    if (duplicateSkus.length > 0) {
      // Auto-corrige: gera um código único para substituir o SKU duplicado
      if (product.code && duplicateSkus.includes(product.code)) {
        product.code = generateUniqueCode(resolvedId, product.itemType);
        console.warn(
          `[ProductService] SKU duplicado detectado. Novo código gerado automaticamente: ${product.code}`
        );
      }
      if (product.variations?.length) {
        product.variations.forEach((v) => {
          if (v.sku && duplicateSkus.includes(v.sku)) {
            v.sku = generateUniqueCode(resolvedId, product.itemType);
            console.warn(`[ProductService] SKU de variação duplicado. Novo SKU gerado: ${v.sku}`);
          }
        });
      }
    }
  }

  const isUuid = (val?: string) =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
  if (product.variations?.length) {
    product.variations.forEach((v) => {
      if (!isUuid(v.id)) {
        v.id = crypto.randomUUID();
      }
    });
  }

  const products = getLocalProducts();

  if (
    resolvedId &&
    !forceInsert &&
    products.some((item) => String(item.id) === String(resolvedId))
  ) {
    await updateProduct(resolvedId, product);
    return String(resolvedId);
  }

  const newProduct: Product = {
    ...product,
    id: resolvedId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  products.push(newProduct);
  saveLocalProducts(products);
  notifySubscribers();

  // Sincronizar com Supabase e aguardar conclusão
  await syncProductToSupabase(newProduct);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('product-updated', { detail: { productId: resolvedId } }));
  }
  return resolvedId;
};

export const updateProduct = async (
  id: string,
  productToUpdate: Partial<Product>
): Promise<void> => {
  validateProductImageLimits(productToUpdate);
  formatProductTextData(productToUpdate as Product);
  if (productToUpdate.id && String(productToUpdate.id) !== String(id)) {
    throw new Error('Não é permitido alterar o ID de um produto existente.');
  }
  const legacyId = undefined;
  const dummyProduct = { ...productToUpdate, id };
  const resolvedId = ensureUuidFormat(dummyProduct);
  if (productToUpdate.id) productToUpdate.id = resolvedId;

  const skusToValidate: string[] = [];
  if (productToUpdate.code) skusToValidate.push(productToUpdate.code);
  if (productToUpdate.variations?.length) {
    productToUpdate.variations.forEach((v) => {
      if (v.sku) skusToValidate.push(v.sku);
    });
  }

  if (skusToValidate.length > 0) {
    const duplicates = await checkSkusUniquenessBatch(skusToValidate, resolvedId, legacyId);
    const duplicateSkus = Object.keys(duplicates);
    if (duplicateSkus.length > 0) {
      throw new Error(
        `SKU já utilizado: ${duplicateSkus.join(', ')}. Escolha o código comercial desejado; ele não será alterado automaticamente.`
      );
    }
  }

  const products = getLocalProducts();
  const index = products.findIndex((p) => String(p.id) === String(resolvedId));
  if (isProductDraft(productToUpdate) || (index !== -1 && isProductDraft(products[index]) && productToUpdate.isDraft !== false)) {
    const draft = { ...products[index], ...productToUpdate, id: resolvedId } as Product;
    await persistProductDraft(draft);
    if (index === -1) products.push(draft);
    else products[index] = draft;
    saveLocalProducts(products);
    notifySubscribers();
    return;
  }
  if (index === -1) {
    const dbUpdate = mapToDB({ ...productToUpdate, id: resolvedId });
    delete dbUpdate.id;
    delete dbUpdate.variations;
    delete dbUpdate.brand;
    delete dbUpdate.category;
    delete dbUpdate.ecommerce_description;
    delete dbUpdate.whatsapp_description;
    delete dbUpdate.whatsapp_template;
    delete dbUpdate.ecommerce_template;
    delete dbUpdate.initial_stock_entries;
    delete dbUpdate.meta_title;
    delete dbUpdate.meta_description;
    delete dbUpdate.seo_description;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(dbUpdate)
      .eq('id', resolvedId)
      .select('*')
      .single();
    if (error) throw error;

    if (Array.isArray(productToUpdate.variations) && productToUpdate.variations.length > 0) {
      for (const v of productToUpdate.variations) {
        if (v.id && v.stock !== undefined) {
          await supabase
            .from('product_variations')
            .update({
              stock: parseInt(String(v.stock), 10),
            })
            .eq('id', v.id);
        }
      }
    }
    const fullProduct = mapFromDB(data) as Product;
    const currentProducts = getLocalProducts();
    currentProducts.push(fullProduct);
    saveLocalProducts(currentProducts);
    notifySubscribers();
    return;
  }

  const currentItem = products[index];

  const updatedProduct = {
    ...currentItem,
    ...productToUpdate,
    id: resolvedId,
    updatedAt: new Date().toISOString(),
  };

  products[index] = updatedProduct;
  saveLocalProducts(products);
  notifySubscribers();

  // Sincronizar com Supabase e aguardar conclusão
  await syncProductToSupabase(updatedProduct);
};

export const bulkMoveToTrash = async (
  ids: string[]
): Promise<{
  successCount: number;
  errorCount: number;
  errors: string[];
  deactivatedIds: string[];
}> => {
  try {
    const idsWithOrders = new Set<string>();
    const orderConflicts: string[] = [];

    await Promise.all(
      ids.map(async (id) => {
        const linkedOrderId = await checkProductLinkedToSales(id);
        if (linkedOrderId) {
          idsWithOrders.add(id);
          orderConflicts.push(`Produto ID ${id} possui pedido vinculado (Ex: #${linkedOrderId})`);
        }
      })
    );

    const idsToUpdate = ids.filter((id) => !idsWithOrders.has(id));

    const errors: string[] = [];
    if (idsWithOrders.size > 0) {
      errors.push(
        `${idsWithOrders.size} produto(s) possuem pedidos de venda/assistência vinculados e não puderam ser movidos para a lixeira.`
      );
      orderConflicts.forEach((oc) => errors.push(oc));
    }

    if (idsToUpdate.length > 0) {
      await Promise.all(idsToUpdate.map((id) => deactivateProduct(id)));
    }

    return {
      successCount: idsToUpdate.length,
      errorCount: ids.length - idsToUpdate.length,
      errors,
      deactivatedIds: idsToUpdate,
    };
  } catch (error) {
    console.error('Erro no bulkMoveToTrash:', error);
    throw error;
  }
};

export const bulkRestoreProducts = async (ids: string[]): Promise<void> => {
  try {
    const products = getLocalProducts();
    const validUuids = ids.filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );
    const localSalvadoIds = new Set(
      products.filter(isNonConventionalProduct).map((product) => String(product.id))
    );
    let salvadoIds = localSalvadoIds;
    if (validUuids.length > 0) {
      const { data: rows, error } = await supabase
        .from(TABLE_NAME)
        .select('id, product_kind')
        .in('id', validUuids);
      if (error) throw error;
      salvadoIds = new Set([
        ...localSalvadoIds,
        ...(rows || [])
          .filter((row: any) => row.product_kind === 'salvado')
          .map((row: any) => String(row.id)),
      ]);
    }
    ids.forEach((id) => {
      const idx = products.findIndex((p) => String(p.id) === String(id));
      if (idx !== -1) {
        products[idx].deleted = false;
        products[idx].active = salvadoIds.has(String(id)) ? false : true;
        products[idx].updatedAt = new Date().toISOString();
      }
    });
    saveLocalProducts(products);
    notifySubscribers();

    if (validUuids.length > 0) {
      await supabase
        .from(TABLE_NAME)
        .update({ deleted: false, updated_at: new Date().toISOString() })
        .in('id', validUuids);
      const normalUuids = validUuids.filter((id) => !salvadoIds.has(id));
      if (normalUuids.length > 0) {
        await supabase.from(TABLE_NAME).update({ active: true }).in('id', normalUuids);
        await supabase
          .from('product_variations')
          .update({ active: true })
          .in('product_id', normalUuids);
      }
    }
  } catch (error) {
    console.error('Erro no bulkRestoreProducts:', error);
    throw error;
  }
};

export const bulkPermanentDeleteProducts = async (
  ids: string[]
): Promise<{ successCount: number; errorCount: number; errors: string[] }> => {
  try {
    const { data: moves } = await supabase
      .from('inventory_moves')
      .select('product_id')
      .in('product_id', ids);

    const idsWithMoves = new Set(moves?.map((m: any) => String(m.product_id)));
    const idsToProcess = ids.filter((id) => !idsWithMoves.has(id));
    const idsWithOrders = new Set<string>();

    for (const id of idsToProcess) {
      const linkedOrderId = await checkProductLinkedToSales(id);
      if (linkedOrderId) idsWithOrders.add(id);
    }

    const idsToDelete = idsToProcess.filter((id) => !idsWithOrders.has(id));

    const errors: string[] = [];
    if (idsWithMoves.size > 0)
      errors.push(
        `${idsWithMoves.size} produto(s) possuem movimentações de estoque (entradas/saídas).`
      );
    if (idsWithOrders.size > 0)
      errors.push(
        `${idsWithOrders.size} produto(s) possuem pedidos de venda ou assistência vinculados.`
      );

    if (idsToDelete.length > 0) {
      let products = getLocalProducts();
      products = products.filter((p) => !idsToDelete.includes(String(p.id)));
      saveLocalProducts(products);
      notifySubscribers();
    }

    return {
      successCount: idsToDelete.length,
      errorCount: ids.length - idsToDelete.length,
      errors,
    };
  } catch (error) {
    console.error('Erro no bulkPermanentDeleteProducts:', error);
    throw error;
  }
};
