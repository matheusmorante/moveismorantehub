import { supabase } from '@/pages/utils/supabaseConfig';
import type Person from '../../../types/person.type';
import { mapAndSortPeople } from './personDeduplication';
import { fetchAllPeopleRows, getCurrentUserContext } from './personQueryFetcher';
import {
  clearCachedPeoplePromise,
  getCachedPeople,
  getInFlightPeoplePromise,
  setCachedPeopleData,
  setCachedPeoplePromise,
} from './personCacheManager';
import { syncMissingEmployeesFromProfiles } from '../personSyncService';

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

/** Assina alterações de sessão e eventos de pessoas com coalescência de recarregamento. */
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
