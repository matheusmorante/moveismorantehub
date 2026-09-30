const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { verifyLocalSupabase } = require('./supabase-local-preflight.cjs');
const { Client } = require(require.resolve('pg', { paths: [path.join(__dirname, '../../supabase/tests')] }));

const migrationsDir = path.join(__dirname, '../../supabase/migrations');
const revisionMigration = fs.readFileSync(
  path.join(migrationsDir, '20260930001434_add_orders_fiscal_revision.sql'),
  'utf8'
);
const snapshotMigration = fs.readFileSync(
  path.join(migrationsDir, '20260930001435_nfe_fiscal_snapshot.sql'),
  'utf8'
);

async function main() {
  const local = await verifyLocalSupabase();
  const runId = `TEST_AUT_${crypto.randomUUID()}`;
  const dbName = `test_nfe_revision_${crypto.randomBytes(5).toString('hex')}`;
  const testUrl = new URL(local.dbUrl);
  testUrl.pathname = `/${dbName}`;
  const admin = new Client({ connectionString: local.dbUrl });
  let test;
  let created = false;

  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE ${dbName}`);
    created = true;
    test = new Client({ connectionString: testUrl.toString() });
    await test.connect();

    await test.query(`
      CREATE SCHEMA extensions;
      CREATE TABLE public.orders (
        id text PRIMARY KEY, order_type text, status text, order_data jsonb,
        updated_at timestamptz
      );
      CREATE TABLE public.settings (id text PRIMARY KEY, data jsonb);
      CREATE TABLE public.nfe_sequences (
        modelo varchar(2), serie varchar(4), ambiente integer,
        ultimo_numero integer, updated_at timestamptz,
        UNIQUE (modelo, serie, ambiente)
      );
      CREATE TABLE public.nfe_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id text,
        document_type text, emission_request_id uuid, modelo varchar(2),
        ambiente integer, serie varchar(4), numero_nfe integer
      );
      GRANT USAGE ON SCHEMA public, extensions TO service_role;
      GRANT SELECT, UPDATE ON public.orders, public.settings TO service_role;
      GRANT SELECT, INSERT, UPDATE ON public.nfe_sequences, public.nfe_documents TO service_role;
    `);

    const orderId = crypto.randomUUID();
    await test.query(
      `INSERT INTO public.orders (id, order_type, status, order_data, updated_at)
       VALUES ($1, 'sale', 'scheduled', $2::jsonb, '2000-01-01T00:00:00Z')`,
      [orderId, JSON.stringify({ testRunId: runId, items: [], payments: [] })]
    );

    await test.query(revisionMigration);
    const { rows: initialized } = await test.query(
      'SELECT version FROM public.orders WHERE id = $1',
      [orderId]
    );
    assert.deepEqual(initialized[0], { version: 1 });

    const { rows: updated } = await test.query(
      'UPDATE public.orders SET status = status WHERE id = $1 RETURNING version, updated_at',
      [orderId]
    );
    assert.equal(updated[0].version, 2);
    assert.ok(new Date(updated[0].updated_at).getTime() > Date.parse('2000-01-01T00:00:00Z'));

    await test.query(snapshotMigration);
    await test.query(
      `INSERT INTO public.settings (id, data)
       VALUES ('app', '{"companyCMun":"4106902","companyCnpj":"00000000000000"}'::jsonb)`
    );

    const reserve = (client, requestId) =>
      client.query(
        `SELECT public.prepare_nfe_fiscal_snapshot(
           $1::text, $2::uuid, '55'::varchar(2), 2, '1'::varchar(4), 1
         ) AS result`,
        [orderId, requestId]
      );

    await test.query('SET ROLE service_role');
    const firstRequestId = crypto.randomUUID();
    const first = (await reserve(test, firstRequestId)).rows[0].result;
    assert.equal(first.orderVersion, 2);
    const repeated = (await reserve(test, firstRequestId)).rows[0].result;
    assert.deepEqual(repeated, first);

    const { rows: firstSnapshot } = await test.query(
      'SELECT snapshot_data, snapshot_sha256 FROM public.nfe_fiscal_snapshots WHERE id = $1',
      [first.snapshotId]
    );
    assert.equal(firstSnapshot[0].snapshot_data.order.version, 2);

    await test.query('RESET ROLE');
    const { rows: nextOrderRevision } = await test.query(
      'UPDATE public.orders SET status = status WHERE id = $1 RETURNING version',
      [orderId]
    );
    assert.equal(nextOrderRevision[0].version, 3);
    await test.query('SET ROLE service_role');

    const repeatedAfterOrderChange = (await reserve(test, firstRequestId)).rows[0].result;
    assert.deepEqual(repeatedAfterOrderChange, first);
    const second = (await reserve(test, crypto.randomUUID())).rows[0].result;
    assert.equal(second.number, first.number + 1);
    assert.equal(second.orderVersion, 3);

    const conflictRequestId = crypto.randomUUID();
    await test.query('RESET ROLE');
    await test.query(
      `INSERT INTO public.nfe_fiscal_snapshots (
         emission_request_id, order_id, order_version, order_updated_at,
         requested_model, environment, series, reserved_number,
         snapshot_data, snapshot_sha256, captured_at
       ) SELECT $1, order_id, order_version, order_updated_at,
                requested_model, environment, series, 3,
                snapshot_data, snapshot_sha256, captured_at
           FROM public.nfe_fiscal_snapshots WHERE id = $2`,
      [conflictRequestId, first.snapshotId]
    );
    await test.query('SET ROLE service_role');
    await assert.rejects(reserve(test, crypto.randomUUID()), { code: '23505' });
    await test.query('RESET ROLE');
    const { rows: sequence } = await test.query(
      `SELECT ultimo_numero FROM public.nfe_sequences
        WHERE modelo = '55' AND serie = '1' AND ambiente = 2`
    );
    assert.equal(sequence[0].ultimo_numero, 2);

    console.log(`Revision + FiscalSnapshot local: sucesso; runId=${runId}; inicialização=1, atualização=2, snapshot=2, nova revisão=3; rollback de conflito comprovado; banco temporário descartável.`);
  } finally {
    if (test) await test.end().catch(() => {});
    if (created) await admin.query(`DROP DATABASE ${dbName} WITH (FORCE)`);
    await admin.end().catch(() => {});
  }
}

main().catch(error => {
  console.error(`Revision + FiscalSnapshot local falhou: ${error.message}`);
  process.exitCode = 1;
});
