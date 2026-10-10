import { supabase } from '@/pages/utils/supabaseConfig';
import Product from '../../types/product.type';
import { isProductDraft } from './productDraftSnapshot';
import { persistProductDraft } from './productDraftPersistence';
import { ensureDefaultVariation } from '../productVariationDefaults';
import { validateProductImageLimits } from './productImageHelpers';
import { getLocalProducts, saveLocalProducts, notifySubscribers } from './productLocalCache';
import { TABLE_NAME, generateUniqueCode, checkSkusUniquenessBatch } from './productSkuService';
import { queryClient } from '@/lib/queryClient';
import { mapToDB, mapFromDB } from './productMapper';
import { isNonConventionalProduct } from '../productKindRules';
import {
  isTestProduct,
  isTestProductCatalogPublicationBlocked,
  TEST_PRODUCT_CATALOG_PUBLICATION_ERROR,
} from '../hmlTestData';
import { ensureUuidFormat, syncProductToSupabase } from './productPersistenceService';
import { formatProductTextData } from './productValidation';
import {
  assertOwnedByTestContext,
  getTestArtifactContext,
  stampTestArtifact,
} from '../../../../../shared-utils/testArtifactContext';
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


const invalidateProductQueries = () => {
  try {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  } catch (err) {
    // Failsafe para testes headless
  }
};

export type ProductMutationOptions = { deferQueryInvalidation?: boolean };

export const saveProduct = async (product: Product, forceInsert = false): Promise<string> => {
  if (isTestProductCatalogPublicationBlocked(product)) {
    throw new Error(TEST_PRODUCT_CATALOG_PUBLICATION_ERROR);
  }
  const products = getLocalProducts();
  const existingProduct = !forceInsert
    ? products.find((item) => String(item.id) === String(product.id))
    : undefined;
  validateProductImageLimits(product, existingProduct);
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
    if (getTestArtifactContext()) {
      throw new Error('Artefatos de teste precisam ser criados no banco; rascunhos locais não são aceitos.');
    }
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

  const existingLocalProduct = products.find((item) => String(item.id) === String(resolvedId));
  const isContextBound = Boolean(getTestArtifactContext());
  if (isContextBound && existingLocalProduct) assertOwnedByTestContext(existingLocalProduct);

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

  if (resolvedId && !forceInsert && existingLocalProduct) {
    await updateProduct(resolvedId, product);
    return String(resolvedId);
  }

  let newProduct: Product = {
    ...product,
    id: resolvedId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isContextBound) {
    newProduct = stampTestArtifact(newProduct, 'technicalSpecs');
    for (const variation of newProduct.variations || []) variation.id = crypto.randomUUID();
  }

  products.push(newProduct);
  saveLocalProducts(products);
  notifySubscribers();

  // Sincronizar com Supabase e aguardar conclusão
  await syncProductToSupabase(newProduct, { insertOnly: isContextBound });
  invalidateProductQueries();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('product-updated', { detail: { productId: resolvedId } }));
  }
  return resolvedId;
};

export const updateProduct = async (
  id: string,
  productToUpdate: Partial<Product>,
  options: ProductMutationOptions = {}
): Promise<void> => {
  const products = getLocalProducts();
  const index = products.findIndex((p) => String(p.id) === String(id));
  const existingProduct = index === -1 ? undefined : products[index];
  const productForValidation: Partial<Product> = {
    ...existingProduct,
    ...productToUpdate,
    images: productToUpdate.images ?? existingProduct?.images,
    variations: productToUpdate.variations ?? existingProduct?.variations,
  };
  validateProductImageLimits(productForValidation, existingProduct);
  formatProductTextData(productToUpdate as Product);
  if (productToUpdate.id && String(productToUpdate.id) !== String(id)) {
    throw new Error('Não é permitido alterar o ID de um produto existente.');
  }
  const legacyId = undefined;
  const dummyProduct = { ...productToUpdate, id };
  const resolvedId = ensureUuidFormat(dummyProduct);
  if (productToUpdate.id) productToUpdate.id = resolvedId;

  if (getTestArtifactContext()) {
    const { data: databaseArtifact, error: artifactError } = await supabase
      .from(TABLE_NAME)
      .select('id,technical_specs')
      .eq('id', resolvedId)
      .maybeSingle();
    if (artifactError) throw artifactError;
    if (!databaseArtifact) throw new Error('O produto não existe para esta execução de teste.');
    assertOwnedByTestContext(databaseArtifact);
  }

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

  const requestsCatalogPublication =
    productToUpdate.status === 'published' ||
    productToUpdate.variations?.some((variation) => variation.status === 'published');
  if (requestsCatalogPublication) {
    const { data: databaseProduct, error } = await supabase
      .from(TABLE_NAME)
      .select('code, observations, product_variations(sku, name)')
      .eq('id', resolvedId)
      .maybeSingle();
    if (error) throw error;

    const existingProduct = index === -1 ? undefined : products[index];
    const publicationCandidate = {
      ...databaseProduct,
      ...existingProduct,
      ...productToUpdate,
      variations: [
        ...(databaseProduct?.product_variations ?? []),
        ...(existingProduct?.variations ?? []),
        ...(productToUpdate.variations ?? []),
      ],
    };
    if (
      [databaseProduct, existingProduct, productToUpdate, publicationCandidate].some(isTestProduct)
    ) {
      throw new Error(TEST_PRODUCT_CATALOG_PUBLICATION_ERROR);
    }
  }

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
  if (!options.deferQueryInvalidation) invalidateProductQueries();
};

export const bulkMoveToTrash = async (
  ids: string[],
  options: ProductMutationOptions = {}
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

    const updateResults = await Promise.allSettled(
      idsToUpdate.map((id) => deactivateProduct(id, { deferQueryInvalidation: true }))
    );
    const deactivatedIds = idsToUpdate.filter(
      (_, index) => updateResults[index]?.status === 'fulfilled'
    );
    updateResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        const reason = result.reason instanceof Error ? result.reason.message : 'falha ao desativar';
        errors.push(`Produto ID ${idsToUpdate[index]}: ${reason}`);
      }
    });

    if (idsToUpdate.length > 0 && !options.deferQueryInvalidation) {
      invalidateProductQueries();
    }

    return {
      successCount: deactivatedIds.length,
      errorCount: ids.length - deactivatedIds.length,
      errors,
      deactivatedIds,
    };
  } catch (error) {
    console.error('Erro no bulkMoveToTrash:', error);
    throw error;
  }
};

export const bulkRestoreProducts = async (ids: string[]): Promise<void> => {
  let remoteWriteStarted = false;
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
    if (validUuids.length > 0) {
      remoteWriteStarted = true;
      const { error: restoreProductsError } = await supabase
        .from(TABLE_NAME)
        .update({ deleted: false, updated_at: new Date().toISOString() })
        .in('id', validUuids);
      if (restoreProductsError) throw restoreProductsError;

      const normalUuids = validUuids.filter((id) => !salvadoIds.has(id));
      if (normalUuids.length > 0) {
        const { error: activateProductsError } = await supabase
          .from(TABLE_NAME)
          .update({ active: true })
          .in('id', normalUuids);
        if (activateProductsError) throw activateProductsError;

        const { error: activateVariationsError } = await supabase
          .from('product_variations')
          .update({ active: true })
          .in('product_id', normalUuids);
        if (activateVariationsError) throw activateVariationsError;
      }
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

    if (ids.length > 0) {
      try {
        await queryClient.invalidateQueries({ queryKey: ['products'] });
      } catch (invalidationError) {
        console.error('Falha ao reconciliar a lista após restaurar produtos:', invalidationError);
      }
    }
  } catch (error) {
    console.error('Erro no bulkRestoreProducts:', error);
    if (remoteWriteStarted) {
      try {
        await queryClient.invalidateQueries({ queryKey: ['products'] });
      } catch (invalidationError) {
        console.error('Falha ao reconciliar a lista após erro na restauração:', invalidationError);
      }
    }
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
