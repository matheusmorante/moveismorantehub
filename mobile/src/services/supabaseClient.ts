import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = "https://hkoxhourxwlddgsfdgws.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI";
export const WEB_URL = "https://morantehub.vercel.app";
export const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

export const MASTER_DEFAULT_PROFILE = {
  id: '00000000-0000-0000-0000-000000000000',
  fullName: 'Matheus Morante',
  email: 'matheusmorante002@gmail.com',
  role: 'admin',
  active: true
};
