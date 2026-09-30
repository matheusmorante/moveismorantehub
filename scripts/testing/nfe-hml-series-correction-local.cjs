// PostgreSQL/pgTAP evidence in a disposable local database; never accepts a remote URL.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { verifyLocalSupabase } = require('./supabase-local-preflight.cjs');
const migration = (name) => fs.readFileSync(path.join(__dirname, '../../supabase/migrations', name), 'utf8');
const correctionMigration = '20260930214601_nfe_hml_series_correction.sql';
const trace = [{ ruleSetVersion: 'HML_NORMAL_SALE_V1' }];
const selection = { '1': { ncm: '94036000', cfop: '5102', origem: '0', cest: '', csosn: '103' } };
async function main() {
  const local = await verifyLocalSupabase();
  const { Client } = require(require.resolve('pg', { paths: [path.join(__dirname, '../../supabase/tests')] }));
  const name = `test_nfe_series_${crypto.randomBytes(5).toString('hex')}`;
  const testUrl = new URL(local.dbUrl);
  testUrl.pathname = `/${name}`;
  const admin = new Client({ connectionString: local.dbUrl });
  const db = new Client({ connectionString: testUrl.toString() });
  const peer = new Client({ connectionString: testUrl.toString() });
  const runId = `TEST_AUT_${crypto.randomUUID()}`;
  let created = false;
  let assertions = 0;
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE ${name}`);
    created = true;
    await db.connect();
    await db.query(`
      CREATE SCHEMA extensions;
      CREATE EXTENSION pgtap WITH SCHEMA extensions;
      SET search_path=public,extensions;
      CREATE TABLE orders (id text PRIMARY KEY,order_type text,status text,
        deleted boolean NOT NULL DEFAULT false,order_data jsonb,updated_at timestamptz);
      CREATE TABLE settings (id text PRIMARY KEY,data jsonb);
      CREATE TABLE products (id uuid PRIMARY KEY,fiscal jsonb);
      CREATE TABLE people (id text PRIMARY KEY,full_name text,cpf_cnpj text,address jsonb,
        rg_ie text,person_type_pf_pj text,deleted boolean DEFAULT false);
      CREATE TABLE ncms (code text PRIMARY KEY,active boolean,start_date date,end_date date);
      CREATE TABLE nfe_sequences (modelo varchar(2),serie varchar(4),ambiente integer,
        ultimo_numero integer,updated_at timestamptz,UNIQUE(modelo,serie,ambiente));
      CREATE TABLE nfe_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id text,
        document_type text,emission_request_id uuid UNIQUE,modelo varchar(2),ambiente integer,
        serie varchar(4),numero_nfe integer,chave_acesso varchar(44),status text,
        finalidade integer,motivo_status text,xml_nfe text,xml_protocolo text,
        numero_protocolo text,created_at timestamptz,updated_at timestamptz);
      GRANT USAGE ON SCHEMA public,extensions TO service_role;
      GRANT ALL ON orders,settings,products,people,ncms,nfe_sequences,nfe_documents TO service_role;
      INSERT INTO ncms VALUES ('94036000',true,NULL,NULL);
      INSERT INTO people VALUES ('synthetic-customer','CLIENTE TEST_AUT','12345678909','{}',NULL,'PF',false);
      INSERT INTO settings VALUES ('app','{"companyCMun":"4105805","companyCRT":"1","companyUF":"PR"}');
      INSERT INTO settings VALUES ('nfe55_hml_csosn_defaults_v1','{"csosn":"103","environment":2}');
    `);
    const lineage = migration('20260926240000_add_fiscal_lineage_and_return_allocations.sql');
    await db.query(lineage.slice(lineage.indexOf('CREATE TABLE IF NOT EXISTS public.nfe_document_items'),
      lineage.indexOf('CREATE TABLE IF NOT EXISTS public.nfe_return_item_allocations')));
    await db.query('GRANT ALL ON nfe_document_items TO service_role');
    for (const file of ['20260930001434_add_orders_fiscal_revision.sql',
      '20260930001435_nfe_fiscal_snapshot.sql', '20260930001436_nfe_hml_atomic_result.sql',
      '20260930001438_nfe_modal_fiscal_selections.sql', '20260930001439_nfe_real_order_hml.sql'])
      await db.query(migration(file));
    async function order() {
      const id = crypto.randomUUID();
      await db.query(`INSERT INTO orders VALUES ($1,'sale','confirmed',false,$2,now(),1)`,
        [id, { testRunId: runId, customerData: { id: 'synthetic-customer' }, items: [{}], payments: [] }]);
      return id;
    }
    async function prepare(connection, orderId, series, request = crypto.randomUUID()) {
      const result = await connection.query(`SELECT prepare_nfe_fiscal_snapshot($1,$2,'55',2,$3,700,'{}',$4) value`,
        [orderId, request, series, selection]);
      return { ...result.rows[0].value, request, orderId, series };
    }
    async function reserve(connection, snapshot) {
      const key = `4126091234567800019555${snapshot.series.padStart(3, '0')}${String(snapshot.number).padStart(9, '0')}1123456780`;
      const xml = `<NFe><infNFe Id="NFe${key}"><ide><tpAmb>2</tpAmb></ide></infNFe></NFe>`;
      const token = crypto.randomUUID();
      const result = await connection.query(`SELECT reserve_hml_nfe_outbound($1,$2,$3,$4,$5,$6,$7,$8) id`,
        [snapshot.orderId, snapshot.request, key, xml, snapshot.number, snapshot.series, JSON.stringify(trace), token]);
      return { id: result.rows[0].id, token, key, xml };
    }
    async function persist(document, code, status = 'erro', protocol = null, items = []) {
      const xml = `<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe"><cStat>${code}</cStat></retEnviNFe>`;
      await db.query(`SELECT persist_hml_nfe_result($1,$2,$3,$4,$5,$6,$7)`,
        [document.id, status, `TEST_AUT cStat ${code}`, xml, protocol, JSON.stringify(items), document.token]);
    }
    const fixtures = [];
    for (const [code, status] of [['244', 'erro'], ['217', 'erro'], ['209', 'erro'], ['999', 'erro'], ['105', 'pendente']]) {
      const orderId = await order();
      const snapshot = await prepare(db, orderId, '900');
      const document = await reserve(db, snapshot);
      await persist(document, code, status);
      await db.query('SELECT release_hml_nfe_attempt($1,$2)', [document.id, document.token]);
      fixtures.push({ orderId, snapshot, document });
    }
    const beforeOrder = (await db.query('SELECT * FROM orders ORDER BY id')).rows;
    const legacy = (await db.query('SELECT * FROM nfe_documents WHERE id=$1', [fixtures[0].document.id])).rows[0];
    await db.query(migration(correctionMigration));
    await db.query(migration(correctionMigration));
    await db.query('SELECT no_plan()');
    async function tap(sql, args = []) {
      const result = await db.query(sql, args);
      for (const row of result.rows) for (const value of Object.values(row))
        assert.doesNotMatch(String(value), /^not ok/m);
      assertions += result.rows.length;
    }
    await tap(`SELECT ok(is_nfe_hml_series_rejection('<s:Envelope xmlns:s="urn:soap"><s:Body><retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe"><cStat>244</cStat></retEnviNFe></s:Body></s:Envelope>'),'SOAP rejection 244 recognized')`);
    await tap(`SELECT ok(NOT is_nfe_hml_series_rejection('<retConsSitNFe><cStat>217</cStat></retConsSitNFe>'),'217 is not a correction authorization')`);
    await tap(`SELECT ok(NOT is_nfe_hml_series_rejection('invalid XML'),'invalid XML fails closed')`);
    await tap(`SELECT ok(NOT has_function_privilege('authenticated','public.is_nfe_hml_series_rejection(text)','EXECUTE'),'browser cannot access internal helper')`);
    const sqlPrepare = (id, series) => `SELECT prepare_nfe_fiscal_snapshot('${id}','${crypto.randomUUID()}','55',2,'${series}',700,'{}','${JSON.stringify(selection)}')`;
    for (const series of ['890', '900', '920', '999'])
      await tap(`SELECT throws_ok($1,'23514','HML_CONTRIBUTOR_SERIES_INVALID','reserved series rolls back numbering')`, [sqlPrepare(fixtures[0].orderId, series)]);
    for (const fixture of fixtures.slice(1)) {
      await assert.rejects(prepare(db, fixture.orderId, '1'));
      await tap(`SELECT is((SELECT count(*) FROM nfe_fiscal_snapshots WHERE order_id=$1),1::bigint,'uncertain or unrelated result cannot create another snapshot')`, [fixture.orderId]);
    }
    assert.equal((await db.query(`SELECT count(*) FROM nfe_sequences WHERE serie='1'`)).rows[0].count, '0');
    await db.query('SET ROLE service_role');
    const corrected = await prepare(db, fixtures[0].orderId, '1');
    const repeated = await prepare(db, fixtures[0].orderId, '1', corrected.request);
    assert.deepEqual(repeated, corrected);
    await db.query('RESET ROLE');
    await tap(`SELECT is(hml_correction_of_document_id,$2::uuid,'snapshot is linked to rejected intention') FROM nfe_fiscal_snapshots WHERE id=$1`, [corrected.snapshotId, legacy.id]);
    await tap(`SELECT throws_ok($1,'23505','ALREADY_ACTIVE_FISCAL_ATTEMPT','another click cannot reserve a correction twice')`, [sqlPrepare(fixtures[0].orderId, '1')]);
    await db.query(`CREATE FUNCTION fail_test_document() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST_AUT_DOCUMENT_FAILURE'; END $$;
      CREATE TRIGGER fail_test_document AFTER INSERT ON nfe_documents FOR EACH ROW EXECUTE FUNCTION fail_test_document();`);
    await assert.rejects(reserve(db, corrected), /TEST_AUT_DOCUMENT_FAILURE/);
    await tap(`SELECT is((SELECT count(*) FROM nfe_documents WHERE order_id=$1),1::bigint,'failed insert leaves no partial correction document')`, [fixtures[0].orderId]);
    await db.query('DROP TRIGGER fail_test_document ON nfe_documents');
    const replacement = await reserve(db, corrected);
    await tap(`SELECT is(hml_correction_of_document_id,$2::uuid,'document copies immutable correction lineage') FROM nfe_documents WHERE id=$1`, [replacement.id, legacy.id]);
    await tap(`SELECT throws_ok($1,'23514','REJECTED_HML_SERIES_ATTEMPT_IMMUTABLE','old rejected XML cannot be altered')`, [`UPDATE nfe_documents SET xml_nfe='modified' WHERE id='${legacy.id}'`]);
    const items = [{ item_number: 1, product_code: runId, description: 'TEST_AUT', billed_quantity: 1,
      unit_value: 100, gross_value: 100, discount_value: 0, product_xml: '<prod/>', taxes_xml: '<imposto/>' }];
    await db.query(`CREATE FUNCTION fail_test_items() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST_AUT_ITEM_FAILURE'; END $$;
      CREATE TRIGGER fail_test_items AFTER INSERT ON nfe_document_items FOR EACH ROW EXECUTE FUNCTION fail_test_items();`);
    await assert.rejects(persist(replacement, '100', 'homologada', '141260000000001', items), /TEST_AUT_ITEM_FAILURE/);
    await tap(`SELECT is(status,'processando','failed authorization persistence rolls back status') FROM nfe_documents WHERE id=$1`, [replacement.id]);
    await tap(`SELECT is((SELECT count(*) FROM nfe_document_items WHERE document_id=$1),0::bigint,'failed authorization has no partial item')`, [replacement.id]);
    await db.query('DROP TRIGGER fail_test_items ON nfe_document_items');
    await persist(replacement, '100', 'homologada', '141260000000001', items);
    await persist(replacement, '100', 'homologada', '141260000000001', items);
    await tap(`SELECT is((SELECT count(*) FROM nfe_document_items WHERE document_id=$1),1::bigint,'authorization retry is idempotent')`, [replacement.id]);
    await assert.rejects(persist(replacement, '101', 'cancelada'), /INVALID_HML_RESULT/);
    await db.query('SELECT release_hml_nfe_attempt($1,$2)', [replacement.id, replacement.token]);
    await assert.rejects(prepare(db, fixtures[0].orderId, '2'), /HML_CORRECTION_REQUIRES_CONFIRMED_SERIES_REJECTION/);
    await peer.connect();
    const freshOrder = await order();
    await db.query('BEGIN');
    const first = await prepare(db, freshOrder, '2');
    let peerSettled = false;
    const competing = prepare(peer, freshOrder, '2').then(() => ({ succeeded: true }),
      (error) => ({ succeeded: false, code: error.code })).finally(() => { peerSettled = true; });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(peerSettled, false, 'Concurrent reservation must wait for the order lock.');
    await db.query('COMMIT');
    assert.deepEqual(await competing, { succeeded: false, code: '23505' });
    await tap(`SELECT is((SELECT count(*) FROM nfe_fiscal_snapshots WHERE order_id=$1),1::bigint,'two PostgreSQL sessions reserve only one intention')`, [freshOrder]);
    assert.equal((await prepare(db, freshOrder, '2', first.request)).number, first.number);
    const oldAfter = (await db.query('SELECT * FROM nfe_documents WHERE id=$1', [legacy.id])).rows[0];
    delete oldAfter.hml_correction_of_document_id;
    assert.deepEqual(oldAfter, legacy, 'Rejected historical facts must remain unchanged.');
    assert.deepEqual((await db.query('SELECT * FROM orders WHERE id=ANY($1) ORDER BY id', [beforeOrder.map((row) => row.id)])).rows,
      beforeOrder, 'Commercial orders must remain unchanged.');
    // Upgrade a legacy 209 in a valid contributor series; preserve its old IE.
    await db.query(`UPDATE settings SET data=data||'{"companyIE":"9091234567"}'::jsonb WHERE id='app'`);
    const ieOrder = await order();
    const rejectedIeSnapshot = await prepare(db, ieOrder, '1');
    const rejectedIe = await reserve(db, rejectedIeSnapshot);
    await persist(rejectedIe, '209');
    await db.query('SELECT release_hml_nfe_attempt($1,$2)', [rejectedIe.id, rejectedIe.token]);
    const ieBefore = (await db.query('SELECT * FROM nfe_documents WHERE id=$1', [rejectedIe.id])).rows[0];
    const ieMigration = migration('20260930222310_nfe_hml_issuer_ie_correction.sql');
    await db.query(ieMigration);
    await db.query(ieMigration);
    await tap(`SELECT ok(is_nfe_hml_ie_rejection('<retEnviNFe><cStat>209</cStat></retEnviNFe>'),'209 is a confirmed IE rejection')`);
    await tap(`SELECT ok(is_valid_nfe_hml_parana_ie('123.45678-50'),'official PR formatted example has valid digits')`);
    await tap(`SELECT ok(NOT is_valid_nfe_hml_parana_ie('9091234567'),'invalid placeholder is rejected')`);
    await tap(`SELECT ok(NOT is_valid_nfe_hml_parana_ie(NULL),'missing IE fails closed')`);
    await tap(`SELECT ok(NOT has_function_privilege('authenticated','public.is_nfe_hml_correction_allowed(uuid,text,jsonb)','EXECUTE'),'browser cannot call correction helper')`);
    const ieSequencesBefore = (await db.query('SELECT * FROM nfe_sequences ORDER BY modelo,serie,ambiente')).rows;
    for (const series of ['1', '2']) await assert.rejects(prepare(db, ieOrder, series), /HML_CORRECTION_REQUIRES_CONFIRMED_REJECTION/);
    assert.deepEqual((await db.query('SELECT * FROM nfe_sequences ORDER BY modelo,serie,ambiente')).rows, ieSequencesBefore);
    await db.query(`UPDATE settings SET data=data||'{"companyIE":"1234567840"}'::jsonb WHERE id='app'`);
    await assert.rejects(prepare(db, ieOrder, '1'), /HML_CORRECTION_REQUIRES_CONFIRMED_REJECTION/);
    await db.query(`UPDATE settings SET data=data||'{"companyIE":"1234567850"}'::jsonb WHERE id='app'`);
    await db.query('BEGIN');
    const fixedIeSnapshot = await prepare(db, ieOrder, '1');
    let iePeerSettled = false;
    const ieCompeting = prepare(peer, ieOrder, '1').then(() => ({ succeeded: true }),
      (error) => ({ succeeded: false, code: error.code })).finally(() => { iePeerSettled = true; });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(iePeerSettled, false, 'IE corrections must share the order lock.');
    await db.query('COMMIT');
    assert.deepEqual(await ieCompeting, { succeeded: false, code: '23505' });
    assert.deepEqual(await prepare(db, ieOrder, '1', fixedIeSnapshot.request), fixedIeSnapshot);
    await tap(`SELECT is(hml_correction_of_document_id,$2::uuid,'changed valid IE links a new same-series snapshot') FROM nfe_fiscal_snapshots WHERE id=$1`, [fixedIeSnapshot.snapshotId, rejectedIe.id]);
    await db.query('CREATE TRIGGER fail_test_document AFTER INSERT ON nfe_documents FOR EACH ROW EXECUTE FUNCTION fail_test_document()');
    await assert.rejects(reserve(db, fixedIeSnapshot), /TEST_AUT_DOCUMENT_FAILURE/);
    await db.query('DROP TRIGGER fail_test_document ON nfe_documents');
    const fixedIe = await reserve(db, fixedIeSnapshot);
    await tap(`SELECT is(hml_correction_of_document_id,$2::uuid,'corrected IE document preserves its original intention') FROM nfe_documents WHERE id=$1`, [fixedIe.id, rejectedIe.id]);
    await tap(`SELECT throws_ok($1,'23514','REJECTED_HML_SERIES_ATTEMPT_IMMUTABLE','rejected IE protocol cannot be fabricated')`, [`UPDATE nfe_documents SET numero_protocolo='FAKE' WHERE id='${rejectedIe.id}'`]);
    await db.query('CREATE TRIGGER fail_test_items AFTER INSERT ON nfe_document_items FOR EACH ROW EXECUTE FUNCTION fail_test_items()');
    await assert.rejects(persist(fixedIe, '100', 'homologada', '141260000000002', items), /TEST_AUT_ITEM_FAILURE/);
    await db.query('DROP TRIGGER fail_test_items ON nfe_document_items');
    await tap(`SELECT is(status,'processando','IE correction failure rolls back confirmed status') FROM nfe_documents WHERE id=$1`, [fixedIe.id]);
    await persist(fixedIe, '100', 'homologada', '141260000000002', items);
    await persist(fixedIe, '100', 'homologada', '141260000000002', items);
    await tap(`SELECT is((SELECT count(*) FROM nfe_document_items WHERE document_id=$1),1::bigint,'IE correction confirmation remains idempotent')`, [fixedIe.id]);
    await assert.rejects(persist(fixedIe, '101', 'cancelada'), /INVALID_HML_RESULT/);
    await assert.rejects(prepare(db, ieOrder, '2'), /HML_CORRECTION_REQUIRES_CONFIRMED_REJECTION/);
    assert.deepEqual((await db.query('SELECT * FROM nfe_documents WHERE id=$1', [rejectedIe.id])).rows[0], ieBefore);
    await db.query('SELECT * FROM finish()');
    console.log(JSON.stringify({ stage: 'local-series-correction', testRunId: runId, assertions,
      upgradeAndReplay: true, rollbackProven: true, twoSessionConcurrencyProven: true,
      historicalDocumentPreserved: true, operationalOrdersUnchanged: true, ieCorrectionVerified: true }));
  } finally {
    try { await peer.end(); } catch { /* not connected */ }
    try { await db.end(); } catch { /* not connected */ }
    if (created) await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
    await admin.end();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
