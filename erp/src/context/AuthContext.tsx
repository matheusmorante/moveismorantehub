import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { User } from '@supabase/supabase-js';

export type UserRole = 'administrator' | 'deliverer' | 'seller' | 'accountant' | 'manager' | 'pending';

export interface Profile {
    id: string;
    email: string;
    role: UserRole;
    roles?: UserRole[];
    full_name?: string;
    avatar_url?: string;
    position?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    isAuthenticated: boolean;
    loading: boolean;
    isAdmin: boolean;
    isManager: boolean;
    isPending: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const isMasterEmailCheck = (emailStr: string) => {
        const email = (emailStr || '').toLowerCase().trim();
        return (
            email === 'matheusmorante002@gmail.com' ||
            email === 'matheusmorante0002@gmail.com' ||
            email === 'matheusmroante0002@gmail.com' ||
            (email.includes('matheus') && email.includes('morante'))
        );
    };

    const fetchProfile = async (user: User) => {
        try {
            console.log('[Auth] Fetching profile for:', user.id);
            const userEmail = (user.email || '').toLowerCase().trim();
            const isMasterEmail = isMasterEmailCheck(userEmail);
            const googleName = user.user_metadata?.full_name || user.user_metadata?.name;

            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (!data) {
                console.log('[Auth] Perfil não encontrado no banco. Criando registro...');
                const assignedRole: UserRole = isMasterEmail ? 'administrator' : 'pending';
                const newProfile: Profile = {
                    id: user.id,
                    email: user.email || '',
                    role: assignedRole,
                    full_name: googleName || user.email?.split('@')[0] || (isMasterEmail ? 'Matheus Morante' : 'Novo Usuário'),
                };

                const { data: upsertedData } = await supabase
                    .from('profiles')
                    .upsert(newProfile)
                    .select()
                    .maybeSingle();

                data = upsertedData || newProfile;
            } else if (isMasterEmail && (data.role !== 'administrator' || !data.roles?.includes('administrator'))) {
                // Se a conta master estiver como pending ou vendedora por engano no DB, promove para admin
                console.log('[Auth] Promovendo conta Master para administrator...');
                data.role = 'administrator';
                data.roles = [...new Set([...(data.roles || []), 'administrator'])];
                await supabase.from('profiles').update({ role: 'administrator' }).eq('id', user.id);
            }

            if (data && googleName && data.full_name !== googleName) {
                data.full_name = googleName;
                await supabase.from('profiles').update({ full_name: googleName }).eq('id', user.id);
            }

            // Garante que o usuário logado via Google sincronize seu colaborador na tabela people (1 por e-mail)
            if (userEmail) {
                try {
                    const { data: existingEmps } = await supabase
                        .from('people')
                        .select('id,email,full_name')
                        .ilike('email', userEmail);

                    const empName = googleName || data?.full_name || userEmail.split('@')[0] || (isMasterEmail ? 'Matheus Morante' : 'Colaborador');

                    if (existingEmps && existingEmps.length > 0) {
                        // Colaborador já existe com esse e-mail: atualiza suas informações pessoais do Google sem duplicar
                        const primaryEmp = existingEmps[0];
                        if (googleName && (!primaryEmp.full_name || primaryEmp.full_name === userEmail.split('@')[0])) {
                            await supabase.from('people').update({
                                full_name: empName,
                                updated_at: new Date().toISOString()
                            }).eq('id', primaryEmp.id);
                        }
                    } else {
                        // Nenhum colaborador usa esse e-mail: cria exatamente 1 novo colaborador com as informações do Google
                        console.log('[Auth] Criando colaborador para novo usuário logado via Google:', userEmail);
                        const defaultRole: UserRole = isMasterEmail ? 'administrator' : (data?.role || 'pending');
                        const defaultRoles: UserRole[] = isMasterEmail ? ['administrator'] : (data?.roles?.length ? data.roles : [defaultRole]);

                        await supabase.from('people').insert([{
                            person_type: 'employees',
                            person_type_pf_pj: 'PF',
                            full_name: empName,
                            email: user.email || '',
                            position: isMasterEmail ? 'Administrador' : (data?.position || 'Sem Cargo Definido'),
                            active: true,
                            is_draft: false,
                            deleted: false,
                            address: {
                                noAddress: true,
                                street: '',
                                city: '',
                                state: '',
                                cep: '',
                                role: defaultRole,
                                roles: defaultRoles
                            },
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }]);
                    }
                } catch (empErr) {
                    console.warn('[Auth] Aviso ao sincronizar colaborador para usuário:', empErr);
                }
            }

            setProfile(data as Profile);
        } catch (err) {
            console.error('[Auth] Error fetching profile:', err);
            const userEmail = (user.email || '').toLowerCase().trim();
            const isMasterEmail = isMasterEmailCheck(userEmail);
            
            setProfile({
                id: user.id,
                email: user.email || '',
                role: isMasterEmail ? 'administrator' : 'pending',
                full_name: user.user_metadata?.full_name || (isMasterEmail ? 'Matheus Morante' : 'Usuário Pendente')
            });
        }
    };

    useEffect(() => {
        let active = true;
        let handlingSession = false;
        const isDev = import.meta.env.DEV;

        if (isDev) console.log('[Auth] Initializing in DEVELOPMENT mode');
        else console.log('[Auth] Initializing in PRODUCTION mode');

        // Hard failsafe: if onAuthStateChange never fires, unblock after 5s
        const failsafe = setTimeout(() => {
            if (active) {
                console.warn('[Auth] 5s failsafe - onAuthStateChange never fired, setting loading=false');
                setLoading(false);
            }
        }, 5000);

        const handleSession = async (session: any, source: string) => {
            if (!active) return;
            // Evitar chamadas duplicadas paralelas (getSession + onAuthStateChange)
            if (handlingSession) {
                console.log('[Auth] Skipping duplicate handleSession from:', source);
                return;
            }
            handlingSession = true;

            const newUser = session?.user || null;
            setUser(newUser);

            if (newUser) {
                // Cleanup URL hash
                if (window.location.hash.includes('access_token=')) {
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                }

                try {
                    await fetchProfile(newUser);
                } finally {
                    if (active) setLoading(false);
                    handlingSession = false;
                }
            } else {
                setProfile(null);
                setLoading(false);
                handlingSession = false;
            }
        };

        // 1. Verificar sessão inicial (para OAuth redirects, WebView hash de tokens, URL params móveis e localStorage)
        const initSession = async () => {
            if (!active) return;

            // Se o app mobile passou parâmetros de autenticação direta via URL (auth_email / user_id)
            const searchParams = new URLSearchParams(window.location.search);
            const authEmail = searchParams.get('auth_email');
            const authUserId = searchParams.get('user_id');
            const authRole = (searchParams.get('auth_role') as UserRole) || 'administrator';

            if (authEmail && authUserId) {
                console.log('[Auth] Autenticação direta mobile ativada via URL para:', authEmail);
                const isMasterEmail = isMasterEmailCheck(authEmail);
                const finalRole = isMasterEmail ? 'administrator' : authRole;

                const syntheticUser = {
                    id: authUserId,
                    email: authEmail,
                    user_metadata: { full_name: isMasterEmail ? 'Matheus Morante' : authEmail.split('@')[0] },
                    app_metadata: {},
                    aud: 'authenticated',
                    created_at: new Date().toISOString()
                } as any;

                setUser(syntheticUser);
                setProfile({
                    id: authUserId,
                    email: authEmail,
                    role: finalRole,
                    full_name: isMasterEmail ? 'Matheus Morante' : authEmail.split('@')[0]
                });
                clearTimeout(failsafe);
                setLoading(false);
                return;
            }

            // Se a URL contiver hash com access_token de autenticação direta, estabelece a sessão imediatamente
            if (window.location.hash.includes('access_token=')) {
                try {
                    const hashStr = window.location.hash.substring(1);
                    const params = new URLSearchParams(hashStr);
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');
                    if (accessToken && refreshToken) {
                        const { data: sData } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        });
                        if (sData?.session) {
                            await handleSession(sData.session, 'hashDirectSession');
                            return;
                        }
                    }
                } catch (err) {
                    console.warn('[Auth] Erro ao extrair hash de sessão:', err);
                }
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (active && session) {
                console.log('[Auth] Initial session found');
                await handleSession(session, 'getSession');
            } else if (active && !session) {
                clearTimeout(failsafe);
                setLoading(false);
            }
        };

        initSession();

        // 2. Ouvir mudanças de estado (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!active) return;
            console.log('[Auth] State Change:', event);
            clearTimeout(failsafe);
            // INITIAL_SESSION já é coberto por getSession(); evitar duplicata
            if (event === 'INITIAL_SESSION') return;
            handleSession(session, event);
        });

        return () => {
            active = false;
            clearTimeout(failsafe);
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (profile) {
            (window as any).userProfile = profile;
            // Se estiver no WebView do React Native, enviar mensagem imediatamente
            if ((window as any).ReactNativeWebView) {
                (window as any).ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'USER_PROFILE',
                    profile
                }));
            }
        } else {
            (window as any).userProfile = null;
        }
    }, [profile]);

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    const value = useMemo(() => ({
        user,
        profile,
        isAuthenticated: !!user,
        loading,
        isAdmin: profile?.roles?.some((role) => role === 'administrator' || role === 'manager') || profile?.role === 'administrator' || profile?.role === 'manager',
        isManager: profile?.roles?.some((role) => role === 'manager' || role === 'administrator') || profile?.role === 'manager' || profile?.role === 'administrator',
        isPending: !loading && !!user && !(profile?.roles?.length || (profile?.role && profile.role !== 'pending')),
        logout
    }), [user, profile, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
