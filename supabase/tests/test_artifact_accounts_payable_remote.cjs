const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const projectRef = 'hkoxhourxwlddgsfdgws';
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const operatorEmail = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;

// Confirm the remote admin UPDATE policy in migration history and pg_policies
// before opting in; without it the test row cannot be cancelled through the API.
assert.equal(
  process.env.ACCOUNTS_PAYABLE_UPDATE_POLICY_VERIFIED,
  '20261010025617',
  'Verify this exact migration is applied remotely before any write.'
);
assert.equal(
  process.env.RUN_AP_TEST_ARTIFACT_REMOTE,
  'authorized-by-current-task',
  'This remote test writes one clearly labeled, one-cent synthetic payable and requires explicit opt-in.'
);
assert.equal(process.env.MORANTE_ENV_SOURCE, 'vercel-development', 'Use Vercel Development runtime variables.');
assert.ok(supabaseUrl && anonKey && operatorEmail && operatorPassword, 'Missing runtime Supabase/operator variables.');
assert.equal(new URL(supabaseUrl).hostname, `${projectRef}.supabase.co`, 'Refuse any project other than MoranteHub.');

const runId = randomUUID();
const recordId = randomUUID();
const rollbackId = randomUUID();
const ownerMismatchId = randomUUID();
const anonymousId = randomUUID();
let accessToken;
let ownerId;
let cleanupResult = 'not-needed';

function artifactNotes(id, artifactOwnerId) {
  return JSON.stringify({
    testArtifact: { is_test: true, runId: id, ownerId: artifactOwnerId },
  });
}

function payable(id, artifactRunId, artifactOwnerId, status = 'pending') {
  return {
    id,
    description: `TESTE DE GUARD - NÃO PAGAR - runId ${artifactRunId}`,
    amount: 0.01,
    due_date: '2099-12-31',
    status,
    category_id: null,
    supplier_name: 'ARTEFATO AUTOMATIZADO',
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
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  return { response, raw, data };
}

async function readById(id) {
  const { response, data } = await request(
    `/rest/v1/accounts_payable?select=id,status,description,amount,notes&id=eq.${encodeURIComponent(id)}`
  );
  assert.equal(response.status, 200, `Synthetic row readback failed (${response.status}).`);
  assert.ok(Array.isArray(data));
  return data;
}

async function reportCount(status) {
  const { response, raw } = await request(
    `/rest/v1/rpc/get_report_accounts_payable?p_status=${encodeURIComponent(status)}`,
    { method: 'HEAD' }
  );
  assert.equal(response.status, 200, `Filtered report HEAD failed (${response.status}).`);
  const match = (response.headers.get('content-range') || '').match(/\/(\d+)$/);
  assert.ok(
    match,
    `Exact report count unavailable for ${status}; header=${response.headers.get('content-range') || 'missing'}; body=${raw}`
  );
  return Number(match[1]);
}

async function insert(row, anonymous = false) {
  return request('/rest/v1/accounts_payable', { method: 'POST', body: row, anonymous });
}

async function cancelOwnedFixture() {
  if (!accessToken || !ownerId) return 'not-created';
  try {
    const rows = await readById(recordId);
    if (rows.length === 0) return 'not-created';
    const row = rows[0];
    const notes = JSON.parse(row.notes || '{}');
    if (notes.testArtifact?.runId !== runId || notes.testArtifact?.ownerId !== ownerId) return 'ownership-mismatch';
    if (row.status !== 'cancelled') {
      const result = await request(`/rest/v1/accounts_payable?id=eq.${encodeURIComponent(recordId)}`, {
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
  assert.equal(session.user?.email?.toLowerCase(), operatorEmail);
  assert.ok(session.access_token && session.user?.id);
  accessToken = session.access_token;
  ownerId = session.user.id;

  const { response: roleResponse, data: isAdministrator } = await request('/rest/v1/rpc/is_administrator', {
    method: 'POST',
    body: {},
  });
  assert.equal(roleResponse.status, 200);
  assert.equal(isAdministrator, true, 'The test-artifact guard requires an authenticated administrator.');

  const baseline = {
    pending: await reportCount('pending'),
    cancelled: await reportCount('cancelled'),
  };

  const anonymous = await insert(payable(anonymousId, randomUUID(), ownerId), true);
  assert.ok([401, 403].includes(anonymous.response.status), 'Anonymous INSERT must be denied by PostgREST/RLS.');
  assert.equal((await readById(anonymousId)).length, 0, 'Anonymous INSERT left a row behind.');

  const forgedOwner = await insert(payable(ownerMismatchId, randomUUID(), randomUUID()));
  assert.ok(forgedOwner.response.status >= 400);
  assert.match(forgedOwner.raw, /TEST_ARTIFACT_UNAUTHORIZED/);
  assert.equal((await readById(ownerMismatchId)).length, 0, 'Forged owner INSERT left a row behind.');

  const invalidStatus = await insert(payable(rollbackId, randomUUID(), ownerId, 'invalid_status'));
  assert.ok(invalidStatus.response.status >= 400, 'Invalid status must fail the database constraint.');
  assert.equal((await readById(rollbackId)).length, 0, 'Rejected INSERT left a row behind.');

  const payload = payable(recordId, runId, ownerId);
  const [first, duplicate] = await Promise.all([insert(payload), insert(payload)]);
  const concurrentStatuses = [first.response.status, duplicate.response.status].sort((a, b) => a - b);
  assert.deepEqual(concurrentStatuses, [201, 409], 'Same primary key must produce one INSERT and one unique-key conflict.');
  const rows = await readById(recordId);
  assert.equal(rows.length, 1, 'Concurrent duplicate requests must leave exactly one row.');
  const stored = rows[0];
  assert.equal(stored.status, 'pending');
  assert.equal(stored.amount, 0.01);
  const metadata = JSON.parse(stored.notes || '{}').testArtifact;
  assert.equal(metadata.is_test, true);
  assert.equal(metadata.runId, runId);
  assert.equal(metadata.ownerId, ownerId);

  assert.equal(await reportCount('pending'), baseline.pending, 'Synthetic payable leaked into pending report/dashboard.');

  const tampered = await request(`/rest/v1/accounts_payable?id=eq.${encodeURIComponent(recordId)}`, {
    method: 'PATCH',
    body: { notes: artifactNotes(randomUUID(), ownerId) },
  });
  assert.ok(tampered.response.status >= 400);
  assert.match(tampered.raw, /TEST_ARTIFACT_IDENTITY_IMMUTABLE/);
  const unchanged = await readById(recordId);
  assert.equal(JSON.parse(unchanged[0].notes).testArtifact.runId, runId);

  const cancellation = await request(`/rest/v1/accounts_payable?id=eq.${encodeURIComponent(recordId)}`, {
    method: 'PATCH',
    body: { status: 'cancelled' },
  });
  assert.equal(cancellation.response.status, 200, 'A test-owned payable must support normal cancellation.');
  cleanupResult = await cancelOwnedFixture();
  assert.equal(cleanupResult, 'cancelled-and-retained');

  const after = {
    pending: await reportCount('pending'),
    cancelled: await reportCount('cancelled'),
  };
  assert.deepEqual(after, baseline, 'Synthetic payable changed an operational report count.');

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
    finalStatus: 'cancelled',
    retainedForAudit: true,
  };
}

run()
  .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
  .catch(async (error) => {
    cleanupResult = await cancelOwnedFixture();
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
