import { supabase } from '@/pages/utils/supabaseConfig';
import Person from '../../types/person.type';
import { TABLE_NAME, mapFromDB } from './personMapper';
import { syncMissingEmployeesFromProfiles } from './personSyncService';

export const PERSON_QUERY_COLUMNS =
  'id, person_type, person_type_pf_pj, full_name, social_name, nickname, cpf_cnpj, rg_ie, ie_indicator, email, phone, address, observation, active, is_draft, deleted, deleted_at, position, lead_time, marketing_origin, stock_origins, created_at, updated_at';


const peopleCache: Record<
  string,
  { data: Person[]; timestamp: number; promise?: Promise<Person[]> }
> = {};

export const subscribeToPeople = (
  collectionName: string,
  callback: (people: Person[]) => void,
  includeDeleted = false
) => {
  const fetchAll = async (force = false) => {
    const cacheKey = `${collectionName}_${includeDeleted}`;

    if (!force && peopleCache[cacheKey]) {
      if (Date.now() - peopleCache[cacheKey].timestamp < 300000) {
        // 5 minutos de cache
        callback(peopleCache[cacheKey].data);
        return;
      }
    }

    if (!force && peopleCache[cacheKey]?.promise) {
      const data = await peopleCache[cacheKey].promise;
      callback(data);
      return;
    }

    const fetchPromise = (async () => {
      if (collectionName === 'employees') {
        await syncMissingEmployeesFromProfiles();
      }

      let peopleQuery = supabase.from(TABLE_NAME).select(PERSON_QUERY_COLUMNS);

      if (!includeDeleted) {
        peopleQuery = peopleQuery.or('deleted.eq.false,deleted.is.null');
      } else {
        peopleQuery = peopleQuery.eq('deleted', true);
      }

      if (collectionName === 'employees') {
        peopleQuery = peopleQuery.or(
          `person_type.ilike.${collectionName},and(position.not.is.null,position.neq."")`
        );
      } else if (collectionName === 'customers') {
        peopleQuery = peopleQuery.or(`person_type.ilike.customers,person_type.ilike.customer`);
      } else {
        peopleQuery = peopleQuery.or(`person_type.ilike.suppliers,person_type.ilike.supplier`);
      }

      const { data: peopleData } = await peopleQuery.order('full_name', { ascending: true });
      let employees: Person[] = (peopleData || []).map(mapFromDB);

      if (collectionName === 'employees') {
        const uniqueMap = new Map<string, Person>();
        for (const emp of employees) {
          const emailKey = emp.email?.toLowerCase().trim();
          const key = emailKey || String(emp.id);
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, emp);
          } else {
            const existing = uniqueMap.get(key)!;
            const existingScore =
              (existing.phone ? 10 : 0) + (existing.fullAddress?.street ? 10 : 0);
            const currentScore = (emp.phone ? 10 : 0) + (emp.fullAddress?.street ? 10 : 0);
            if (currentScore > existingScore) {
              uniqueMap.set(key, emp);
            }
          }
        }
        employees = Array.from(uniqueMap.values());
      }

      employees.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      return employees;
    })();

    peopleCache[cacheKey] = { ...peopleCache[cacheKey], promise: fetchPromise };

    const result = await fetchPromise;
    peopleCache[cacheKey] = { data: result, timestamp: Date.now() };
    callback(result);
  };

  fetchAll();

  const handlePeopleUpdate = () => {
    fetchAll(true); // force refresh
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('people_updated', handlePeopleUpdate);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('people_updated', handlePeopleUpdate);
    }
  };
};

export const fetchPersons = async (
  collectionName: string = 'suppliers',
  includeDeleted = false,
  options: { throwOnError?: boolean } = {}
): Promise<Person[]> => {
  try {
    if (collectionName === 'employees') {
      await syncMissingEmployeesFromProfiles();
    }

    let peopleQuery = supabase.from(TABLE_NAME).select(PERSON_QUERY_COLUMNS);

    if (!includeDeleted) {
      peopleQuery = peopleQuery.or('deleted.eq.false,deleted.is.null');
    } else {
      peopleQuery = peopleQuery.eq('deleted', true);
    }

    if (collectionName === 'employees') {
      peopleQuery = peopleQuery.or(
        `person_type.ilike.${collectionName},and(position.not.is.null,position.neq."")`
      );
    } else if (collectionName === 'customers') {
      peopleQuery = peopleQuery.or(`person_type.ilike.customers,person_type.ilike.customer`);
    } else {
      peopleQuery = peopleQuery.or(`person_type.ilike.suppliers,person_type.ilike.supplier`);
    }

    const { data: peopleData, error } = await peopleQuery.order('full_name', { ascending: true });
    if (error) throw error;

    let employees: Person[] = (peopleData || []).map(mapFromDB);

    if (collectionName === 'employees') {
      const uniqueMap = new Map<string, Person>();
      for (const emp of employees) {
        const emailKey = emp.email?.toLowerCase().trim();
        const key = emailKey || String(emp.id);
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, emp);
        } else {
          const existing = uniqueMap.get(key)!;
          const existingScore =
            (existing.phone ? 10 : 0) + (existing.fullAddress?.street ? 10 : 0);
          const currentScore = (emp.phone ? 10 : 0) + (emp.fullAddress?.street ? 10 : 0);
          if (currentScore > existingScore) {
            uniqueMap.set(key, emp);
          }
        }
      }
      employees = Array.from(uniqueMap.values());
    }

    employees.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
    return employees;
  } catch (e) {
    console.error('Erro ao buscar pessoas em personService:', e);
    if (options.throwOnError) throw e;
    return [];
  }
};

export const fetchPersonById = async (id: string): Promise<Person | null> => {
  if (!id) return null;
  try {
    const { data, error } = await supabase.from(TABLE_NAME).select(PERSON_QUERY_COLUMNS).eq('id', id).maybeSingle();

    if (error || !data) return null;
    return mapFromDB(data);
  } catch (e) {
    console.error('Erro ao buscar pessoa por ID em personService:', e);
    return null;
  }
};

export const searchPeople = async (
  query: string,
  collectionName: string,
  limit = 30
): Promise<Person[]> => {
  if (!query || query.trim().length < 2) return [];

  let peopleQuery = supabase.from(TABLE_NAME).select(PERSON_QUERY_COLUMNS).or('deleted.eq.false,deleted.is.null');

  if (collectionName === 'employees') {
    peopleQuery = peopleQuery.or(
      `person_type.ilike.${collectionName},and(position.not.is.null,position.neq."")`
    );
  } else if (collectionName === 'customers') {
    peopleQuery = peopleQuery.or(`person_type.ilike.customers,person_type.ilike.customer`);
  } else {
    peopleQuery = peopleQuery.or(`person_type.ilike.suppliers,person_type.ilike.supplier`);
  }

  const searchTerm = `%${query.trim()}%`;
  peopleQuery = peopleQuery.or(
    `full_name.ilike.${searchTerm},social_name.ilike.${searchTerm},cpf_cnpj.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`
  );

  try {
    const { data, error } = await peopleQuery
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(mapFromDB);
  } catch (e) {
    console.error('Erro ao buscar pessoas no searchPeople:', e);
    return [];
  }
};

export const getRecentPeople = async (collectionName: string, limit = 20): Promise<Person[]> => {
  let peopleQuery = supabase.from(TABLE_NAME).select(PERSON_QUERY_COLUMNS).or('deleted.eq.false,deleted.is.null');

  if (collectionName === 'employees') {
    peopleQuery = peopleQuery.or(
      `person_type.ilike.${collectionName},and(position.not.is.null,position.neq."")`
    );
  } else if (collectionName === 'customers') {
    peopleQuery = peopleQuery.or(`person_type.ilike.customers,person_type.ilike.customer`);
  } else {
    peopleQuery = peopleQuery.or(`person_type.ilike.suppliers,person_type.ilike.supplier`);
  }

  try {
    const { data, error } = await peopleQuery
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(mapFromDB);
  } catch (e) {
    console.error('Erro ao buscar pessoas recentes:', e);
    return [];
  }
};
