import type Person from '../../types/person.type';
import { type PersonCacheEntry, PEOPLE_CACHE_TTL_MS, PERSON_PREFETCH_MAX_AGE_MS } from './personQuery.types';

export const peopleCache: Record<string, PersonCacheEntry> = {};
export const personByIdRequests = new Map<string, Promise<Person | null>>();
export const preloadedPersonById = new Map<string, { person: Person; timestamp: number }>();

export function getCachedPeople(cacheKey: string): Person[] | null {
  const entry = peopleCache[cacheKey];
  if (entry && Date.now() - entry.timestamp < PEOPLE_CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

export function getInFlightPeoplePromise(cacheKey: string): Promise<Person[]> | null {
  return peopleCache[cacheKey]?.promise || null;
}

export function setCachedPeoplePromise(cacheKey: string, promise: Promise<Person[]>): void {
  peopleCache[cacheKey] = { ...peopleCache[cacheKey], promise };
}

export function setCachedPeopleData(cacheKey: string, data: Person[]): void {
  peopleCache[cacheKey] = { data, timestamp: Date.now() };
}

export function clearCachedPeoplePromise(cacheKey: string): void {
  if (peopleCache[cacheKey]) {
    delete peopleCache[cacheKey];
  }
}

export function getPreloadedPerson(id: string): Person | null {
  if (!id) return null;
  const preloaded = preloadedPersonById.get(id);
  if (preloaded && Date.now() - preloaded.timestamp <= PERSON_PREFETCH_MAX_AGE_MS) {
    return preloaded.person;
  }
  preloadedPersonById.delete(id);
  return null;
}

export function setPreloadedPerson(id: string, person: Person): void {
  if (id && person) {
    preloadedPersonById.set(id, { person, timestamp: Date.now() });
  }
}
