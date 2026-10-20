import { supabase } from '@/pages/utils/supabaseConfig';
import type Person from '../../types/person.type';
import { TABLE_NAME, mapFromDB } from './personMapper';
import { syncMissingEmployeesFromProfiles } from './personSyncService';
import type { TestArtifactIdentity } from '../../../../../shared-utils/testArtifactPolicy';
import { isTestOperatorVisibleToUser } from '../../../../../shared-utils/testOperatorVisibility';
import {
  PERSON_QUERY_COLUMNS,
  type FetchPersonsOptions,
  isTestPerson,
  matchesPersonQueryContext,
  mapAndSortPeople,
  fetchAllPeopleRows,
  getCurrentUserEmail,
  getCachedPeople,
  getInFlightPeoplePromise,
  setCachedPeoplePromise,
  setCachedPeopleData,
  clearCachedPeoplePromise,
  getPreloadedPerson,
  setPreloadedPerson,
  personByIdRequests,
} from './query';

export { PERSON_QUERY_COLUMNS, isTestPerson };

export const subscribeToPeople = (
  collectionName: string,
  callback: (people: Person[]) => void,
  includeDeleted = false
) => {
  const fetchAll = async (force = false) => {
    const currentUserEmail = collectionName === 'employees' ? await getCurrentUserEmail() : '';
    const cacheKey = `${collectionName}_${includeDeleted}_${currentUserEmail}`;

    if (!force) {
      const cached = getCachedPeople(cacheKey);
      if (cached) {
        callback(cached);
        return;
      }

      const inFlight = getInFlightPeoplePromise(cacheKey);
      if (inFlight) {
        try {
          callback(await inFlight);
        } catch {
          callback([]);
        }
        return;
      }
    }

    const fetchPromise = (async () => {
      if (collectionName === 'employees') {
        await syncMissingEmployeesFromProfiles();
      }
      const rows = await fetchAllPeopleRows(collectionName, includeDeleted);
      return mapAndSortPeople(collectionName, rows, includeDeleted, currentUserEmail);
    })();

    setCachedPeoplePromise(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      if (getInFlightPeoplePromise(cacheKey) === fetchPromise) {
        setCachedPeopleData(cacheKey, result);
      }
      callback(result);
    } catch {
      if (getInFlightPeoplePromise(cacheKey) === fetchPromise) {
        clearCachedPeoplePromise(cacheKey);
      }
      callback([]);
    }
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
  options: FetchPersonsOptions = {}
): Promise<Person[]> => {
  try {
    if (collectionName === 'employees' && options.syncEmployeeProfiles !== false) {
      await syncMissingEmployeesFromProfiles();
    }

    const rows = await fetchAllPeopleRows(collectionName, includeDeleted);
    const currentUserEmail = collectionName === 'employees' ? await getCurrentUserEmail() : '';
    return mapAndSortPeople(collectionName, rows, includeDeleted, currentUserEmail);
  } catch (e) {
    console.error('Erro ao buscar pessoas em personService:', e);
    if (options.throwOnError) throw e;
    return [];
  }
};

export const fetchPersonById = (id: string): Promise<Person | null> => {
  if (!id) return Promise.resolve(null);

  const preloaded = getPreloadedPerson(id);
  if (preloaded) {
    return Promise.resolve(preloaded);
  }

  const existingRequest = personByIdRequests.get(id);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(PERSON_QUERY_COLUMNS)
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      return mapFromDB(data);
    } catch (e) {
      console.error('Erro ao buscar pessoa por ID em personService:', e);
      return null;
    }
  })();

  personByIdRequests.set(id, request);

  void request.finally(() => {
    if (personByIdRequests.get(id) === request) personByIdRequests.delete(id);
  });

  return request;
};

/** Eagerly resolve a person while the user is reviewing the order's available actions. */
export const preloadPersonById = async (id: string): Promise<Person | null> => {
  const person = await fetchPersonById(id);
  if (id && person) {
    setPreloadedPerson(id, person);
  }
  return person;
};

export const searchPeople = async (
  query: string,
  collectionName: string,
  limit = 30,
  testContext?: TestArtifactIdentity
): Promise<Person[]> => {
  if (!query || query.trim().length < 2) return [];
  if (testContext && collectionName !== 'customers') return [];

  let peopleQuery = supabase
    .from(TABLE_NAME)
    .select(PERSON_QUERY_COLUMNS)
    .or('deleted.eq.false,deleted.is.null');

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

  if (testContext) {
    peopleQuery = peopleQuery
      .eq('full_address->testArtifact->>is_test', 'true')
      .eq('full_address->testArtifact->>runId', testContext.runId)
      .eq('full_address->testArtifact->>ownerId', testContext.ownerId);
  }

  try {
    const currentUserEmail = collectionName === 'employees' ? await getCurrentUserEmail() : '';
    const { data, error } = await peopleQuery
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data
      .map(mapFromDB)
      .filter((person) => matchesPersonQueryContext(person, testContext))
      .filter(
        (person) =>
          collectionName !== 'employees' ||
          isTestOperatorVisibleToUser(person, currentUserEmail)
      );
  } catch (e) {
    console.error('Erro ao buscar pessoas no searchPeople:', e);
    return [];
  }
};

export const getRecentPeople = async (
  collectionName: string,
  limit = 20,
  testContext?: TestArtifactIdentity
): Promise<Person[]> => {
  if (testContext && collectionName !== 'customers') return [];

  let peopleQuery = supabase
    .from(TABLE_NAME)
    .select(PERSON_QUERY_COLUMNS)
    .or('deleted.eq.false,deleted.is.null');

  if (collectionName === 'employees') {
    peopleQuery = peopleQuery.or(
      `person_type.ilike.${collectionName},and(position.not.is.null,position.neq."")`
    );
  } else if (collectionName === 'customers') {
    peopleQuery = peopleQuery.or(`person_type.ilike.customers,person_type.ilike.customer`);
  } else {
    peopleQuery = peopleQuery.or(`person_type.ilike.suppliers,person_type.ilike.supplier`);
  }

  if (testContext) {
    peopleQuery = peopleQuery
      .eq('full_address->testArtifact->>is_test', 'true')
      .eq('full_address->testArtifact->>runId', testContext.runId)
      .eq('full_address->testArtifact->>ownerId', testContext.ownerId);
  }

  try {
    const currentUserEmail = collectionName === 'employees' ? await getCurrentUserEmail() : '';
    const { data, error } = await peopleQuery
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data
      .map(mapFromDB)
      .filter((person) => matchesPersonQueryContext(person, testContext))
      .filter(
        (person) =>
          collectionName !== 'employees' ||
          isTestOperatorVisibleToUser(person, currentUserEmail)
      );
  } catch (e) {
    console.error('Erro ao buscar pessoas recentes:', e);
    return [];
  }
};
