const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA extensions;
      CREATE FUNCTION extensions.digest(bytea, text) RETURNS bytea
        LANGUAGE sql IMMUTABLE AS $$ SELECT decode(repeat('00', 32), 'hex') $$;
      CREATE TABLE public.orders (
        id text PRIMARY KEY, order_type text, status text, deleted boolean,
        order_data jsonb, version integer, updated_at timestamptz
      );
      CREATE TABLE public.settings (id text PRIMARY KEY, data jsonb);
      CREATE TABLE public.nfe_sequences (
        modelo varchar(2), serie varchar(4), ambiente integer,
        ultimo_numero integer, updated_at timestamptz,
        PRIMARY KEY (modelo, serie, ambiente)
      );
      CREATE TABLE public.nfe_documents (
        id uuid PRIMARY KEY, order_id text, requested_model varchar(2),
        environment integer, emission_request_id uuid, status text,
        fiscal_snapshot_id uuid
      );
      CREATE TABLE public.nfe_fiscal_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), emission_request_id uuid UNIQUE,
        order_id text, order_version integer, order_updated_at timestamptz,
        requested_model varchar(2), environment integer, series varchar(4),
        reserved_number integer, snapshot_data jsonb, snapshot_sha256 text,
        captured_at timestamptz
      );
      CREATE TABLE public.products (id uuid PRIMARY KEY, fiscal jsonb);
      CREATE TABLE public.people (
        id text PRIMARY KEY, full_name text, cpf_cnpj text, address jsonb,
        rg_ie text, person_type_pf_pj text, deleted boolean
      );
      CREATE TABLE public.ncms (
        code text, active boolean, start_date date, end_date date
      );
      INSERT INTO public.settings VALUES
        ('app', '{"companyCMun":"4106902","companyCnpj":"00000000000000"}'),
        ('nfe55_hml_csosn_defaults_v1', '{"model":"55","environment":2,"issuerCrt":"1","csosn":"103"}');
      INSERT INTO public.ncms VALUES ('94035000', true, NULL, NULL);
    `);

    const migration = fs.readFileSync(path.join(__dirname,
      '../migrations/20261003150000_nfe_snapshot_normalize_legacy_product_ids.sql'), 'utf8');
    await db.exec(migration);

    const validId = '44444444-4444-4444-8444-444444444444';
    const classification = { ncm: '94035000', cfop: '5102', origem: '0', csosn: '103', cest: '' };
    const items = [
      { productId: validId, description: 'UUID válido', quantity: 1, unitPrice: 10 },
      { productId: '', description: 'ID vazio', quantity: 1, unitPrice: 10 },
      { description: 'ID undefined omitido no JSON', quantity: 1, unitPrice: 10 },
      { productId: 'not-a-uuid', description: 'Item legado sem cadastro', quantity: 1, unitPrice: 10 },
    ];
    const selections = Object.fromEntries(items.map((_, index) => [String(index + 1), classification]));
    const orderData = { items, payments: [] };
    const orderId = 'TEST_AUT_snapshot_product_ids';
    await db.query('INSERT INTO public.products VALUES ($1, $2::jsonb)',
      [validId, JSON.stringify({ ncm: '94035000' })]);
    await db.query(`INSERT INTO public.orders VALUES ($1, 'sale', 'scheduled', false, $2::jsonb, 1, now())`,
      [orderId, JSON.stringify(orderData)]);

    const reserve = (requestId, fiscalSelections = selections) => db.query(`
      SELECT public.prepare_nfe_fiscal_snapshot(
        $1::text, $2::uuid, '55'::varchar(2), 2, '1'::varchar(4), 1,
        '{}'::jsonb, $3::jsonb
      ) AS result`, [orderId, requestId, JSON.stringify(fiscalSelections)]);
    const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const result = (await reserve(requestId)).rows[0].result;
    assert.equal(result.number, 1, 'one snapshot reserves one number for the whole order');

    const snapshot = (await db.query(
      'SELECT snapshot_data FROM public.nfe_fiscal_snapshots WHERE id=$1::uuid', [result.snapshotId]
    )).rows[0].snapshot_data;
    const capturedItems = snapshot.order.data.items;
    assert.equal(capturedItems[0].productId, validId);
    assert.equal(capturedItems[1].productId, null);
    assert.equal(capturedItems[2].productId, null);
    assert.equal(capturedItems[3].productId, null);
    assert.deepEqual(snapshot.fiscalInputs.products[validId], { ncm: '94035000' });
    assert.deepEqual(snapshot.emissionRequest.itemFiscalSelections, selections);

    const originalOrder = (await db.query('SELECT order_data FROM public.orders WHERE id=$1', [orderId]))
      .rows[0].order_data;
    assert.equal(originalOrder.items[1].productId, '');
    assert.equal(Object.hasOwn(originalOrder.items[2], 'productId'), false);
    assert.equal(originalOrder.items[3].productId, 'not-a-uuid');

    const invalidOrderId = `${orderId}_invalid`;
    await db.query(`INSERT INTO public.orders VALUES ($1, 'sale', 'scheduled', false, $2::jsonb, 1, now())`,
      [invalidOrderId, JSON.stringify({ items: [{ description: 'NCM inválido' }], payments: [] })]);
    const invalidSelection = { '1': { ...classification, ncm: '00000000' } };
    await assert.rejects(db.query(`
      SELECT public.prepare_nfe_fiscal_snapshot(
        $1::text, $2::uuid, '55'::varchar(2), 2, '1'::varchar(4), 1, '{}'::jsonb, $3::jsonb
      )`, [invalidOrderId, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', JSON.stringify(invalidSelection)]),
    /NCM_NOT_ACTIVE/);
    const sequence = (await db.query(
      "SELECT ultimo_numero FROM public.nfe_sequences WHERE modelo='55' AND serie='1' AND ambiente=2"
    )).rows[0].ultimo_numero;
    assert.equal(sequence, 1, 'failed snapshot validation does not consume another number');
  } finally {
    await db.close();
  }
  console.log('Fiscal snapshot legacy productId: valid UUID retained; empty, omitted/undefined and invalid IDs normalized; fiscal data preserved; one number reserved on success and none on validation failure.');
}

main().catch((error) => {
  console.error(`Fiscal snapshot legacy productId test failed: ${error.message}`);
  process.exitCode = 1;
});
