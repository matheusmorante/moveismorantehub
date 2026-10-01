const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');

(async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE SCHEMA vault;
    CREATE TABLE vault.decrypted_secrets(name text, decrypted_secret text);
    INSERT INTO vault.decrypted_secrets VALUES ('delivery_summary_job_secret', 'test-secret');
    CREATE SCHEMA net;
    CREATE TABLE net.queue_stats(sent integer NOT NULL DEFAULT 0);
    INSERT INTO net.queue_stats VALUES (0);
    CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb)
      RETURNS bigint LANGUAGE plpgsql AS $$
      BEGIN UPDATE net.queue_stats SET sent = sent + 1; RETURN 1; END $$;
    CREATE TABLE public.dashboard_daily_metrics(
      metric_date date PRIMARY KEY, revenue numeric(14,2), orders integer, cost numeric(14,2),
      profit numeric(14,2), items_without_cost integer, updated_at timestamptz
    );
    CREATE TABLE public.orders(
      id text PRIMARY KEY, status text, order_type text, deleted boolean DEFAULT false,
      order_data jsonb NOT NULL DEFAULT '{}'::jsonb, total_amount numeric DEFAULT 0,
      created_at timestamptz DEFAULT now()
    );
    CREATE FUNCTION public.parse_order_metric_date(p_value text, p_created_at timestamptz)
      RETURNS date LANGUAGE sql IMMUTABLE AS $$
      SELECT COALESCE(NULLIF(left(p_value, 10), '')::date, p_created_at::date)
    $$;
    CREATE FUNCTION public.is_nfe_hml_technical_order(
      p_id text, p_status text, p_deleted boolean, p_data jsonb
    ) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
      SELECT false
    $$;
    CREATE TABLE public.inventory_moves(id integer PRIMARY KEY);
    CREATE TABLE public.accounts_receivable(id integer PRIMARY KEY);
    CREATE TABLE public.financial_transactions(id integer PRIMARY KEY);
  `);

  const migration = fs.readFileSync(path.join(__dirname,
    '../migrations/20261001170000_isolate_operational_hml_orders.sql'), 'utf8');
  await db.exec(migration);
  await db.exec(`
    CREATE TRIGGER orders_dashboard_metrics_refresh
      AFTER INSERT OR UPDATE OR DELETE ON public.orders
      FOR EACH ROW EXECUTE FUNCTION public.refresh_dashboard_metrics_trigger();
    CREATE TRIGGER enqueue_delivery_summary_refresh_orders_insert
      AFTER INSERT ON public.orders REFERENCING NEW TABLE AS hml_new_rows
      FOR EACH STATEMENT EXECUTE FUNCTION public.enqueue_delivery_summary_refresh();
    CREATE TRIGGER enqueue_delivery_summary_refresh_orders_update
      AFTER UPDATE ON public.orders REFERENCING NEW TABLE AS hml_new_rows OLD TABLE AS hml_old_rows
      FOR EACH STATEMENT EXECUTE FUNCTION public.enqueue_delivery_summary_refresh();
    CREATE TRIGGER enqueue_delivery_summary_refresh_orders_delete
      AFTER DELETE ON public.orders REFERENCING OLD TABLE AS hml_old_rows
      FOR EACH STATEMENT EXECUTE FUNCTION public.enqueue_delivery_summary_refresh();
  `);

  const today = new Date().toISOString().slice(0, 10);
  const makeData = ({ runId, type = 'sale', test = true, environment = 'homologation', value = 40 }) => ({
    orderType: type,
    date: `${today}T12:00:00.000Z`,
    testRunId: runId,
    is_test: test,
    test_environment: environment,
    paymentsSummary: { totalOrderValue: value },
    items: [{ productId: 'product-1', quantity: 1, unitPrice: value, unitCost: 5 }],
  });
  const liveRun = '00000000-0000-4000-8000-000000000001';
  const hmlSale = '00000000-0000-4000-8000-000000000002';
  const hmlReturn = '00000000-0000-4000-8000-000000000003';

  await db.query(`INSERT INTO public.orders(id,status,order_type,total_amount,order_data)
    VALUES ('ordinary-order','scheduled','sale',100,
      $1::jsonb)`, [JSON.stringify(makeData({ runId: null, test: false, environment: '', value: 100 }))]);
  const before = await db.query('SELECT metric_date,revenue,orders,cost,profit,items_without_cost FROM public.dashboard_daily_metrics WHERE metric_date=$1::date', [today]);
  assert.equal(before.rows.length, 1);
  assert.equal(Number(before.rows[0].revenue), 100);
  assert.equal(before.rows[0].orders, 1);
  const queueBefore = (await db.query('SELECT sent FROM net.queue_stats')).rows[0].sent;

  assert.equal((await db.query(`SELECT public.is_nfe_hml_test_order($1,'scheduled',false,$2::jsonb) AS ok`,
    [hmlSale, JSON.stringify(makeData({ runId: liveRun }))])).rows[0].ok, true);
  assert.equal((await db.query(`SELECT public.is_nfe_hml_test_order($1,'fulfilled',false,$2::jsonb) AS ok`,
    [hmlReturn, JSON.stringify(makeData({ runId: liveRun, type: 'return' }))])).rows[0].ok, true);
  assert.equal((await db.query(`SELECT public.is_nfe_hml_test_order($1,'scheduled',false,$2::jsonb) AS ok`,
    ['not-a-uuid', JSON.stringify(makeData({ runId: liveRun }))])).rows[0].ok, false);
  assert.equal((await db.query(`SELECT public.is_nfe_hml_test_order($1,'scheduled',false,$2::jsonb) AS ok`,
    [hmlSale, JSON.stringify(makeData({ runId: 'not-a-uuid' }))])).rows[0].ok, false);
  assert.equal((await db.query(`SELECT public.is_nfe_hml_test_order($1,'scheduled',false,$2::jsonb) AS ok`,
    [hmlSale, JSON.stringify(makeData({ runId: liveRun, environment: 'production' }))])).rows[0].ok, false);

  await db.query(`INSERT INTO public.orders(id,status,order_type,total_amount,order_data)
    VALUES ($1,'scheduled','sale',40,$2::jsonb)`, [hmlSale, JSON.stringify(makeData({ runId: liveRun }))]);
  await db.query(`UPDATE public.orders SET status='fulfilled',
    order_data=jsonb_set(order_data,'{status}','"fulfilled"') WHERE id=$1`, [hmlSale]);
  await db.query(`INSERT INTO public.orders(id,status,order_type,total_amount,order_data)
    VALUES ($1,'fulfilled','return',-40,$2::jsonb)`,
    [hmlReturn, JSON.stringify(makeData({ runId: liveRun, type: 'return', value: -40 }))]);
  await db.query('SELECT public.refresh_dashboard_metric_day($1::date)', [today]);

  const after = await db.query('SELECT metric_date,revenue,orders,cost,profit,items_without_cost FROM public.dashboard_daily_metrics WHERE metric_date=$1::date', [today]);
  assert.deepEqual(after.rows, before.rows, 'HML operational tests must not change dashboard business metrics');
  assert.equal((await db.query('SELECT sent FROM net.queue_stats')).rows[0].sent, queueBefore,
    'HML test-only order changes must not enqueue delivery summary jobs');

  const malformedId = '00000000-0000-4000-8000-000000000004';
  await db.query(`INSERT INTO public.orders(id,status,order_type,total_amount,order_data)
    VALUES ($1,'scheduled','sale',50,$2::jsonb)`,
    [malformedId, JSON.stringify(makeData({ runId: 'missing-required-run-id' }))]);
  const afterMalformed = (await db.query('SELECT revenue,orders FROM public.dashboard_daily_metrics WHERE metric_date=$1::date', [today])).rows[0];
  assert.equal(Number(afterMalformed.revenue), Number(before.rows[0].revenue) + 40,
    'Malformed markers must stay visible as operational activity instead of suppressing metrics');
  assert.equal(afterMalformed.orders, 2);
  assert.equal((await db.query('SELECT sent FROM net.queue_stats')).rows[0].sent, queueBefore + 1,
    'Malformed markers must retain normal delivery refresh behavior');

  console.log('Isolamento de E2E HML: KPIs e refreshes operacionais preservados para pedidos marcados; marcadores inválidos continuam operacionais.');
  await db.close();
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
