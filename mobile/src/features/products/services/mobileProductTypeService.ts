import { supabase } from '../../../services/supabaseClient';

export interface MobileProductType { id: string; name: string; created_at?: string; }

export const fetchMobileProductTypes = async (): Promise<MobileProductType[]> => {
  const { data, error } = await supabase.from('product_types').select('*').order('name');
  if (error) throw error;
  return data || [];
};

export const saveMobileProductType = async (name: string) => {
  const normalized = name.trim().toUpperCase();
  if (!normalized) return;
  const { error } = await supabase.from('product_types').insert([{ name: normalized }]);
  if (error) throw error;
};

export const deleteMobileProductType = async (id: string) => {
  const { error } = await supabase.from('product_types').delete().eq('id', id);
  if (error) throw error;
};
