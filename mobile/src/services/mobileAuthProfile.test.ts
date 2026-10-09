import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const profileQuery: Record<string, any> = {};
  const peopleQuery: Record<string, any> = {};
  const from = vi.fn();
  return { profileQuery, peopleQuery, from };
});

vi.mock('./supabaseClient', () => ({
  MASTER_DEFAULT_PROFILE: { email: 'admin@morantehub.test', fullName: 'Admin' },
  supabase: { from: mocks.from },
}));

import { resolveMobileUserProfile } from './mobileAuthProfile';

describe('resolveMobileUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const query of [mocks.profileQuery, mocks.peopleQuery]) {
      query.select = vi.fn(() => query);
      query.eq = vi.fn(() => query);
      query.maybeSingle = vi.fn();
    }
    mocks.profileQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'seller@morantehub.test',
        full_name: 'Vendedora',
        role: 'seller',
        roles: ['seller'],
      },
      error: null,
    });
    mocks.peopleQuery.maybeSingle.mockResolvedValue({
      data: { role: 'seller', roles: ['seller', 'stockist'] },
      error: null,
    });
    mocks.from.mockImplementation((table: string) =>
      table === 'profiles' ? mocks.profileQuery : mocks.peopleQuery
    );
  });

  it('projects only the profile columns needed for mobile identity and permissions', async () => {
    const profile = await resolveMobileUserProfile({
      user: {
        id: 'user-1',
        email: 'seller@morantehub.test',
        user_metadata: {},
      },
    });

    expect(mocks.profileQuery.select).toHaveBeenCalledWith('id,email,full_name,role,roles');
    expect(mocks.peopleQuery.select).toHaveBeenCalledWith('roles,role');
    expect(profile.roles).toEqual(['seller', 'stockist']);
    expect(profile.id).toBe('user-1');
  });
});
