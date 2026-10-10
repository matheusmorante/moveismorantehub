const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const projectRef = 'hkoxhourxwlddgsfdgws';
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const operatorEmail = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;

assert.equal(process.env.PRODUCT_ARTIFACT_GUARD_VERIFIED, '20261010012313');
assert.equal(process.env.RUN_PRODUCT_ARTIFACT_REMOTE, 'authorized-by-current-task');
assert.equal(process.env.MORANTE_ENV_SOURCE, 'vercel-development');
assert.ok(supabaseUrl && anonKey && operatorEmail && operatorPassword);
assert.equal(new URL(supabaseUrl).hostname, projectRef + '.supabase.co');

const runId = randomUUID();
const attemptId = randomUUID();
const slug = 'test-guard-' + runId;
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
  assert.equal(session.user?.email?.toLowerCase(), operatorEmail);
  assert.ok(session.access_token && session.user?.id);
  accessToken = session.access_token;

  const role = await request('/rest/v1/rpc/is_administrator', { method: 'POST', body: {} });
  assert.equal(role.response.status, 200);
  assert.equal(JSON.parse(role.raw), true, 'The approved test operator must be an administrator.');

  const productBefore = await exactCount(
    '/rest/v1/products?select=id&id=eq.' + encodeURIComponent(attemptId),
    'Product ID'
  );
  const slugBefore = await exactCount(
    '/rest/v1/products?select=id&slug=eq.' + encodeURIComponent(slug),
    'Product slug'
  );
  const variationBefore = await exactCount(
    '/rest/v1/product_variations?select=id&product_id=eq.' + encodeURIComponent(attemptId),
    'Product variations'
  );
  assert.deepEqual(
    [productBefore, slugBefore, variationBefore],
    [0, 0, 0],
    'Probe identifiers must not collide with existing catalog rows.'
  );

  const probe = await request('/rest/v1/products', {
    method: 'POST',
    body: {
      id: attemptId,
      name: null,
      slug,
      description: 'TESTE NEGATIVO DE GUARD - NÃO OPERACIONAL - runId ' + runId,
      price: null,
      code: 'TEST-GUARD-' + runId,
      status: 'draft',
      is_draft: true,
      active: false,
      stock: 0,
      initial_stock: 0,
      item_type: 'product',
      is_combo: false,
      combo_items: [],
      supplier_ids: [],
      technical_specs: {
        testArtifact: { is_test: true, runId, ownerId: forgedOwnerId },
      },
    },
  });
  assert.equal(probe.response.status, 400, 'Forged test owner must be rejected by the guard.');
  assert.match(probe.raw, /TEST_ARTIFACT_UNAUTHORIZED/);

  const productAfter = await exactCount(
    '/rest/v1/products?select=id&id=eq.' + encodeURIComponent(attemptId),
    'Product ID after rejection'
  );
  const slugAfter = await exactCount(
    '/rest/v1/products?select=id&slug=eq.' + encodeURIComponent(slug),
    'Product slug after rejection'
  );
  const variationAfter = await exactCount(
    '/rest/v1/product_variations?select=id&product_id=eq.' + encodeURIComponent(attemptId),
    'Product variations after rejection'
  );
  const inventoryMoves = await exactCount(
    '/rest/v1/inventory_moves?select=id&product_id=eq.' + encodeURIComponent(attemptId),
    'Inventory moves for rejected product'
  );

  assert.deepEqual(
    [productAfter, slugAfter, variationAfter, inventoryMoves],
    [0, 0, 0, 0],
    'Rejected product must leave no product, variation, or inventory movement.'
  );

  return {
    projectRef,
    schema: 'public',
    runId,
    operatorIdentityVerified: true,
    forgedOwnerRejected: true,
    productPersisted: false,
    variationPersisted: false,
    inventoryMovePersisted: false,
    skuTriggerUsesSequence: false,
    limitation: 'Negative guard behavior only; no valid product write, commit, rollback, concurrency, or cleanup was tested.',
  };
}

run()
  .then((result) => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
  .catch((error) => {
    process.stderr.write((error?.message || 'Remote product guard probe failed.') + '\n');
    process.exitCode = 1;
  });
