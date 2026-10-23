import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface AuthenticatedErpRequest {
  userId: string;
  roles: string[];
  userDb: SupabaseClient;
  rolePermissions: Record<string, unknown>;
}

const DEFAULT_PERMISSION_ROLES: Record<string, string[]> = {
  createEditOrders: ['manager'],
  startDelivery: ['administrator', 'manager', 'deliverer', 'seller', 'stockist'],
  viewOrders: ['manager'],
  viewChannelCatalog: ['manager'],
  viewMarketing: ['manager'],
  viewDeliverySchedule: ['manager', 'seller', 'deliverer'],
};

function getBearerToken(req: VercelRequest): string {
  const header = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  return /^Bearer\s+(\S+)$/i.exec(String(header || ''))?.[1] || '';
}

export async function authenticateErpRequest(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthenticatedErpRequest | null> {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sessão inválida. Entre novamente.' });
    return null;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !anonKey) {
    res.status(503).json({ error: 'Serviço indisponível no servidor.' });
    return null;
  }

  const userDb = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: auth, error: authError } = await userDb.auth.getUser(token);
  if (authError || !auth.user?.id) {
    res.status(401).json({ error: 'Sessão inválida. Entre novamente.' });
    return null;
  }

  const { data: profile, error: profileError } = await userDb
    .from('profiles')
    .select('role,roles')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profileError) {
    res.status(503).json({ error: 'Não foi possível validar o perfil.' });
    return null;
  }
  const roles = [
    ...(Array.isArray(profile?.roles) ? profile.roles : []),
    ...(typeof profile?.role === 'string' ? [profile.role] : []),
  ].filter((role): role is string => typeof role === 'string' && role.trim().length > 0);
  if (!roles.length || roles.includes('pending')) {
    res.status(403).json({ error: 'Perfil sem acesso ao serviço.' });
    return null;
  }

  const { data: settings, error: settingsError } = await userDb
    .from('settings')
    .select('data->rolePermissions')
    .eq('id', 'app')
    .maybeSingle();
  if (settingsError) {
    res.status(503).json({ error: 'Não foi possível validar as permissões.' });
    return null;
  }

  return {
    userId: auth.user.id,
    roles,
    userDb,
    rolePermissions: (settings?.rolePermissions as Record<string, unknown>) || {},
  };
}

export function hasErpPermission(
  context: AuthenticatedErpRequest,
  permission: string
): boolean {
  if (context.roles.includes('administrator')) return true;
  const configured = context.rolePermissions[permission];
  const allowedRoles = Array.isArray(configured)
    ? configured.filter((role): role is string => typeof role === 'string')
    : DEFAULT_PERMISSION_ROLES[permission] || [];
  return context.roles.some((role) => allowedRoles.includes(role));
}
