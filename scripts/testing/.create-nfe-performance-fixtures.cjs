'use strict';

const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const expectedHost = 'hkoxhourxwlddgsfdgws.supabase.co';
const expectedProductIds = [
  '801bfea0-2377-4379-9d85-e2688fd895c9',
  'c62f36cf-5c38-45ac-9493-c8d82d34535c',
  '39abf0b6-7fc9-4b2c-a0ea-dc1fd7b18970',
  'd55a4cba-8b93-4c55-a4bb-bba0a32c462f',
  '55f5e306-db2e-4085-9ab7-1e3652a70c27',
];
const scenarios = [1, 5, 10, 20];
const created = [];

function requireDevelopmentEnvironment() {
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.MORANTE_ENV_SOURCE !== 'vercel-development') {
    throw new Error('ENVIRONMENT_SOURCE_MISMATCH');
  }
  if (!rawUrl || new URL(rawUrl).hostname !== expectedHost) {
    throw new Error('SUPABASE_DEVELOPMENT_PROJECT_MISMATCH');
  }
  if (!secret) throw new Error('SUPABASE_SECRET_MISSING');
  return { url: rawUrl, secret };
}

function makeCpf() {
  const base = Array.from({ length: 9 }, () => crypto.randomInt(0, 10));
  const digit = (values, start) => {
    const sum = values.reduce((total, value, index) => total + value * (start - index), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  base.push(digit(base, 10));
  base.push(digit(base, 11));
  const cpf = base.join('');
  return /^(\d)\1{10}$/.test(cpf) ? makeCpf() : cpf;
}

async function requireAvailableOrderIndex(db) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const value = crypto.randomInt(800000, 1000000);
    const { data, error } = await db.from('orders').select('id').eq('order_index', value).maybeSingle();
    if (error) throw new Error('ORDER_INDEX_LOOKUP_FAILED');
    if (!data) return value;
  }
  throw new Error('ORDER_INDEX_RANGE_FULL');
}

async function assertPersistedAndExcluded(db, fixture) {
  const { data, error } = await db
    .from('orders')
    .select('id,status,deleted,order_index,order_data')
    .eq('id', fixture.id)
    .single();
  if (error || !data) throw new Error('FIXTURE_READBACK_FAILED');
  if (
    data.status !== 'draft' ||
    data.deleted !== false ||
    data.order_index !== fixture.orderIndex ||
    data.order_data?.testRunId !== fixture.id ||
    data.order_data?.test_run_id !== `TEST_AUT_${fixture.id}` ||
    data.order_data?.is_test !== true ||
    data.order_data?.test_environment !== 'homologation' ||
    data.order_data?.items?.length !== fixture.items.length
  ) {
    throw new Error('FIXTURE_MARKERS_MISMATCH');
  }
  const { data: excluded, error: exclusionError } = await db.rpc('is_nfe_hml_test_order', {
    p_id: data.id,
    p_status: data.status,
    p_deleted: data.deleted,
    p_data: data.order_data,
  });
  if (exclusionError || excluded !== true) throw new Error('DASHBOARD_EXCLUSION_FAILED');
  return data;
}

async function main() {
  const { url, secret } = requireDevelopmentEnvironment();
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: products, error: productError } = await db
    .from('products')
    .select('id,name,code,status,active,deleted,unit_price,price,cost_price,fiscal,stock')
    .in('id', expectedProductIds);
  if (productError || products?.length !== expectedProductIds.length) {
    throw new Error('TEST_PRODUCT_FIXTURES_NOT_AVAILABLE');
  }
  if (
    products.some(
      (product) =>
        !product.name?.includes('[HML NF TEST]') ||
        product.status !== 'hidden' ||
        product.active !== true ||
        product.deleted === true ||
        !product.fiscal?.ncm
    )
  ) {
    throw new Error('UNSAFE_PRODUCT_FIXTURE');
  }

  const { data: variations, error: variationError } = await db
    .from('product_variations')
    .select('id,product_id')
    .in('product_id', expectedProductIds);
  if (variationError) throw new Error('TEST_PRODUCT_VARIATIONS_UNAVAILABLE');
  const variationsByProduct = new Map();
  for (const variation of variations || []) {
    const list = variationsByProduct.get(variation.product_id) || [];
    list.push(variation);
    variationsByProduct.set(variation.product_id, list);
  }
  if (expectedProductIds.some((id) => !variationsByProduct.get(id)?.length)) {
    throw new Error('TEST_PRODUCT_VARIATION_MISSING');
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  for (const itemCount of scenarios) {
    const id = crypto.randomUUID();
    const testRunId = `TEST_AUT_${id}`;
    const orderIndex = await requireAvailableOrderIndex(db);
    const date = new Date();
    const now = date.toISOString();
    const scheduledDate = now.slice(0, 10);
    const address = {
      cep: '80000000',
      zipCode: '80000000',
      street: 'Rua Teste de Performance',
      number: '9999',
      neighborhood: 'Teste',
      city: 'Curitiba',
      state: 'PR',
      complement: '',
      observation: testRunId,
    };
    const customerData = {
      personType: 'PF',
      fullName: `${testRunId} CLIENTE DE TESTE`,
      cpfCnpj: makeCpf(),
      phone: '',
      noPhone: true,
      noAddress: false,
      fullAddress: address,
    };
    const items = Array.from({ length: itemCount }, (_, index) => {
      const product = productById.get(expectedProductIds[index % expectedProductIds.length]);
      const unitPrice = Number(product.unit_price ?? product.price ?? 1);
      return {
        productId: product.id,
        isTemporaryProduct: false,
        orderItemId: crypto.randomUUID(),
        variationId: variationsByProduct.get(product.id)[0].id,
        itemType: 'product',
        description: `${testRunId} ITEM ${index + 1}`,
        quantity: 1,
        unitPrice,
        unitDiscount: 0,
        unitCost: Number(product.cost_price || 0),
        fiscal: {
          ncm: product.fiscal.ncm,
          cest: product.fiscal.cest || '',
          cfop: '5102',
          origem: product.fiscal.origem || product.fiscal.origin || '0',
          csosn: product.fiscal.csosn || '103',
        },
      };
    });
    const total = items.reduce((sum, item) => sum + item.unitPrice, 0);
    const order = {
      id,
      orderNumber: String(orderIndex),
      orderIndex,
      orderType: 'sale',
      status: 'draft',
      deleted: false,
      deletedAt: null,
      date: now,
      observation: testRunId,
      testRunId: id,
      test_run_id: testRunId,
      is_test: true,
      test_environment: 'homologation',
      testPurpose: 'nfe-modal-performance-readiness',
      items,
      payments: [],
      customerData,
      shipping: {
        deliveryMethod: 'delivery',
        useCustomerAddress: true,
        value: 0,
        scheduling: { date: scheduledDate, startTime: '09:00', endTime: '11:00' },
        deliveryAddress: address,
      },
      itemsSummary: { itemsSubtotal: total, totalFixedDiscount: 0, totalItemsCost: 0 },
      paymentsSummary: { totalOrderValue: total, totalPaid: 0, remainingAmount: total },
      seller: 'TEST_AUT PERFORMANCE',
      stockProcessed: false,
      isStockChecked: false,
      isRegisteredInBling: false,
    };
    const payload = {
      order_data: order,
      items,
      order_number: String(orderIndex),
      order_index: orderIndex,
      order_type: 'sale',
      status: 'draft',
      customer_id: null,
      customer_name: customerData.fullName,
      seller_id: null,
      seller_name: order.seller,
      total_amount: total,
      scheduled_date: scheduledDate,
      scheduled_start_time: '09:00',
      scheduled_end_time: '11:00',
      delivery_method: 'delivery',
      delivery_status: null,
      marketing_origin: 'organic',
      items_subtotal: total,
      total_discount: 0,
      total_cost: 0,
      stock_processed: false,
      is_stock_checked: false,
      is_registered_in_bling: false,
      deleted: false,
      deleted_at: null,
      updated_at: now,
    };

    const { data: excludedBeforeWrite, error: ruleError } = await db.rpc('is_nfe_hml_test_order', {
      p_id: id,
      p_status: 'draft',
      p_deleted: false,
      p_data: order,
    });
    if (ruleError || excludedBeforeWrite !== true) throw new Error('DASHBOARD_RULE_PRECHECK_FAILED');

    const { data: result, error } = await db.rpc('create_order_with_inventory_transaction', {
      p_order_id: id,
      p_order_payload: payload,
      p_items: items,
      p_payments: [],
    });
    if (error) {
      const { data: existing } = await db.from('orders').select('id').eq('id', id).maybeSingle();
      if (!existing) throw new Error('ORDER_CREATION_RPC_FAILED');
    } else if (result?.id !== id || Number(result?.order_index) !== orderIndex) {
      throw new Error('ORDER_CREATION_NOT_CONFIRMED');
    }

    const fixture = { id, orderIndex, items };
    await assertPersistedAndExcluded(db, fixture);
    created.push({ itemCount, id, testRunId, orderIndex });
  }

  const ids = created.map((fixture) => fixture.id);
  const { count: movementCount, error: movementError } = await db
    .from('inventory_moves')
    .select('id', { count: 'exact', head: true })
    .in('order_id', ids);
  if (movementError || movementCount !== 0) throw new Error('UNEXPECTED_INVENTORY_MOVEMENT');

  for (const fixture of created) {
    process.stdout.write(
      JSON.stringify({ itemCount: fixture.itemCount, orderId: fixture.id, testRunId: fixture.testRunId, orderIndex: fixture.orderIndex }) + '\n'
    );
  }
  process.stdout.write('fixtureCount=4\nstatus=draft\ndashboardExcluded=true\ninventoryMoves=0\npayments=0\n');
}

main().catch((error) => {
  process.stderr.write(`fixtureCreation=FAILED code=${error?.message || 'UNKNOWN'}\n`);
  for (const fixture of created) {
    process.stderr.write(
      JSON.stringify({ itemCount: fixture.itemCount, orderId: fixture.id, testRunId: fixture.testRunId }) + '\n'
    );
  }
  process.exitCode = 1;
});
