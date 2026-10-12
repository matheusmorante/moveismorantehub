'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPersistedFiscalOrder } = require('./fiscal-persisted-artifact.cjs');
const orderId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '550e8400-e29b-41d4-a716-446655440001';
const ownerId = '550e8400-e29b-41d4-a716-446655440002';
const row = { id: orderId, customer_id: orderId, seller_id: ownerId, order_data: { is_test: true, customerData: { id: orderId }, testArtifact: { runId, ownerId } } };
function client(data) { return { from(table) { assert.equal(table, 'orders'); return { select() { return { eq(field, value) { assert.equal(field, 'id'); assert.equal(value, orderId); return { async maybeSingle() { return { data, error: null }; } }; } }; } }; } }; } }
test('accepts only persisted owned and linked test orders', async () => {
  assert.equal((await loadPersistedFiscalOrder(client(row), { orderId, runId, ownerId })).id, orderId);
  await assert.rejects(loadPersistedFiscalOrder(client({ ...row, order_data: { ...row.order_data, testArtifact: { runId, ownerId: orderId } } }), { orderId, runId, ownerId }), /OWNERSHIP/);
  await assert.rejects(loadPersistedFiscalOrder(client(null), { orderId, runId, ownerId }), /PERSISTED/);
  await assert.rejects(loadPersistedFiscalOrder(client({ ...row, order_data: { ...row.order_data, is_test: false } }), { orderId, runId, ownerId }), /PERSISTED/);
  await assert.rejects(loadPersistedFiscalOrder(client(row), { orderId: 'invalid', runId, ownerId }), /INVALID_ORDER_ID/);
});
