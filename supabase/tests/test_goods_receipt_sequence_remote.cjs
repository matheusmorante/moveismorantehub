const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const projectRef = 'hkoxhourxwlddgsfdgws';
const runAuthorization = 'authorized-by-current-task';
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const operatorEmail = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;

assert.equal(process.env.MORANTE_ENV_SOURCE, 'vercel-development');
assert.equal(process.env.RUN_GOODS_RECEIPT_SEQUENCE_REMOTE, runAuthorization);
assert.ok(supabaseUrl && anonKey && operatorEmail && operatorPassword);
assert.equal(new URL(supabaseUrl).hostname, `${projectRef}.supabase.co`);

const runId = randomUUID();
const receiptId = randomUUID();
let accessToken;
let ownerId;
let created = false;
let cleanupComplete = false;
let anonymousRpcDenied = false;
let anonymousDirectDeleteDenied = false;

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

function exactReceiptPath() {
  return `/rest/v1/goods_receipts?select=id,receipt_index,purchase_id,supplier_id,supplier_name,items,total_value,observation,status,is_draft&id=eq.${encodeURIComponent(receiptId)}`;
}

async function readExactReceipt() {
  const result = await request(exactReceiptPath());
  assert.equal(result.response.status, 200, `Receipt verification failed (${result.response.status}).`);
  return JSON.parse(result.raw);
}

function assertOwnedDraft(row) {
  assert.equal(row.id, receiptId);
  assert.equal(row.status, 'draft');
  assert.equal(row.is_draft, true);
  assert.equal(row.receipt_index, null);
  assert.equal(row.purchase_id, null);
  assert.equal(row.supplier_id, null);
  assert.equal(row.items.length, 0);
  assert.equal(Number(row.total_value), 0);
  const observation = JSON.parse(row.observation);
  assert.deepEqual(observation.testArtifact, { is_test: true, runId, ownerId });
}

async function removeOnlyThisDraft() {
  const rows = await readExactReceipt();
  if (rows.length === 0) {
    cleanupComplete = true;
    return;
  }
  assert.equal(rows.length, 1, 'Unexpected duplicate receipt ID; refusing cleanup.');
  assertOwnedDraft(rows[0]);

  const cleanup = await request('/rest/v1/rpc/delete_goods_receipt_draft_transaction', {
    method: 'POST',
    body: { p_receipt_id: receiptId },
  });
  assert.ok([200, 204].includes(cleanup.response.status), `Draft cleanup failed (${cleanup.response.status}).`);
  const remaining = await readExactReceipt();
  assert.equal(remaining.length, 0, 'The exact synthetic draft remains after cleanup.');
  cleanupComplete = true;
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

  const role = await request('/rest/v1/rpc/is_administrator', { method: 'POST', body: {} });
  assert.equal(role.response.status, 200, `Administrator check failed (${role.response.status}).`);
  assert.equal(JSON.parse(role.raw), true, 'The approved test operator must be an administrator.');

  const receiptsBefore = await exactCount('/rest/v1/goods_receipts?select=id', 'Goods receipts');
  assert.equal(receiptsBefore, 0, 'Precondition failed: goods_receipts must be empty before this one-row proof.');

  const artifact = { is_test: true, runId, ownerId };
  const payload = {
    id: receiptId,
    supplier_name: `__TEST_RECEBIMENTO__ ${runId}`,
    received_at: new Date().toISOString(),
    items: [],
    total_value: 0,
    observation: JSON.stringify({ testArtifact: artifact }),
    status: 'draft',
    is_draft: true,
  };

  try {
    let post;
    try {
      post = await request('/rest/v1/goods_receipts', { method: 'POST', body: payload });
    } catch {
      const uncertainRows = await readExactReceipt();
      if (uncertainRows.length === 1 && uncertainRows[0].observation) {
        const identity = JSON.parse(uncertainRows[0].observation).testArtifact;
        if (identity?.runId === runId && identity?.ownerId === ownerId) created = true;
      }
      if (!created) throw new Error('POST outcome uncertain and no row with this runId was confirmed.');
      post = { response: { status: 201 }, raw: JSON.stringify(await readExactReceipt()) };
    }

    if (post.response.status === 201 || post.response.status === 200) {
      created = true;
    } else {
      const failedRows = await readExactReceipt();
      if (failedRows.length === 1 && failedRows[0].observation) {
        const identity = JSON.parse(failedRows[0].observation).testArtifact;
        if (identity?.runId === runId && identity?.ownerId === ownerId) created = true;
      }
      assert.fail(`Synthetic draft insert failed (${post.response.status}).`);
    }

    const inserted = JSON.parse(post.raw);
    assert.ok(Array.isArray(inserted) && inserted.length === 1, 'Insert did not return exactly one row.');
    assertOwnedDraft(inserted[0]);

    const persisted = await readExactReceipt();
    assert.equal(persisted.length, 1);
    assertOwnedDraft(persisted[0]);

    const itemCount = await exactCount(
      `/rest/v1/goods_receipt_items?select=id&receipt_id=eq.${encodeURIComponent(receiptId)}`,
      'Linked receipt items'
    );
    assert.equal(itemCount, 0, 'The draft unexpectedly created goods_receipt_items rows.');

    const movementCount = await exactCount(
      `/rest/v1/inventory_moves?select=id&source_receipt_id=eq.${encodeURIComponent(receiptId)}`,
      'Receipt inventory moves'
    );
    assert.equal(movementCount, 0, 'The draft unexpectedly created an inventory movement.');

    const anonymousRpc = await request('/rest/v1/rpc/delete_goods_receipt_draft_transaction', {
      method: 'POST',
      body: { p_receipt_id: receiptId },
      anonymous: true,
    });
    assert.ok(
      [401, 403, 404].includes(anonymousRpc.response.status),
      `Anonymous cleanup RPC was not denied (${anonymousRpc.response.status}).`
    );
    anonymousRpcDenied = true;
    const afterAnonymousRpc = await readExactReceipt();
    assert.equal(afterAnonymousRpc.length, 1, 'Anonymous RPC changed the synthetic receipt.');
    assertOwnedDraft(afterAnonymousRpc[0]);

    const anonymousDirectDelete = await request(
      `/rest/v1/goods_receipts?id=eq.${encodeURIComponent(receiptId)}`,
      { method: 'DELETE', anonymous: true }
    );
    assert.ok(
      [401, 403].includes(anonymousDirectDelete.response.status),
      `Anonymous direct DELETE was not denied (${anonymousDirectDelete.response.status}).`
    );
    anonymousDirectDeleteDenied = true;
    const afterAnonymousDelete = await readExactReceipt();
    assert.equal(afterAnonymousDelete.length, 1, 'Anonymous direct DELETE changed the synthetic receipt.');
    assertOwnedDraft(afterAnonymousDelete[0]);
  } finally {
    if (created) await removeOnlyThisDraft();
  }

  assert.equal(cleanupComplete, true, 'The synthetic draft was not confirmed removed.');
  const itemCountAfter = await exactCount(
    `/rest/v1/goods_receipt_items?select=id&receipt_id=eq.${encodeURIComponent(receiptId)}`,
    'Receipt items after cleanup'
  );
  const movementCountAfter = await exactCount(
    `/rest/v1/inventory_moves?select=id&source_receipt_id=eq.${encodeURIComponent(receiptId)}`,
    'Receipt movements after cleanup'
  );
  assert.equal(itemCountAfter, 0);
  assert.equal(movementCountAfter, 0);

  process.stdout.write(JSON.stringify({
    projectRef,
    schema: 'public',
    authenticatedAdministrator: true,
    runId,
    receiptId,
    preconditionNoReceipts: receiptsBefore === 0,
    draftHadNoCommercialIndex: true,
    purchaseAndSupplierLinksAbsent: true,
    jsonItemsEmpty: true,
    linkedReceiptItemsAfterCleanup: itemCountAfter,
    inventoryMovesAfterCleanup: movementCountAfter,
    anonymousRpcDenied,
    anonymousDirectDeleteDenied,
    cleanupViaDraftRpc: cleanupComplete,
    sefazContacted: false,
    receiptFinalized: false,
  }, null, 2) + '\n');
}

run().catch((error) => {
  process.stderr.write(`${error?.message || 'Remote goods-receipt sequence proof failed.'}\n`);
  process.exitCode = 1;
});
