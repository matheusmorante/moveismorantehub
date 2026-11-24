import { supabase } from '@/pages/utils/supabaseConfig';
import type Product from '../../types/product.type';
import type { Variation } from '../../types/product.type';
import { applyCompositionAvailability } from './compositionAvailability';
import { getLocalProducts, saveLocalProducts } from './productLocalCache';
import { mapFromDB } from './productMapper';
import { LIGHT_COLUMNS_WITH_CATS } from './productQueryProjections';
import { TABLE_NAME } from './productSkuService';

/** Atualiza ou insere produtos carregados do servidor no cache local legado. */
export const upsertLocalProducts = (products: Product[]): void => {
  if (!products.length) return;
  const localProducts = getLocalProducts();
  for (const product of products) {
    const id = String(product.id);
    const idx = localProducts.findIndex((cached) => String(cached.id) === id);
    if (idx === -1) {
      localProducts.push(product);
    } else {
      localProducts[idx] = product;
    }
  }
  saveLocalProducts(localProducts);
};

export const initializeProductsIfEmpty = async (): Promise<Product[]> => {
  try {
    console.log(
      '[ProductService] Carregando produtos a partir da tabela do Supabase do e-commerce...'
    );
    let allData: Record<string, unknown>[] = [];
    let from = 0;
    const step = 1000;
    let fetchMore = true;

    while (fetchMore) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(LIGHT_COLUMNS_WITH_CATS)
        .order('created_at', { ascending: false })
        .range(from, from + step - 1);

      if (error) {
        console.error('[ProductService] Erro ao buscar produtos do Supabase:', error);
        return getLocalProducts();
      }

      if (data && data.length > 0) {
        allData = [...allData, ...(data as unknown as Record<string, unknown>[])];
        from += step;
        if (data.length < step) fetchMore = false;
      } else {
        fetchMore = false;
      }
    }

    const fetchedProducts = await applyCompositionAvailability(
      allData.map((productRow, idx) => mapFromDB(productRow, idx))
    );
    saveLocalProducts(fetchedProducts);
    return fetchedProducts;
  } catch (error) {
    console.error('[ProductService] Exceção ao sincronizar dados do Supabase:', error);
    return getLocalProducts();
  }
};

export const getProductsByIds = async (ids: string[]): Promise<Product[]> => {
  const products = getLocalProducts();
  const idStrings = ids.map(String);
  return products.filter((product) => idStrings.includes(String(product.id)));
};

export const getProductByCode = async (
  code: string
): Promise<{ product: Product; variation?: Variation } | null> => {
  try {
    const products = getLocalProducts().filter((product) => !product.deleted);

    const directMatch = products.find((product) => product.code === code);
    if (directMatch) {
      return { product: directMatch };
    }

    for (const product of products) {
      const variation = product.variations?.find((candidate) => candidate.sku === code);
      if (variation) {
        return { product, variation };
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar produto por código:', error);
    return null;
  }
};
