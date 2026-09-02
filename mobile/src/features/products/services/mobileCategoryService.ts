import { supabase } from '../../../services/supabaseClient';

export interface MobileCategory {
  id: string;
  name: string;
  active?: boolean;
  slug?: string;
  parents?: string[];
}

export const fetchMobileCategories = async (): Promise<MobileCategory[]> => {
  try {
    const { data: catsData, error: catsErr } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (catsErr) {
      console.warn('[MobileCategoryService] Erro ao buscar categorias:', catsErr);
      return [];
    }

    const { data: relData, error: relErr } = await supabase
      .from('category_relationships')
      .select('parent_id, child_id');

    if (relErr) {
      console.warn('[MobileCategoryService] Erro ao buscar relacoes:', relErr);
    }

    const categoriesWithParents = (catsData || []).map((cat: any) => ({
      ...cat,
      parents: relData?.filter((r: any) => r.child_id === cat.id).map((r: any) => r.parent_id) || []
    }));

    return categoriesWithParents;
  } catch (err) {
    console.error('[MobileCategoryService] Exceção:', err);
    return [];
  }
};

export const saveMobileCategory = async (name: string, id?: string): Promise<MobileCategory | null> => {
  const trimmed = name.trim();
  if (!trimmed) return null;

  if (id) {
    const { data, error } = await supabase
      .from('categories')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('categories')
    .insert([{ name: trimmed, active: true, created_at: new Date().toISOString() }])
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const deleteMobileCategory = async (id: string): Promise<void> => {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
};
