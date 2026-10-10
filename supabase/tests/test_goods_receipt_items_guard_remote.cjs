const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const projectRef = 'hkoxhourxwlddgsfdgws';
const expectedOperatorEmail = 'matheusmorante002@gmail.com';
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const operatorEmail = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;

assert.equal(process.env.VERCEL_ENV, 'development');
assert.equal(process.env.MORANTE_ENV_SOURCE, 'vercel-development');
assert.equal(process.env.RUN_GOODS_RECEIPT_ITEMS_GUARD_REMOTE, 'authorized-by-current-task');
assert.ok(supabaseUrl && anonKey && operatorEmail && operatorPassword);
assert.equal(operatorEmail, expectedOperatorEmail);
assert.equal(new URL(supabaseUrl).hostname, `${projectRef}.supabase.co`);

const runIds = [randomUUID(), randomUUID(), randomUUID()];
const receiptIds = [randomUUID(), randomUUID(), randomUUID()];
const itemIds = [];
let accessToken;
let ownerId;
let confirmationRollbackSupported = false;
let invalidConfirmationRollbackPassed = false;
let validConfirmationRollbackPassed = false;

async function request(path, { method = 'GET', body, anonymous = false, prefer } = {}) {
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
  if (prefer) headers.Prefer = prefer;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers.Prefer = prefer ? `${prefer},return=representation` : 'return=representation';
  }
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  return { response, raw: await response.text() };
}

function receiptPath(id) {
  return `/rest/v1/goods_receipts?select=id,receipt_index,purchase_id,supplier_id,supplier_name,items,total_value,observation,status,is_draft&id=eq.${encodeURIComponent(id)}`;
}

function itemPath(filter) {
  return `/rest/v1/goods_receipt_items?select=id,receipt_id,item_index,product_id,variation_id,description,unit_cost,item_snapshot&id=${filter}`;
}

async function readReceipt(id) {
  const result = await request(receiptPath(id));
  assert.equal(result.response.status, 200, `Receipt lookup failed (${result.response.status}).`);
  return JSON.parse(result.raw);
}

async function readItems(ids) {
  const filter = `in.(${ids.map(encodeURIComponent).join(',')})`;
  const result = await request(itemPath(filter));
  assert.equal(result.response.status, 200, `Item lookup failed (${result.response.status}).`);
  return JSON.parse(result.raw);
}

async function exactCount(path, label) {
  const result = await request(path, { method: 'HEAD' });
  assert.equal(result.response.status, 200, `${label} count failed (${result.response.status}).`);
  const match = (result.response.headers.get('content-range') || '').match(/\/(\d+)$/);
  assert.ok(match, `${label} exact count unavailable.`);
  return Number(match[1]);
}

function syntheticIdentity(runId) {
  return { is_test: true, runId, ownerId };
}

function assertOwnedDraft(row, receiptId, runId) {
  assert.equal(row.id, receiptId);
  assert.equal(row.status, 'draft');
  assert.equal(row.is_draft, true);
  assert.equal(row.receipt_index, null);
  assert.equal(row.purchase_id, null);
  assert.equal(row.supplier_id, null);
  assert.deepEqual(row.items, []);
  assert.equal(Number(row.total_value), 0);
  const observation = typeof row.observation === 'string' ? JSON.parse(row.observation) : row.observation;
  assert.deepEqual(observation.testArtifact, syntheticIdentity(runId));
}

async function createDraft(index) {
  const receiptId = receiptIds[index];
  const runId = runIds[index];
  assert.equal((await readReceipt(receiptId)).length, 0, 'Randomized receipt ID already exists; refusing to reuse it.');
  const payload = {
    id: receiptId,
    supplier_name: `__TEST_ITEM_GUARD__ ${runId}`,
    received_at: new Date().toISOString(),
    items: [],
    total_value: 0,
    observation: JSON.stringify({ testArtifact: syntheticIdentity(runId) }),
    status: 'draft',
    is_draft: true,
  };
  const inserted = await request('/rest/v1/goods_receipts', { method: 'POST', body: payload });
  assert.ok([200, 201].includes(inserted.response.status), `Synthetic receipt insert failed (${inserted.response.status}).`);
  const rows = await readReceipt(receiptId);
  assert.equal(rows.length, 1, 'Synthetic receipt was not persisted exactly once.');
  assertOwnedDraft(rows[0], receiptId, runId);
}

function itemPayload(receiptIndex, itemIndex) {
  const runId = runIds[receiptIndex];
  return {
    id: randomUUID(),
    receipt_id: receiptIds[receiptIndex],
    item_index: itemIndex,
    product_id: null,
    variation_id: null,
    description: `__TEST_ITEM_GUARD__ ${runId} ${itemIndex}`,
    quantity: 1,
    base_cost: 0,
    unit_cost: 0,
    item_snapshot: { itemIndex },
  };
}

function confirmationReceiptPayload(index) {
  const runId = runIds[index];
  return {
    id: receiptIds[index],
    receipt_index: null,
    purchase_id: null,
    supplier_id: null,
    supplier_name: `__TEST_ITEM_GUARD__ ${runId}`,
    received_at: new Date().toISOString(),
    invoice_number: null,
    invoice_date: null,
    total_value: 0,
    observation: JSON.stringify({ testArtifact: syntheticIdentity(runId) }),
    fiscal_key: null,
    attachments: [],
    status: 'received',
    is_draft: false,
    ipi_percent: 0,
    freight_percent: 0,
    non_fiscal_discount_mode: null,
    non_fiscal_discount_value: 0,
    non_fiscal_freight_mode: null,
    non_fiscal_freight_value: 0,
    non_fiscal_other_expenses_mode: null,
    non_fiscal_other_expenses_value: 0,
    fiscal_ipi: 0,
    fiscal_freight: 0,
    fiscal_discount: 0,
    fiscal_other_expenses: 0,
  };
}

async function confirmReceipt(index, items, prefer) {
  return request('/rest/v1/rpc/confirm_goods_receipt_checked_transaction', {
    method: 'POST',
    body: { p_receipt: confirmationReceiptPayload(index), p_items: Array.isArray(items) ? items : [items] },
    prefer,
  });
}

async function insertItem(receiptIndex, itemIndex) {
  const payload = itemPayload(receiptIndex, itemIndex);
  const inserted = await request('/rest/v1/goods_receipt_items', { method: 'POST', body: payload });
  assert.ok([200, 201].includes(inserted.response.status), `Synthetic item insert failed (${inserted.response.status}).`);
  const returned = JSON.parse(inserted.raw);
  assert.equal(returned.length, 1);
  assert.equal(returned[0].id, payload.id);
  assert.equal(returned[0].receipt_id, receiptIds[receiptIndex]);
  return payload.id;
}

async function countItems(receiptId) {
  return exactCount(
    `/rest/v1/goods_receipt_items?select=id&receipt_id=eq.${encodeURIComponent(receiptId)}`,
    `Items for synthetic receipt ${receiptId}`
  );
}

async function removeOnlyOwnedDraft(receiptIndex) {
  const receiptId = receiptIds[receiptIndex];
  const rows = await readReceipt(receiptId);
  if (rows.length === 0) return;
  assert.equal(rows.length, 1, 'Unexpected duplicate receipt ID; refusing cleanup.');
  assertOwnedDraft(rows[0], receiptId, runIds[receiptIndex]);
  const moves = await exactCount(
    `/rest/v1/inventory_moves?select=id&source_receipt_id=eq.${encodeURIComponent(receiptId)}`,
    'Synthetic receipt inventory moves'
  );
  assert.equal(moves, 0, 'Refusing draft cleanup because an inventory movement exists.');

  const cleanup = await request('/rest/v1/rpc/delete_goods_receipt_draft_transaction', {
    method: 'POST',
    body: { p_receipt_id: receiptId },
  });
  assert.ok([200, 204].includes(cleanup.response.status), `Exact draft cleanup failed (${cleanup.response.status}).`);
  assert.equal((await readReceipt(receiptId)).length, 0, 'Synthetic receipt remains after normal draft cleanup.');
  assert.equal(await countItems(receiptId), 0, 'Synthetic receipt items remain after normal draft cleanup.');
}

async function run() {
  const login = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: operatorEmail, password: operatorPassword }),
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(login.status, 200, `Authorized operator login failed (${login.status}).`);
  const session = await login.json();
  assert.equal(session.user?.email?.trim().toLowerCase(), operatorEmail);
  assert.ok(session.access_token && session.user?.id);
  accessToken = session.access_token;
  ownerId = session.user.id;

  const role = await request('/rest/v1/rpc/is_administrator', { method: 'POST', body: {} });
  assert.equal(role.response.status, 200, `Administrator check failed (${role.response.status}).`);
  assert.equal(JSON.parse(role.raw), true, 'The configured operator must be an administrator for test artifacts.');

  try {
    await createDraft(0);
    await createDraft(1);

    const itemA = await insertItem(0, 1);
    const itemB = await insertItem(1, 1);
    itemIds[0] = itemA;
    itemIds[1] = itemB;

    const anonymous = await request('/rest/v1/goods_receipt_items', {
      method: 'POST',
      body: itemPayload(0, 90),
      anonymous: true,
    });
    assert.ok([401, 403].includes(anonymous.response.status), `Anonymous item write was not denied (${anonymous.response.status}).`);

    const sameRunUpdate = await request(`/rest/v1/goods_receipt_items?id=eq.${encodeURIComponent(itemA)}`, {
      method: 'PATCH',
      body: { description: `__TEST_ITEM_GUARD__ same-run ${runIds[0]}` },
    });
    assert.equal(sameRunUpdate.response.status, 200, `Same-run item update failed (${sameRunUpdate.response.status}).`);

    const crossRunBatch = await request(
      `/rest/v1/goods_receipt_items?id=in.(${encodeURIComponent(itemA)},${encodeURIComponent(itemB)})`,
      { method: 'PATCH', body: { receipt_id: receiptIds[1] } }
    );
    assert.equal(crossRunBatch.response.status, 400, 'Cross-run item reparenting was not rejected by the guard.');
    assert.match(crossRunBatch.raw, /TEST_ARTIFACT_IDENTITY_IMMUTABLE/);
    const afterRejectedBatch = await readItems(itemIds);
    assert.equal(afterRejectedBatch.length, 2);
    assert.equal(afterRejectedBatch.find((row) => row.id === itemA)?.receipt_id, receiptIds[0]);
    assert.equal(afterRejectedBatch.find((row) => row.id === itemB)?.receipt_id, receiptIds[1]);

    const concurrentResults = await Promise.allSettled([
      insertItem(0, 2),
      insertItem(0, 3),
      insertItem(1, 2),
      insertItem(1, 3),
    ]);
    const rejectedConcurrentWrites = concurrentResults.filter((result) => result.status === 'rejected');
    assert.equal(rejectedConcurrentWrites.length, 0, 'One or more concurrent synthetic item writes failed.');
    const concurrentIds = concurrentResults.map((result) => result.value);
    assert.equal(new Set(concurrentIds).size, 4);
    assert.equal(await countItems(receiptIds[0]), 3);
    assert.equal(await countItems(receiptIds[1]), 3);

    const rollbackProbe = await request('/rest/v1/goods_receipts?select=id&limit=0', {
      prefer: 'tx=rollback',
    });
    assert.equal(rollbackProbe.response.status, 200, 'Read-only tx=rollback preflight failed.');
    const appliedPreferences = (rollbackProbe.response.headers.get('preference-applied') || '')
      .toLowerCase().split(',').map((value) => value.trim());
    confirmationRollbackSupported = appliedPreferences.includes('tx=rollback');

    await createDraft(2);
    const invalidConfirmation = await confirmReceipt(2, [
      {
        productId: null,
        variationId: null,
        description: `__TEST_ITEM_GUARD__ rollback-first ${runIds[2]}`,
        quantity: 1,
        baseCost: 0,
        unitCost: 0,
      },
      {
        productId: null,
        variationId: null,
        description: `__TEST_ITEM_GUARD__ rollback-failure ${runIds[2]}`,
        quantity: 1,
        baseCost: 0,
        unitCost: 'not-a-number',
      },
    ]);
    assert.equal(invalidConfirmation.response.status, 400, 'Invalid item did not abort the checked confirmation transaction.');
    let confirmationDraft = await readReceipt(receiptIds[2]);
    assert.equal(confirmationDraft.length, 1);
    assertOwnedDraft(confirmationDraft[0], receiptIds[2], runIds[2]);
    assert.equal(await countItems(receiptIds[2]), 0, 'Failed confirmation left normalized item rows behind.');
    invalidConfirmationRollbackPassed = true;

    if (confirmationRollbackSupported) {
      const validConfirmation = await confirmReceipt(2, {
        productId: null,
        variationId: null,
        description: `__TEST_ITEM_GUARD__ transaction rollback ${runIds[2]}`,
        quantity: 1,
        baseCost: 0,
        unitCost: 0,
      }, 'tx=rollback');
      assert.equal(validConfirmation.response.status, 200, `Non-stock confirmation probe failed (${validConfirmation.response.status}).`);
      const confirmPreferences = (validConfirmation.response.headers.get('preference-applied') || '')
        .toLowerCase().split(',').map((value) => value.trim());
      assert.ok(confirmPreferences.includes('tx=rollback'), 'Confirmation request did not apply tx=rollback.');
      assert.equal(JSON.parse(validConfirmation.raw)?.status, 'received');

      confirmationDraft = await readReceipt(receiptIds[2]);
      assert.equal(confirmationDraft.length, 1);
      assertOwnedDraft(confirmationDraft[0], receiptIds[2], runIds[2]);
      assert.equal(await countItems(receiptIds[2]), 0, 'tx=rollback left normalized item rows behind.');
      const confirmationMoves = await exactCount(
        `/rest/v1/inventory_moves?select=id&source_receipt_id=eq.${encodeURIComponent(receiptIds[2])}`,
        'Confirmation rollback inventory moves'
      );
      assert.equal(confirmationMoves, 0);
      validConfirmationRollbackPassed = true;
    }
  } finally {
    const cleanupErrors = [];
    for (const index of [0, 1, 2]) {
      try {
        await removeOnlyOwnedDraft(index);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length) {
      throw new AggregateError(cleanupErrors, 'One or more exact synthetic drafts could not be cleaned by the normal RPC.');
    }
  }

  const remainingItems = await Promise.all(receiptIds.map((id) => countItems(id)));
  assert.deepEqual(remainingItems, [0, 0, 0]);
  const remainingReceipts = await Promise.all(receiptIds.map((id) => readReceipt(id)));
  assert.deepEqual(remainingReceipts.map((rows) => rows.length), [0, 0, 0]);
  process.stdout.write(JSON.stringify({
    projectRef,
    schema: 'public',
    authenticatedAdministrator: true,
    runIds,
    receiptIds,
    sameRunItemWrites: 'passed',
    anonymousWriteDenied: true,
    crossRunReparentRejected: true,
    rejectedBatchRolledBack: true,
    concurrentSameRunAndCrossRunWrites: 'passed',
    confirmationPathExecutedUnderConfirmedTxRollback: validConfirmationRollbackPassed,
    confirmationRollbackSupported,
    invalidConfirmationRolledBack: invalidConfirmationRollbackPassed,
    validConfirmationRolledBackByPostgREST: validConfirmationRollbackPassed,
    confirmationProbeStatus: validConfirmationRollbackPassed ? 'passed' : 'blocked-postgrest-rollback-preference-unavailable',
    draftReceiptsCleanedByNormalRpc: true,
    receiptRowsAfterCleanup: [0, 0, 0],
    itemRowsAfterCleanup: remainingItems,
    inventoryMovementsCreated: 0,
    catalogRowsCreated: 0,
    receiptIndexesAssigned: false,
    notificationsRequested: false,
    sefazContacted: false,
  }, null, 2) + '\n');
  if (!validConfirmationRollbackPassed) process.exitCode = 2;
}

run().catch((error) => {
  process.stderr.write(`${error?.message || 'Remote goods-receipt item guard proof failed.'}\n`);
  process.stderr.write(`runIds=${runIds.join(',')} receiptIds=${receiptIds.join(',')}\n`);
  process.exitCode = 1;
});
