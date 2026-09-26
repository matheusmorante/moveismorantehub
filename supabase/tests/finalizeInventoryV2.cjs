const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { PGlite } = require('@electric-sql/pglite');

(async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE TABLE public.products (id uuid PRIMARY KEY, stock numeric);
    CREATE TABLE public.product_variations (id uuid PRIMARY KEY, product_id uuid, stock numeric, merged_to_variation_id uuid);
    CREATE TABLE public.inventory_moves (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id text, variation_id text,
      product_description text, type text, quantity numeric, date timestamptz, label text,
      observation text, related_entity_id text, order_id text, status text, created_at timestamptz
    );
  `);
  const migration = fs.readFileSync(path.join(__dirname, '../migrations/20260925210000_finalize_inventory_counted_at_v2.sql'), 'utf8');
  await db.exec(migration);
  const p = '11111111-1111-4111-8111-111111111111';
  const v = '22222222-2222-4222-8222-222222222222';
  const audit = '33333333-3333-4333-8333-333333333333';
  const countedAt = new Date(Date.now() - 7200000).toISOString();
  const movedAt = new Date(Date.now() - 3600000).toISOString();
  await db.query('INSERT INTO products(id,stock) VALUES ($1,15)', [p]);
  await db.query('INSERT INTO product_variations(id,product_id,stock) VALUES ($1,$2,15)', [v,p]);
  await db.query(`INSERT INTO inventory_moves(product_id,variation_id,type,quantity,date,status,created_at)
    VALUES ($1,$2,'entry',5,$3,'effective',$3)`, [p,v,movedAt]);
  const observation = { inventoryAudit:true, inventoryCode:'TEST-1', status:'completed', items:[{productId:p,variationId:v,physicalCount:9,countedAt}] };
  const items = [{productId:p,variationId:v,name:'Produto',physicalCount:9,countedAt}];
  const call = () => db.query('SELECT public.finalize_inventory_transaction_v2($1,$2,$3::jsonb,$4::jsonb,$5) AS result',
    [audit,'TEST-1',JSON.stringify(observation),JSON.stringify(items),'Operador']);
  const first = await call();
  assert.equal(first.rows[0].result.status,'processed');
  const stock = await db.query('SELECT stock FROM product_variations WHERE id=$1',[v]);
  assert.equal(Number(stock.rows[0].stock),14);
  const second = await call();
  assert.equal(second.rows[0].result.status,'already_processed');
  await assert.rejects(db.query('SELECT public.finalize_inventory_transaction_v2($1,$2,$3::jsonb,$4::jsonb,$5)',
    [audit,'TEST-1',JSON.stringify(observation),JSON.stringify([{...items[0],physicalCount:99}]),'Operador']),
    /payload diferente/);
  const moves = await db.query("SELECT count(*) AS count FROM inventory_moves WHERE type='adjustment' AND variation_id=$1",[v]);
  assert.equal(Number(moves.rows[0].count),1);
  const blockedAudit = '44444444-4444-4444-8444-444444444444';
  await db.query(`INSERT INTO inventory_moves(product_id,variation_id,type,quantity,date,status,created_at)
    VALUES ($1,$2,'adjustment',0,$3,'effective',$3)`, [p,v,new Date(Date.now() - 1800000).toISOString()]);
  await assert.rejects(db.query('SELECT public.finalize_inventory_transaction_v2($1,$2,$3::jsonb,$4::jsonb,$5)',
    [blockedAudit,'TEST-1',JSON.stringify(observation),JSON.stringify(items),'Operador']), /Outro ajuste alterou/);
  const blockedMarker = await db.query('SELECT count(*) AS count FROM inventory_moves WHERE related_entity_id=$1',[blockedAudit]);
  assert.equal(Number(blockedMarker.rows[0].count),0);
  await db.query('UPDATE product_variations SET merged_to_variation_id=$1 WHERE id=$2',[p,v]);
  const mergeAudit = '55555555-5555-4555-8555-555555555555';
  await assert.rejects(db.query('SELECT public.finalize_inventory_transaction_v2($1,$2,$3::jsonb,$4::jsonb,$5)',
    [mergeAudit,'TEST-1',JSON.stringify(observation),JSON.stringify(items),'Operador']), /foi mesclada/);
  console.log('SQL v2: syntax, post-count movement, idempotency, adjustment conflict, merge conflict and rollback OK');
  await db.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
