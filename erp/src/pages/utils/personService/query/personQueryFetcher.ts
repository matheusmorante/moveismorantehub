import { supabase } from '@/pages/utils/supabaseConfig';
import { TABLE_NAME } from '../personMapper';
import { PEOPLE_FETCH_PAGE_SIZE, PERSON_QUERY_COLUMNS } from './personQuery.types';

export const getCurrentUserEmail = async (): Promise<string> => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.email?.trim().toLowerCase() || '';
  } catch {
    return '';
  }
};

export const fetchAllPeopleRows = async (
  collectionName: string,
  includeDeleted: boolean
): Promise<any[]> => {
  const allRows: any[] = [];

  for (let firstRow = 0; ; firstRow += PEOPLE_FETCH_PAGE_SIZE) {
    let query = supabase.from(TABLE_NAME).select(PERSON_QUERY_COLUMNS);

    if (includeDeleted) {
      query = query.eq('deleted', true);
    } else {
      query = query.or('deleted.eq.false,deleted.is.null');
    }

    if (collectionName === 'employees') {
      query = query.or(
        `person_type.ilike.${collectionName},and(position.not.is.null,position.neq."")`
      );
    } else if (collectionName === 'customers') {
      query = query.or('person_type.ilike.customers,person_type.ilike.customer');
    } else {
      query = query.or('person_type.ilike.suppliers,person_type.ilike.supplier');
    }

    const { data, error } = await query
      .order('full_name', { ascending: true })
      .order('id', { ascending: true })
      .range(firstRow, firstRow + PEOPLE_FETCH_PAGE_SIZE - 1);

    if (error) throw error;

    const page = data || [];
    allRows.push(...page);
    if (page.length < PEOPLE_FETCH_PAGE_SIZE) return allRows;
  }
};
