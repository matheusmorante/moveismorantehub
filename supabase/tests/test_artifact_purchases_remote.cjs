const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const projectRef = 'hkoxhourxwlddgsfdgws';
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const operatorEmail = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
const crossRunPersonId = process.env.PURCHASE_CROSS_RUN_PERSON_ID;
const crossRunPersonRunId = process.env.PURCHASE_CROSS_RUN_PERSON_RUN_ID;

assert.equal(process.env.PURCHASE_ARTIFACT_GUARD_VERIFIED, '20261010012313');
assert.equal(process.env.RUN_PURCHASE_ARTIFACT_REMOTE, 'authorized-by-current-task');
assert.equal(process.env.MORANTE_ENV_SOURCE, 'vercel-development');
assert.ok(supabaseUrl && anonKey && operatorEmail && operatorPassword);
assert.equal(new URL(supabaseUrl).hostname, projectRef + '.supabase.co');
assert.match(crossRunPersonId || '', /^[0-9a-f-]{36}$/i);
assert.match(crossRunPersonRunId || '', /^[0-9a-f-]{36}$/i);

const runId = randomUUID();
const ownerIdPlaceholder = randomUUID();
let accessToken;
let ownerId;

function observation(artifactRunId, artifactOwnerId) {
  return JSON.stringify({
    testArtifact: { is_test: true, runId: artifactRunId, ownerId: artifactOwnerId },
  });
}

function purchase(id, artifactRunId, artifactOwnerId, supplierId = null) {
  return {
    id,
    supplier_id: supplierId,
    supplier_name: 'TESTE DE GUARD - NÃO OPERACIONAL - runId ' + artifactRunId,
    date: '2000-01-01T00:00:00.000Z',
    items: [],
    total_value: 0,
    observation: observation(artifactRunId, artifactOwnerId),
    status: 'cancelled',
    stockProcessed: false,
    created_at: '2000-01-01T00:00:00.000Z',
  };
}

async function request(path, { method = 'GET', body, anonymous = false } = {}) {
  const headers = {
    apikey: anonKey,
    Accept: 'application/json',
    'Accept-Profile': 'public',
    'Content-Profile': 'public',
  };
  if (!anonymous && accessToken) headers.Authorization = 'Bearer ' + accessToken;
  if (method === 'HEAD') {
    headers.Prefer = 'count=exact';
    headers.Range = '0-0';
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers.Prefer = 'return=representation';
  }
  const response = await fetch(supabaseUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = method === 'HEAD' ? '' : await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  return { response, raw, data };
}

async function exactCount(path, label) {
  const result = await request(path, { method: 'HEAD' });
  assert.equal(result.response.status, 200, label + ' HEAD failed (' + result.response.status + ').');
  const match = (result.response.headers.get('content-range') || '').match(/\/(\d+)$/);
  assert.ok(match, label + ' exact count unavailable.');
  return Number(match[1]);
}

async function postPurchase(row, anonymous = false) {
  return request('/rest/v1/purchases', {
    method: 'POST',
    body: row,
    anonymous,
  });
}

async function readPurchaseIds(ids) {
  const query = ids.map((id) => 'id.eq.' + encodeURIComponent(id)).join(',');
  const result = await request('/rest/v1/purchases?select=id&or=(' + query + ')');
  assert.equal(result.response.status, 200, 'Purchase ID verification failed.');
  assert.ok(Array.isArray(result.data));
  return result.data.map((row) => row.id).sort();
}

async function readRunArtifacts() {
  const result = await request(
    '/rest/v1/purchases?select=id&observation=ilike.*' + encodeURIComponent(runId) + '*&limit=2'
  );
  assert.equal(result.response.status, 200, 'Run artifact verification failed.');
  assert.ok(Array.isArray(result.data));
  return result.data;
}

async function linkedCounts(purchaseId) {
  return {
    purchaseItems: await exactCount(
      '/rest/v1/purchase_items?select=id&purchase_id=eq.' + encodeURIComponent(purchaseId),
      'Purchase items'
    ),
    receipts: await exactCount(
      '/rest/v1/goods_receipts?select=id&purchase_id=eq.' + encodeURIComponent(purchaseId),
      'Goods receipts'
    ),
    inventoryMoves: await exactCount(
      '/rest/v1/inventory_moves?select=id&related_entity_type=eq.purchase_order&related_entity_id=eq.' +
        encodeURIComponent(purchaseId),
      'Purchase inventory moves'
    ),
  };
}

async function run() {
  const login = await fetch(supabaseUrl + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: operatorEmail, password: operatorPassword }),
  });
  assert.equal(login.status, 200, 'Authorized operator login failed (' + login.status + ').');
  const session = await login.json();
  assert.equal(session.user?.email?.toLowerCase(), operatorEmail);
  assert.ok(session.access_token && session.user?.id);
  accessToken = session.access_token;
  ownerId = session.user.id;

  const role = await request('/rest/v1/rpc/is_administrator', { method: 'POST', body: {} });
  assert.equal(role.response.status, 200);
  assert.equal(role.data, true, 'The approved test operator must be an administrator.');

  const sentinelResult = await request('/rest/v1/purchases?select=id&limit=2');
  assert.equal(sentinelResult.response.status, 200, 'Could not read the purchase conflict sentinel.');
  assert.ok(Array.isArray(sentinelResult.data) && sentinelResult.data.length >= 1);
  const sentinelIds = sentinelResult.data.map((row) => row.id);
  const targetId = sentinelIds[0];
  const beforeIds = await readPurchaseIds([targetId]);
  assert.deepEqual(beforeIds, [targetId]);
  const linkedBefore = await linkedCounts(targetId);

  const anonymous = await postPurchase(purchase(targetId, runId, ownerId), true);
  assert.ok([401, 403].includes(anonymous.response.status), 'Anonymous INSERT must be denied.');
  assert.deepEqual(await readPurchaseIds([targetId]), beforeIds);

  const forged = await postPurchase(purchase(targetId, runId, ownerIdPlaceholder));
  assert.equal(forged.response.status, 400, 'Forged owner INSERT must be rejected by the guard.');
  assert.match(forged.raw, /TEST_ARTIFACT_UNAUTHORIZED/);

  const validCollision = await postPurchase(purchase(targetId, runId, ownerId));
  assert.equal(validCollision.response.status, 409, 'Valid metadata should reach the duplicate-key conflict.');
  assert.match(validCollision.raw, /23505/);

  assert.notEqual(crossRunPersonRunId, runId);
  const crossRun = await postPurchase(purchase(targetId, runId, ownerId, crossRunPersonId));
  assert.equal(crossRun.response.status, 400, 'Cross-run supplier link must be rejected by the guard.');
  assert.match(crossRun.raw, /TEST_ARTIFACT_LINK_MISMATCH: people/);

  let immutableTransitionProved = false;
  if (sentinelIds.length >= 2) {
    const secondId = sentinelIds[1];
    const immutable = await request('/rest/v1/purchases?id=eq.' + encodeURIComponent(targetId), {
      method: 'PATCH',
      body: {
        id: secondId,
        observation: observation(runId, ownerId),
      },
    });
    assert.equal(immutable.response.status, 400);
    assert.match(immutable.raw, /TEST_ARTIFACT_IDENTITY_IMMUTABLE/);
    immutableTransitionProved = true;
  }

  const concurrentPayload = purchase(targetId, runId, ownerId);
  const [first, second] = await Promise.all([
    postPurchase(concurrentPayload),
    postPurchase(concurrentPayload),
  ]);
  assert.deepEqual(
    [first.response.status, second.response.status].sort(),
    [409, 409],
    'Concurrent duplicate INSERT attempts must both fail without persisting.'
  );

  assert.deepEqual(await readPurchaseIds([targetId]), beforeIds);
  assert.deepEqual(await linkedCounts(targetId), linkedBefore);
  assert.deepEqual(await readPurchaseIds([targetId]), beforeIds);
  assert.deepEqual(await readRunArtifacts(), [], 'The runId must not persist a purchase fixture.');

  return {
    projectRef,
    schema: 'public',
    runId,
    operatorIdentityVerified: true,
    usedExistingPurchaseIdOnlyAsConflictSentinel: true,
    anonymousInsertDenied: true,
    forgedOwnerDenied: true,
    validMetadataReachedUniqueConstraint: true,
    crossRunSupplierLinkDenied: true,
    identityTransitionRejected: immutableTransitionProved,
    concurrentDuplicateAttemptStatuses: [first.response.status, second.response.status],
    sentinelAndLinkedCountsUnchanged: true,
    noTestPurchasePersisted: true,
    commercialNumberConsumed: false,
    limitation: 'The sentinel conflict avoids persisted fixtures; it does not prove committed idempotency or cleanup behavior.',
  };
}

run()
  .then((result) => process.stdout.write(JSON.stringify(result) + '\n'))
  .catch((error) => {
    process.stderr.write(JSON.stringify({ error: error.message, projectRef, runId }) + '\n');
    process.exitCode = 1;
  })
  .finally(async () => {
    if (accessToken) {
      await fetch(supabaseUrl + '/auth/v1/logout', {
        method: 'POST',
        headers: { apikey: anonKey, Authorization: 'Bearer ' + accessToken },
      }).catch(() => {});
    }
  });
