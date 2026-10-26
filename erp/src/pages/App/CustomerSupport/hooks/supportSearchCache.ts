import type { CustomerSupportGlobalSearchPage } from '@/pages/utils/customerSupport/customerSupportService';

const SEARCH_CACHE_TTL_MS = 5 * 60_000;

interface CachedSearchPage {
  expiresAt: number;
  page: CustomerSupportGlobalSearchPage<unknown>;
}

const temporarySearchCache = new Map<string, CachedSearchPage>();

export function readSupportSearchCache<T>(key: string): CustomerSupportGlobalSearchPage<T> | null {
  const entry = temporarySearchCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    temporarySearchCache.delete(key);
    return null;
  }
  return entry.page as CustomerSupportGlobalSearchPage<T>;
}

export function writeSupportSearchCache<T>(key: string, page: CustomerSupportGlobalSearchPage<T>) {
  const now = Date.now();
  for (const [cacheKey, entry] of temporarySearchCache) {
    if (entry.expiresAt <= now) temporarySearchCache.delete(cacheKey);
  }
  temporarySearchCache.set(key, { expiresAt: now + SEARCH_CACHE_TTL_MS, page });
  while (temporarySearchCache.size > 100) {
    const oldest = temporarySearchCache.keys().next().value;
    if (!oldest) break;
    temporarySearchCache.delete(oldest);
  }
}
