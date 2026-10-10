const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const projectRef = 'hkoxhourxwlddgsfdgws';
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const operatorEmail = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;

if (!supabaseUrl || !anonKey || !operatorEmail || !operatorPassword) {
  throw new Error('Set the Vercel Development Supabase URL, anon key and authorized operator credentials at runtime.');
}

const parsedUrl = new URL(supabaseUrl);
assert.equal(parsedUrl.hostname, `${projectRef}.supabase.co`, 'Refuse any project other than operational MoranteHub.');

const authClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let accessToken;

async function authenticateOperator() {
  const { data, error } = await authClient.auth.signInWithPassword({ email: operatorEmail, password: operatorPassword });
  if (error || !data.session || data.user?.email?.toLowerCase() !== operatorEmail) {
    throw new Error('TEST_ARTIFACT_OPERATOR_AUTH_FAILED');
  }
  accessToken = data.session.access_token;

  const { data: isAdministrator, error: roleError } = await authClient.rpc('is_administrator');
  if (roleError || isAdministrator !== true) throw new Error('TEST_ARTIFACT_OPERATOR_NOT_ADMIN');
  return data.user.id;
}

async function request(path, { method = 'GET', body, token = accessToken } = {}) {
  const headers = { apikey: anonKey, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(new URL(path, `${supabaseUrl}/`), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  return { response, data };
}

async function createArtifact(runId, linkedOrderId = null, token = accessToken) {
  const { response, data } = await request('/rest/v1/rpc/create_test_artifact_order', {
    method: 'POST',
    token,
    body: {
      p_run_id: runId,
      p_linked_order_id: linkedOrderId,
    },
  });
  return { response, data };
}

async function rowsByRunId(table, jsonColumn, runId, ownerId) {
  const params = new URLSearchParams({
    select: table === 'orders' ? 'id,customer_id,order_number,order_index,status,order_data' : 'id,full_name,active,is_draft,full_address',
    [`${jsonColumn}->testArtifact->>runId`]: `eq.${runId}`,
    [`${jsonColumn}->testArtifact->>ownerId`]: `eq.${ownerId}`,
  });
  const { response, data } = await request(`/rest/v1/${table}?${params}`);
  assert.equal(response.status, 200, `Read back ${table} fixture by exact runId and ownerId.`);
  assert.ok(Array.isArray(data));
  return data;
}

async function readOrder(orderId) {
  const params = new URLSearchParams({
    select: 'id,customer_id,order_number,order_index,status,order_data',
    id: `eq.${orderId}`,
  });
  const { response, data } = await request(`/rest/v1/orders?${params}`);
  assert.equal(response.status, 200, 'Read back synthetic order through authenticated PostgREST.');
  assert.equal(data.length, 1);
  return data[0];
}

(async () => {
  const ownerId = await authenticateOperator();
  const anonymousAttempt = await createArtifact(randomUUID(), null, null);
  assert.ok(anonymousAttempt.response.status >= 400, 'Anonymous role must not execute the fixture RPC.');

  const concurrentRunId = randomUUID();
  const [first, replay] = await Promise.all([
    createArtifact(concurrentRunId),
    createArtifact(concurrentRunId),
  ]);
  assert.equal(first.response.status, 200, JSON.stringify(first.data));
  assert.equal(replay.response.status, 200, JSON.stringify(replay.data));
  assert.equal(first.data.orderId, replay.data.orderId, 'Concurrent retries for one runId must be idempotent.');
  assert.equal(first.data.personId, replay.data.personId);

  const otherRunId = randomUUID();
  const other = await createArtifact(otherRunId);
  assert.equal(other.response.status, 200, JSON.stringify(other.data));
  assert.notEqual(first.data.orderId, other.data.orderId, 'Independent runs must get independent orders.');

  const failedRunId = randomUUID();
  const crossRun = await createArtifact(failedRunId, other.data.orderId);
  assert.equal(crossRun.response.status, 400, 'A link into another run must be rejected by the database guard.');
  assert.match(JSON.stringify(crossRun.data), /TEST_ARTIFACT_LINK_MISMATCH/);
  assert.equal(first.data.ownerId, ownerId, 'The database fixture owner must match the authenticated user.');
  assert.deepEqual(await rowsByRunId('orders', 'order_data', failedRunId, ownerId), []);
  assert.deepEqual(await rowsByRunId('people', 'full_address', failedRunId, ownerId), [], 'Failed order insert must roll back its preceding customer insert.');

  const storedOrder = await readOrder(first.data.orderId);
  assert.equal(storedOrder.order_index, null, 'Synthetic fixture must not consume a commercial order index.');
  assert.match(storedOrder.order_number, /^T-/);
  assert.equal(storedOrder.status, 'cancelled');
  assert.equal(storedOrder.order_data.testArtifact.runId, concurrentRunId);
  assert.equal(storedOrder.order_data.testArtifact.ownerId, ownerId);

  const inventoryParams = new URLSearchParams({ select: 'id', order_id: `eq.${first.data.orderId}` });
  const inventory = await request(`/rest/v1/inventory_moves?${inventoryParams}`);
  assert.equal(inventory.response.status, 200, 'Verify the authenticated operator can audit stock movements for this order.');
  assert.deepEqual(inventory.data, [], 'Synthetic fixture RPC must create no inventory movements.');

  const notificationParams = new URLSearchParams({ select: 'id', order_id: `eq.${first.data.orderId}` });
  const notifications = await request(`/rest/v1/app_notifications?${notificationParams}`);
  assert.equal(notifications.response.status, 200, 'Verify the authenticated operator can audit notifications for this order.');
  assert.deepEqual(notifications.data, [], 'Synthetic fixture must create no ERP or push notification rows.');

  process.stdout.write(JSON.stringify({
    projectRef,
    runIds: [concurrentRunId, otherRunId, failedRunId],
    createdOrderIds: [first.data.orderId, other.data.orderId],
    anonymousRpcRejected: true,
    authenticatedOperatorAdmin: true,
    concurrentRetryIdempotent: true,
    crossRunLinkRejectedAndRolledBack: true,
    commercialOrderIndexConsumed: false,
    inventoryMovementsCreated: 0,
    notificationRowsCreated: 0,
    retainedForAudit: true,
  }) + '\n');
})().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}).finally(async () => {
  if (accessToken) await authClient.auth.signOut({ scope: 'local' }).catch(() => {});
});
