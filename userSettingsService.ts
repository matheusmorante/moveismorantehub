import { supabase } from '@/pages/utils/supabaseConfig';

export interface UserSettings {
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
    autoScroll: {
        enabled: boolean;
        speed: number;
    };
    defaultModule: string; // e.g. '/', '/sales-order'
    notificationsEnabled: boolean;
}

export const getDefaultUserSettings = (): UserSettings => ({
    theme: 'system',
    compactMode: false,
    autoScroll: {
        enabled: true,
        speed: 20
    },
    defaultModule: '/',
    notificationsEnabled: true
});

const getUserSettingsKey = (userId: string) => `pdv_user_settings_${userId}`;

export const getUserSettings = (userId?: string): UserSettings => {
    if (!userId) return getDefaultUserSettings();
    
    // Check localStorage first
    const saved = localStorage.getItem(getUserSettingsKey(userId));
    if (saved) {
        try {
            return { ...getDefaultUserSettings(), ...JSON.parse(saved) };
        } catch (e) {
            console.error("Erro parse user settings", e);
        }
    }
    return getDefaultUserSettings();
};

export const saveUserSettings = async (userId: string, settings: UserSettings) => {
    if (!userId) return;
    
    // Save to local storage for instant sync across tabs
    localStorage.setItem(getUserSettingsKey(userId), JSON.stringify(settings));

    // Optional: save to Supabase 'profiles' or a new table 'user_settings'. 
    // We will save it in the 'profiles' table if we have a 'settings' jsonb column.
    // If we don't, we can just use localStorage, but we'll try to update profiles metadata:
    try {
        await supabase
            .from('profiles')
            .update({ settings: settings as any }) // ignoring TS error if settings col doesn't exist
            .eq('id', userId);
    } catch(e) {
        // Fallback or ignore if no settings column
    }
};

// Create a hook/observable if needed, or we can just manage state in React contexts
