import { expect, it } from 'vitest';

type OfflineProfileCacheCaseDependencies = {
  state: { connected: boolean };
  resolveMobileUserProfile: (session: any) => Promise<any>;
};

export function registerOfflineProfileCacheCase({
  state,
  resolveMobileUserProfile,
}: OfflineProfileCacheCaseDependencies): void {
  it('restaura o perfil aprovado em cache quando o app abre offline sem rebaixar para pending', async () => {
    const sessionUser = {
      id: 'user-offline-1',
      email: 'driver@morantehub.test',
      user_metadata: { full_name: 'Motorista' },
    };

    state.connected = true;
    const onlineProfile = await resolveMobileUserProfile({ user: sessionUser });
    expect(onlineProfile.role).toBe('driver');

    state.connected = false;
    const offlineProfile = await resolveMobileUserProfile({ user: sessionUser });
    expect(offlineProfile.role).toBe('driver');
    expect(offlineProfile.roles).toContain('driver');
  });
}
