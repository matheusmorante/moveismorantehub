import { supabase } from './supabase/client';
import { withAbortTimeout } from '../../../shared-utils/withAbortTimeout';

export const catalogCategoriesQuery = {
  queryKey: ['catalog-categories'], staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000,
  queryFn: async () => {
    const { data, error } = await withAbortTimeout(supabase.from('categories').select('id, name, slug, type').order('name'), 'catalogo:categorias', 15_000);
    if (error) throw error;
    return data || [];
  },
};
export const catalogRelationshipsQuery = {
  queryKey: ['catalog-category-relationships'], staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000,
  queryFn: async () => {
    const { data, error } = await withAbortTimeout(supabase.from('category_relationships').select('parent_id, child_id'), 'catalogo:relacoes-categorias', 15_000);
    if (error) throw error;
    return data || [];
  },
};
