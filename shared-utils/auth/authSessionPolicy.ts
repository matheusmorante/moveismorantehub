/** Session token refreshes do not change user metadata or password credentials. */
export const shouldRunAuthSessionMaintenance = (event: string): boolean =>
  event !== 'TOKEN_REFRESHED';
