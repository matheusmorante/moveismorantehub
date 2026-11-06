import { supabase } from '../../../services/supabaseClient';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';
export * from '../../../../../shared-utils/productListMetadata';

interface OpportunityRow {
  id: string;
  name: string | null;
}

interface SupplierRow {
  id: string;
  full_name: string | null;
  nickname: string | null;
  social_name: string | null;
}

export const fetchProductOpportunityMap = async (
  ids: readonly string[], signal?: AbortSignal,
): Promise<Record<string, string>> => {
  if (!ids.length) return {};
  const { data, error } = await withAbortTimeout(
    supabase.from('opportunities').select('id, name').in('id', [...ids]),
    'produtos:nomes-oportunidades', 15_000, signal,
  );
  if (error) throw error;
  const map: Record<string, string> = {};
  ((data || []) as OpportunityRow[]).forEach(({ id, name }) => {
    if (name) map[id] = name;
  });
  return map;
};

export const fetchProductSupplierMap = async (
  ids: readonly string[], signal?: AbortSignal,
): Promise<Record<string, string>> => {
  if (!ids.length) return {};
  const { data, error } = await withAbortTimeout(supabase.from('people')
    .select('id, full_name, nickname, social_name')
    .or('person_type.ilike.suppliers,person_type.ilike.supplier')
    .in('id', [...ids]), 'produtos:nomes-fornecedores', 15_000, signal);
  if (error) throw error;
  const map: Record<string, string> = {};
  ((data || []) as SupplierRow[]).forEach(({ id, full_name, nickname, social_name }) => {
    map[id] = nickname || full_name || social_name || '';
  });
  return map;
};
