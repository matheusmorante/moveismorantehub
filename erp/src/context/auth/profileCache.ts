import type { Profile } from './auth.types';

export const CACHE_KEY_PREFIX = 'morantehub_auth_profile_';

export function getCachedProfile(userId: string): Profile | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id === userId && parsed.role) {
      return parsed as Profile;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

export function setCachedProfile(userId: string, profile: Profile): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${CACHE_KEY_PREFIX}${userId}`, JSON.stringify(profile));
  } catch {
    // Ignore storage write errors
  }
}

export function clearCachedProfile(userId: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
  } catch {
    // Ignore storage removal errors
  }
}
