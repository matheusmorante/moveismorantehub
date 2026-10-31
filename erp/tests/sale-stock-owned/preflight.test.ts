import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

describe('guardas remotas para teste isolado de estoque de venda', () => {
  it('confirma projeto, política e operador administrativo', async () => {
    const ref = readFileSync(resolve(process.cwd(), '../supabase/.temp/project-ref'), 'utf8').trim();
    const url = process.env.VITE_SUPABASE_URL;
    const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const service = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    if (!url || !anon || !service || !email || !password) {
      throw new Error('Faltam credenciais de operador ou configuração do projeto no ambiente Vercel Development.');
    }
    expect(new URL(url).hostname).toBe(`${ref}.supabase.co`);

    const headers: Record<string, string> = { apikey: service, 'content-type': 'application/json' };
    if (service.startsWith('eyJ')) headers.authorization = `Bearer ${service}`;
    const response = await fetch(new URL('/rest/v1/rpc/test_artifact_policy_status', url), {
      method: 'POST', headers, body: '{}', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('A política de artefatos de teste não pôde ser consultada.');
    const policy = await response.json();
    expect(policy).toMatchObject({ ready: true, policyVersion: 'json-artifacts-v1', behavioralProofRequired: false });

    const operator = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const login = await operator.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.user || !login.data.session) throw new Error('A autenticação do operador falhou.');
    const authorization = await operator.rpc('is_administrator');
    expect(authorization.error === null && authorization.data === true).toBe(true);
    await operator.auth.signOut();
  });
});
