import { supabase } from '@/pages/utils/supabaseConfig';

export interface ProductCategoryOption {
  readonly id: string;
  readonly name: string;
}

export const fetchProductCategoryOptions = async (): Promise<ProductCategoryOption[]> => {
  const { data, error } = await supabase.from('categories').select('id, name').order('name');
  if (error) throw error;
  return data ?? [];
};
