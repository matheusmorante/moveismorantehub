import type { SupabaseClient } from '@supabase/supabase-js';
import {
  hasFiscalAdministratorRole,
  hasFiscalExportRole,
  hasFiscalOperationRole,
} from '../../erp/src/pages/utils/nfe/fiscalAuthorization';

export type FiscalAuthorizationResult =
  | { ok: true; userId: string; isAdministrator: boolean }
  | { ok: false; status: 401 | 403 | 503; message: string };

export type FiscalExportAuthorizationResult =
  | { ok: true; userId: string; isAdministrator: boolean; accountantOnly: boolean }
  | { ok: false; status: 401 | 403 | 503; message: string };

export async function authorizeFiscalOperator(
  client: SupabaseClient<any>,
  authorizationHeader: unknown
): Promise<FiscalAuthorizationResult> {
  const headerValue = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader;
  const token = String(headerValue || '')
    .replace(/^Bearer\s+/i, '')
    .trim();
  if (!token) return { ok: false, status: 401, message: 'Autenticação necessária.' };

  try {
    const { data, error } = await client.auth.getUser(token);
    const user = data?.user;
    if (error || !user?.id) return { ok: false, status: 401, message: 'Sessão inválida.' };

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role,roles')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError)
      return { ok: false, status: 503, message: 'Não foi possível validar a permissão fiscal.' };
    if (!hasFiscalOperationRole(profile))
      return { ok: false, status: 403, message: 'Seu perfil não pode operar documentos fiscais.' };

    return { ok: true, userId: user.id, isAdministrator: hasFiscalAdministratorRole(profile) };
  } catch {
    return { ok: false, status: 503, message: 'Não foi possível validar a permissão fiscal.' };
  }
}

export async function authorizeFiscalExporter(
  client: SupabaseClient<any>,
  authorizationHeader: unknown
): Promise<FiscalExportAuthorizationResult> {
  const headerValue = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader;
  const token = String(headerValue || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, message: 'Autenticação necessária.' };

  try {
    const { data, error } = await client.auth.getUser(token);
    const user = data?.user;
    if (error || !user?.id) return { ok: false, status: 401, message: 'Sessão inválida.' };

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role,roles')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError)
      return { ok: false, status: 503, message: 'Não foi possível validar a permissão de exportação.' };
    if (!hasFiscalExportRole(profile))
      return { ok: false, status: 403, message: 'Seu perfil não pode exportar documentos fiscais.' };

    const profileRoles = new Set<string>([
      ...(typeof profile?.role === 'string' ? [profile.role] : []),
      ...(Array.isArray(profile?.roles) ? profile.roles.filter((role: unknown) => typeof role === 'string') : []),
    ]);
    const isOperator = hasFiscalOperationRole(profile);
    return {
      ok: true,
      userId: user.id,
      isAdministrator: hasFiscalAdministratorRole(profile),
      accountantOnly: profileRoles.has('accountant') && !isOperator,
    };
  } catch {
    return { ok: false, status: 503, message: 'Não foi possível validar a permissão de exportação.' };
  }
}
