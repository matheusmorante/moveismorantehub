import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { User } from '@supabase/supabase-js';

export type UserRole = 'administrator' | 'deliverer' | 'seller' | 'accountant' | 'manager' | 'pending';

export interface Profile {
    id: string;
    email: string;
    role: UserRole;
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

    const fetchProfile = async (userId: string) => {
        try {
            console.log('[Auth] Fetching profile for:', userId);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('[Auth] No profile found, user might be new.');
                }
                throw error;
            }
            setProfile(data as Profile);
        } catch (err) {
            console.error('[Auth] Error fetching profile:', err);
            setProfile(null);
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
                    await fetchProfile(newUser.id);
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

        // 1. Verificar sessão inicial (para OAuth redirects)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (active && session) {
                console.log('[Auth] Initial session found');
                handleSession(session, 'getSession');
            } else if (active && !session) {
                // Sem sessão, liberar loading para redirecionar para login
                clearTimeout(failsafe);
                setLoading(false);
            }
        });

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
        isAdmin: profile?.role === 'administrator',
        isManager: profile?.role === 'manager' || profile?.role === 'administrator',
        isPending: !loading && !!user && (!profile?.role || profile?.role === 'pending'),
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
