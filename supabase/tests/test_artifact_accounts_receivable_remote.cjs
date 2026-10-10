const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const projectRef = 'hkoxhourxwlddgsfdgws';
const expectedOperatorEmail = 'matheusmorante002@gmail.com';
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const operatorEmail = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;

assert.equal(process.env.AR_ARTIFACT_GUARD_VERIFIED, '20261010012313');
assert.equal(process.env.RUN_AR_TEST_ARTIFACT_REMOTE, 'authorized-by-current-task');
assert.equal(process.env.MORANTE_ENV_SOURCE, 'vercel-development');
assert.ok(supabaseUrl && anonKey && operatorEmail && operatorPassword);
assert.equal(operatorEmail, expectedOperatorEmail);
assert.equal(new URL(supabaseUrl).hostname, `${projectRef}.supabase.co`);

const runId = randomUUID();
const recordId = randomUUID();
const invalidId = randomUUID();
const forgedOwnerId = randomUUID();
const anonymousId = randomUUID();
let accessToken;
let ownerId;

function artifactNotes(id, artifactOwnerId) {
  return JSON.stringify({
    testArtifact: { is_test: true, runId: id, ownerId: artifactOwnerId },
  });
}

function receivable(id, artifactRunId, artifactOwnerId, status = 'pending') {
  return {
    id,
    description: `TESTE DE GUARD - NÃO COBRAR - runId ${artifactRunId}`,
    amount: 0.01,
    due_date: '2099-12-31',
    status,
    category_id: null,
    customer_name: 'ARTEFATO SINTÉTICO - NÃO COBRAR',
    order_id: null,
    payment_date: null,
    notes: artifactNotes(artifactRunId, artifactOwnerId),
  };
}

async function request(path, { method = 'GET', body, anonymous = false } = {}) {
  const headers = {
    apikey: anonKey,
    Accept: 'application/json',
    'Accept-Profile': 'public',
    'Content-Profile': 'public',
  };
  if (method === 'HEAD') {
    headers.Prefer = 'count=exact';
    headers.Range = '0-0';
  }
  if (!anonymous && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Profile'] = 'public';
    headers.Prefer = 'return=representation';
  }
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = method === 'HEAD' ? '' : await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { response, raw, data };
}

async function readById(id) {
  const { response, data } = await request(
    `/rest/v1/accounts_receivable?select=id,status,description,amount,notes&id=eq.${encodeURIComponent(id)}`
  );
  assert.equal(response.status, 200, `Synthetic receivable read failed (${response.status}).`);
  assert.ok(Array.isArray(data));
  return data;
}

async function exactCount(path, label) {
  const { response } = await request(path, { method: 'HEAD' });
  assert.equal(response.status, 200, `${label} HEAD failed (${response.status}).`);
  const match = (response.headers.get('content-range') || '').match(/\/(\d+)$/);
  assert.ok(match, `${label} exact count unavailable.`);
  return Number(match[1]);
}

async function reportCount(status) {
  return exactCount(
    `/rest/v1/rpc/get_report_accounts_receivable?p_status=${encodeURIComponent(status)}`,
    `Receivable report (${status})`
  );
}

async function insert(row, anonymous = false) {
  return request('/rest/v1/accounts_receivable', {
    method: 'POST',
    body: row,
    anonymous,
  });
}

async function cancelOwnedFixture() {
  if (!accessToken || !ownerId) return 'not-created';
  try {
    const rows = await readById(recordId);
    if (rows.length === 0) return 'not-created';
    const row = rows[0];
    const notes = JSON.parse(row.notes || '{}');
    if (notes.testArtifact?.runId !== runId || notes.testArtifact?.ownerId !== ownerId) {
      return 'ownership-mismatch';
    }
    if (row.status !== 'cancelled') {
      const result = await request(`/rest/v1/accounts_receivable?id=eq.${encodeURIComponent(recordId)}`, {
        method: 'PATCH',
        body: { status: 'cancelled' },
      });
      if (!result.response.ok) return 'cancellation-failed';
    }
    const finalRows = await readById(recordId);
    return finalRows.length === 1 && finalRows[0].status === 'cancelled'
      ? 'cancelled-and-retained'
      : 'cancellation-verification-failed';
  } catch {
    return 'cancellation-failed';
  }
}

async function run() {
  const login = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: operatorEmail, password: operatorPassword }),
  });
  assert.equal(login.status, 200, `Authorized operator login failed (${login.status}).`);
  const session = await login.json();
  assert.equal(session.user?.email?.toLowerCase(), expectedOperatorEmail);
  assert.ok(session.access_token && session.user?.id);
  accessToken = session.access_token;
  ownerId = session.user.id;

  const { response: roleResponse, data: isAdministrator } = await request('/rest/v1/rpc/is_administrator', {
    method: 'POST',
    body: {},
  });
  assert.equal(roleResponse.status, 200);
  assert.equal(isAdministrator, true, 'The approved test operator must be an administrator.');

  const baseline = {
    pending: await reportCount('pending'),
    cancelled: await reportCount('cancelled'),
  };
  const linkedTransactionsBefore = await exactCount(
    `/rest/v1/financial_transactions?select=id&receivable_id=eq.${encodeURIComponent(recordId)}`,
    'Linked financial transactions before INSERT'
  );
  assert.equal(linkedTransactionsBefore, 0);

  const anonymous = await insert(receivable(anonymousId, randomUUID(), ownerId), true);
  assert.ok([401, 403].includes(anonymous.response.status), 'Anonymous INSERT must be denied.');
  assert.equal((await readById(anonymousId)).length, 0, 'Anonymous INSERT left a row behind.');

  const forgedOwner = await insert(receivable(forgedOwnerId, randomUUID(), randomUUID()));
  assert.ok(forgedOwner.response.status >= 400);
  assert.match(forgedOwner.raw, /TEST_ARTIFACT_UNAUTHORIZED/);
  assert.equal((await readById(forgedOwnerId)).length, 0, 'Forged owner INSERT left a row behind.');

  const invalidStatus = await insert(receivable(invalidId, randomUUID(), ownerId, 'invalid_status'));
  assert.ok(invalidStatus.response.status >= 400, 'Invalid status must fail the database constraint.');
  assert.equal((await readById(invalidId)).length, 0, 'Rejected INSERT left a row behind.');

  const payload = receivable(recordId, runId, ownerId);
  const [first, duplicate] = await Promise.all([insert(payload), insert(payload)]);
  const concurrentStatuses = [first.response.status, duplicate.response.status].sort((a, b) => a - b);
  assert.deepEqual(concurrentStatuses, [201, 409], 'Same primary key must yield one INSERT and one conflict.');

  const rows = await readById(recordId);
  assert.equal(rows.length, 1, 'Concurrent duplicate requests must leave exactly one row.');
  const stored = rows[0];
  assert.equal(stored.status, 'pending');
  assert.equal(stored.amount, 0.01);
  const metadata = JSON.parse(stored.notes || '{}').testArtifact;
  assert.equal(metadata.is_test, true);
  assert.equal(metadata.runId, runId);
  assert.equal(metadata.ownerId, ownerId);
  assert.equal(await reportCount('pending'), baseline.pending, 'Synthetic receivable leaked into report.');

  const tampered = await request(`/rest/v1/accounts_receivable?id=eq.${encodeURIComponent(recordId)}`, {
    method: 'PATCH',
    body: { notes: artifactNotes(randomUUID(), ownerId) },
  });
  assert.ok(tampered.response.status >= 400);
  assert.match(tampered.raw, /TEST_ARTIFACT_IDENTITY_IMMUTABLE/);
  const unchanged = await readById(recordId);
  assert.equal(JSON.parse(unchanged[0].notes).testArtifact.runId, runId);

  const cancellation = await request(`/rest/v1/accounts_receivable?id=eq.${encodeURIComponent(recordId)}`, {
    method: 'PATCH',
    body: { status: 'cancelled' },
  });
  assert.equal(cancellation.response.status, 200, 'Synthetic receivable cancellation PATCH failed.');
  assert.equal(cancellation.data?.length, 1);
  const cleanupResult = await cancelOwnedFixture();
  assert.equal(cleanupResult, 'cancelled-and-retained');

  const after = {
    pending: await reportCount('pending'),
    cancelled: await reportCount('cancelled'),
  };
  assert.deepEqual(after, baseline, 'Synthetic receivable changed report counts.');
  const linkedTransactionsAfter = await exactCount(
    `/rest/v1/financial_transactions?select=id&receivable_id=eq.${encodeURIComponent(recordId)}`,
    'Linked financial transactions after cancellation'
  );
  assert.equal(linkedTransactionsAfter, 0, 'Receivable test created a financial transaction.');

  return {
    projectRef,
    schema: 'public',
    runId,
    recordId,
    anonymousInsertDenied: true,
    forgedOwnerDenied: true,
    invalidInsertRolledBack: true,
    concurrentSameIdStatuses: concurrentStatuses,
    oneRowPersisted: true,
    identityMutationRejected: true,
    pendingAndCancelledReportCountsUnchanged: true,
    linkedFinancialTransactions: 0,
    finalStatus: 'cancelled',
    retainedForAudit: true,
  };
}

run()
  .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
  .catch(async (error) => {
    const cleanupResult = await cancelOwnedFixture();
    process.stderr.write(
      `${JSON.stringify({ error: error.message, projectRef, runId, recordId, cleanupResult })}\n`
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (accessToken) {
      await fetch(`${supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }
  });
