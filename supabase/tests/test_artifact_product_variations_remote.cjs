const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const projectRef = 'hkoxhourxwlddgsfdgws';
const expectedOperatorEmail = 'matheusmorante002@gmail.com';
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const operatorEmail = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;

assert.equal(process.env.PRODUCT_VARIATION_ARTIFACT_GUARD_VERIFIED, '20261010012313');
assert.equal(process.env.RUN_PRODUCT_VARIATION_ARTIFACT_REMOTE, 'authorized-by-current-task');
assert.equal(process.env.MORANTE_ENV_SOURCE, 'vercel-development');
assert.ok(supabaseUrl && anonKey && operatorEmail && operatorPassword);
assert.equal(operatorEmail, expectedOperatorEmail);
assert.equal(new URL(supabaseUrl).hostname, projectRef + '.supabase.co');

const runId = randomUUID();
const variationId = randomUUID();
const nonexistentProductId = randomUUID();
const forgedOwnerId = randomUUID();
let accessToken;

async function request(path, { method = 'GET', body } = {}) {
  const headers = {
    apikey: anonKey,
    Accept: 'application/json',
    'Accept-Profile': 'public',
    'Content-Profile': 'public',
  };
  if (accessToken) headers.Authorization = 'Bearer ' + accessToken;
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

  const parentBefore = await exactCount(
    '/rest/v1/products?select=id&id=eq.' + encodeURIComponent(nonexistentProductId),
    'Product parent sentinel'
  );
  const variationBefore = await exactCount(
    '/rest/v1/product_variations?select=id&id=eq.' + encodeURIComponent(variationId),
    'Variation ID'
  );
  const linkedBefore = await exactCount(
    '/rest/v1/product_variations?select=id&product_id=eq.' + encodeURIComponent(nonexistentProductId),
    'Variations for parent sentinel'
  );
  assert.deepEqual(
    [parentBefore, variationBefore, linkedBefore],
    [0, 0, 0],
    'Probe UUIDs must not refer to existing catalog rows.'
  );

  const probe = await request('/rest/v1/product_variations', {
    method: 'POST',
    body: {
      id: variationId,
      product_id: nonexistentProductId,
      name: null,
      sku: 'TEST-GUARD-' + runId,
      price: null,
      stock: 0,
      attributes: {
        testArtifact: { is_test: true, runId, ownerId: forgedOwnerId },
      },
      combo_items: [],
      active: false,
    },
  });
  assert.equal(probe.response.status, 400, 'Forged test owner must be rejected by the guard.');
  assert.match(probe.raw, /TEST_ARTIFACT_UNAUTHORIZED/);

  const variationAfter = await exactCount(
    '/rest/v1/product_variations?select=id&id=eq.' + encodeURIComponent(variationId),
    'Variation ID after rejection'
  );
  const linkedAfter = await exactCount(
    '/rest/v1/product_variations?select=id&product_id=eq.' + encodeURIComponent(nonexistentProductId),
    'Variations for parent sentinel after rejection'
  );
  const inventoryMoves = await exactCount(
    '/rest/v1/inventory_moves?select=id&variation_id=eq.' + encodeURIComponent(variationId),
    'Inventory moves for rejected variation'
  );
  assert.deepEqual(
    [variationAfter, linkedAfter, inventoryMoves],
    [0, 0, 0],
    'Rejected variation must leave no variation or inventory movement.'
  );

  return {
    projectRef,
    schema: 'public',
    runId,
    operatorEmail: expectedOperatorEmail,
    forgedOwnerRejected: true,
    nonexistentParentUsed: true,
    noOperationalParentLocked: true,
    variationPersisted: false,
    inventoryMovePersisted: false,
    limitation: 'Negative guard behavior only; no valid variation write, parent synchronization, rollback, concurrency, or cleanup was tested.',
  };
}

run()
  .then((result) => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
  .catch((error) => {
    process.stderr.write((error?.message || 'Remote product-variation guard probe failed.') + '\n');
    process.exitCode = 1;
  });
