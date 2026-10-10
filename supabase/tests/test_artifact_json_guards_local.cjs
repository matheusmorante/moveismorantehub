const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// PGlite simulation only; it is not PostgreSQL/Supabase integration evidence.
const { PGlite } = require('@electric-sql/pglite');

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER_OWNER = '22222222-2222-4222-8222-222222222222';
const NON_ADMIN = '33333333-3333-4333-8333-333333333333';
const RUN_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RUN_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PRODUCT_A = '10000000-0000-4000-8000-000000000001';
const PRODUCT_B = '10000000-0000-4000-8000-000000000002';
const VARIATION_A = '20000000-0000-4000-8000-000000000001';
const VARIATION_B = '20000000-0000-4000-8000-000000000002';
const PURCHASE_A = '30000000-0000-4000-8000-000000000001';
const PURCHASE_B = '30000000-0000-4000-8000-000000000002';
const RECEIPT_A = '40000000-0000-4000-8000-000000000001';
const RECEIPT_B = '40000000-0000-4000-8000-000000000002';
const TODAY = '2026-10-09';

const metadata = (runId, ownerId = OWNER) => ({ is_test: true, runId, ownerId });
const testArtifactJson = (runId, ownerId = OWNER) => JSON.stringify({ testArtifact: metadata(runId, ownerId) });
const orderJson = (runId, extra = {}) => JSON.stringify({ is_test: true, runId, ownerId: OWNER, ...extra });

async function expectReject(operation, pattern) {
  await assert.rejects(operation, pattern);
}

async function run() {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
        SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), current_user);
      $$;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY, role text, roles text[] DEFAULT ARRAY[]::text[]);
      CREATE FUNCTION public.is_administrator() RETURNS boolean
        LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
          SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
            AND (p.role='administrator' OR 'administrator'=ANY(COALESCE(p.roles,ARRAY[]::text[]))))
        $$;
      GRANT EXECUTE ON FUNCTION public.is_administrator() TO authenticated, service_role;

      CREATE TABLE public.dashboard_daily_metrics(metric_date date PRIMARY KEY, orders integer DEFAULT 0);
      CREATE TABLE public.orders(
        id text PRIMARY KEY, status text DEFAULT 'scheduled', customer_id text,
        linked_order_id text, items jsonb DEFAULT '[]'::jsonb,
        order_data jsonb DEFAULT '{}'::jsonb, deleted boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      );
      CREATE TABLE public.people(
        id text PRIMARY KEY, full_name text NOT NULL, notes text, observation text,
        address jsonb DEFAULT '{}'::jsonb, full_address jsonb DEFAULT '{}'::jsonb
      );
      CREATE TABLE public.products(
        id uuid PRIMARY KEY, supplier_id text, parent_id uuid,
        supplier_ids jsonb DEFAULT '[]'::jsonb, combo_items jsonb DEFAULT '[]'::jsonb,
        technical_specs jsonb DEFAULT '{}'::jsonb
      );
      CREATE TABLE public.product_variations(
        id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES public.products(id)
      );
      CREATE TABLE public.purchases(
        id uuid PRIMARY KEY, supplier_id text, items jsonb DEFAULT '[]'::jsonb,
        observation text DEFAULT ''
      );
      CREATE TABLE public.goods_receipts(
        id uuid PRIMARY KEY, purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
        supplier_name text NOT NULL, items jsonb DEFAULT '[]'::jsonb, observation text DEFAULT ''
      );
      CREATE TABLE public.inventory_moves(
        id uuid PRIMARY KEY, product_id text, variation_id uuid, order_id text,
        source_order_id text, related_entity_type text, related_entity_id text,
        source_receipt_id text
      );
      CREATE TABLE public.accounts_receivable(
        id text PRIMARY KEY, order_id text, notes text, status text DEFAULT 'pending'
      );
      CREATE TABLE public.accounts_payable(
        id uuid PRIMARY KEY, notes text, status text DEFAULT 'pending'
      );
      CREATE TABLE public.financial_transactions(
        id text PRIMARY KEY, receivable_id text, payable_id text,
        reference_type text, reference_id text, notes text,
        date date DEFAULT CURRENT_DATE
      );
      CREATE TABLE public.app_notifications(
        id uuid PRIMARY KEY, order_id text, title text NOT NULL, message text NOT NULL,
        type text NOT NULL, order_data jsonb
      );

      CREATE FUNCTION public.parse_order_metric_date(p_value text, p_created_at timestamptz)
      RETURNS date LANGUAGE sql IMMUTABLE AS $$
        SELECT COALESCE(NULLIF(left(p_value,10),'')::date,p_created_at::date)
      $$;
      CREATE FUNCTION public.is_nfe_hml_test_order(p_id text,p_status text,p_deleted boolean,p_data jsonb)
      RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT false $$;
      CREATE FUNCTION public.get_dashboard_aggregates(p_start timestamptz,p_end timestamptz,p_kind text)
      RETURNS integer LANGUAGE sql STABLE AS $$
        SELECT count(*)::integer FROM public.orders o WHERE COALESCE(o.deleted, false) = false
      $$;
      CREATE FUNCTION public.refresh_dashboard_metric_day(p_day date) RETURNS void
      LANGUAGE plpgsql AS $$
      BEGIN
        DELETE FROM public.dashboard_daily_metrics WHERE metric_date=p_day;
        INSERT INTO public.dashboard_daily_metrics(metric_date,orders)
        SELECT p_day,count(*)::integer FROM public.orders
        WHERE public.parse_order_metric_date(order_data->>'date',created_at)=p_day
          AND NOT public.is_nfe_hml_test_order(id, status, deleted, order_data)
        GROUP BY p_day;
      END;
      $$;
      GRANT USAGE ON SCHEMA public, auth TO authenticated, anon, service_role;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
    `);

    const migration = fs.readFileSync(path.join(__dirname,
      '../migrations/20261009200000_test_artifact_json_guards.sql'), 'utf8');
    await db.exec(migration);
    await db.exec(`
      INSERT INTO public.profiles(id,role) VALUES
        ('${OWNER}','administrator'),('${OTHER_OWNER}','administrator'),('${NON_ADMIN}','seller');
    `);

    const setIdentity = async (userId, role = 'authenticated') => {
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role',$2,false)", [userId ?? '', role]);
    };
    const asAuthenticated = async (operation) => {
      await db.exec('SET ROLE authenticated');
      try { return await operation(); } finally { await db.exec('RESET ROLE'); }
    };
    const insertPerson = (id, runId, ownerId = OWNER) => db.query(
      'INSERT INTO public.people(id,full_name,observation) VALUES ($1,$2,$3)',
      [id, id, testArtifactJson(runId, ownerId)],
    );
    const insertProduct = (id, runId, ownerId = OWNER) => db.query(
      'INSERT INTO public.products(id,technical_specs) VALUES ($1,$2::jsonb)',
      [id, testArtifactJson(runId, ownerId)],
    );

    await expectReject(insertPerson('person-no-auth', RUN_A), /TEST_ARTIFACT_UNAUTHORIZED/);
    await setIdentity(NON_ADMIN);
    await expectReject(asAuthenticated(() => insertPerson('person-not-admin', RUN_A, NON_ADMIN)), /TEST_ARTIFACT_UNAUTHORIZED/);
    await setIdentity(OTHER_OWNER);
    await expectReject(asAuthenticated(() => insertPerson('person-wrong-owner', RUN_A)), /TEST_ARTIFACT_UNAUTHORIZED/);

    await setIdentity(OWNER);
    await asAuthenticated(async () => {
      await insertPerson('customer-a', RUN_A);
      await insertPerson('customer-b', RUN_B);
      await db.query("INSERT INTO public.people(id,full_name) VALUES ('customer-live','Cliente operacional')");
      await insertProduct(PRODUCT_A, RUN_A);
      await insertProduct(PRODUCT_B, RUN_B);
      await db.query('INSERT INTO public.product_variations(id,product_id) VALUES ($1,$2),($3,$4)', [VARIATION_A, PRODUCT_A, VARIATION_B, PRODUCT_B]);
      await db.query('INSERT INTO public.orders(id,customer_id,items,order_data) VALUES ($1,$2,$3::jsonb,$4::jsonb)', [
        'order-a', 'customer-a', JSON.stringify([{ productId: PRODUCT_A, variationId: VARIATION_A }]), orderJson(RUN_A, { date: `${TODAY}T12:00:00Z`, assemblyScheduled: true }),
      ]);
      await db.query('INSERT INTO public.orders(id,customer_id,items,order_data) VALUES ($1,$2,$3::jsonb,$4::jsonb)', [
        'order-b', 'customer-b', JSON.stringify([{ productId: PRODUCT_B, variationId: VARIATION_B }]), orderJson(RUN_B, { date: `${TODAY}T12:00:00Z`, assemblyScheduled: true }),
      ]);
      await db.query("INSERT INTO public.orders(id,customer_id,order_data) VALUES ('live-order','customer-live',jsonb_build_object('date',$1::text))", [`${TODAY}T12:00:00Z`]);
      await db.query("INSERT INTO public.orders(id,customer_id,order_data) VALUES ('order-camel','customer-a',$1::jsonb)", [JSON.stringify({ isTest: true, testRunId: RUN_A, testOwnerId: OWNER, date: `${TODAY}T12:00:00Z` })]);
      await db.query("INSERT INTO public.orders(id,customer_id,order_data) VALUES ('order-nested','customer-a',$1::jsonb)", [JSON.stringify({ testArtifact: metadata(RUN_A), date: `${TODAY}T12:00:00Z` })]);
      await db.query("INSERT INTO public.orders(id,customer_id,linked_order_id,order_data) VALUES ('order-linked-a','customer-a','order-a',$1::jsonb)", [orderJson(RUN_A)]);
    });

    await expectReject(asAuthenticated(() => db.query(
      'INSERT INTO public.orders(id,customer_id,items,order_data) VALUES ($1,$2,$3::jsonb,$4::jsonb)',
      ['order-fallback-cross-run', 'customer-a', '[]', orderJson(RUN_A, { items: [{ productId: PRODUCT_B }] })],
    )), /TEST_ARTIFACT_LINK_MISMATCH/);
    await expectReject(asAuthenticated(() => db.query(
      'INSERT INTO public.orders(id,customer_id,order_data) VALUES ($1,$2,$3::jsonb)',
      ['order-cross-customer', 'customer-b', orderJson(RUN_A)],
    )), /TEST_ARTIFACT_LINK_MISMATCH/);
    await expectReject(asAuthenticated(() => db.query(
      "INSERT INTO public.orders(id,customer_id,order_data) VALUES ('live-cross-customer','customer-a','{}'::jsonb)",
    )), /TEST_ARTIFACT_LINK_MISMATCH/);
    await expectReject(asAuthenticated(() => db.query(
      "INSERT INTO public.orders(id,customer_id,linked_order_id,order_data) VALUES ('order-cross-link','customer-a','order-b',$1::jsonb)", [orderJson(RUN_A)],
    )), /TEST_ARTIFACT_LINK_MISMATCH/);
    await expectReject(asAuthenticated(() => db.query(
      "INSERT INTO public.orders(id,customer_id,linked_order_id,order_data) VALUES ('live-cross-link','customer-live','order-a','{}'::jsonb)",
    )), /TEST_ARTIFACT_LINK_MISMATCH/);
    await expectReject(asAuthenticated(() => db.query(
      'INSERT INTO public.orders(id,customer_id,items,order_data) VALUES ($1,$2,$3::jsonb,$4::jsonb)',
      ['order-cross-variation', 'customer-a', JSON.stringify([{ productId: PRODUCT_A, variationId: VARIATION_B }]), orderJson(RUN_A)],
    )), /TEST_ARTIFACT_LINK_MISMATCH/);
    await expectReject(asAuthenticated(() => db.query(
      'UPDATE public.products SET combo_items=$1::jsonb WHERE id=$2',
      [JSON.stringify([{ productId: PRODUCT_B }]), PRODUCT_A],
    )), /TEST_ARTIFACT_LINK_MISMATCH/);

    await asAuthenticated(() => db.query(
      'INSERT INTO public.inventory_moves(id,product_id,variation_id,order_id) VALUES ($1,$2,$3,$4)',
      ['50000000-0000-4000-8000-000000000001', PRODUCT_A, VARIATION_A, 'order-a'],
    ));
    await expectReject(asAuthenticated(() => db.query(
      'INSERT INTO public.inventory_moves(id,product_id,order_id) VALUES ($1,$2,$3)',
      ['50000000-0000-4000-8000-000000000002', PRODUCT_B, 'order-a'],
    )), /TEST_ARTIFACT_LINK_MISMATCH/);

    await asAuthenticated(() => db.query(
      'INSERT INTO public.accounts_receivable(id,order_id,notes) VALUES ($1,$2,$3)',
      ['ar-a', 'order-a', testArtifactJson(RUN_A)],
    ));
    await expectReject(asAuthenticated(() => db.query(
      'INSERT INTO public.accounts_receivable(id,order_id,notes) VALUES ($1,$2,$3)',
      ['ar-cross-run', 'order-b', testArtifactJson(RUN_A)],
    )), /TEST_ARTIFACT_LINK_MISMATCH/);
    await asAuthenticated(() => db.query(
      'INSERT INTO public.accounts_payable(id,notes) VALUES ($1,$2)',
      ['60000000-0000-4000-8000-000000000001', testArtifactJson(RUN_A)],
    ));
    await expectReject(asAuthenticated(() => db.query(
      'INSERT INTO public.financial_transactions(id,receivable_id,notes) VALUES ($1,$2,$3)',
      ['ft-cross-run','ar-a',testArtifactJson(RUN_B)],
    )), /TEST_ARTIFACT_LINK_MISMATCH/);
    await asAuthenticated(() => db.query(
      'INSERT INTO public.financial_transactions(id,receivable_id) VALUES ($1,$2)', ['ft-a','ar-a'],
    ));

    await asAuthenticated(async () => {
      await db.query('INSERT INTO public.purchases(id,supplier_id,items,observation) VALUES ($1,$2,$3::jsonb,$4)', [
        PURCHASE_A, 'customer-a', JSON.stringify([{ productId: PRODUCT_A, variationId: VARIATION_A }]), testArtifactJson(RUN_A),
      ]);
      await db.query('INSERT INTO public.purchases(id,supplier_id,items,observation) VALUES ($1,$2,$3::jsonb,$4)', [
        PURCHASE_B, 'customer-b', JSON.stringify([{ productId: PRODUCT_B, variationId: VARIATION_B }]), testArtifactJson(RUN_B),
      ]);
    });
    await expectReject(asAuthenticated(() => db.query(
      'INSERT INTO public.purchases(id,supplier_id,items,observation) VALUES ($1,$2,$3::jsonb,$4)',
      ['30000000-0000-4000-8000-000000000003', 'customer-a', JSON.stringify([{ productId: PRODUCT_B }]), testArtifactJson(RUN_A)],
    )), /TEST_ARTIFACT_LINK_MISMATCH/);
    await expectReject(asAuthenticated(() => db.query(
      'INSERT INTO public.goods_receipts(id,purchase_id,supplier_name,observation) VALUES ($1,$2,$3,$4)',
      [RECEIPT_A, PURCHASE_B, 'Fornecedor teste', testArtifactJson(RUN_A)],
    )), /TEST_ARTIFACT_LINK_MISMATCH/);
    await expectReject(asAuthenticated(() => db.query(
      'INSERT INTO public.goods_receipts(id,purchase_id,supplier_name) VALUES ($1,$2,$3)',
      [RECEIPT_B, PURCHASE_A, 'Fornecedor operacional'],
    )), /TEST_ARTIFACT_LINK_MISMATCH/);
    await asAuthenticated(() => db.query(
      'INSERT INTO public.goods_receipts(id,purchase_id,supplier_name,items,observation) VALUES ($1,$2,$3,$4::jsonb,$5)',
      [RECEIPT_A, PURCHASE_A, 'Fornecedor teste', JSON.stringify([{ productId: PRODUCT_A, variationId: VARIATION_A }]), testArtifactJson(RUN_A)],
    ));
    await asAuthenticated(() => db.query(
      'INSERT INTO public.inventory_moves(id,product_id,source_receipt_id) VALUES ($1,$2,$3)',
      ['50000000-0000-4000-8000-000000000003', PRODUCT_A, RECEIPT_A],
    ));
    await expectReject(asAuthenticated(() => db.query(
      'INSERT INTO public.inventory_moves(id,product_id,source_receipt_id) VALUES ($1,$2,$3)',
      ['50000000-0000-4000-8000-000000000004', PRODUCT_B, RECEIPT_A],
    )), /TEST_ARTIFACT_LINK_MISMATCH/);

    await asAuthenticated(async () => {
      await db.query('INSERT INTO public.app_notifications(id,order_id,title,message,type) VALUES ($1,$2,$3,$4,$5)', [
        '70000000-0000-4000-8000-000000000001','order-a','Test','Não enviar','order',
      ]);
      await db.query('INSERT INTO public.app_notifications(id,title,message,type,order_data) VALUES ($1,$2,$3,$4,$5::jsonb)', [
        '70000000-0000-4000-8000-000000000002','Test','Não enviar','order',orderJson(RUN_A),
      ]);
      await db.query("INSERT INTO public.app_notifications(id,order_id,title,message,type) VALUES ('70000000-0000-4000-8000-000000000003','live-order','Normal','Enviar','order')");
    });
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.app_notifications')).rows[0].n, 1);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.inventory_moves WHERE order_id=$1', ['order-a'])).rows[0].n, 1,
      'test inventory history remains available for audit');

    await asAuthenticated(async () => {
      await db.query("INSERT INTO public.accounts_receivable(id,order_id,status) VALUES ('ar-live','live-order','pending')");
      await db.query("INSERT INTO public.accounts_payable(id,status) VALUES ('60000000-0000-4000-8000-000000000002','pending')");
      await db.query("INSERT INTO public.accounts_payable(id,notes,status) VALUES ('60000000-0000-4000-8000-000000000003',$1,'pending')", [testArtifactJson(RUN_A)]);
      await db.query("INSERT INTO public.financial_transactions(id,reference_type,reference_id) VALUES ('ft-live','order','live-order')");
      await db.query("INSERT INTO public.financial_transactions(id,reference_type,reference_id) VALUES ('ft-test-order','order','order-a')");
      await db.query("INSERT INTO public.financial_transactions(id,payable_id) VALUES ('ft-test-payable','60000000-0000-4000-8000-000000000001')");
      await db.query("INSERT INTO public.financial_transactions(id,notes) VALUES ('ft-test-self',$1)", [testArtifactJson(RUN_A)]);
    });
    const reportAr = await asAuthenticated(() => db.query('SELECT id FROM public.get_report_accounts_receivable() ORDER BY id'));
    const reportAp = await asAuthenticated(() => db.query('SELECT id::text AS id FROM public.get_report_accounts_payable() ORDER BY id'));
    const reportFt = await asAuthenticated(() => db.query('SELECT id FROM public.get_report_financial_transactions() ORDER BY id'));
    assert.deepEqual(reportAr.rows.map((row) => row.id), ['ar-live']);
    assert.deepEqual(reportAp.rows.map((row) => row.id), ['60000000-0000-4000-8000-000000000002']);
    assert.deepEqual(reportFt.rows.map((row) => row.id), ['ft-live']);

    const destinationFilter = `(
      o.order_data IS NULL OR (
        (o.order_data->>'is_test' IS NULL OR o.order_data->>'is_test'<>'true') AND
        (o.order_data->>'isTest' IS NULL OR o.order_data->>'isTest'<>'true') AND
        (o.order_data#>>'{testArtifact,is_test}' IS NULL OR o.order_data#>>'{testArtifact,is_test}'<>'true')
      )
    )`;
    for (const destination of ['agenda','cronograma','montagens']) {
      const rows = await db.query(`SELECT o.id FROM public.orders o WHERE ${destinationFilter} ORDER BY o.id`);
      assert.deepEqual(rows.rows.map((row) => row.id), ['live-order'], `${destination} must exclude test orders before pagination`);
    }
    const dashboard = await db.query("SELECT public.get_dashboard_aggregates('2026-10-01','2026-10-31','all') AS count");
    assert.equal(dashboard.rows[0].count, 1, 'dashboard aggregate excludes both test orders');
    await db.query('SELECT public.refresh_dashboard_metric_day($1::date)', [TODAY]);
    const daily = await db.query('SELECT orders FROM public.dashboard_daily_metrics WHERE metric_date=$1::date', [TODAY]);
    assert.equal(daily.rows[0].orders, 1, 'materialized dashboard metric excludes test orders');

    await asAuthenticated(() => db.query(
      "INSERT INTO public.orders(id,customer_id,items,order_data) VALUES ('order-idempotent','customer-a','[]'::jsonb,$1::jsonb)",
      [orderJson(RUN_A)],
    ));
    await asAuthenticated(() => db.query(
      "INSERT INTO public.orders(id,customer_id,items,order_data) VALUES ('order-idempotent','customer-a','[]'::jsonb,$1::jsonb) ON CONFLICT(id) DO UPDATE SET order_data=EXCLUDED.order_data",
      [orderJson(RUN_A)],
    ));
    await expectReject(asAuthenticated(() => db.query(
      "UPDATE public.orders SET order_data=$1::jsonb WHERE id='order-idempotent'",
      [orderJson(RUN_B)],
    )), /TEST_ARTIFACT_IDENTITY_IMMUTABLE/);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.orders WHERE id='order-idempotent'")).rows[0].n, 1);

    await asAuthenticated(async () => {
      await db.exec('BEGIN');
      try {
        await db.query("INSERT INTO public.people(id,full_name,observation) VALUES ('rollback-person','Rollback',$1)", [testArtifactJson(RUN_A)]);
        await db.query("INSERT INTO public.orders(id,customer_id,order_data) VALUES ('rollback-order','customer-b',$1::jsonb)", [orderJson(RUN_A)]);
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }
    }).catch((error) => {
      assert.match(error.message, /TEST_ARTIFACT_LINK_MISMATCH/);
    });
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.people WHERE id='rollback-person'")).rows[0].n, 0,
      'failed linked write rolls back earlier rows in the transaction');

    await setIdentity(OTHER_OWNER);
    await expectReject(asAuthenticated(() => db.query("DELETE FROM public.people WHERE id='customer-a'")), /TEST_ARTIFACT_UNAUTHORIZED/);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.people WHERE id='customer-a'")).rows[0].n, 1);
    await setIdentity(OWNER);
    await asAuthenticated(async () => {
      await db.query('DELETE FROM public.goods_receipts WHERE id=$1', [RECEIPT_A]);
      await db.query('DELETE FROM public.purchases WHERE id=$1', [PURCHASE_A]);
      await db.query("DELETE FROM public.financial_transactions WHERE id IN ('ft-a','ft-test-order','ft-test-payable','ft-test-self')");
      await db.query("DELETE FROM public.accounts_receivable WHERE id IN ('ar-a')");
      await db.query("DELETE FROM public.accounts_payable WHERE id='60000000-0000-4000-8000-000000000001'");
      await db.query("DELETE FROM public.inventory_moves WHERE id IN ('50000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000003')");
      await db.query("DELETE FROM public.orders WHERE id IN ('order-a','order-b','order-camel','order-nested','order-linked-a','order-idempotent')");
      await db.query('DELETE FROM public.product_variations WHERE id IN ($1,$2)', [VARIATION_A, VARIATION_B]);
      await db.query('DELETE FROM public.products WHERE id IN ($1,$2)', [PRODUCT_A, PRODUCT_B]);
      await db.query('DELETE FROM public.purchases WHERE id=$1', [PURCHASE_B]);
      await db.query("DELETE FROM public.people WHERE id IN ('customer-a','customer-b')");
    });
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.orders WHERE id='live-order'")).rows[0].n, 1,
      'cleanup leaves operational fixtures untouched');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.people WHERE id=$1', ['customer-live'])).rows[0].n, 1);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.goods_receipts WHERE id IN ($1,$2)', [RECEIPT_A, RECEIPT_B])).rows[0].n, 0);

    await db.query("SELECT set_config('request.jwt.claim.role','service_role',false)");
    await db.exec('SET ROLE service_role');
    try {
      const status = await db.query('SELECT public.test_artifact_policy_status() AS result');
      assert.equal(status.rows[0].result.ready, true);
    } finally {
      await db.exec('RESET ROLE');
    }
    await setIdentity(OWNER);
    await expectReject(asAuthenticated(() => db.query('SELECT public.test_artifact_policy_status()')), /permission denied|TEST_ARTIFACT_STATUS_SERVICE_ROLE_REQUIRED/);

    console.log('PGlite simulation checks passed: authorization, artifact links, purchases/receipts, notifications, reports, agenda/schedule/assemblies predicates, dashboard, retry idempotency, rollback, owned cleanup and runtime status.');
    console.log('This simulation does not prove PostgreSQL concurrency, PostgREST, live Supabase RLS/runtime, or authenticated Preview UI.');
  } finally {
    await db.close();
  }
}

run().catch((error) => {
  console.error('Test artifact guard check failed:', error);
  process.exitCode = 1;
});
