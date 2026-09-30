import { createClient } from '@supabase/supabase-js';

export function createProductDbClient(url: string, serviceKey: string, userToken?: string) {
  return createClient(url, serviceKey, userToken ? {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  } : undefined);
}
