import { supabase } from '@/pages/utils/supabaseConfig';
import type Person from '../../types/person.type';
import { TABLE_NAME, mapFromDB } from './personMapper';
import { syncMissingEmployeesFromProfiles } from './personSyncService';
import type { TestArtifactIdentity } from '../../../../../shared-utils/testArtifactPolicy';
import { isTestOperatorVisibleToUser } from '../../../../../shared-utils/testOperatorVisibility';
import { buildNormalizedWordsRegex } from '../../../../../shared-utils/searchText';
import {
  PERSON_QUERY_COLUMNS,
  type FetchPersonsOptions,
  isTestPerson,
  matchesPersonQueryContext,
  mapAndSortPeople,
  fetchAllPeopleRows,
  getCurrentUserContext,
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

// Share the same event and collapse newer invalidations that arrive while a read is
// running into one follow-up read. The final result must include the latest event.
const peopleUpdateRequests = new WeakMap<Event, Map<string, Promise<Person[]>>>();
const peopleUpdateGenerations = new Map<
  string,
  { generation: number; promise?: Promise<Person[]> }
>();

const getPeopleUpdatePromise = (
  updateEvent: Event,
  cacheKey: string,
  load: () => Promise<Person[]>
): Promise<Person[]> => {
  const eventRequests =
    peopleUpdateRequests.get(updateEvent) ?? new Map<string, Promise<Person[]>>();
  peopleUpdateRequests.set(updateEvent, eventRequests);

  const eventRequest = eventRequests.get(cacheKey);
  if (eventRequest) return eventRequest;

  let state = peopleUpdateGenerations.get(cacheKey);
  if (!state) {
    state = { generation: 0 };
    peopleUpdateGenerations.set(cacheKey, state);
  }
  const currentState = state;
  currentState.generation += 1;

  if (!currentState.promise) {
    let completedGeneration = 0;
    const promise = (async () => {
      let result: Person[] = [];
      while (completedGeneration < currentState.generation) {
        const requestedGeneration = currentState.generation;
        try {
          result = await load();
        } catch (error) {
          if (requestedGeneration === currentState.generation) throw error;
        }
        completedGeneration = requestedGeneration;
      }
      return result;
    })();
    currentState.promise = promise;

    const clearState = () => {
      if (
        peopleUpdateGenerations.get(cacheKey) === currentState &&
        currentState.promise === promise
      ) {
        peopleUpdateGenerations.delete(cacheKey);
      }
    };
    void promise.then(clearState, clearState);
  }

  const sharedPromise = currentState.promise;
  if (!sharedPromise) throw new Error('A atualização compartilhada de pessoas não foi iniciada.');
  eventRequests.set(cacheKey, sharedPromise);
  const clearEventRequest = () => {
    if (eventRequests.get(cacheKey) === sharedPromise) eventRequests.delete(cacheKey);
  };
  void sharedPromise.then(clearEventRequest, clearEventRequest);
  return sharedPromise;
};

export const subscribeToPeople = (
  collectionName: string,
  callback: (people: Person[]) => void,
  includeDeleted = false
) => {
  let isSubscribed = true;
  let requestGeneration = 0;
  let observedSessionKey: string | null = null;

  const makeSessionKey = (userId: string, email: string) =>
    JSON.stringify([userId, email.trim().toLowerCase()]);

  const scheduleSessionRefresh = (sessionKey: string, userId: string) => {
    queueMicrotask(() => {
      if (!isSubscribed || observedSessionKey !== sessionKey) return;
      callback([]);
      if (!userId) {
        return;
      }
      void fetchAll();
    });
  };

  const observeSession = (userId: string, email: string): boolean => {
    const nextSessionKey = makeSessionKey(userId, email);
    if (observedSessionKey === nextSessionKey) return false;

    const hadPreviousSession = observedSessionKey !== null;
    observedSessionKey = nextSessionKey;
    if (hadPreviousSession) {
      requestGeneration += 1;
      scheduleSessionRefresh(nextSessionKey, userId);
    }
    return hadPreviousSession;
  };

  const fetchAll = async (force = false, updateEvent?: Event) => {
    if (!isSubscribed) return;
    const requestVersion = ++requestGeneration;
    const currentUserContext = await getCurrentUserContext();
    const currentUserEmail = currentUserContext.email;
    const sessionKey = makeSessionKey(currentUserContext.userId, currentUserEmail);
    if (observedSessionKey === null) observedSessionKey = sessionKey;
    else if (observedSessionKey !== sessionKey) {
      observeSession(currentUserContext.userId, currentUserEmail);
      return;
    }
    if (!isSubscribed || requestVersion !== requestGeneration) return;
    const cacheKey = JSON.stringify([
      collectionName,
      includeDeleted,
      currentUserContext.userId,
      currentUserEmail,
    ]);

    const isSessionCurrent = async () => {
      const current = await getCurrentUserContext();
      if (makeSessionKey(current.userId, current.email) === sessionKey) return true;
      observeSession(current.userId, current.email);
      return false;
    };

    if (!force) {
      const cached = getCachedPeople(cacheKey);
      if (cached) {
        if (isSubscribed && requestVersion === requestGeneration && (await isSessionCurrent())) {
          callback(cached);
        }
        return;
      }

      const inFlight = getInFlightPeoplePromise(cacheKey);
      if (inFlight) {
        try {
          const result = await inFlight;
          if (
            isSubscribed &&
            requestVersion === requestGeneration &&
            (await isSessionCurrent())
          ) {
            callback(result);
          }
        } catch {
          if (
            isSubscribed &&
            requestVersion === requestGeneration &&
            (await isSessionCurrent())
          ) {
            callback([]);
          }
        }
        return;
      }
    }

    const load = async () => {
      if (collectionName === 'employees') {
        await syncMissingEmployeesFromProfiles();
      }
      const rows = await fetchAllPeopleRows(collectionName, includeDeleted);
      return mapAndSortPeople(collectionName, rows, includeDeleted, currentUserEmail);
    };
    const fetchPromise = updateEvent
      ? getPeopleUpdatePromise(updateEvent, cacheKey, load)
      : load();
    setCachedPeoplePromise(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      const sessionIsCurrent = await isSessionCurrent();
      if (sessionIsCurrent && getInFlightPeoplePromise(cacheKey) === fetchPromise) {
        setCachedPeopleData(cacheKey, result);
      }
      if (!sessionIsCurrent || !isSubscribed || requestVersion !== requestGeneration) return;
      callback(result);
    } catch {
      if (getInFlightPeoplePromise(cacheKey) === fetchPromise) {
        clearCachedPeoplePromise(cacheKey);
      }
      if (
        !isSubscribed ||
        requestVersion !== requestGeneration ||
        !(await isSessionCurrent())
      ) {
        return;
      }
      callback([]);
    }
  };

  const handlePeopleUpdate = (event: Event) => {
    fetchAll(true, event);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('people_updated', handlePeopleUpdate);
  }
  const authSubscription = supabase.auth?.onAuthStateChange
    ? supabase.auth.onAuthStateChange((_event, session) => {
        const userId = session?.user?.id || '';
        const email = session?.user?.email?.trim().toLowerCase() || '';
        observeSession(userId, email);
      }).data.subscription
    : null;
  fetchAll();

  return () => {
    isSubscribed = false;
    requestGeneration += 1;
    authSubscription?.unsubscribe();
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

  peopleQuery = peopleQuery.filter('search_people_main_text', 'imatch', buildNormalizedWordsRegex(query));

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
