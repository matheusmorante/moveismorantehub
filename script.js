const { createClient } = require('@supabase/supabase-js');
const sbUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const sbKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy';
// wait we don't have env injected.
