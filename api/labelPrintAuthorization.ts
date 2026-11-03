import type { VercelRequest } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseSecretKey, getSupabaseUrl } from './supabaseSecretKey';

export type LabelCategory = 'identificacao' | 'precos';
export type LabelPrintAuthorization =
  | { ok: true; db: SupabaseClient<any>; userId: string }
  | { ok: false; status: 401 | 403 | 503; message: string };

const defaultRoles: Record<string, string[]> = {
  viewStockLabels: ['manager', 'deliverer', 'stockist'],
  printProductIdentificationLabels: ['manager', 'seller', 'stockist', 'deliverer'],
};

export function createLabelPrintDb(): SupabaseClient<any> | null {
  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function authorizeLabelPrintUser(
  req: VercelRequest,
  category: LabelCategory | 'manage'
): Promise<LabelPrintAuthorization> {
  const db = createLabelPrintDb();
  if (!db) return { ok: false, status: 503, message: 'Impressão direta indisponível.' };
  const token = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || ''))?.[1]?.trim();
  if (!token) return { ok: false, status: 401, message: 'Autenticação necessária.' };

  try {
    const [{ data: auth, error: authError }] = await Promise.all([
      db.auth.getUser(token),
    ]);
    if (authError || !auth.user?.id)
      return { ok: false, status: 401, message: 'Sessão inválida.' };

    const [{ data: profile, error: profileError }, { data: settings, error: settingsError }] =
      await Promise.all([
        db.from('profiles').select('role,roles').eq('id', auth.user.id).maybeSingle(),
        db.from('settings').select('data').eq('id', 'app').maybeSingle(),
      ]);
    if (profileError || settingsError)
      return { ok: false, status: 503, message: 'Não foi possível validar a permissão para etiquetas.' };

    const roles = new Set<string>([
      ...(typeof profile?.role === 'string' ? [profile.role] : []),
      ...(Array.isArray(profile?.roles)
        ? profile.roles.filter((role: unknown): role is string => typeof role === 'string')
        : []),
    ]);
    const administrator = roles.has('administrator');
    const rolePermissions = settings?.data?.rolePermissions;
    const allowed = (action: keyof typeof defaultRoles) => {
      if (administrator) return true;
      const configured = rolePermissions?.[action];
      const permittedRoles = Array.isArray(configured) ? configured : defaultRoles[action];
      return permittedRoles.some((role: unknown) => typeof role === 'string' && roles.has(role));
    };

    const canView = allowed('viewStockLabels');
    const canIdentify = canView || allowed('printProductIdentificationLabels');
    const authorized = category === 'precos' ? canView : category === 'identificacao' ? canIdentify : canIdentify;
    if (!authorized)
      return { ok: false, status: 403, message: 'Seu perfil não pode imprimir essas etiquetas.' };

    return { ok: true, db, userId: auth.user.id };
  } catch {
    return { ok: false, status: 503, message: 'Não foi possível validar a permissão para etiquetas.' };
  }
}

export function getLabelCategory(value: unknown): LabelCategory | null {
  return value === 'identificacao' || value === 'precos' ? value : null;
}

export function isAllowedAppOrigin(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (url.protocol === 'https:' &&
      (host === 'morantehub.vercel.app' || host === 'morantehub.com' || host.endsWith('.morantehub.com'))) ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(host) && url.port === '5173');
  } catch {
    return false;
  }
}

export function cleanLabelHtml(value: unknown): string | null {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > 3_000_000) return null;
  const html = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<(iframe|object|embed|base)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(iframe|object|embed|base)\b[^>]*\/?>/gi, '')
    .replace(/\s+on[a-z0-9:_-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src|xlink:href)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '');
  return html.trim() ? html : null;
}
