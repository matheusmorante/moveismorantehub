const assert = require('node:assert/strict');

const projectRef = 'hkoxhourxwlddgsfdgws';
const runAuthorization = 'authorized-by-current-task';
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const operatorEmail = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;

assert.equal(process.env.MORANTE_ENV_SOURCE, 'vercel-development');
assert.equal(process.env.RUN_GOODS_RECEIPT_CONFIRMATION_REMOTE, runAuthorization);
assert.ok(supabaseUrl && anonKey && operatorEmail && operatorPassword);
assert.equal(new URL(supabaseUrl).hostname, `${projectRef}.supabase.co`);

let accessToken;

async function request(path, { method = 'GET', body, anonymous = false } = {}) {
  const headers = {
    apikey: anonKey,
    Accept: 'application/json',
    'Accept-Profile': 'public',
    'Content-Profile': 'public',
  };
  if (!anonymous && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (method === 'HEAD') {
    headers.Prefer = 'count=exact';
    headers.Range = '0-0';
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers.Prefer = 'return=representation';
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, raw: method === 'HEAD' ? '' : await response.text() };
}

async function exactCount(path, label) {
  const result = await request(path, { method: 'HEAD' });
  assert.equal(result.response.status, 200, `${label} count failed (${result.response.status}).`);
  const match = (result.response.headers.get('content-range') || '').match(/\/(\d+)$/);
  assert.ok(match, `${label} exact count unavailable.`);
  return Number(match[1]);
}

function assertDenied(result, label) {
  assert.ok(
    [401, 403, 404].includes(result.response.status),
    `${label} should be denied, received HTTP ${result.response.status}.`
  );
}

async function run() {
  const login = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: operatorEmail, password: operatorPassword }),
  });
  assert.equal(login.status, 200, `Authorized operator login failed (${login.status}).`);
  const session = await login.json();
  assert.equal(session.user?.email?.toLowerCase(), operatorEmail);
  assert.ok(session.access_token);
  accessToken = session.access_token;

  const administrator = await request('/rest/v1/rpc/is_administrator', { method: 'POST', body: {} });
  assert.equal(administrator.response.status, 200, `Administrator check failed (${administrator.response.status}).`);
  assert.equal(JSON.parse(administrator.raw), true, 'The approved test operator must be an administrator.');

  const countPaths = [
    ['/rest/v1/goods_receipts?select=id', 'Goods receipts'],
    ['/rest/v1/goods_receipt_items?select=id', 'Goods receipt items'],
    ['/rest/v1/inventory_moves?select=id', 'Inventory movements'],
  ];
  const countsBefore = await Promise.all(countPaths.map(([path, label]) => exactCount(path, label)));

  const invalidBody = { p_receipt: {}, p_items: [] };
  const anonymousChecked = await request('/rest/v1/rpc/confirm_goods_receipt_checked_transaction', {
    method: 'POST', body: invalidBody, anonymous: true,
  });
  assertDenied(anonymousChecked, 'Anonymous checked confirmation RPC');

  const anonymousBase = await request('/rest/v1/rpc/confirm_goods_receipt_transaction', {
    method: 'POST', body: invalidBody, anonymous: true,
  });
  assertDenied(anonymousBase, 'Anonymous base confirmation RPC');

  const authenticatedBase = await request('/rest/v1/rpc/confirm_goods_receipt_transaction', {
    method: 'POST', body: invalidBody,
  });
  assertDenied(authenticatedBase, 'Authenticated direct base confirmation RPC');

  const authenticatedChecked = await request('/rest/v1/rpc/confirm_goods_receipt_checked_transaction', {
    method: 'POST', body: invalidBody,
  });
  assert.equal(
    authenticatedChecked.response.status,
    400,
    `Authenticated checked RPC should execute and reject the invalid payload before writes (HTTP ${authenticatedChecked.response.status}).`
  );
  assert.match(authenticatedChecked.raw, /Recebimento requer identificador e itens válidos/);

  const countsAfter = await Promise.all(countPaths.map(([path, label]) => exactCount(path, label)));
  assert.deepEqual(countsAfter, countsBefore, 'Permission probes changed receipt or inventory row counts.');

  process.stdout.write(`${JSON.stringify({
    projectRef,
    schema: 'public',
    authenticatedAdministrator: true,
    anonymousCheckedRpcDenied: true,
    anonymousBaseRpcDenied: true,
    authenticatedBaseRpcDenied: true,
    authenticatedCheckedRpcReachable: true,
    invalidPayloadRejectedBeforeWrites: true,
    receiptItemAndInventoryCountsUnchanged: true,
  }, null, 2)}\n`);
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
