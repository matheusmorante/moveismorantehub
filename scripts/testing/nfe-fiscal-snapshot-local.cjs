const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { verifyLocalSupabase } = require('./supabase-local-preflight.cjs');
const { Client } = require(require.resolve('pg', {
  paths: [path.join(__dirname, '../../supabase/tests'), path.join(__dirname, '../../erp')],
}));

const revisionMigration = fs.readFileSync(
  path.join(__dirname, '../../supabase/migrations/20260930001434_add_orders_fiscal_revision.sql'),
  'utf8'
);
const snapshotMigration = fs.readFileSync(
  path.join(__dirname, '../../supabase/migrations/20260930001435_nfe_fiscal_snapshot.sql'),
  'utf8'
);

async function main() {
  const local = await verifyLocalSupabase();
  const runId = `TEST_AUT_${crypto.randomUUID()}`;
  const dbName = `test_nfe_snapshot_${crypto.randomBytes(5).toString('hex')}`;
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
        updated_at timestamptz, deleted boolean NOT NULL DEFAULT false
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
        ambiente integer, serie varchar(4), numero_nfe integer, status text
      );
      GRANT USAGE ON SCHEMA public, extensions TO service_role;
      GRANT SELECT, UPDATE ON public.orders, public.settings TO service_role;
      GRANT SELECT, INSERT, UPDATE ON public.nfe_sequences, public.nfe_documents TO service_role;
    `);
    const revisionProbeId = crypto.randomUUID();
    await test.query(
      `INSERT INTO public.orders (id, order_type, status, order_data, updated_at)
       VALUES ($1, 'sale', 'scheduled', '{}'::jsonb, now())`,
      [revisionProbeId]
    );
    await test.query(revisionMigration);
    await test.query(snapshotMigration);

    const initialRevision = await test.query(
      `SELECT version FROM public.orders WHERE id = $1`,
      [revisionProbeId]
    );
    assert.equal(initialRevision.rows[0].version, 1);
    await test.query(`UPDATE public.orders SET status = 'processing' WHERE id = $1`, [
      revisionProbeId,
    ]);
    const incrementedRevision = await test.query(
      `SELECT version FROM public.orders WHERE id = $1`,
      [revisionProbeId]
    );
    assert.equal(incrementedRevision.rows[0].version, 2);

    const orderId = crypto.randomUUID();
    await test.query(
      `INSERT INTO public.orders
         (id, order_type, status, order_data, updated_at)
       VALUES ($1, 'sale', 'scheduled', $2::jsonb, now())`,
      [orderId, JSON.stringify({ testRunId: runId, items: [], payments: [] })]
    );
    await test.query(
      `INSERT INTO public.settings (id, data)
       VALUES ('app', '{"companyCMun":"4106902","companyCnpj":"00000000000000"}'::jsonb)`
    );

    const alternateOrders = Array.from({ length: 5 }, () => crypto.randomUUID());
    await test.query(`INSERT INTO public.orders (id,order_type,status,order_data,updated_at)
      SELECT unnest($1::text[]),'sale','scheduled',order_data,now()
      FROM public.orders WHERE id=$2`, [alternateOrders, orderId]);
    const reserve = (client, requestId, model = '55', targetOrderId = orderId) =>
      client.query(
        `SELECT public.prepare_nfe_fiscal_snapshot(
           $1::text, $2::uuid, $3::varchar(2), 2, '1'::varchar(4), 1
         ) AS result`,
        [targetOrderId, requestId, model]
      );
    await test.query('SET ROLE service_role');
    const requestId = crypto.randomUUID();
    const first = (await reserve(test, requestId)).rows[0].result;
    const repeated = (await reserve(test, requestId)).rows[0].result;
    assert.equal(first.snapshotId, repeated.snapshotId);
    assert.equal(first.number, 1);
    assert.equal(repeated.number, 1);
    await assert.rejects(reserve(test, crypto.randomUUID()), /ALREADY_ACTIVE_FISCAL_ATTEMPT/);
    const { rows: captured } = await test.query(
      `SELECT snapshot_data, snapshot_sha256,
              encode(extensions.digest(convert_to(snapshot_data::text, 'UTF8'), 'sha256'), 'hex')
                AS recomputed_hash
         FROM public.nfe_fiscal_snapshots WHERE id = $1`,
      [first.snapshotId]
    );
    assert.deepEqual(captured[0].snapshot_data.order.data, {
      testRunId: runId,
      items: [],
      payments: [],
    });
    assert.deepEqual(captured[0].snapshot_data.issuerProfile, {
      companyCMun: '4106902',
      companyCnpj: '00000000000000',
    });
    assert.equal(captured[0].snapshot_sha256, captured[0].recomputed_hash);

    const otherA = crypto.randomUUID();
    const otherB = crypto.randomUUID();
    const secondClient = new Client({ connectionString: testUrl.toString() });
    try {
      await secondClient.connect();
      await secondClient.query('SET ROLE service_role');
      const [a, b] = await Promise.all([
        reserve(test, otherA, '55', alternateOrders[0]),
        reserve(secondClient, otherB, '55', alternateOrders[1]),
      ]);
      assert.deepEqual(
        [a.rows[0].result.number, b.rows[0].result.number].sort((x, y) => x - y),
        [2, 3]
      );
    } finally {
      await secondClient.end();
    }

    const sharedRequestId = crypto.randomUUID();
    const sameKeyClient = new Client({ connectionString: testUrl.toString() });
    try {
      await sameKeyClient.connect();
      await sameKeyClient.query('SET ROLE service_role');
      const [a, b] = await Promise.all([
        reserve(test, sharedRequestId, '55', alternateOrders[2]),
        reserve(sameKeyClient, sharedRequestId, '55', alternateOrders[2]),
      ]);
      assert.equal(a.rows[0].result.number, 4);
      assert.equal(a.rows[0].result.snapshotId, b.rows[0].result.snapshotId);
    } finally {
      await sameKeyClient.end();
    }

    const { rows: linked } = await test.query(
      `INSERT INTO public.nfe_documents
         (order_id, document_type, emission_request_id, modelo, ambiente, serie, numero_nfe, status)
       VALUES ($1, 'outbound', $2, '55', 2, '1', 1, 'erro')
       RETURNING fiscal_snapshot_id`,
      [orderId, requestId]
    );
    assert.equal(linked[0].fiscal_snapshot_id, first.snapshotId);
    await assert.rejects(
      test.query(
        `INSERT INTO public.nfe_documents
           (order_id, document_type, emission_request_id, modelo, ambiente, serie, numero_nfe)
         VALUES ($1, 'outbound', $2, '55', 2, '1', 999)`,
        [orderId, requestId]
      ),
      /FISCAL_SNAPSHOT_MISMATCH/
    );
    await assert.rejects(reserve(test, requestId, '65'), /IDEMPOTENCY_KEY_REUSED/);

    await test.query('RESET ROLE');
    const invalidOrderId = crypto.randomUUID();
    await test.query(
      `INSERT INTO public.orders
         (id, order_type, status, order_data, updated_at)
       VALUES ($1, NULL, 'scheduled', '{}'::jsonb, now())`,
      [invalidOrderId]
    );
    await test.query('SET ROLE service_role');
    await assert.rejects(
      test.query(
        `SELECT public.prepare_nfe_fiscal_snapshot(
           $1::text, $2::uuid, '55'::varchar(2), 2, '1'::varchar(4), 1
         )`,
        [invalidOrderId, crypto.randomUUID()]
      ),
      /ORDER_NOT_ELIGIBLE_FOR_OUTBOUND_FISCAL/
    );
    await test.query('RESET ROLE');

    const conflictId = crypto.randomUUID();
    await test.query(
      `INSERT INTO public.nfe_fiscal_snapshots
         (emission_request_id, order_id, order_version, order_updated_at,
          requested_model, environment, series, reserved_number,
          snapshot_data, snapshot_sha256, captured_at)
       SELECT $1, $3, order_version, order_updated_at,
              requested_model, environment, series, 5,
              snapshot_data, snapshot_sha256, captured_at
         FROM public.nfe_fiscal_snapshots WHERE id = $2`,
      [conflictId, first.snapshotId, alternateOrders[3]]
    );
    await test.query('SET ROLE service_role');
    await assert.rejects(reserve(test, crypto.randomUUID(), '55', alternateOrders[4]),
      { code: '23505', constraint: 'uq_nfe_fiscal_snapshot_sequence' });
    await test.query('RESET ROLE');
    const { rows: rolledBack } = await test.query(`
      SELECT ultimo_numero FROM public.nfe_sequences
       WHERE modelo = '55' AND serie = '1' AND ambiente = 2
    `);
    assert.equal(rolledBack[0].ultimo_numero, 4);
    await test.query('DELETE FROM public.nfe_fiscal_snapshots WHERE emission_request_id = $1', [
      conflictId,
    ]);

    const { rows: rights } = await test.query(`
      SELECT
        has_table_privilege('authenticated', 'public.nfe_fiscal_snapshots', 'SELECT') AS browser_read,
        has_table_privilege('service_role', 'public.nfe_fiscal_snapshots', 'UPDATE') AS service_update,
        has_function_privilege(
          'authenticated',
          'public.prepare_nfe_fiscal_snapshot(text,uuid,varchar,integer,varchar,integer)',
          'EXECUTE'
        ) AS browser_execute
    `);
    assert.deepEqual(rights[0], {
      browser_read: false,
      service_update: false,
      browser_execute: false,
    });

    const { rows: state } = await test.query(`
      SELECT (SELECT count(*)::integer FROM public.nfe_fiscal_snapshots) AS snapshots,
             (SELECT ultimo_numero FROM public.nfe_sequences
               WHERE modelo = '55' AND serie = '1' AND ambiente = 2) AS last_number,
             (SELECT count(*)::integer FROM public.nfe_documents) AS documents
    `);
    assert.deepEqual(state[0], { snapshots: 4, last_number: 4, documents: 1 });
  } finally {
    if (test) await test.end().catch(() => {});
    if (created) await admin.query(`DROP DATABASE ${dbName} WITH (FORCE)`);
    await admin.end().catch(() => {});
  }
  console.log(`Fiscal revision + snapshot PostgreSQL local: sucesso; runId=${runId}; backfill/default de revisão, trigger, 4 snapshots, 1 documento vinculado; banco temporário removido.`);
}

main().catch((error) => {
  console.error(`FiscalSnapshot PostgreSQL local falhou: ${error.message}`);
  process.exitCode = 1;
});
