import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import type {
  CharacteristicGroup,
} from '../types/variation.type';
import type { CharacteristicGroupFormData } from '../../../../shared-utils/characteristicGroupFormRules';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import { sortProductCharacteristicGroups } from '../../../../shared-utils/productCharacteristicGroupOrder';

export type ProductCategoryOption = { id: string; name: string };

export const CHARACTERISTIC_GROUPS_QUERY_KEY = ['characteristic-groups'] as const;
const CHARACTERISTIC_GROUP_REQUEST_TIMEOUT_MS = 20_000;
const CACHE_TTL_MS = 60_000;

let cachedCharacteristicGroups: {
  timestamp: number;
  data: { groups: CharacteristicGroup[]; categories: ProductCategoryOption[] };
} | null = null;

export const clearCharacteristicGroupCache = () => {
  cachedCharacteristicGroups = null;
};

export const fetchCharacteristicGroups = async (options?: { forceRefresh?: boolean }): Promise<{
  groups: CharacteristicGroup[];
  categories: ProductCategoryOption[];
}> => {
  const now = Date.now();
  if (!options?.forceRefresh && cachedCharacteristicGroups && now - cachedCharacteristicGroups.timestamp < CACHE_TTL_MS) {
    return cachedCharacteristicGroups.data;
  }

  const results = await withTimeout(
    Promise.all([
      supabase.from('attribute_groups').select('id, name, description, is_default').order('name'),
      supabase.from('categories').select('id, name').eq('type', 'category').order('name'),
    ]),
    CHARACTERISTIC_GROUP_REQUEST_TIMEOUT_MS,
    null,
    'Carregar grupos de características'
  );
  if (!results) throw new Error('Tempo esgotado ao carregar grupos de características.');
  const [groupResult, categoryResult] = results;

  if (groupResult.error) throw groupResult.error;
  if (categoryResult.error) throw categoryResult.error;

  const categories = (categoryResult.data ?? []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
  }));
  const groups: CharacteristicGroup[] = (groupResult.data ?? []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    isDefault: row.is_default === true,
  }));
  const sortedGroups = sortProductCharacteristicGroups(groups);

  cachedCharacteristicGroups = {
    timestamp: now,
    data: { groups: sortedGroups, categories },
  };

  return cachedCharacteristicGroups.data;
};

export const saveCharacteristicGroup = async (
  group: CharacteristicGroupFormData,
  preservedDescription = ''
): Promise<string> => {
  const result = await withTimeout(
    supabase.rpc('save_product_characteristic_group', {
      p_definition: {
        id: group.id,
        name: group.name,
        description: preservedDescription,
      },
    }),
    CHARACTERISTIC_GROUP_REQUEST_TIMEOUT_MS,
    null,
    'Salvar grupo de características'
  );
  if (!result) throw new Error('Tempo esgotado ao salvar o grupo de características.');
  const { data, error } = result;
  if (error) throw error;
  if (typeof data !== 'string' || !data) {
    throw new Error('O banco não retornou o identificador do grupo salvo.');
  }
  clearCharacteristicGroupCache();
  return data;
};

export const deleteCharacteristicGroup = async (groupId: string): Promise<void> => {
  const result = await withTimeout(
    supabase.rpc('delete_product_characteristic_group', { p_group_id: groupId }),
    CHARACTERISTIC_GROUP_REQUEST_TIMEOUT_MS,
    null,
    'Excluir grupo de características'
  );
  if (!result) throw new Error('Tempo esgotado ao excluir o grupo de características.');
  const { error } = result;
  if (error) throw error;
  clearCharacteristicGroupCache();
};

