import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import {
  isConfiguredTestArtifactOperator,
  isTestArtifactOperatorRuntimeEnabled,
} from './testArtifactOperatorPolicy';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const environment = process.env;
  if (!isTestArtifactOperatorRuntimeEnabled(environment))
    return res.status(403).json({ error: 'Sessão de teste indisponível.' });

  const supabaseUrl = environment.SUPABASE_URL || environment.VITE_SUPABASE_URL || '';
  const anonKey = environment.SUPABASE_ANON_KEY || environment.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !anonKey || !environment.NFE_HML_TEST_OPERATOR_EMAIL?.trim())
    return res.status(503).json({ error: 'Sessão de teste indisponível.' });

  const authorizationHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  const accessToken = /^Bearer\s+(.+)$/i.exec(String(authorizationHeader || ''))?.[1]?.trim();
  if (!accessToken) return res.status(401).json({ error: 'Sessão inválida.' });

  try {
    const userDb = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: auth, error: authError } = await userDb.auth.getUser(accessToken);
    if (authError || !auth.user?.id)
      return res.status(401).json({ error: 'Sessão inválida.' });

    const { data: isAdministrator, error: authorizationError } =
      await userDb.rpc('is_administrator');
    if (authorizationError)
      return res.status(503).json({ error: 'Não foi possível validar a autorização.' });

    const configuredEmail = environment.NFE_HML_TEST_OPERATOR_EMAIL;
    const authenticatedEmail = auth.user.email;
    const administrator = isAdministrator === true;
    const authorized = isConfiguredTestArtifactOperator({
      configuredEmail,
      authenticatedEmail,
      isAdministrator: administrator,
    });
    if (!authorized) {
      console.warn('[TestArtifactOperator] authorization rejected', {
        administrator,
        identityMatches: Boolean(
          typeof configuredEmail === 'string'
          && typeof authenticatedEmail === 'string'
          && configuredEmail.trim().toLowerCase() === authenticatedEmail.trim().toLowerCase(),
        ),
        configuredEmailPresent: Boolean(configuredEmail?.trim()),
        authenticatedEmailPresent: Boolean(authenticatedEmail?.trim()),
      });
      return res.status(403).json({ error: 'Sessão de teste indisponível.' });
    }

    return res.status(204).end();
  } catch {
    return res.status(503).json({ error: 'Não foi possível validar a autorização.' });
  }
}
