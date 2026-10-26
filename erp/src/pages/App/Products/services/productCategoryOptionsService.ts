import { supabase } from '@/pages/utils/supabaseConfig';
import { isProductCategoryOption } from 'morante-hub-root/shared-utils/productCategoryOptions';

export interface ProductCategoryOption {
  readonly id: string;
  readonly name: string;
}

export const fetchProductCategoryOptions = async (): Promise<ProductCategoryOption[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, type')
    .order('name');
  if (error) throw error;
  return (data ?? []).filter(isProductCategoryOption).map(({ id, name }) => ({ id, name }));
};
