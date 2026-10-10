const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const projectRef = 'hkoxhourxwlddgsfdgws';
const expectedOperatorEmail = 'matheusmorante002@gmail.com';
const invalidType = 'guard-probe-invalid';
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const operatorEmail = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;

assert.equal(process.env.FINANCIAL_TRANSACTION_ARTIFACT_GUARD_VERIFIED, '20261010012313');
assert.equal(process.env.RUN_FINANCIAL_TRANSACTION_ARTIFACT_REMOTE, 'authorized-by-current-task');
assert.equal(process.env.MORANTE_ENV_SOURCE, 'vercel-development');
assert.ok(supabaseUrl && anonKey && operatorEmail && operatorPassword);
assert.equal(operatorEmail, expectedOperatorEmail);
assert.equal(new URL(supabaseUrl).hostname, projectRef + '.supabase.co');

const runId = randomUUID();
const transactionId = randomUUID();
const forgedOwnerId = randomUUID();
let accessToken;

function notes() {
  return JSON.stringify({
    testArtifact: { is_test: true, runId, ownerId: forgedOwnerId },
  });
}

function transaction() {
  return {
    id: transactionId,
    description: 'TESTE NEGATIVO DE GUARD - NÃO OPERACIONAL - runId ' + runId,
    amount: 0,
    type: invalidType,
    date: '2000-01-01',
    notes: notes(),
    idempotency_key: 'guard-probe-' + runId,
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

  const before = await exactCount(
    '/rest/v1/financial_transactions?select=id&id=eq.' + encodeURIComponent(transactionId),
    'Transaction ID'
  );
  assert.equal(before, 0, 'Probe ID must not collide with an existing financial transaction.');

  const anonymous = await request('/rest/v1/financial_transactions', {
    method: 'POST',
    body: transaction(),
    anonymous: true,
  });
  assert.ok(
    [401, 403].includes(anonymous.response.status),
    'Anonymous INSERT must be denied by table privileges (' + anonymous.response.status + ').'
  );

  const authenticated = await request('/rest/v1/financial_transactions', {
    method: 'POST',
    body: transaction(),
  });
  assert.equal(authenticated.response.status, 400, 'Forged test owner must be rejected by the guard.');
  assert.match(authenticated.raw, /TEST_ARTIFACT_UNAUTHORIZED/);

  const after = await exactCount(
    '/rest/v1/financial_transactions?select=id&id=eq.' + encodeURIComponent(transactionId),
    'Transaction ID after rejection'
  );
  assert.equal(after, 0, 'Rejected attempts must leave no financial transaction.');

  return {
    projectRef,
    schema: 'public',
    runId,
    operatorEmail: expectedOperatorEmail,
    anonymousInsertDenied: true,
    authenticatedForgedOwnerRejected: true,
    transactionPersisted: false,
    invalidTypePreventsPersistenceIfGuardIsMissing: true,
    limitation: 'Negative permission/guard behavior only; no valid financial transaction, idempotency, rollback, concurrency, or cleanup was tested.',
  };
}

run()
  .then((result) => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
  .catch((error) => {
    process.stderr.write((error?.message || 'Remote financial-transaction guard probe failed.') + '\n');
    process.exitCode = 1;
  });
