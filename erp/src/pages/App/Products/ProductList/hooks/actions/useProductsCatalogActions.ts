import { supabase } from '@/pages/utils/supabaseConfig';
import Product from '../../../../../types/product.type';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';
import { updateProduct } from '@/pages/utils/productService';
import {
  isTestProduct,
  TEST_PRODUCT_CATALOG_PUBLICATION_ERROR,
} from '@/pages/utils/hmlTestData';
import { triggerProductMetaCatalogSync } from '@/pages/utils/productService/productMetaCatalogSync';

export { validateCatalogPublication } from '../../../../../../../../shared-utils/catalogPublicationValidation';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export interface ResolvedCatalogEntities {
  parentProduct?: Product;
  variation?: any;
  isVariation: boolean;
}

/**
 * Resolve os objetos de variação e produto pai para ações de catálogo
 * a partir do identificador fornecido (composto ou simples).
 */
export const resolveCatalogEntities = async (
  id: string,
  serverProducts: Product[]
): Promise<ResolvedCatalogEntities> => {
  const [possibleParentId, ...skuParts] = id.split('_');
  const targetSku = skuParts.join('_');
  const isCompoundId = skuParts.length > 0;

  let parentProduct: Product | undefined;
  let variation: any = undefined;

  // 1. Procurar em serverProducts por ID composto (possibleParentId)
  if (isCompoundId) {
    parentProduct = serverProducts.find((p) => String(p.id) === String(possibleParentId));
    if (parentProduct && Array.isArray(parentProduct.variations)) {
      variation = parentProduct.variations.find((item: any, index: number) => {
        if (String(item.id) === targetSku || String(index) === targetSku) return true;
        const rawSku = item.sku || '';
        const genSku = `${parentProduct!.sku || parentProduct!.code || ''}-${String(index + 1).padStart(2, '0')}`;
        const normalizedTarget = normalizeVariationSku(targetSku);
        return (
          (rawSku && String(rawSku) === targetSku) ||
          genSku === targetSku ||
          normalizeVariationSku(rawSku) === normalizedTarget ||
          normalizeVariationSku(genSku) === normalizedTarget
        );
      });
    }
  }

  // 2. Procurar em serverProducts se id for diretamente o ID ou SKU de uma variação
  if (!variation) {
    const normalizedId = normalizeVariationSku(id);
    for (const p of serverProducts) {
      if (Array.isArray(p.variations)) {
        const found = p.variations.find(
          (v: any) =>
            String(v.id) === String(id) ||
            String(v.id) === targetSku ||
            String(v.sku) === String(id) ||
            normalizeVariationSku(v.sku || '') === normalizedId
        );
        if (found) {
          parentProduct = p;
          variation = found;
          break;
        }
      }
    }
  }

  // 3. Fallback: procurar no Supabase se não estiver na página atual em memória
  if (isCompoundId && !variation) {
    const { data: dbProd } = await supabase
      .from('products')
      .select('*, product_variations(*)')
      .eq('id', possibleParentId)
      .maybeSingle();

    if (dbProd) {
      parentProduct = dbProd;
      const vars = (dbProd as any).product_variations || (dbProd as any).variations || [];
      const normalizedTarget = normalizeVariationSku(targetSku);
      variation = vars.find((item: any, index: number) => {
        if (String(item.id) === targetSku) return true;
        const rawSku = item.sku || '';
        const genSku = `${dbProd.code || ''}-${String(index + 1).padStart(2, '0')}`;
        return (
          normalizeVariationSku(rawSku) === normalizedTarget ||
          normalizeVariationSku(genSku) === normalizedTarget
        );
      });
    }
  } else if (!variation) {
    const { data: dbVar } = await supabase
      .from('product_variations')
      .select('*, products(*)')
      .eq('id', id)
      .maybeSingle();

    if (dbVar) {
      variation = dbVar;
      parentProduct = (dbVar as any).products;
    }
  }

  // 4. Se ainda não for variação, verifica se é produto simples/pai
  if (!parentProduct) {
    parentProduct = serverProducts.find((p) => String(p.id) === String(id));
  }

  return {
    parentProduct,
    variation,
    isVariation: Boolean(variation),
  };
};

/**
 * Persiste a alteração de status do catálogo no banco e sincroniza com canais externos.
 */
export const persistCatalogStatus = async (
  id: string,
  newStatus: NonNullable<Product['status']>,
  parentProduct?: Product,
  variation?: any,
  serverProducts: Product[] = []
): Promise<void> => {
  const isVariation = Boolean(variation);
  const catalogProduct = {
    ...parentProduct,
    variations: isVariation && variation ? [variation] : parentProduct?.variations,
  };

  if (newStatus === 'published' && isTestProduct(catalogProduct)) {
    throw new Error(TEST_PRODUCT_CATALOG_PUBLICATION_ERROR);
  }

  // ── Atualização individual de Variação ───────────────────────────
  if (isVariation && variation) {
    if (isUuid(variation.id)) {
      const { error } = await supabase
        .from('product_variations')
        .update({ status: newStatus })
        .eq('id', variation.id);
      if (error) throw error;
    }

    if (parentProduct?.id) {
      if (newStatus === 'published') {
        // Publicar qualquer variação garante que o produto pai fique publicado e visível nos feeds
        const { error: parentStatusError } = await supabase
          .from('products')
          .update({ status: 'published' })
          .eq('id', parentProduct.id);
        if (parentStatusError) throw parentStatusError;
      } else {
        // Se a variação foi ocultada, verifica se ainda existe alguma outra variação publicada
        const { data: remainingVars, error: remainingVarsError } = await supabase
          .from('product_variations')
          .select('id')
          .eq('product_id', parentProduct.id)
          .neq('id', variation.id)
          .eq('status', 'published');
        if (remainingVarsError) throw remainingVarsError;

        if (!remainingVars || remainingVars.length === 0) {
          const { error: parentStatusError } = await supabase
            .from('products')
            .update({ status: 'hidden' })
            .eq('id', parentProduct.id);
          if (parentStatusError) throw parentStatusError;
        }
      }

      triggerProductMetaCatalogSync(parentProduct.id);
    }
    return;
  }

  // ── Atualização de Produto Pai / Simples ─────────────────────────
  if (isUuid(id)) {
    const { error: productError } = await supabase
      .from('products')
      .update({ status: newStatus })
      .eq('id', id);
    if (productError) throw productError;
  }

  await updateProduct(id, { status: newStatus }, { deferQueryInvalidation: true });

  if (parentProduct?.variations?.length) {
    await updateProduct(id, {
      variations: parentProduct.variations.map((v: any) => ({
        ...v,
        status: newStatus,
      })),
    }, { deferQueryInvalidation: true });
  }

  if (isUuid(id)) {
    const { error: variationsError } = await supabase
      .from('product_variations')
      .update({ status: newStatus })
      .eq('product_id', id);
    if (variationsError) throw variationsError;
  }

  const independentChildren = serverProducts.filter(
    (product) => String(product.parentId) === String(id)
  );

  await Promise.all(
    independentChildren
      .filter((child) => child.id)
      .map((child) =>
        updateProduct(child.id!, { status: newStatus }, { deferQueryInvalidation: true })
      )
  );

  triggerProductMetaCatalogSync(id);
};
