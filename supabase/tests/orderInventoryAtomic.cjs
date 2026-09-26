const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');

(async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE products (id uuid PRIMARY KEY, description text, name text, cost_price numeric,
      stock numeric, is_combo boolean DEFAULT false, combo_items jsonb DEFAULT '[]'::jsonb);
    CREATE TABLE product_variations (id uuid PRIMARY KEY, product_id uuid REFERENCES products(id),
      stock integer, cost_price numeric, opening_cost_price numeric);
    CREATE TABLE orders (id text PRIMARY KEY, order_index integer UNIQUE, status text,
      order_type text, items jsonb, order_data jsonb, stock_processed boolean, linked_order_id text);
    CREATE TABLE order_items (order_id text, item_index integer, cost_price numeric, item_snapshot jsonb);
    CREATE TABLE order_status_history (order_id text, old_status text, new_status text, changed_by text);
    CREATE TABLE inventory_moves (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id text,
      variation_id text, product_description text, type text, quantity numeric, date timestamptz,
      label text, unit_cost numeric, unit_price numeric, observation text, order_id text,
      related_entity_id text, status text, reason text, created_at timestamptz DEFAULT now());
    CREATE FUNCTION save_order_transaction(p_order_id text, p_order_payload jsonb, p_items jsonb,
      p_payments jsonb, p_is_update boolean) RETURNS jsonb LANGUAGE plpgsql AS $$
    DECLARE v_item record; BEGIN
      INSERT INTO orders(id, order_index, status, order_type, items, order_data, stock_processed, linked_order_id)
      VALUES (p_order_id, (p_order_payload->>'order_index')::integer,
        p_order_payload->>'status', p_order_payload->>'order_type', p_items,
        p_order_payload->'order_data', false, p_order_payload->>'linked_order_id')
      ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, order_type=EXCLUDED.order_type,
        items=EXCLUDED.items, order_data=EXCLUDED.order_data, stock_processed=EXCLUDED.stock_processed,
        linked_order_id=EXCLUDED.linked_order_id;
      DELETE FROM order_items WHERE order_id=p_order_id;
      FOR v_item IN SELECT value, ordinality::integer AS item_index
        FROM jsonb_array_elements(p_items) WITH ORDINALITY LOOP
        INSERT INTO order_items(order_id, item_index, cost_price, item_snapshot)
          VALUES (p_order_id, v_item.item_index, 0, v_item.value);
      END LOOP;
      RETURN jsonb_build_object('id', p_order_id,
        'order_index', (p_order_payload->>'order_index')::integer,
        'order_data', p_order_payload->'order_data');
    END $$;
  `);

  const migration = fs.readFileSync(path.join(__dirname,
    '../migrations/20260926160000_create_order_with_inventory_transaction.sql'), 'utf8');
  await db.exec(migration);
  const costMigration = fs.readFileSync(path.join(__dirname,
    '../migrations/20260926180000_preserve_opening_inventory_cost.sql'), 'utf8');
  await db.exec(costMigration);

  const p1 = '11111111-1111-4111-8111-111111111111';
  const v1 = '22222222-2222-4222-8222-222222222222';
  const p2 = '33333333-3333-4333-8333-333333333333';
  const v2 = '44444444-4444-4444-8444-444444444444';
  const p3 = '55555555-5555-4555-8555-555555555555';
  const v3 = '66666666-6666-4666-8666-666666666666';
  await db.query('INSERT INTO products(id,name,description,stock,cost_price) VALUES ($1,$2,$2,10,12),($3,$4,$4,5,8),($5,$6,$6,10,6)',
    [p1, 'Produto 1', p2, 'Produto 2', p3, 'Produto 3']);
  await db.query('INSERT INTO product_variations(id,product_id,stock) VALUES ($1,$2,10),($3,$4,5),($5,$6,10)',
    [v1, p1, v2, p2, v3, p3]);

  const item = (productId, variationId, quantity = 1, extra = {}) =>
    ({ productId, variationId, quantity, description: 'Item teste', ...extra });
  const call = (id, index, status, orderType, items, update = false, extraData = {}) => {
    const payload = { order_index: index, status, order_type: orderType,
      linked_order_id: extraData.linkedOrderId || null,
      order_data: { date: '2026-09-26T10:00:00.000Z', status, orderType, items, ...extraData } };
    return db.query('SELECT create_order_with_inventory_transaction($1,$2::jsonb,$3::jsonb,$4::jsonb,$5) AS result',
      [id, JSON.stringify(payload), JSON.stringify(items), '[]', update]);
  };
  const countMoves = async (id) => Number((await db.query(
    'SELECT count(*) AS count FROM inventory_moves WHERE source_order_id=$1', [id])).rows[0].count);
  const stock = async (id) => Number((await db.query(
    'SELECT stock FROM product_variations WHERE id=$1', [id])).rows[0].stock);
  const cost = async (id) => Number((await db.query(
    'SELECT cost_price FROM product_variations WHERE id=$1', [id])).rows[0].cost_price);

  const receiptMove = await db.query(`INSERT INTO inventory_moves(product_id,variation_id,type,quantity,unit_cost,date,status)
    VALUES ($1,$2,'entry',2,20,'2026-09-26T09:00:00Z','effective') RETURNING id`, [p3, v3]);
  await db.query('SELECT apply_order_document_stock_delta($1,$2,2,20)', [p3, v3]);
  assert.equal(await cost(v3), 20);
  await db.query("UPDATE inventory_moves SET status='reversed' WHERE id=$1", [receiptMove.rows[0].id]);
  await db.query('SELECT apply_order_document_stock_delta($1,$2,-2,NULL)', [p3, v3]);
  assert.equal(await cost(v3), 6);

  const saleItems = [item(p1, v1, 2)];
  const first = await call('sale-scheduled', 1, 'scheduled', 'sale', saleItems);
  assert.equal(first.rows[0].result.stock_processed, true);
  assert.equal(await countMoves('sale-scheduled'), 1);
  assert.equal(await stock(v1), 8);
  const saved = await db.query('SELECT order_data, stock_processed FROM orders WHERE id=$1', ['sale-scheduled']);
  assert.equal(saved.rows[0].stock_processed, true);
  assert.equal(saved.rows[0].order_data.items[0].cmvUnitCost, 12);

  await call('sale-scheduled', 1, 'scheduled', 'sale', saleItems);
  assert.equal(await countMoves('sale-scheduled'), 1);
  assert.equal(await stock(v1), 8);
  await call('sale-scheduled', 1, 'fulfilled', 'sale', saleItems, true);
  assert.equal(await countMoves('sale-scheduled'), 1);
  assert.equal(await stock(v1), 8);
  await call('sale-scheduled', 1, 'cancelled', 'sale', saleItems, true);
  assert.equal(Number((await db.query("SELECT count(*) AS count FROM inventory_moves WHERE source_order_id=$1 AND status='effective'",
    ['sale-scheduled'])).rows[0].count), 0);
  assert.equal(await stock(v1), 10);
  await call('sale-scheduled', 1, 'cancelled', 'sale', saleItems, true);
  assert.equal(await stock(v1), 10);
  await call('sale-scheduled', 1, 'scheduled', 'sale', saleItems, true);
  assert.equal(await stock(v1), 8);
  assert.equal(await countMoves('sale-scheduled'), 2); // fato antigo estornado + nova saída efetiva
  await call('sale-fulfilled', 2, 'fulfilled', 'sale', [item(p1, v1)]);
  assert.equal(await stock(v1), 7);

  await call('return-scheduled', 3, 'scheduled', 'return', [item(p1, v1, 1, { unitCost: 11 })]);
  assert.equal(await countMoves('return-scheduled'), 0);
  await call('return-fulfilled', 4, 'fulfilled', 'return', [item(p1, v1, 1, { unitCost: 11 })]);
  assert.equal(await countMoves('return-fulfilled'), 1);
  assert.equal(await stock(v1), 8);
  await call('sale-temporary', 5, 'scheduled', 'sale', [{ quantity: 1, isTemporaryProduct: true }]);
  assert.equal(await countMoves('sale-temporary'), 0);

  await call('sale-edited', 11, 'scheduled', 'sale', [item(p3, v3)]);
  await db.query('UPDATE product_variations SET cost_price=20 WHERE id=$1', [v3]);
  await call('sale-edited', 11, 'fulfilled', 'sale', [item(p3, v3)], true);
  const unchangedSale = await db.query('SELECT items FROM orders WHERE id=$1', ['sale-edited']);
  assert.equal(unchangedSale.rows[0].items[0].cmvUnitCost, 6);
  assert.equal(await countMoves('sale-edited'), 1);
  await call('sale-edited', 11, 'fulfilled', 'sale', [item(p3, v3, 2)], true);
  assert.equal(await stock(v3), 8);
  const editedMoves = await db.query('SELECT status, quantity FROM inventory_moves WHERE source_order_id=$1 ORDER BY quantity', ['sale-edited']);
  assert.deepEqual(editedMoves.rows.map(row => row.status), ['reversed', 'effective']);
  await call('sale-edited', 11, 'cancelled', 'sale', [item(p3, v3, 2)], true);
  assert.equal(await stock(v3), 10);

  await call('return-transition', 12, 'scheduled', 'return', [item(p3, v3, 1, { unitCost: 6 })]);
  assert.equal(await countMoves('return-transition'), 0);
  await call('return-transition', 12, 'fulfilled', 'return', [item(p3, v3, 1, { unitCost: 6 })], true);
  assert.equal(await stock(v3), 11);
  await call('return-transition', 12, 'cancelled', 'return', [item(p3, v3, 1, { unitCost: 6 })], true);
  assert.equal(await stock(v3), 10);

  const temporary = [{ quantity: 1, description: 'Item teste', isTemporaryProduct: true, unitCost: 6 }];
  await call('sale-reconciled', 13, 'scheduled', 'sale', temporary);
  await call('return-reconciled', 14, 'fulfilled', 'return', temporary, false,
    { linkedOrderId: 'sale-reconciled' });
  assert.equal(await countMoves('return-reconciled'), 0);
  await call('sale-reconciled', 13, 'scheduled', 'sale', [item(p3, v3)], true);
  assert.equal(await countMoves('sale-reconciled'), 1);
  assert.equal(await countMoves('return-reconciled'), 1);
  assert.equal(await stock(v3), 10);

  await assert.rejects(call('sale-invalid', 6, 'scheduled', 'sale',
    [item(p1, '77777777-7777-4777-8777-777777777777')]), /Variação/);
  await assert.rejects(call('sale-fractional', 16, 'scheduled', 'sale', [item(p1, v1, 0.5)]), /inteira/);
  assert.equal(await countMoves('sale-fractional'), 0);
  assert.equal(Number((await db.query('SELECT count(*) AS count FROM orders WHERE id=$1', ['sale-invalid'])).rows[0].count), 0);
  assert.equal(await countMoves('sale-invalid'), 0);

  await db.exec(`
    CREATE FUNCTION reject_test_move() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.source_order_id = 'sale-rejected' THEN RAISE EXCEPTION 'Falha de movimento simulada'; END IF;
      RETURN NEW; END $$;
    CREATE TRIGGER reject_test_move BEFORE INSERT ON inventory_moves
      FOR EACH ROW EXECUTE FUNCTION reject_test_move();
  `);
  await assert.rejects(call('sale-rejected', 7, 'scheduled', 'sale', [item(p1, v1)]), /Falha de movimento/);
  assert.equal(Number((await db.query('SELECT count(*) AS count FROM orders WHERE id=$1', ['sale-rejected'])).rows[0].count), 0);
  assert.equal(await stock(v1), 8);

  await db.query('UPDATE products SET is_combo=true, combo_items=$1::jsonb WHERE id=$2',
    [JSON.stringify([{ productId: p2, variationId: v2, quantity: 2 }]), p1]);
  await call('sale-combo', 8, 'scheduled', 'sale', [item(p1, v1)]);
  assert.equal(await countMoves('sale-combo'), 2);
  assert.equal(await stock(v1), 7);
  assert.equal(await stock(v2), 3);

  const twoSales = await Promise.all([
    call('sale-concurrent-1', 9, 'scheduled', 'sale', [item(p2, v2)]),
    call('sale-concurrent-2', 10, 'scheduled', 'sale', [item(p2, v2)]),
  ]);
  assert.equal(twoSales.length, 2);
  assert.equal(await stock(v2), 1);
  assert.equal(await countMoves('sale-concurrent-1'), 1);
  console.log('Pedido+estoque: saída, retorno, composição, idempotência, concorrência e rollback OK');
  await db.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
