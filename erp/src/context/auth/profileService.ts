import { supabase } from '@/pages/utils/supabaseConfig';
import type { User } from '@supabase/supabase-js';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import type { Profile, UserRole } from './auth.types';
import { getCachedProfile, setCachedProfile } from './profileCache';
import { isMasterEmail, createMasterProfile } from './masterIdentity';
import { syncEmployeeRecord } from './employeeSyncService';

export const PROFILE_COLUMNS = 'id,email,role,roles,full_name,position,phone,address';

export interface FetchProfileOptions {
  user: User;
  syncEmployee: boolean;
  supabaseClient?: typeof supabase;
}

/**
 * Procura e carrega o perfil do usuário no Supabase com timeouts delimitados,
 * renovação preventiva de JWT expirado, fallback para cache local e sincronização
 * opcional de registro de colaborador na tabela people.
 */
export async function fetchUserProfile({
  user,
  syncEmployee,
  supabaseClient = supabase,
}: FetchProfileOptions): Promise<Profile | null> {
  try {
    console.log('[Auth] Fetching profile for:', user.id);
    const userEmail = (user.email || '').toLowerCase().trim();
    const isMaster = isMasterEmail(userEmail);
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name;

    // 1. Proativamente renova o token se expirado ou prestes a expirar (< 60s)
    try {
      if (typeof supabaseClient?.auth?.getSession === 'function') {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const currentSession = sessionData?.session;
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (
          currentSession?.expires_at &&
          currentSession.expires_at - nowSeconds < 60 &&
          typeof supabaseClient.auth?.refreshSession === 'function'
        ) {
          console.log('[Auth] Token expirado ou próximo do vencimento. Renovando sessão preventivamente...');
          await supabaseClient.auth.refreshSession();
        }
      }
    } catch (tokenCheckErr) {
      console.warn('[Auth] Aviso ao verificar renovação preventiva de token:', tokenCheckErr);
    }

    // 2. Busca o perfil no banco com proteção de timeout
    let queryResult = await withTimeout(
      supabaseClient
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', user.id)
        .maybeSingle(),
      6000,
      { data: null, error: { message: 'timeout' } } as any,
      'profiles.select'
    );

    // 3. Se a consulta falhou por token/JWT expirado ou não autorizado (401), tenta refresh e repete
    const isAuthError =
      queryResult?.error &&
      (queryResult.error.message?.includes('JWT') ||
        queryResult.error.message?.includes('token') ||
        queryResult.error.message?.includes('expired') ||
        queryResult.error.code === 'PGRST301' ||
        (queryResult.error as any).status === 401);

    if (isAuthError && typeof supabaseClient?.auth?.refreshSession === 'function') {
      console.log('[Auth] Erro de autenticação no select de profiles. Renovando sessão e tentando novamente...');
      try {
        const { error: refreshErr } = await supabaseClient.auth.refreshSession();
        if (!refreshErr) {
          queryResult = await withTimeout(
            supabaseClient
              .from('profiles')
              .select(PROFILE_COLUMNS)
              .eq('id', user.id)
              .maybeSingle(),
            6000,
            { data: null, error: { message: 'timeout' } } as any,
            'profiles.select.retry'
          );
        }
      } catch (rErr) {
        console.warn('[Auth] Falha ao tentar renovar sessão após erro de auth:', rErr);
      }
    }

    let data: Profile | null = queryResult?.data || null;

    // 4. Se a consulta retornou ERRO (não 0 registros, mas falha de rede/timeout/banco/auth):
    if (queryResult?.error && !data) {
      console.warn('[Auth] Erro ao carregar perfil do banco:', queryResult.error);
      const cached = getCachedProfile(user.id);
      if (cached) {
        console.log('[Auth] Recuperando perfil do cache local após falha transitória de consulta');
        return cached;
      }

      if (isMaster) {
        const masterProfile = createMasterProfile(user.id, user.email || '', googleName);
        setCachedProfile(user.id, masterProfile);
        return masterProfile;
      }

      // NÃO atribuir 'pending'! Se o perfil não pôde ser verificado por erro transitório ou falta de token,
      // retorna null para continuar em sincronização e não exibir falsamente o modal de aprovação.
      return null;
    }

    // 5. Perfil genuinamente não existe no banco (query completou com sucesso sem erro, mas 0 linhas)
    if (!data) {
      console.log('[Auth] Perfil não encontrado no banco. Criando registro...');
      const assignedRole: UserRole = isMaster ? 'administrator' : 'pending';
      const assignedRoles: UserRole[] = [assignedRole];
      const newProfile: Profile = {
        id: user.id,
        email: user.email || '',
        role: assignedRole,
        roles: assignedRoles,
        full_name:
          googleName ||
          user.email?.split('@')[0] ||
          (isMaster ? 'Matheus Morante' : 'Novo Usuário'),
      };

      const { data: upsertedData } = await withTimeout(
        supabaseClient
          .from('profiles')
          .upsert(newProfile)
          .select(PROFILE_COLUMNS)
          .maybeSingle(),
        5000,
        { data: null, error: null } as any,
        'profiles.upsert'
      );

      data = upsertedData || newProfile;
    }

    if (data && googleName && data.full_name !== googleName) {
      data.full_name = googleName;
      await supabaseClient.from('profiles').update({ full_name: googleName }).eq('id', user.id);
    }

    // Garante que o usuário logado via Google sincronize seu colaborador na tabela people (1 por e-mail)
    if (userEmail && syncEmployee && data) {
      await syncEmployeeRecord({
        userEmail,
        googleName,
        profileData: data,
        isMaster,
        supabaseClient,
      });
    }

    if (data) {
      const resolvedProfile = data as Profile;
      setCachedProfile(user.id, resolvedProfile);
      return resolvedProfile;
    }
    return null;
  } catch (err) {
    console.error('[Auth] Error fetching profile:', err);
    const userEmail = (user.email || '').toLowerCase().trim();
    const isMaster = isMasterEmail(userEmail);

    const cached = getCachedProfile(user.id);
    if (cached) {
      return cached;
    }

    if (isMaster) {
      const masterProfile = createMasterProfile(
        user.id,
        user.email || '',
        user.user_metadata?.full_name
      );
      setCachedProfile(user.id, masterProfile);
      return masterProfile;
    }

    return null;
  }
}
