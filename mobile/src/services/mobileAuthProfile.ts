import { MASTER_DEFAULT_PROFILE, supabase } from './supabaseClient';

const PROFILE_TIMEOUT_MS = 10000;

const withTimeout = <T,>(promise: Promise<T>) => Promise.race<T | null>([
  promise,
  new Promise<null>((resolve) => setTimeout(() => resolve(null), PROFILE_TIMEOUT_MS)),
]);

export const resolveMobileUserProfile = async (session: any) => {
  if (!session?.user) return null;

  const googleName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
  const userEmail = session.user.email?.toLowerCase();
  if (userEmail === MASTER_DEFAULT_PROFILE.email.toLowerCase()) {
    return { ...MASTER_DEFAULT_PROFILE, fullName: googleName || MASTER_DEFAULT_PROFILE.fullName };
  }

  const response: any = await withTimeout(
    Promise.resolve(supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()),
  );
  const profile = response?.data;
  if (profile && googleName && profile.full_name !== googleName) {
    await supabase.from('profiles').update({ full_name: googleName }).eq('id', session.user.id);
  }

  return {
    id: profile?.id || session.user.id,
    fullName: googleName || profile?.full_name || session.user.email?.split('@')[0] || 'Usuário',
    email: profile?.email || session.user.email,
    role: profile?.role || 'pending',
    active: true,
  };
};
