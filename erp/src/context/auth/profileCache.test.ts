// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedProfile,
  setCachedProfile,
  clearCachedProfile,
  CACHE_KEY_PREFIX,
} from './profileCache';
import type { Profile } from './auth.types';

describe('profileCache', () => {
  const sampleProfile: Profile = {
    id: 'user-123',
    email: 'user@example.com',
    role: 'seller',
    roles: ['seller'],
    full_name: 'Test Seller',
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('retrieves cached profile if valid json and id matches', () => {
    setCachedProfile('user-123', sampleProfile);
    const cached = getCachedProfile('user-123');
    expect(cached).toEqual(sampleProfile);
  });

  it('returns null if profile is not found in cache', () => {
    const cached = getCachedProfile('non-existent');
    expect(cached).toBeNull();
  });

  it('returns null if cached json has mismatched user id', () => {
    localStorage.setItem(
      `${CACHE_KEY_PREFIX}user-123`,
      JSON.stringify({ id: 'different-user', role: 'seller' })
    );
    const cached = getCachedProfile('user-123');
    expect(cached).toBeNull();
  });

  it('returns null if cached json lacks role property', () => {
    localStorage.setItem(
      `${CACHE_KEY_PREFIX}user-123`,
      JSON.stringify({ id: 'user-123' })
    );
    const cached = getCachedProfile('user-123');
    expect(cached).toBeNull();
  });

  it('gracefully handles malformed json without throwing', () => {
    localStorage.setItem(`${CACHE_KEY_PREFIX}user-123`, 'invalid-json{{{');
    const cached = getCachedProfile('user-123');
    expect(cached).toBeNull();
  });

  it('clears cached profile by user id', () => {
    setCachedProfile('user-123', sampleProfile);
    expect(getCachedProfile('user-123')).not.toBeNull();

    clearCachedProfile('user-123');
    expect(getCachedProfile('user-123')).toBeNull();
  });

  it('handles localStorage errors gracefully when storage is disabled/blocked', () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => setCachedProfile('user-123', sampleProfile)).not.toThrow();

    localStorage.setItem = originalSetItem;
  });
});
