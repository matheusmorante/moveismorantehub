const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');

(async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE goods_receipts (id uuid PRIMARY KEY, status text);
    CREATE TABLE goods_receipt_items (receipt_id uuid, item_index integer, product_id uuid,
      variation_id uuid, quantity numeric, unit_cost numeric, item_snapshot jsonb,
      PRIMARY KEY(receipt_id,item_index));
    CREATE TABLE products (id uuid PRIMARY KEY, stock numeric);
    CREATE TABLE product_variations (id uuid PRIMARY KEY, product_id uuid, stock integer);
    CREATE TABLE inventory_moves (source_receipt_id uuid, source_item_index integer,
      product_id uuid, variation_id uuid, quantity numeric, status text,
      PRIMARY KEY(source_receipt_id,source_item_index));
    CREATE FUNCTION confirm_goods_receipt_transaction(p_receipt jsonb, p_items jsonb)
      RETURNS jsonb LANGUAGE plpgsql AS $$
    DECLARE v_item record; v_id uuid := (p_receipt->>'id')::uuid; BEGIN
      INSERT INTO goods_receipts VALUES(v_id,'received') ON CONFLICT(id) DO NOTHING;
      FOR v_item IN SELECT value, ordinality::integer AS item_index
        FROM jsonb_array_elements(p_items) WITH ORDINALITY LOOP
        INSERT INTO goods_receipt_items VALUES(v_id,v_item.item_index,
          NULLIF(v_item.value->>'productId','')::uuid,
          NULLIF(v_item.value->>'variationId','')::uuid,
          (v_item.value->>'quantity')::numeric,
          NULLIF(v_item.value->>'unitCost','')::numeric,v_item.value) ON CONFLICT DO NOTHING;
        IF v_item.value->>'productId' IS NOT NULL AND p_receipt->>'simulateMissing' IS DISTINCT FROM 'true' THEN
          INSERT INTO inventory_moves VALUES(v_id,v_item.item_index,
            (v_item.value->>'productId')::uuid,NULLIF(v_item.value->>'variationId','')::uuid,
            (v_item.value->>'quantity')::numeric,'effective') ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
      RETURN jsonb_build_object('receiptId',v_id,'status','received');
    END $$;
    CREATE FUNCTION set_goods_receipt_inventory_status_transaction(
      p_receipt_id uuid,p_status text,p_reason text) RETURNS jsonb LANGUAGE plpgsql AS $$
    BEGIN
      UPDATE goods_receipts SET status=p_status WHERE id=p_receipt_id;
      UPDATE inventory_moves SET status=CASE WHEN p_status='estornado' THEN 'reversed' ELSE 'effective' END
        WHERE source_receipt_id=p_receipt_id;
      RETURN jsonb_build_object('receiptId',p_receipt_id,'status',p_status);
    END $$;
    CREATE FUNCTION apply_order_document_stock_delta(
      p_product_id uuid,p_variation_id uuid,p_delta numeric,p_entry_unit_cost numeric DEFAULT NULL)
      RETURNS void LANGUAGE plpgsql AS $$ BEGIN
      IF p_delta <> trunc(p_delta) THEN RAISE EXCEPTION 'Quantidade não inteira'; END IF;
      UPDATE product_variations SET stock=stock+p_delta
        WHERE id=p_variation_id AND product_id=p_product_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Variação inválida'; END IF;
      UPDATE products SET stock=stock+p_delta WHERE id=p_product_id;
    END $$;
  `);
  const migration = fs.readFileSync(path.join(__dirname,
    '../migrations/20260926170000_check_goods_receipt_inventory_transactions.sql'), 'utf8');
  await db.exec(migration);

  const productId = '11111111-1111-4111-8111-111111111111';
  const variationId = '22222222-2222-4222-8222-222222222222';
  const receiptId = '33333333-3333-4333-8333-333333333333';
  const item = { productId, variationId, quantity: 2 };
  await db.query('INSERT INTO products VALUES ($1,10)', [productId]);
  await db.query('INSERT INTO product_variations VALUES ($1,$2,10)', [variationId, productId]);
  const stock = async () => Number((await db.query('SELECT stock FROM products WHERE id=$1', [productId])).rows[0].stock);
  const confirm = (id, items, extra = {}) => db.query(
    'SELECT confirm_goods_receipt_checked_transaction($1::jsonb,$2::jsonb)',
    [JSON.stringify({ id, ...extra }), JSON.stringify(items)]);
  const change = (id, status) => db.query(
    'SELECT set_goods_receipt_inventory_status_checked_transaction($1::uuid,$2,$3)',
    [id, status, 'teste']);
  const status = async (id) => (await db.query('SELECT status FROM goods_receipts WHERE id=$1', [id])).rows[0]?.status;
  const moveStatus = async (id) => (await db.query(
    'SELECT status FROM inventory_moves WHERE source_receipt_id=$1', [id])).rows[0]?.status;

  await confirm(receiptId, [item]);
  assert.equal(await stock(), 12);
  await confirm(receiptId, [item]);
  assert.equal(await stock(), 12);
  assert.equal((await db.query('SELECT count(*) AS count FROM inventory_moves WHERE source_receipt_id=$1',
    [receiptId])).rows[0].count, 1);
  await assert.rejects(confirm(receiptId, [{ ...item, quantity: 3 }]), /itens diferentes/);
  await change(receiptId, 'estornado');
  assert.equal(await stock(), 10);
  assert.equal(await status(receiptId), 'estornado');
  assert.equal(await moveStatus(receiptId), 'reversed');
  await assert.rejects(confirm(receiptId, [item]), /reativado/);
  await change(receiptId, 'received');
  assert.equal(await stock(), 12);
  assert.equal(await status(receiptId), 'received');
  assert.equal(await moveStatus(receiptId), 'effective');

  const missingId = '44444444-4444-4444-8444-444444444444';
  await assert.rejects(confirm(missingId, [item], { simulateMissing: true }), /Entrada de estoque/);
  assert.equal(await status(missingId), undefined);

  await db.query('DELETE FROM inventory_moves WHERE source_receipt_id=$1', [receiptId]);
  await assert.rejects(change(receiptId, 'estornado'), /movimentações de estoque incompletas/);
  assert.equal(await status(receiptId), 'received');
  await assert.rejects(db.query('SELECT delete_goods_receipt_draft_transaction($1::uuid)', [receiptId]), /não pode ser excluído/);
  assert.equal(await status(receiptId), 'received');
  const draftId = '55555555-5555-4555-8555-555555555555';
  await db.query("INSERT INTO goods_receipts(id,status) VALUES ($1,'draft')", [draftId]);
  await db.query('SELECT delete_goods_receipt_draft_transaction($1::uuid)', [draftId]);
  assert.equal(await status(draftId), undefined);
  console.log('Recebimento: confirmação, estorno, repetição e rollback por entrada ausente OK');
  await db.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
