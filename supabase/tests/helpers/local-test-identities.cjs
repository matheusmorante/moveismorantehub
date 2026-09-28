const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require(require.resolve('pg', { paths: [path.resolve(__dirname, '..')] }));

async function createRoleIdentities(local, roles, runId) {
  const admin = createClient(local.apiUrl, local.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const db = new Client({ connectionString: local.dbUrl });
  const password = `${randomUUID()}!Aa9`;
  const identities = [];
  await db.connect();

  try {
    for (const role of roles) {
      const email = `${runId.toLowerCase()}-${role}@example.test`;
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { certification_run: runId } });
      if (error || !data.user) throw new Error(`Falha ao criar usuário de teste local para perfil ${role}.`);
      identities.push({ id: data.user.id, email, role });
    }

    // Fixture-only setup on the isolated local PostgreSQL superuser connection:
    // application permissions are exercised later with genuine Auth-issued JWTs.
    await db.query('BEGIN');
    await db.query("SET LOCAL session_replication_role = 'replica'");
    for (const user of identities) {
      await db.query(
        `INSERT INTO public.profiles (id, role, roles, name)
         VALUES ($1, $2, ARRAY[$2]::text[], $3)
         ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, roles = EXCLUDED.roles, name = EXCLUDED.name`,
        [user.id, user.role, `${runId} ${user.role}`],
      );
    }
    await db.query('COMMIT');
  } catch (error) {
    try { await db.query('ROLLBACK'); } catch { /* sem transação ativa */ }
    try { await cleanup(); } catch (cleanupError) { error.message += ` Cleanup: ${cleanupError.message}`; }
    throw error;
  }

  async function cleanup() {
    const failures = [];
    for (const user of [...identities].reverse()) {
      try { await db.query('DELETE FROM public.profiles WHERE id = $1', [user.id]); }
      catch { failures.push(`profile ${user.id}`); }
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) failures.push(`auth user ${user.id}`);
    }
    try {
      const residual = await db.query('SELECT id FROM public.profiles WHERE id = ANY($1::uuid[])', [identities.map(user => user.id)]);
      if (residual.rowCount) failures.push(`profiles remanescentes ${residual.rows.map(row => row.id).join(', ')}`);
    } catch { failures.push('verificação de profiles remanescentes'); }
    try { await db.end(); } catch { failures.push('PostgreSQL client close'); }
    if (failures.length) throw new Error(`cleanup incompleto: ${failures.join(', ')}`);
  }

  async function authenticate(user) {
    const authClient = createClient(local.apiUrl, local.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await authClient.auth.signInWithPassword({ email: user.email, password });
    if (error || data.user?.id !== user.id || !data.session?.access_token) throw new Error(`JWT local inválido para perfil ${user.role}.`);
    const token = data.session.access_token;
    const client = createClient(local.apiUrl, local.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    return { client, signOut: () => authClient.auth.signOut() };
  }

  return { admin, db, identities, authenticate, cleanup };
}

module.exports = { createRoleIdentities };
