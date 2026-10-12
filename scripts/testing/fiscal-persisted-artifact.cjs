'use strict';

// Read-only E2E artifact resolver. Never creates or repairs test data.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value, name) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error(`INVALID_${name.toUpperCase()}`);
}

async function loadPersistedFiscalOrder(client, { orderId, runId, ownerId }) {
  assertUuid(orderId, 'order_id');
  assertUuid(runId, 'run_id');
  assertUuid(ownerId, 'owner_id');
  if (!client || typeof client.from !== 'function') throw new Error('AUTHENTICATED_CLIENT_REQUIRED');
  const { data, error } = await client.from('orders')
    .select('id, order_data, customer_id, seller_id, order_type, status')
    .eq('id', orderId).maybeSingle();
  if (error) throw error;
  if (!data || !data.order_data || data.order_data.is_test !== true) throw new Error('PERSISTED_TEST_ORDER_REQUIRED');
  // Identity can be stored in existing JSON metadata; never trust labels or IDs alone.
  const metadata = data.order_data.testArtifact || data.order_data.test_artifact || data.order_data.testMetadata;
  if (!metadata || metadata.runId !== runId || metadata.ownerId !== ownerId) {
    throw new Error('TEST_ARTIFACT_OWNERSHIP_UNVERIFIED');
  }
  if (data.order_data.customerData?.id !== data.customer_id || !data.seller_id) {
    throw new Error('TEST_ARTIFACT_LINKS_UNVERIFIED');
  }
  return data;
}

module.exports = { loadPersistedFiscalOrder };
