'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPersistedFiscalOrder } = require('./fiscal-persisted-artifact.cjs');

const runId = '550e8400-e29b-41d4-a716-446655440001';
const ownerId = '550e8400-e29b-41d4-a716-446655440002';
const orderId = '550e8400-e29b-41d4-a716-446655440003';
const customerId = '550e8400-e29b-41d4-a716-446655440004';
const productId = '550e8400-e29b-41d4-a716-446655440005';
const variationId = '550e8400-e29b-41d4-a716-446655440006';
const componentProductId = '550e8400-e29b-41d4-a716-446655440007';
const componentVariationId = '550e8400-e29b-41d4-a716-446655440008';
const operatorEmail = 'fiscal.operator@example.test';
const metadata = { is_test: true, runId, ownerId };

function fixture() {
  return {
    orders: [{
      id: orderId,
      order_type: 'sale',
      status: 'scheduled',
      deleted: false,
      customer_id: customerId,
      order_index: 902001,
      order_number: '902001',
      items: [{ productId, variationId, itemType: 'product', quantity: 1 }],
      order_data: {
        is_test: true,
        testArtifact: metadata,
        orderIndex: 902001,
        customerData: { id: customerId, fullName: 'Destinatario HML' },
        items: [{ productId, variationId, itemType: 'product', quantity: 1 }],
        payments: [{ method: 'pix', amount: 25 }],
      },
      order_items: [{ id: '550e8400-e29b-41d4-a716-446655440009', order_id: orderId, product_id: productId, variation_id: variationId, is_temporary_product: false }],
      order_payments: [{ order_id: orderId, payment_method: 'pix', amount: 25 }],
    }],
    people: [{ id: customerId, deleted: false, address: { testArtifact: metadata } }],
    products: [{ id: productId, deleted: false, technical_specs: { testArtifact: metadata }, combo_items: [] }],
    variations: [{ id: variationId, product_id: productId, deleted: false }],
    documents: [],
    snapshots: [],
    authenticated: true,
    administrator: true,
  };
}

function makeClient(state = fixture()) {
  return {
    auth: {
      async getUser() {
        return state.authenticated
          ? { data: { user: { id: ownerId, email: operatorEmail } }, error: null }
          : { data: { user: null }, error: new Error('not signed in') };
      },
    },
    async rpc(name, args = {}) {
      if (name === 'is_administrator') return { data: state.administrator, error: null };
      if (name !== 'test_artifact_row_data') return { data: null, error: new Error('unexpected rpc') };
      const row = args.p_row;
      const table = args.p_table;
      let result;
      if (table === 'orders') result = row.order_data?.testArtifact;
      if (table === 'people') result = row.address?.testArtifact;
      if (table === 'products') result = row.technical_specs?.testArtifact;
      if (table === 'product_variations') {
        result = state.products.find((item) => item.id === row.product_id)?.technical_specs?.testArtifact;
      }
      return result ? { data: result, error: null } : { data: null, error: new Error('metadata missing') };
    },
    from(table) {
      let filters = [];
      const rows = () => {
        const source = ({
          orders: state.orders,
          people: state.people,
          products: state.products,
          product_variations: state.variations,
          nfe_documents: state.documents,
          nfe_fiscal_snapshots: state.snapshots,
        })[table] || [];
        return source.filter((row) => filters.every(({ operator, field, value }) =>
          operator === 'eq' ? row[field] === value : value.includes(row[field])));
      };
      const query = {
        select() { return query; },
        eq(field, value) { filters.push({ operator: 'eq', field, value }); return query; },
        in(field, value) { filters.push({ operator: 'in', field, value }); return query; },
        async maybeSingle() { return { data: rows()[0] || null, error: null }; },
        then(resolve, reject) { return Promise.resolve({ data: rows(), error: null }).then(resolve, reject); },
      };
      return query;
    },
  };
}

const input = () => ({ orderId, runId, expectedEmail: operatorEmail });

test('accepts a persisted, owned sale with same-run customer, product, variation and payments', async () => {
  const result = await loadPersistedFiscalOrder(makeClient(), input());
  assert.deepEqual(result, {
    id: orderId,
    runId,
    ownerId,
    orderIndex: '902001',
    customerSearchLabel: 'Destinatario HML',
    status: 'scheduled',
    customerId,
    productIds: [productId],
    variationIds: [variationId],
    itemCount: 1,
    paymentCount: 1,
    environment: 2,
  });
});

test('rejects missing authentication, wrong configured operator and insufficient permission', async () => {
  const unauthenticated = fixture();
  unauthenticated.authenticated = false;
  await assert.rejects(loadPersistedFiscalOrder(makeClient(unauthenticated), input()), /AUTHENTICATED_OPERATOR_REQUIRED/);
  await assert.rejects(loadPersistedFiscalOrder(makeClient(), { ...input(), expectedEmail: 'other@example.test' }), /CONFIGURED_OPERATOR_IDENTITY_MISMATCH/);
  const nonAdmin = fixture();
  nonAdmin.administrator = false;
  await assert.rejects(loadPersistedFiscalOrder(makeClient(nonAdmin), input()), /FISCAL_OPERATOR_PERMISSION_REQUIRED/);
});

test('rejects invalid IDs, absent records and is_test without canonical ownership metadata', async () => {
  await assert.rejects(loadPersistedFiscalOrder(makeClient(), { ...input(), orderId: 'TEST_AUT_' + orderId }), /INVALID_ORDER_ID/);
  const absent = fixture();
  absent.orders = [];
  await assert.rejects(loadPersistedFiscalOrder(makeClient(absent), input()), /PERSISTED_TEST_ORDER_REQUIRED/);
  const unowned = fixture();
  unowned.orders[0].order_data.testArtifact = undefined;
  await assert.rejects(loadPersistedFiscalOrder(makeClient(unowned), input()), /TEST_ARTIFACT_ORDER_IDENTITY_MISMATCH/);
});

test('rejects owner or run mismatches and cross-execution linked records', async () => {
  const wrongOwner = fixture();
  wrongOwner.orders[0].order_data.testArtifact = { ...metadata, ownerId: customerId };
  await assert.rejects(loadPersistedFiscalOrder(makeClient(wrongOwner), input()), /TEST_ARTIFACT_ORDER_IDENTITY_MISMATCH/);

  const wrongRun = fixture();
  wrongRun.products[0].technical_specs.testArtifact = { ...metadata, runId: customerId };
  await assert.rejects(loadPersistedFiscalOrder(makeClient(wrongRun), input()), /TEST_ARTIFACT_PRODUCT_IDENTITY_MISMATCH/);

  const wrongCustomer = fixture();
  wrongCustomer.people[0].address.testArtifact = { ...metadata, runId: customerId };
  await assert.rejects(loadPersistedFiscalOrder(makeClient(wrongCustomer), input()), /TEST_ARTIFACT_CUSTOMER_IDENTITY_MISMATCH/);

  const wrongCustomerLink = fixture();
  wrongCustomerLink.orders[0].customer_id = productId;
  await assert.rejects(loadPersistedFiscalOrder(makeClient(wrongCustomerLink), input()), /TEST_ARTIFACT_CUSTOMER_LINK_MISMATCH/);
});

test('rejects missing payment links, a variation from another product and invalid sale state', async () => {
  const noPayments = fixture();
  noPayments.orders[0].order_data.payments = [];
  await assert.rejects(loadPersistedFiscalOrder(makeClient(noPayments), input()), /TEST_ARTIFACT_PAYMENTS_INVALID/);

  const noNormalizedPayments = fixture();
  noNormalizedPayments.orders[0].order_payments = [];
  await assert.rejects(loadPersistedFiscalOrder(makeClient(noNormalizedPayments), input()), /TEST_ARTIFACT_ORDER_PAYMENTS_UNVERIFIED/);

  const mismatchedJsonItems = fixture();
  mismatchedJsonItems.orders[0].items = [];
  await assert.rejects(loadPersistedFiscalOrder(makeClient(mismatchedJsonItems), input()), /TEST_ARTIFACT_ORDER_JSON_ITEMS_UNVERIFIED/);

  const mismatchedVariation = fixture();
  mismatchedVariation.products.push({ id: customerId, deleted: false, technical_specs: { testArtifact: metadata }, combo_items: [] });
  mismatchedVariation.variations[0].product_id = customerId;
  await assert.rejects(loadPersistedFiscalOrder(makeClient(mismatchedVariation), input()), /TEST_ARTIFACT_VARIATION_PRODUCT_MISMATCH/);

  const cancelled = fixture();
  cancelled.orders[0].status = 'cancelled';
  await assert.rejects(loadPersistedFiscalOrder(makeClient(cancelled), input()), /PERSISTED_TEST_ORDER_STATE_INVALID/);
});

test('rejects product composition that links to a different execution', async () => {
  const crossRunComponent = fixture();
  crossRunComponent.products[0].combo_items = [{ productId: componentProductId, variationId: componentVariationId }];
  crossRunComponent.products.push({
    id: componentProductId,
    deleted: false,
    technical_specs: { testArtifact: { ...metadata, runId: customerId } },
    combo_items: [],
  });
  crossRunComponent.variations.push({ id: componentVariationId, product_id: componentProductId });
  await assert.rejects(
    loadPersistedFiscalOrder(makeClient(crossRunComponent), input()),
    /TEST_ARTIFACT_COMPONENT_IDENTITY_MISMATCH/,
  );
});

test('blocks documents, fiscal snapshots and unverifiable fiscal history', async () => {
  const withDocument = fixture();
  withDocument.documents.push({ id: 'doc', order_id: orderId, modelo: '55', ambiente: 2, status: 'homologada' });
  await assert.rejects(loadPersistedFiscalOrder(makeClient(withDocument), input()), /FISCAL_ATTEMPT_EXISTS_OR_UNCERTAIN/);

  const withSnapshot = fixture();
  withSnapshot.snapshots.push({ id: 'snapshot', order_id: orderId, requested_model: '65', environment: 2 });
  await assert.rejects(loadPersistedFiscalOrder(makeClient(withSnapshot), input()), /FISCAL_ATTEMPT_EXISTS_OR_UNCERTAIN/);
});
