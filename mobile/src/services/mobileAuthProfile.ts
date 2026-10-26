import { MASTER_DEFAULT_PROFILE, supabase } from './supabaseClient';
import { offlineStorageService } from './offline/offlineStorageService';
import { withTimeout as waitForProfileRequest } from '../../../shared-utils/withTimeout';

const PROFILE_TIMEOUT_MS = 10000;
const PROFILE_COLUMNS = 'id,email,full_name,role,roles';

const withProfileTimeout = <T,>(promise: PromiseLike<T>) =>
  waitForProfileRequest(
    promise.then((value): T | null => value),
    PROFILE_TIMEOUT_MS,
    null,
    'resolução do perfil móvel'
  );

const getProfileCacheKey = (userId: string) => `user_profile_${userId}`;

export const resolveMobileUserProfile = async (session: any) => {
  if (!session?.user) return null;

  const googleName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
  const userEmail = session.user.email?.toLowerCase();
  if (userEmail === MASTER_DEFAULT_PROFILE.email.toLowerCase()) {
    return { ...MASTER_DEFAULT_PROFILE, fullName: googleName || MASTER_DEFAULT_PROFILE.fullName };
  }

  let response: any = null;
  try {
    response = await withProfileTimeout(
      Promise.resolve(
        supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', session.user.id).maybeSingle()
      )
    );
  } catch {
    response = null;
  }

  let profile = response?.data;
  const hadNetworkOrTimeoutFailure = !response || Boolean(response?.error);

  // Somente cria perfil 'pending' se a consulta ao banco respondeu sem erro e confirmou ausência do registro
  if (!profile && !hadNetworkOrTimeoutFailure) {
    try {
      const response = await withProfileTimeout(
        supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            email: session.user.email || '',
            full_name: googleName || session.user.email?.split('@')[0] || 'Novo usuário',
            role: 'pending',
          })
          .select(PROFILE_COLUMNS)
          .maybeSingle()
      );
      profile = response?.data;
    } catch {}
  }

  // Fallback offline: se houve falha de rede/timeout e não obteve profile do servidor, restaura o último perfil válido em cache
  if (!profile && hadNetworkOrTimeoutFailure) {
    try {
      const cached = await withProfileTimeout(
        offlineStorageService.getWorkingSet<any>(getProfileCacheKey(session.user.id))
      );
      if (cached?.data && cached.data.id === session.user.id) {
        return cached.data;
      }
    } catch {}
  }

  if (profile && googleName && profile.full_name !== googleName) {
    try {
      await withProfileTimeout(
        supabase.from('profiles').update({ full_name: googleName }).eq('id', session.user.id)
      );
    } catch {}
  }

  let personRoles: string[] = [];
  if (!hadNetworkOrTimeoutFailure) {
    try {
      const response = await withProfileTimeout(
        supabase.from('people').select('roles,role').eq('email', userEmail).maybeSingle()
      );
      const person = response?.data;
      if (person) {
        if (Array.isArray(person.roles) && person.roles.length > 0) {
          personRoles.push(...person.roles);
        } else if (person.role) {
          personRoles.push(person.role);
        }
      }
    } catch (err) {}
  }

  const mergedRoles = Array.from(
    new Set([
      ...(Array.isArray(profile?.roles) ? profile.roles : []),
      ...personRoles,
      profile?.role,
    ])
  ).filter((r) => r && r !== 'pending');

  const resolvedProfile = {
    id: profile?.id || session.user.id,
    fullName: googleName || profile?.full_name || session.user.email?.split('@')[0] || 'Usuário',
    email: profile?.email || session.user.email,
    role: profile?.role || mergedRoles[0] || 'pending',
    roles:
      mergedRoles.length > 0
        ? mergedRoles
        : profile?.role && profile.role !== 'pending'
          ? [profile.role]
          : [],
    active: true,
  };

  if (resolvedProfile.role && resolvedProfile.role !== 'pending') {
    try {
      await withProfileTimeout(
        offlineStorageService.cacheWorkingSet(getProfileCacheKey(session.user.id), resolvedProfile)
      );
    } catch {}
  }

  return resolvedProfile;
};
