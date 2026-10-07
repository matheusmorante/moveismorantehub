import { supabase } from '@/pages/utils/supabaseConfig';

export interface ProductCatalogMetadataOption {
  readonly id: string;
  readonly name: string;
  readonly created_at?: string;
}

interface ProductOpportunityRow {
  readonly id: string;
  readonly name: string | null;
}

interface ProductSupplierRow {
  readonly id: string;
  readonly full_name: string | null;
  readonly nickname: string | null;
  readonly social_name: string | null;
}

let productOpportunityMap: Record<string, string> | null = null;
let productOpportunityMapPromise: Promise<Record<string, string>> | null = null;

export const fetchProductOpportunityMap = async (): Promise<Record<string, string>> => {
  if (productOpportunityMap) return productOpportunityMap;
  if (!productOpportunityMapPromise) {
    productOpportunityMapPromise = (async () => {
      const { data } = await supabase.from('opportunities').select('id, name');
      const map: Record<string, string> = {};
      ((data || []) as ProductOpportunityRow[]).forEach(({ id, name }) => {
        if (name) map[id] = name;
      });
      productOpportunityMap = map;
      return map;
    })();
  }
  return productOpportunityMapPromise;
};

let productSupplierMap: Record<string, string> | null = null;
let productSupplierMapPromise: Promise<Record<string, string>> | null = null;

export const fetchProductSupplierMap = async (): Promise<Record<string, string>> => {
  if (productSupplierMap) return productSupplierMap;
  if (!productSupplierMapPromise) {
    productSupplierMapPromise = (async () => {
      const { data } = await supabase
        .from('people')
        .select('id, full_name, nickname, social_name')
        .or('person_type.ilike.suppliers,person_type.ilike.supplier');
      const map: Record<string, string> = {};
      ((data || []) as ProductSupplierRow[]).forEach(({ id, full_name, nickname, social_name }) => {
        map[id] = nickname || full_name || social_name || '';
      });
      productSupplierMap = map;
      return map;
    })();
  }
  return productSupplierMapPromise;
};

export const getProductMetadataErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
};

export const fetchProductMaterials = async (): Promise<ProductCatalogMetadataOption[]> => {
  const { data, error } = await supabase
    .from('product_materials')
    .select('id, name, created_at')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

export const createProductMaterial = async (name: string): Promise<void> => {
  const { error } = await supabase
    .from('product_materials')
    .insert([{ name: name.trim().toUpperCase() }]);
  if (error?.code === '23505') throw new Error('Este material já existe!');
  if (error) throw error;
};

/** Returns the number of linked products; deletes the material only when no links exist. */
export const deleteProductMaterialIfUnused = async (material: ProductCatalogMetadataOption) => {
  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('material', material.name)
    .is('deleted', false);
  if (countError) throw countError;
  if (count && count > 0) return { linkedProductCount: count, deleted: false };

  const { error } = await supabase.from('product_materials').delete().eq('id', material.id);
  if (error) throw error;
  return { linkedProductCount: 0, deleted: true };
};

export const fetchProductTypes = async (): Promise<ProductCatalogMetadataOption[]> => {
  const { data, error } = await supabase
    .from('product_types')
    .select('id, name, created_at')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

export const createProductType = async (name: string): Promise<void> => {
  const { error } = await supabase
    .from('product_types')
    .insert([{ name: name.trim().toUpperCase() }]);
  if (error) throw error;
};

export const deleteProductType = async (id: string): Promise<void> => {
  const { error } = await supabase.from('product_types').delete().eq('id', id);
  if (error) throw error;
};
