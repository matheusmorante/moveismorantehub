/** Controlled integration proof: the installed BEFORE INSERT guard must suppress every probe. */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const projectRef = 'hkoxhourxwlddgsfdgws';
const [orderId, runId] = process.argv.slice(2);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
assert.ok(uuid.test(orderId || '') && uuid.test(runId || ''), 'Exact fixture order ID and runId are required.');
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
assert.ok(url && key && email && password, 'Vercel Development operator credentials are required at runtime.');
assert.equal(new URL(url).hostname, `${projectRef}.supabase.co`, 'Unexpected Supabase project.');
assert.equal(process.env.VERCEL_ENV, 'development', 'Vercel Development is required.');
assert.equal(process.env.NFE_ENVIRONMENT, '2', 'Homologation configuration is required.');
assert.equal(process.env.NFE_PRODUCTION_ENABLED, 'false', 'Production must be disabled.');

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const types = ['order_created', 'order_edited', 'order_schedule_changed', 'assembly_outside', 'assembly_depot', 'system'];

async function notificationCount(column, value) {
  const result = await client.from('app_notifications').select('id', { count: 'exact', head: true }).eq(column, value);
  assert.equal(result.error, null, 'Could not audit notification rows.');
  assert.notEqual(result.count, null, 'Notification count is required.');
  return result.count;
}

async function main() {
  const login = await client.auth.signInWithPassword({ email, password });
  assert.ok(!login.error && login.data.session && login.data.user?.email?.toLowerCase() === email,
    'Configured operator authentication failed.');
  const ownerId = login.data.user.id;
  const role = await client.rpc('is_administrator');
  assert.ok(!role.error && role.data === true, 'Authenticated administrator is required.');
  const fixture = await client.from('orders').select('id,order_data').eq('id', orderId).single();
  assert.equal(fixture.error, null, 'Could not read the exact fixture.');
  const identity = fixture.data?.order_data?.testArtifact;
  assert.ok(identity?.is_test === true && identity.runId === runId && identity.ownerId === ownerId,
    'The fixture must belong to this execution and authenticated operator.');

  const beforeCount = await notificationCount('order_id', orderId);
  const probes = [];
  for (const type of types) {
    const id = randomUUID();
    // Metadata is deliberately absent: the database must classify the canonical order_id.
    const inserted = await client.from('app_notifications').insert({
      id, order_id: orderId, title: 'Prova de supressão de artefato',
      message: 'Fixture sintética: esta linha deve ser suprimida antes do push.',
      type, order_data: null, read: false,
    }).select('id').maybeSingle();
    assert.equal(inserted.error, null, 'The suppression request failed.');
    assert.equal(inserted.data, null, 'The notification guard failed to suppress the probe.');
    const persisted = await notificationCount('id', id);
    assert.equal(persisted, 0, 'A probe notification was persisted.');
    probes.push({ id, type, suppressed: true, persistedRows: persisted });
  }
  const afterCount = await notificationCount('order_id', orderId);
  assert.equal(afterCount, beforeCount, 'The fixture notification count changed.');
  process.stdout.write(JSON.stringify({
    name: 'test-artifact-notification-suppression-postgrest', projectRef, orderId, runId, ownerId,
    authenticatedIdentityMatches: true, administratorConfirmed: true,
    insertReturningMaybeSingle: true, beforeCount, afterCount, probes,
    directPushRequests: 0, persistedProbeRows: 0,
    limitation: 'Database/PostgREST suppression proof; no device, Expo or UI notification was sent.',
  }) + '\n');
}

main().catch(() => {
  process.stderr.write('TEST_ARTIFACT_NOTIFICATION_PROOF_FAILED\n');
  process.exitCode = 1;
}).finally(async () => {
  await client.auth.signOut({ scope: 'local' }).catch(() => {});
});
