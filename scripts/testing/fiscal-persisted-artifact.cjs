'use strict';

// Read-only resolver for a previously persisted fiscal E2E order.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function assertUuid(value, name) {
  if (typeof value !== 'string' || !UUID.test(value)) fail('INVALID_' + name.toUpperCase());
  return value.toLowerCase();
}

function assertScenarioKey(value, name) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9_-]{2,63}$/i.test(value)) {
    fail('INVALID_' + name.toUpperCase());
  }
  const scenarioKey = value.trim().toLowerCase();
  if (!['nfe55_sale', 'nfe55_delivery_own_transport', 'nfce65_pickup', 'nfce65_delivery'].includes(scenarioKey)) {
    fail('UNSUPPORTED_FISCAL_SCENARIO');
  }
  return scenarioKey;
}

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function canonicalIdentity(value, expected, name) {
  const metadata = object(value);
  if (metadata.is_test !== true || metadata.runId !== expected.runId || metadata.ownerId !== expected.ownerId) {
    fail('TEST_ARTIFACT_' + name.toUpperCase() + '_IDENTITY_MISMATCH');
  }
}

async function verifyAuthenticatedOperator(client, expectedEmail) {
  if (!client || !client.auth || typeof client.auth.getUser !== 'function' || typeof client.rpc !== 'function') {
    fail('AUTHENTICATED_CLIENT_REQUIRED');
  }

  const { data: authData, error: authError } = await client.auth.getUser();
  const user = authData && authData.user;
  if (authError || !user || typeof user.id !== 'string' || !UUID.test(user.id)) {
    fail('AUTHENTICATED_OPERATOR_REQUIRED');
  }

  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
  const configuredEmail = typeof expectedEmail === 'string' ? expectedEmail.trim().toLowerCase() : '';
  if (!configuredEmail || !email || email !== configuredEmail) fail('CONFIGURED_OPERATOR_IDENTITY_MISMATCH');

  const { data: isAdministrator, error: authorizationError } = await client.rpc('is_administrator');
  if (authorizationError || isAdministrator !== true) fail('FISCAL_OPERATOR_PERMISSION_REQUIRED');

  return { ownerId: user.id.toLowerCase(), email };
}

async function readArtifactIdentity(client, table, row, expected, label) {
  const { data, error } = await client.rpc('test_artifact_row_data', {
    p_table: table,
    p_row: row,
  });
  if (error || !data || typeof data !== 'object') fail('TEST_ARTIFACT_METADATA_UNAVAILABLE');
  canonicalIdentity(data, expected, label);
}

async function readSingle(client, table, columns, id, missingCode) {
  const { data, error } = await client.from(table).select(columns).eq('id', id).maybeSingle();
  if (error) fail('TEST_ARTIFACT_READ_FAILED');
  if (!data) fail(missingCode);
  return data;
}

async function readMany(client, table, columns, ids) {
  if (!ids.length) return [];
  const { data, error } = await client.from(table).select(columns).in('id', ids);
  if (error || !Array.isArray(data)) fail('TEST_ARTIFACT_READ_FAILED');
  return data;
}

async function assertNoFiscalAttempt(client, orderId) {
  const [documents, snapshots] = await Promise.all([
    client.from('nfe_documents').select('id,order_id,modelo,ambiente,status').eq('order_id', orderId),
    client.from('nfe_fiscal_snapshots')
      .select('id,order_id,requested_model,environment,emission_request_id').eq('order_id', orderId),
  ]);
  if (documents.error || snapshots.error || !Array.isArray(documents.data) || !Array.isArray(snapshots.data)) {
    fail('FISCAL_ATTEMPT_STATE_UNVERIFIED');
  }
  if (documents.data.length || snapshots.data.length) fail('FISCAL_ATTEMPT_EXISTS_OR_UNCERTAIN');
}

async function assertProductComponents(client, product, expected, visited = new Set()) {
  const productId = product.id.toLowerCase();
  if (visited.has(productId) || visited.size >= 32) fail('TEST_ARTIFACT_COMPONENT_CYCLE');
  visited.add(productId);
  const components = product.combo_items == null ? [] : product.combo_items;
  if (!Array.isArray(components)) fail('TEST_ARTIFACT_COMPONENTS_INVALID');
  for (const entry of components) {
    const component = object(entry);
    const childProductId = assertUuid(component.productId, 'component_product_id');
    const childVariationId = assertUuid(component.variationId, 'component_variation_id');
    const childProduct = await readSingle(
      client,
      'products',
      'id,technical_specs,combo_items,deleted',
      childProductId,
      'TEST_ARTIFACT_COMPONENT_REQUIRED',
    );
    if (childProduct.deleted === true) fail('TEST_ARTIFACT_COMPONENT_INVALID');
    canonicalIdentity(object(childProduct.technical_specs).testArtifact, expected, 'COMPONENT');
    await readArtifactIdentity(client, 'products', childProduct, expected, 'COMPONENT');
    const childVariation = await readSingle(
      client,
      'product_variations',
      'id,product_id',
      childVariationId,
      'TEST_ARTIFACT_COMPONENT_VARIATION_REQUIRED',
    );
    if (typeof childVariation.product_id !== 'string' ||
        childVariation.product_id.toLowerCase() !== childProductId) {
      fail('TEST_ARTIFACT_VARIATION_PRODUCT_MISMATCH');
    }
    await readArtifactIdentity(client, 'product_variations', childVariation, expected, 'COMPONENT_VARIATION');
    await assertProductComponents(client, childProduct, expected, visited);
  }
  visited.delete(productId);
}

async function loadPersistedFiscalOrder(client, { orderId, runId, scenarioKey, expectedEmail }) {
  const normalizedOrderId = assertUuid(orderId, 'order_id');
  const normalizedRunId = assertUuid(runId, 'run_id');
  const normalizedScenarioKey = assertScenarioKey(scenarioKey, 'scenario_key');
  const operator = await verifyAuthenticatedOperator(client, expectedEmail);
  const expected = { runId: normalizedRunId, ownerId: operator.ownerId };

  const order = await readSingle(
    client,
    'orders',
    'id,order_data,order_type,status,deleted,customer_id,delivery_method,order_index,order_number,items,order_items(id,order_id,product_id,variation_id,is_temporary_product),order_payments(order_id,payment_method,amount)',
    normalizedOrderId,
    'PERSISTED_TEST_ORDER_REQUIRED',
  );
  const orderData = object(order.order_data);
  if (order.id.toLowerCase() !== normalizedOrderId || order.deleted !== false || order.order_type !== 'sale') {
    fail('PERSISTED_TEST_SALE_REQUIRED');
  }
  if (!['scheduled', 'fulfilled'].includes(order.status)) fail('PERSISTED_TEST_ORDER_STATE_INVALID');
  if (orderData.is_test !== true) fail('PERSISTED_TEST_ORDER_REQUIRED');
  canonicalIdentity(orderData.testArtifact, expected, 'ORDER');
  if (object(orderData.testArtifact).scenarioKey !== normalizedScenarioKey) {
    fail('TEST_ARTIFACT_ORDER_SCENARIO_MISMATCH');
  }
  const deliveryMethod = object(orderData.shipping).deliveryMethod;
  const freightMode = object(orderData.shipping).freightMode;
  if (!['delivery', 'pickup'].includes(deliveryMethod) || order.delivery_method !== deliveryMethod) {
    fail('TEST_ARTIFACT_DELIVERY_METHOD_MISMATCH');
  }
  if (
    (normalizedScenarioKey === 'nfce65_pickup' && deliveryMethod !== 'pickup') ||
    (normalizedScenarioKey === 'nfce65_delivery' && deliveryMethod !== 'delivery') ||
    (normalizedScenarioKey === 'nfe55_delivery_own_transport' &&
      (deliveryMethod !== 'delivery' || String(freightMode) !== '3'))
  ) {
    fail('TEST_ARTIFACT_SCENARIO_DELIVERY_MISMATCH');
  }
  await readArtifactIdentity(client, 'orders', order, expected, 'ORDER');

  const customerId = assertUuid(object(orderData.customerData).id, 'customer_id');
  if (typeof order.customer_id !== 'string' || order.customer_id.toLowerCase() !== customerId) {
    fail('TEST_ARTIFACT_CUSTOMER_LINK_MISMATCH');
  }
  const customer = await readSingle(
    client,
    'people',
    'id,full_address,deleted',
    customerId,
    'TEST_ARTIFACT_CUSTOMER_REQUIRED',
  );
  if (customer.deleted === true || customer.id.toLowerCase() !== customerId) fail('TEST_ARTIFACT_CUSTOMER_INVALID');
  canonicalIdentity(object(customer.full_address).testArtifact, expected, 'CUSTOMER');
  await readArtifactIdentity(client, 'people', customer, expected, 'CUSTOMER');
  const customerSearchLabel = typeof object(orderData.customerData).fullName === 'string'
    ? object(orderData.customerData).fullName.trim() : '';
  if (customerSearchLabel.length < 3) fail('TEST_ARTIFACT_CUSTOMER_LABEL_REQUIRED');

  const items = orderData.items;
  if (!Array.isArray(items) || !items.length) fail('TEST_ARTIFACT_ITEMS_REQUIRED');
  const itemRefs = items.map((item) => {
    const value = object(item);
    if (value.isTemporaryProduct === true || value.itemType === 'service') fail('TEST_ARTIFACT_REGISTERED_GOODS_REQUIRED');
    return {
      productId: assertUuid(value.productId, 'product_id'),
      variationId: assertUuid(value.variationId, 'variation_id'),
    };
  });
  if (!Array.isArray(order.items) || order.items.length !== items.length) {
    fail('TEST_ARTIFACT_ORDER_JSON_ITEMS_UNVERIFIED');
  }
  const normalizedItemRefs = order.items.map((item) => {
    const value = object(item);
    if (value.isTemporaryProduct === true || value.itemType === 'service') {
      fail('TEST_ARTIFACT_REGISTERED_GOODS_REQUIRED');
    }
    return {
      productId: assertUuid(value.productId, 'order_json_product_id'),
      variationId: assertUuid(value.variationId, 'order_json_variation_id'),
    };
  });
  const itemKey = (item) => item.productId + ':' + item.variationId;
  const expectedItemKeys = itemRefs.map(itemKey).sort();
  const jsonItemKeys = normalizedItemRefs.map(itemKey).sort();
  if (expectedItemKeys.some((key, index) => key !== jsonItemKeys[index])) {
    fail('TEST_ARTIFACT_ORDER_JSON_ITEMS_MISMATCH');
  }
  const persistedItems = order.order_items;
  if (!Array.isArray(persistedItems) || persistedItems.length !== itemRefs.length) {
    fail('TEST_ARTIFACT_ORDER_ITEMS_UNVERIFIED');
  }
  const persistedItemKeys = persistedItems.map((item) => {
    const value = object(item);
    if (typeof value.order_id !== 'string' || value.order_id.toLowerCase() !== normalizedOrderId) {
      fail('TEST_ARTIFACT_ORDER_ITEM_LINK_MISMATCH');
    }
    if (value.is_temporary_product === true) fail('TEST_ARTIFACT_REGISTERED_GOODS_REQUIRED');
    return assertUuid(value.product_id, 'order_item_product_id') + ':'
      + assertUuid(value.variation_id, 'order_item_variation_id');
  }).sort();
  if (expectedItemKeys.some((key, index) => key !== persistedItemKeys[index])) {
    fail('TEST_ARTIFACT_ORDER_ITEMS_MISMATCH');
  }
  const productIds = [...new Set(itemRefs.map((item) => item.productId))];
  const variationIds = [...new Set(itemRefs.map((item) => item.variationId))];
  const [products, variations] = await Promise.all([
    readMany(client, 'products', 'id,technical_specs,combo_items,deleted', productIds),
    readMany(client, 'product_variations', 'id,product_id', variationIds),
  ]);
  const productById = new Map(products.map((product) => [product.id.toLowerCase(), product]));
  const variationById = new Map(variations.map((variation) => [variation.id.toLowerCase(), variation]));
  if (productById.size !== productIds.length || variationById.size !== variationIds.length) {
    fail('TEST_ARTIFACT_PRODUCT_LINK_REQUIRED');
  }

  for (const product of products) {
    if (product.deleted === true) fail('TEST_ARTIFACT_PRODUCT_INVALID');
    canonicalIdentity(object(product.technical_specs).testArtifact, expected, 'PRODUCT');
    await readArtifactIdentity(client, 'products', product, expected, 'PRODUCT');
  }
  for (const variation of variations) {
    await readArtifactIdentity(client, 'product_variations', variation, expected, 'VARIATION');
  }
  for (const item of itemRefs) {
    const variation = variationById.get(item.variationId);
    if (!variation || typeof variation.product_id !== 'string' ||
        variation.product_id.toLowerCase() !== item.productId) {
      fail('TEST_ARTIFACT_VARIATION_PRODUCT_MISMATCH');
    }
  }
  for (const product of products) await assertProductComponents(client, product, expected);

  const payments = orderData.payments;
  if (!Array.isArray(payments) || !payments.length || payments.some((payment) => {
    const value = object(payment);
    return typeof value.method !== 'string' || !value.method.trim()
      || !Number.isFinite(Number(value.amount)) || Number(value.amount) <= 0;
  })) fail('TEST_ARTIFACT_PAYMENTS_INVALID');
  const persistedPayments = order.order_payments;
  if (!Array.isArray(persistedPayments) || persistedPayments.length !== payments.length) {
    fail('TEST_ARTIFACT_ORDER_PAYMENTS_UNVERIFIED');
  }
  const paymentKey = (method, amount) => method.trim().toLowerCase() + ':' + Number(amount).toFixed(2);
  const expectedPaymentKeys = payments.map((payment) => {
    const value = object(payment);
    return paymentKey(value.method, value.amount);
  }).sort();
  const persistedPaymentKeys = persistedPayments.map((payment) => {
    const value = object(payment);
    if (typeof value.order_id !== 'string' || value.order_id.toLowerCase() !== normalizedOrderId) {
      fail('TEST_ARTIFACT_ORDER_PAYMENT_LINK_MISMATCH');
    }
    if (typeof value.payment_method !== 'string' || !Number.isFinite(Number(value.amount))) {
      fail('TEST_ARTIFACT_ORDER_PAYMENTS_INVALID');
    }
    return paymentKey(value.payment_method, value.amount);
  }).sort();
  if (expectedPaymentKeys.some((key, index) => key !== persistedPaymentKeys[index])) {
    fail('TEST_ARTIFACT_ORDER_PAYMENTS_MISMATCH');
  }

  await assertNoFiscalAttempt(client, normalizedOrderId);

  return {
    id: normalizedOrderId,
    runId: normalizedRunId,
    scenarioKey: normalizedScenarioKey,
    ownerId: operator.ownerId,
    freightMode: freightMode == null ? null : String(freightMode),
    customerSearchLabel,
    status: order.status,
    deliveryMethod,
    customerId,
    productIds,
    variationIds,
    itemCount: itemRefs.length,
    paymentCount: payments.length,
    environment: 2,
  };
}

module.exports = {
  assertUuid,
  loadPersistedFiscalOrder,
  verifyAuthenticatedOperator,
};
