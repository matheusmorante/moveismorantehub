const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const projectRef = 'hkoxhourxwlddgsfdgws';
const expectedOperatorEmail = 'matheusmorante002@gmail.com';
const safeUnusedReceiptIndex = 999999;
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const operatorEmail = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;

assert.equal(process.env.GOODS_RECEIPT_ARTIFACT_GUARD_VERIFIED, '20261010012313');
assert.equal(process.env.RUN_GOODS_RECEIPT_ARTIFACT_REMOTE, 'authorized-by-current-task');
assert.equal(process.env.MORANTE_ENV_SOURCE, 'vercel-development');
assert.ok(supabaseUrl && anonKey && operatorEmail && operatorPassword);
assert.equal(operatorEmail, expectedOperatorEmail);
assert.equal(new URL(supabaseUrl).hostname, projectRef + '.supabase.co');

const runId = randomUUID();
const attemptId = randomUUID();
const forgedOwnerId = randomUUID();
let accessToken;

function testObservation() {
  return JSON.stringify({
    testArtifact: { is_test: true, runId, ownerId: forgedOwnerId },
  });
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
  return { response, raw: method === 'HEAD' ? '' : await response.text() };
}

async function exactCount(path, label) {
  const result = await request(path, { method: 'HEAD' });
  assert.equal(result.response.status, 200, label + ' HEAD failed (' + result.response.status + ').');
  const match = (result.response.headers.get('content-range') || '').match(/\/(\d+)$/);
  assert.ok(match, label + ' exact count unavailable.');
  return Number(match[1]);
}

async function run() {
  const login = await fetch(supabaseUrl + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: operatorEmail, password: operatorPassword }),
  });
  assert.equal(login.status, 200, 'Authorized operator login failed (' + login.status + ').');
  const session = await login.json();
  assert.equal(session.user?.email?.toLowerCase(), expectedOperatorEmail);
  assert.ok(session.access_token && session.user?.id);
  accessToken = session.access_token;

  const role = await request('/rest/v1/rpc/is_administrator', { method: 'POST', body: {} });
  assert.equal(role.response.status, 200);
  assert.equal(JSON.parse(role.raw), true, 'The approved test operator must be an administrator.');

  const receiptsBefore = await exactCount('/rest/v1/goods_receipts?select=id', 'Goods receipts');
  assert.equal(
    receiptsBefore,
    0,
    'Guard probe is blocked unless goods_receipts remains empty; no existing row may be used as a fixture.'
  );

  const probe = await request('/rest/v1/goods_receipts', {
    method: 'POST',
    body: {
      id: attemptId,
      receipt_index: safeUnusedReceiptIndex,
      purchase_id: null,
      supplier_id: null,
      supplier_name: null,
      received_at: '2000-01-01T00:00:00.000Z',
      items: [],
      total_value: 0,
      observation: testObservation(),
      status: 'draft',
      is_draft: true,
      created_at: '2000-01-01T00:00:00.000Z',
      updated_at: '2000-01-01T00:00:00.000Z',
    },
  });
  assert.equal(probe.response.status, 400, 'Forged test owner must be rejected by the guard.');
  assert.match(probe.raw, /TEST_ARTIFACT_UNAUTHORIZED/);

  const persistedById = await request(
    '/rest/v1/goods_receipts?select=id&id=eq.' + encodeURIComponent(attemptId)
  );
  assert.equal(persistedById.response.status, 200);
  assert.equal(persistedById.raw, '[]', 'The rejected attempt must leave no receipt row.');

  const persistedByRunId = await request(
    '/rest/v1/goods_receipts?select=id&observation=ilike.*' + encodeURIComponent(runId) + '*'
  );
  assert.equal(persistedByRunId.response.status, 200);
  assert.equal(persistedByRunId.raw, '[]', 'The rejected attempt must leave no runId row.');

  const linkedReceipts = await exactCount(
    '/rest/v1/goods_receipt_items?select=id&receipt_id=eq.' + encodeURIComponent(attemptId),
    'Goods receipt items'
  );
  assert.equal(linkedReceipts, 0, 'The rejected attempt must leave no receipt items.');

  const inventoryMoves = await exactCount(
    '/rest/v1/inventory_moves?select=id&source_receipt_id=eq.' + encodeURIComponent(attemptId),
    'Receipt inventory moves'
  );
  assert.equal(inventoryMoves, 0, 'The rejected attempt must leave no inventory movement.');

  return {
    projectRef,
    schema: 'public',
    runId,
    operatorEmail: expectedOperatorEmail,
    preconditionNoGoodsReceipts: receiptsBefore === 0,
    forgedOwnerRejected: true,
    rejectedAttemptPersisted: false,
    receiptItemsPersisted: false,
    receiptInventoryMovesPersisted: false,
    sequenceIndexSuppliedExplicitly: safeUnusedReceiptIndex,
    sequenceConsumptionMustBeConfirmedSeparately: true,
  };
}

run()
  .then((result) => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
  .catch((error) => {
    process.stderr.write((error?.message || 'Remote goods-receipt guard probe failed.') + '\n');
    process.exitCode = 1;
  });
