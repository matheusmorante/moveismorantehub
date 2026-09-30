const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { verifyLocalSupabase } = require('./supabase-local-preflight.cjs');

const migration = (name) => fs.readFileSync(path.join(__dirname, '../../supabase/migrations', name), 'utf8');

async function main() {
  // Must pass before CREATE DATABASE; no remote URL or fallback is accepted.
  const local = await verifyLocalSupabase();
  const { Client } = require(require.resolve('pg', {
    paths: [path.join(__dirname, '../../supabase/tests'), path.join(__dirname, '../../erp')],
  }));
  const dbName = `test_nfe_hml_${crypto.randomBytes(5).toString('hex')}`;
  const testUrl = new URL(local.dbUrl);
  testUrl.pathname = `/${dbName}`;
  const admin = new Client({ connectionString: local.dbUrl });
  const db = new Client({ connectionString: testUrl.toString() });
  const peer = new Client({ connectionString: testUrl.toString() });
  let created = false;
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE ${dbName}`);
    created = true;
    await db.connect();
    await db.query(`
      CREATE SCHEMA extensions;
      CREATE EXTENSION pgtap WITH SCHEMA extensions;
      SET search_path = public, extensions;
      CREATE TABLE orders (id text PRIMARY KEY, order_type text, status text,
        deleted boolean NOT NULL DEFAULT false, order_data jsonb, updated_at timestamptz);
      CREATE TABLE settings (id text PRIMARY KEY, data jsonb);
      CREATE TABLE nfe_sequences (modelo varchar(2), serie varchar(4), ambiente integer,
        ultimo_numero integer, updated_at timestamptz, UNIQUE(modelo,serie,ambiente));
      CREATE TABLE nfe_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id text,
        document_type text, emission_request_id uuid UNIQUE, modelo varchar(2), ambiente integer,
        serie varchar(4), numero_nfe integer, chave_acesso varchar(44), status text,
        finalidade integer, motivo_status text, xml_nfe text, xml_protocolo text,
        numero_protocolo text, created_at timestamptz, updated_at timestamptz);
      GRANT USAGE ON SCHEMA public, extensions TO service_role;
      GRANT ALL ON orders, settings, nfe_sequences, nfe_documents TO service_role;
    `);
    const lineage = migration('20260926240000_add_fiscal_lineage_and_return_allocations.sql');
    await db.query(lineage.slice(lineage.indexOf('CREATE TABLE IF NOT EXISTS public.nfe_document_items'),
      lineage.indexOf('CREATE TABLE IF NOT EXISTS public.nfe_return_item_allocations')));
    await db.query('GRANT ALL ON nfe_document_items TO service_role');
    for (const name of ['20260930001434_add_orders_fiscal_revision.sql',
      '20260930001435_nfe_fiscal_snapshot.sql', '20260930001436_nfe_hml_atomic_result.sql']) {
      await db.query(migration(name));
    }
    // Replay the new migration before fixtures to check idempotent DDL as well.
    await db.query(migration('20260930001436_nfe_hml_atomic_result.sql'));
    const requestId = crypto.randomUUID();
    const orderId = `TEST_AUT_${crypto.randomUUID()}`;
    const token = crypto.randomUUID();
    await db.query(`INSERT INTO orders VALUES ($1,'sale','draft',true,$2,now(),1)`,
      [orderId, { deleted: true, testRunId: orderId, fiscalScenario: 'HML_TECHNICAL_V1', payments: [] }]);
    await db.query(`INSERT INTO settings VALUES ('app','{"companyCMun":"4105805"}')`);
    await db.query(`INSERT INTO settings VALUES ('nfe55_hml_csosn_defaults_v1',
      '{"model":"55","environment":2,"issuerCrt":"1","csosn":"103","productionApproved":false,"version":"test-synthetic"}')`);
    await db.query('SET ROLE service_role');
    const reservation = (await db.query(`SELECT prepare_nfe_fiscal_snapshot($1,$2,'55',2,'900',700) AS value`,
      [orderId, requestId])).rows[0].value;
    const key = `4126091234567800019555900${String(reservation.number).padStart(9, '0')}1123456780`;
    const xml = `<NFe><infNFe Id="NFe${key}"/></NFe>`;
    const docId = (await db.query(`SELECT reserve_hml_nfe_outbound($1,$2,$3,$4,$5,'900','[{}]',$6) AS id`,
      [orderId, requestId, key, xml, reservation.number, token])).rows[0].id;
    await db.query('RESET ROLE');
    await db.query('SELECT no_plan()');
    const tap = async (sql, args = []) => {
      const result = await db.query(sql, args);
      for (const row of result.rows) {
        for (const value of Object.values(row)) assert.doesNotMatch(String(value), /^not ok/m);
      }
    };
    await tap(`SELECT is(snapshot_data #>> '{fiscalConfiguration,csosn}', '103',
      'server configuration is captured in the immutable snapshot')
      FROM nfe_fiscal_snapshots WHERE id=$1`, [reservation.snapshotId]);
    await tap(`SELECT throws_ok($1,'23505','IDEMPOTENCY_KEY_REUSED',
      'same request cannot change the explicit CSOSN choice')`,
      [`SELECT prepare_nfe_fiscal_snapshot('${orderId}','${requestId}','55',2,'900',700,'{"1":"102"}')`]);
    await tap(`SELECT ok(NOT claim_hml_nfe_attempt($1,$2), 'active send blocks another caller')`,
      [docId, crypto.randomUUID()]);
    await tap(`SELECT ok(NOT has_function_privilege('authenticated',
      'public.claim_hml_nfe_attempt(uuid,uuid)','EXECUTE'), 'browser cannot claim')`);
    await tap(`SELECT ok(NOT has_function_privilege('anon',
      'public.persist_hml_nfe_result(uuid,text,text,text,text,jsonb,uuid)','EXECUTE'), 'anon cannot confirm')`);
    await db.query('SELECT release_hml_nfe_attempt($1,$2)', [docId, crypto.randomUUID()]);
    await tap(`SELECT is(hml_attempt_token,$2::uuid,'wrong owner cannot release') FROM nfe_documents WHERE id=$1`,
      [docId, token]);
    await db.query('SELECT release_hml_nfe_attempt($1,$2)', [docId, token]);
    await peer.connect();
    await peer.query('SET ROLE service_role');
    await db.query('SET ROLE service_role');
    const nextToken = crypto.randomUUID();
    const otherToken = crypto.randomUUID();
    const claimed = await Promise.all([
      db.query('SELECT claim_hml_nfe_attempt($1,$2) AS won', [docId, nextToken]),
      peer.query('SELECT claim_hml_nfe_attempt($1,$2) AS won', [docId, otherToken]),
    ]);
    assert.equal(claimed.filter((r) => r.rows[0].won).length, 1);
    let owner = claimed[0].rows[0].won ? nextToken : otherToken;
    await db.query('RESET ROLE');
    await tap(`SELECT throws_ok($1,'23514','HML_ATTEMPT_LEASE_LOST','stale owner cannot persist')`,
      [`SELECT persist_hml_nfe_result('${docId}','pendente','timeout','',NULL,'[]','${token}')`]);
    await db.query(`UPDATE nfe_documents SET hml_attempt_expires_at=now()-interval '1 second' WHERE id=$1`, [docId]);
    const expired = owner;
    owner = crypto.randomUUID();
    await tap(`SELECT ok(claim_hml_nfe_attempt($1,$2),'expired lease can be reclaimed')`, [docId, owner]);
    await db.query('SELECT release_hml_nfe_attempt($1,$2)', [docId, expired]);
    await tap(`SELECT is(hml_attempt_token,$2::uuid,'expired caller cannot release new owner') FROM nfe_documents WHERE id=$1`,
      [docId, owner]);
    await tap(`SELECT throws_ok($1,'23514','HML_RETRY_STATE_CHANGED','retry needs confirmed 217')`,
      [`SELECT reactivate_hml_nfe_retry('${docId}','${owner}')`]);
    await db.query(`SELECT persist_hml_nfe_result($1,'erro','217: Não consta','<cStat>217</cStat>',NULL,'[]',$2)`, [docId, owner]);
    await db.query('SELECT reactivate_hml_nfe_retry($1,$2)', [docId, owner]);
    const line = { item_number: 1, product_code: 'TEST_AUT', description: 'PRODUTO TESTE',
      billed_quantity: 1, unit_value: 100, gross_value: 100, discount_value: 0,
      product_xml: '<prod/>', taxes_xml: '<imposto/>' };
    const invalid = { ...line, item_number: 2, billed_quantity: 0 };
    const persistSql = (items) => `SELECT persist_hml_nfe_result('${docId}','homologada',
      '100: Autorizada','<resposta/>','141260000000001','${JSON.stringify(items)}','${owner}')`;
    await tap(`SELECT throws_ok($1,'23514',NULL,'invalid second line rolls back first line')`, [persistSql([line, invalid])]);
    await tap(`SELECT is(count(*)::integer,0,'no partial lines') FROM nfe_document_items WHERE document_id=$1`, [docId]);
    await tap(`SELECT is(status,'processando','no partial authorization') FROM nfe_documents WHERE id=$1`, [docId]);
    await db.query(persistSql([line]));
    await db.query(persistSql([line]));
    await tap(`SELECT is(count(*)::integer,1,'authorization idempotent') FROM nfe_document_items WHERE document_id=$1`, [docId]);
    await tap(`SELECT is(jsonb_array_length(hml_response_history),2,'217 and authorization preserved without duplicates') FROM nfe_documents WHERE id=$1`, [docId]);
    await tap(`SELECT throws_ok($1,'23514','AUTHORIZED_HML_IMMUTABLE','confirmed fact cannot be reversed by timeout')`,
      [`SELECT persist_hml_nfe_result('${docId}','pendente','timeout','',NULL,'[]','${owner}')`]);
    await tap(`SELECT is(xml_nfe,$2,'original signed XML preserved') FROM nfe_documents WHERE id=$1`, [docId, xml]);
    await tap('SELECT * FROM finish()');
    console.log('NF-e HML local: pgTAP + duas sessões; reserva, permissões, trava, rollback de itens e idempotência passaram.');
  } finally {
    await peer.end().catch(() => {});
    await db.end().catch(() => {});
    if (created) await admin.query(`DROP DATABASE ${dbName} WITH (FORCE)`);
    await admin.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`NF-e HML PostgreSQL local: ${error.message}`);
  process.exitCode = 1;
});
