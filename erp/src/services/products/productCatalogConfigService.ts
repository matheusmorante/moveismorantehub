import { supabase } from '@/pages/utils/supabaseConfig';
import {
  createProductMaterial,
  createProductType,
  deleteProductMaterialIfUnused,
  deleteProductType,
  fetchProductMaterials,
  fetchProductTypes,
  getProductMetadataErrorCode,
  type ProductCatalogMetadataOption,
} from '@/pages/App/Products/services/productCatalogMetadataService';

export type ProductCatalogItem = ProductCatalogMetadataOption;

export interface ProductCatalogDeleteResult {
  linkedProductCount: number;
  deleted: boolean;
}

export const getCatalogConfigErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

export async function fetchProductCatalogConfig(): Promise<{
  materials: ProductCatalogItem[];
  productTypes: ProductCatalogItem[];
}> {
  const [materials, productTypes] = await Promise.all([
    fetchProductMaterials(),
    fetchProductTypes(),
  ]);
  return { materials, productTypes };
}

export async function createCatalogMaterial(name: string): Promise<void> {
  try {
    await createProductMaterial(name);
  } catch (error) {
    if (getProductCatalogConflictMessage(error)) {
      throw new Error('Atenção: Este material já existe!');
    }
    throw error;
  }
}

export async function createCatalogType(name: string): Promise<void> {
  try {
    await createProductType(name);
  } catch (error) {
    if (getProductCatalogConflictMessage(error)) {
      throw new Error('Atenção: Esta categoria já existe!');
    }
    throw error;
  }
}

const getProductCatalogConflictMessage = (error: unknown): boolean => {
  if (getProductMetadataErrorCode(error) === '23505') return true;
  return error instanceof Error && error.message.includes('já existe');
};

export async function deleteCatalogMaterialIfUnused(
  material: ProductCatalogItem
): Promise<ProductCatalogDeleteResult> {
  return deleteProductMaterialIfUnused(material);
}

/** Remove um tipo/categoria base somente quando nenhum produto ativo estiver vinculado. */
export async function deleteCatalogTypeIfUnused(
  productType: ProductCatalogItem
): Promise<ProductCatalogDeleteResult> {
  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('product_type_id', productType.id)
    .is('deleted_at', null);

  if (countError) throw countError;
  if (count && count > 0) {
    return { linkedProductCount: count, deleted: false };
  }

  await deleteProductType(productType.id);
  return { linkedProductCount: 0, deleted: true };
}
