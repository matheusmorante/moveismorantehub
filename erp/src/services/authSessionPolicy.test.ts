import { describe, expect, it } from 'vitest';
import { shouldRunAuthSessionMaintenance } from '../../../shared-utils/authSessionPolicy';

describe('shouldRunAuthSessionMaintenance', () => {
  it('skips maintenance for a silent token refresh', () => {
    expect(shouldRunAuthSessionMaintenance('TOKEN_REFRESHED')).toBe(false);
  });

  it.each(['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED', 'PASSWORD_RECOVERY'])(
    'keeps maintenance for %s events',
    (event) => {
      expect(shouldRunAuthSessionMaintenance(event)).toBe(true);
    }
  );
});
