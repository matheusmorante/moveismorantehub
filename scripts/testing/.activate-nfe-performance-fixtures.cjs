'use strict';

const { createClient } = require('@supabase/supabase-js');

const expectedHost = 'hkoxhourxwlddgsfdgws.supabase.co';
const fixtures = [
  { id: '30f6f630-105c-42fe-9851-d4f4830bf268', itemCount: 1 },
  { id: '7fd6dc22-95fc-4583-bbf2-d6cd023deda0', itemCount: 5 },
  { id: '6e9d4eb8-4de1-47c1-bffe-8726a45477c3', itemCount: 10 },
  { id: 'f8f07225-7816-4d7b-80f7-2cb6eb246240', itemCount: 20 },
];

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.MORANTE_ENV_SOURCE !== 'vercel-development') throw new Error('ENVIRONMENT_SOURCE_MISMATCH');
  if (!url || new URL(url).hostname !== expectedHost) throw new Error('SUPABASE_DEVELOPMENT_PROJECT_MISMATCH');
  if (!secret) throw new Error('SUPABASE_SECRET_MISSING');
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: orders, error: readError } = await db
    .from('orders')
    .select('id,status,deleted,order_index,order_data,order_type,customer_id,customer_name,seller_id,seller_name,total_amount,scheduled_date,scheduled_start_time,scheduled_end_time,delivery_method,delivery_status,marketing_origin,items_subtotal,total_discount,total_cost,stock_processed,is_stock_checked,is_registered_in_bling,deleted_at')
    .in('id', fixtures.map((fixture) => fixture.id));
  if (readError || orders?.length !== fixtures.length) throw new Error('FIXTURE_READBACK_FAILED');

  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const updates = [];
  for (const row of orders) {
    const fixture = fixtureById.get(row.id);
    const expectedRunId = `TEST_AUT_${row.id}`;
    if (
      row.status !== 'draft' || row.deleted !== false ||
      row.order_data?.testRunId !== row.id ||
      row.order_data?.test_run_id !== expectedRunId ||
      row.order_data?.is_test !== true ||
      row.order_data?.test_environment !== 'homologation' ||
      row.order_data?.items?.length !== fixture.itemCount ||
      row.order_data.items.some((item) => !item.productId || !item.variationId)
    ) {
      throw new Error('FIXTURE_OWNERSHIP_OR_SHAPE_MISMATCH');
    }
    const items = row.order_data.items.map((item) => ({ ...item, isTemporaryProduct: true }));
    const orderData = {
      ...row.order_data,
      status: 'scheduled',
      items,
      stockProcessed: false,
      isStockChecked: false,
    };
    const payload = {
      order_data: orderData,
      items,
      order_number: String(row.order_index),
      order_index: row.order_index,
      order_type: row.order_type || 'sale',
      status: 'scheduled',
      customer_id: row.customer_id,
      customer_name: row.customer_name,
      seller_id: row.seller_id,
      seller_name: row.seller_name,
      total_amount: row.total_amount,
      scheduled_date: row.scheduled_date,
      scheduled_start_time: row.scheduled_start_time,
      scheduled_end_time: row.scheduled_end_time,
      delivery_method: row.delivery_method,
      delivery_status: row.delivery_status,
      marketing_origin: row.marketing_origin,
      items_subtotal: row.items_subtotal,
      total_discount: row.total_discount,
      total_cost: row.total_cost,
      stock_processed: false,
      is_stock_checked: false,
      is_registered_in_bling: row.is_registered_in_bling,
      deleted: false,
      deleted_at: row.deleted_at,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await db.rpc('create_order_with_inventory_transaction', {
      p_order_id: row.id,
      p_order_payload: payload,
      p_items: items,
      p_payments: [],
      p_is_update: true,
    });
    if (error || data?.id !== row.id || data?.status !== 'scheduled') {
      throw new Error('ATOMIC_ORDER_UPDATE_FAILED');
    }
    updates.push({ id: row.id, itemCount: fixture.itemCount });
  }

  const ids = fixtures.map((fixture) => fixture.id);
  const { count: movementCount, error: movementError } = await db
    .from('inventory_moves')
    .select('id', { count: 'exact', head: true })
    .in('order_id', ids);
  const { count: paymentCount, error: paymentError } = await db
    .from('order_payments')
    .select('order_id', { count: 'exact', head: true })
    .in('order_id', ids);
  if (movementError || movementCount !== 0 || paymentError || paymentCount !== 0) {
    throw new Error('UNEXPECTED_STOCK_OR_PAYMENT_EFFECT');
  }

  for (const fixture of fixtures) {
    const { data: row, error } = await db
      .from('orders')
      .select('id,status,deleted,order_data')
      .eq('id', fixture.id)
      .single();
    if (error || row.status !== 'scheduled' || row.deleted !== false ||
        row.order_data?.items?.length !== fixture.itemCount ||
        row.order_data.items.some((item) => item.isTemporaryProduct !== true)) {
      throw new Error('SCHEDULED_FIXTURE_VERIFICATION_FAILED');
    }
    const { data: excluded, error: exclusionError } = await db.rpc('is_nfe_hml_test_order', {
      p_id: row.id, p_status: row.status, p_deleted: row.deleted, p_data: row.order_data,
    });
    if (exclusionError || excluded !== true) throw new Error('DASHBOARD_EXCLUSION_FAILED');
  }

  for (const fixture of fixtures) {
    process.stdout.write(JSON.stringify({ itemCount: fixture.itemCount, orderId: fixture.id, testRunId: `TEST_AUT_${fixture.id}` }) + '\n');
  }
  process.stdout.write('status=scheduled\nallItemsTemporary=true\ndashboardExcluded=true\ninventoryMoves=0\npayments=0\n');
}

main().catch((error) => {
  process.stderr.write(`fixtureActivation=FAILED code=${error?.message || 'UNKNOWN'}\n`);
  process.exitCode = 1;
});
