import { supabase } from '@/pages/utils/supabaseConfig';
import { withAbortTimeout } from '../../../../shared-utils/withAbortTimeout';
import { buildPostgrestAccentInsensitiveOrFilter } from '../../../../shared-utils/searchText';

const TABLE_NAME = 'showcase_assemblies';

export interface ShowcaseAssembly {
  id?: string;
  description: string;
  quantity: number;
  date: string;
  status: 'pending' | 'completed';
  observation?: string;
  created_at?: string;
  deleted?: boolean;
}

export const getShowcaseAssemblies = async (limit?: number, filters: { search?: string; startDate?: string; endDate?: string } = {}, signal?: AbortSignal) => {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('deleted', false)
    .order('date', { ascending: false });

  if (limit != null) query = query.limit(limit);
  if (filters.startDate) query = query.gte('date', filters.startDate);
  if (filters.endDate) query = query.lte('date', filters.endDate);
  if (filters.search?.trim()) {
    for (const word of filters.search.trim().split(/\s+/)) {
      const wordsFilter = buildPostgrestAccentInsensitiveOrFilter(['description', 'observation'], word);
      query = query.or(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(word) ? `${wordsFilter},id.eq.${word}` : wordsFilter);
    }
  }

  const { data, error } = await withAbortTimeout(query, 'agenda:montagens-mostruario', 15_000, signal);

  if (error) {
    // Tabela pode não existir ainda (404 do PostgREST)
    if (
      error.code === '42P01' ||
      error.message?.includes('does not exist') ||
      (error as any)?.details?.includes('does not exist')
    ) {
      console.warn(`Tabela '${TABLE_NAME}' não existe. Retornando lista vazia.`);
      return [] as ShowcaseAssembly[];
    }
    throw error;
  }
  return data as ShowcaseAssembly[];
};

export const saveShowcaseAssembly = async (assembly: ShowcaseAssembly) => {
  if (assembly.id) {
    const { error } = await supabase.from(TABLE_NAME).update(assembly).eq('id', assembly.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from(TABLE_NAME).insert(assembly);
    if (error) throw error;
  }
};

export const deleteShowcaseAssembly = async (id: string) => {
  const { error } = await supabase.from(TABLE_NAME).update({ deleted: true }).eq('id', id);
  if (error) throw error;
};
