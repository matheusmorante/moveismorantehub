const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');

(async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE nfe_sequences(modelo varchar(2), serie varchar(4), ambiente integer,
      ultimo_numero integer, updated_at timestamptz DEFAULT now(), PRIMARY KEY(modelo,serie,ambiente));
    CREATE TABLE orders (
      id uuid PRIMARY KEY, status text, order_type text, items jsonb, order_data jsonb,
      stock_processed boolean, order_index integer, linked_order_id text, return_order_id text,
      total_amount numeric DEFAULT 0, updated_at timestamptz DEFAULT now()
    );
    CREATE TABLE nfe_documents (
      id uuid PRIMARY KEY, order_id uuid REFERENCES orders(id), numero_nfe integer NOT NULL,
      serie varchar(4) NOT NULL DEFAULT '1', chave_acesso varchar(44), modelo varchar(2) NOT NULL DEFAULT '55',
      ambiente integer NOT NULL DEFAULT 2, status varchar(30) NOT NULL DEFAULT 'pendente', motivo_status text,
      xml_nfe text, xml_protocolo text, numero_protocolo varchar(30), danfe_url text,
      valor_total numeric(12,2) NOT NULL DEFAULT 0, destinatario_nome text, destinatario_documento text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
    );
    CREATE FUNCTION create_order_with_inventory_transaction(p_order_id text,p_order_payload jsonb,p_items jsonb,p_payments jsonb,p_is_update boolean)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE v_existing orders%ROWTYPE; BEGIN
        SELECT * INTO v_existing FROM orders WHERE id=p_order_id::uuid;
        IF FOUND THEN RETURN jsonb_build_object('id',v_existing.id,'idempotent_replay',true); END IF;
        INSERT INTO orders(id,status,order_type,items,order_data,order_index,linked_order_id,total_amount)
        VALUES(p_order_id::uuid,p_order_payload->>'status',p_order_payload->>'order_type',p_items,p_order_payload->'order_data',
          NULLIF(p_order_payload->>'order_index','')::integer,p_order_payload->>'linked_order_id',COALESCE((p_order_payload->>'total_amount')::numeric,0));
        RETURN jsonb_build_object('id',p_order_id,'idempotent_replay',false);
      END $$;
  `);
  const originalDuplicateGuard = fs.readFileSync(path.join(__dirname,
    '../migrations/20260926200000_prevent_duplicate_outbound_nfe.sql'), 'utf8');
  await db.exec(originalDuplicateGuard);
  const returnCapacityMigration = fs.readFileSync(path.join(__dirname,
    '../migrations/20260926220000_create_atomic_return_capacity_rpc.sql'), 'utf8');
  await db.exec(returnCapacityMigration);
  const eventsMigration = fs.readFileSync(path.join(__dirname,
    '../migrations/20260926230000_create_nfe_fiscal_events.sql'), 'utf8');
  await db.exec(eventsMigration);
  const migration = fs.readFileSync(path.join(__dirname,
    '../migrations/20260926240000_add_fiscal_lineage_and_return_allocations.sql'), 'utf8');
  await db.exec(migration);
  const multipleInvoicesMigration = fs.readFileSync(path.join(__dirname,
    '../migrations/20260926250000_support_multiple_outbound_invoices_per_order.sql'), 'utf8');
  await db.exec(multipleInvoicesMigration);
  const draftsMigration = fs.readFileSync(path.join(__dirname,
    '../migrations/20260926260000_create_nfe_operation_drafts.sql'), 'utf8');
  await db.exec(draftsMigration);
  const numberReservationMigration = fs.readFileSync(path.join(__dirname,
    '../migrations/20260926210000_reserve_next_nfe_number.sql'), 'utf8');
  await db.exec(numberReservationMigration);
  const atomicPersistenceMigration = fs.readFileSync(path.join(__dirname,
    '../migrations/20260926270000_persist_authorized_nfe_operation_atomically.sql'), 'utf8');
  await db.exec(atomicPersistenceMigration);
  const draftReviewMigration = fs.readFileSync(path.join(__dirname,
    '../migrations/20260926280000_save_nfe_operation_draft_review.sql'), 'utf8');
  await db.exec(draftReviewMigration);
  const safeDraftRetryMigration = fs.readFileSync(path.join(__dirname,
    '../migrations/20260926290000_support_safe_nfe_draft_retries_after_rejection.sql'), 'utf8');
  await db.exec(safeDraftRetryMigration);

  const saleId = '11111111-1111-4111-8111-111111111111';
  const documentId = '22222222-2222-4222-8222-222222222222';
  const returnId = '33333333-3333-4333-8333-333333333333';
  const saleItem = { productId: '44444444-4444-4444-8444-444444444444', code: 'SKU-1', description: 'Cadeira', quantity: 5 };
  await db.query('INSERT INTO orders(id,status,order_type,items,order_data) VALUES ($1,\'fulfilled\',\'sale\',$2::jsonb,$3::jsonb)',
    [saleId, JSON.stringify([saleItem]), JSON.stringify({ orderType: 'sale' })]);
  await db.query(`INSERT INTO nfe_documents(id,order_id,numero_nfe,modelo,ambiente,status,document_type)
    VALUES ($1,$2,700,'55',1,'autorizada','outbound')`, [documentId, saleId]);
  await db.query(`INSERT INTO nfe_document_items(document_id,item_number,product_code,description,billed_quantity,unit_value,gross_value,product_xml,taxes_xml)
    VALUES ($1,1,'SKU-1','Cadeira',1,25,25,'<prod/>','<imposto/>')`, [documentId]);
  await db.query(`INSERT INTO nfe_documents(id,order_id,numero_nfe,modelo,ambiente,status,document_type,emission_request_id)
    VALUES ('77777777-7777-4777-8777-777777777777',$1,701,'55',1,'autorizada','outbound','88888888-8888-4888-8888-888888888888'),
           ('99999999-9999-4999-8999-999999999999',$1,702,'55',1,'autorizada','outbound','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')`, [saleId]);
  await assert.rejects(db.query(`INSERT INTO nfe_documents(id,order_id,numero_nfe,modelo,ambiente,status,document_type,emission_request_id)
    VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',$1,703,'55',1,'autorizada','outbound','88888888-8888-4888-8888-888888888888')`, [saleId]), /unique|duplicate/i);
  await db.query(`INSERT INTO nfe_documents(id,order_id,numero_nfe,modelo,ambiente,status,document_type)
    VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',$1,704,'55',1,'processando','outbound')`, [saleId]);
  await assert.rejects(db.query(`INSERT INTO nfe_documents(id,order_id,numero_nfe,modelo,ambiente,status,document_type)
    VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',$1,705,'55',1,'pendente','outbound')`, [saleId]), /unique|duplicate/i);

  const payload = { order_type: 'return', linked_order_id: saleId, order_index: 1, status: 'scheduled',
    order_data: { orderType: 'return', linkedOrderId: saleId, returnRequestId: returnId, items: [] } };
  const items = [{ originalOrderItemIndex: 0, productId: saleItem.productId, code: 'SKU-1', description: 'Cadeira', quantity: 1, returnedQuantity: 1 }];
  const allocation = [{ returnItemIndex: 0, originalOrderItemIndex: 0, originalDocumentId: documentId, originalItemNumber: 1, quantity: 1 }];
  const create = (id, lineItems, sourceAllocations = allocation) => db.query(
    'SELECT create_return_order_with_fiscal_capacity($1,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb) AS result',
    [id, JSON.stringify(payload), JSON.stringify(lineItems), '[]', JSON.stringify(sourceAllocations)]);

  await create(returnId, items);
  await assert.rejects(create('55555555-5555-4555-8555-555555555555', [{ ...items[0], quantity: 2, returnedQuantity: 2 }],
    [{ ...allocation[0], quantity: 2 }]), /Quantidade acima do saldo faturado/);
  await assert.rejects(create('66666666-6666-4666-8666-666666666666', items,
    [{ ...allocation[0], originalItemNumber: 2 }]), /Linha fiscal autorizada não disponível/);
  await assert.rejects(create('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', [items[0], items[0]], [
    allocation[0], { ...allocation[0], returnItemIndex: 1 },
  ]), /Quantidade acima do saldo faturado/);
  await create(returnId, items);
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_return_item_allocations')).rows[0].count, 1);
  await db.query('UPDATE nfe_documents SET chave_acesso=$2 WHERE id=$1', [documentId, '1'.repeat(44)]);
  await db.query('UPDATE nfe_documents SET numero_protocolo=$2 WHERE id=$1', [documentId, '141260000123456']);
  const prepare = () => db.query(`SELECT prepare_nfe_operation_draft('return'::text,$1::uuid,$2::uuid,1::smallint,NULL::text,NULL::uuid) AS id`,
    [documentId, returnId]);
  await assert.rejects(prepare(), /atendida/);
  await db.query("UPDATE orders SET status='fulfilled' WHERE id=$1", [returnId]);
  await db.query('UPDATE nfe_documents SET numero_protocolo=NULL WHERE id=$1', [documentId]);
  await assert.rejects(prepare(), /não autorizado/);
  await db.query('UPDATE nfe_documents SET numero_protocolo=$2 WHERE id=$1', [documentId, '141260000123456']);
  let draftId = (await prepare()).rows[0].id;
  assert.equal((await prepare()).rows[0].id, draftId);
  const storedLine = (await db.query('SELECT quantity,gross_value FROM nfe_operation_draft_lines WHERE draft_id=$1', [draftId])).rows[0];
  assert.equal(Number(storedLine.quantity), 1);
  assert.equal(Number(storedLine.gross_value), 25);
  assert.equal((await db.query(`SELECT count(*) AS count FROM nfe_operation_draft_allocations`)).rows[0].count, 1);
  let draftLine = (await db.query('SELECT id FROM nfe_operation_draft_lines WHERE draft_id=$1', [draftId])).rows[0];
  const reviewData = { nature_of_operation: 'Devolucao de mercadoria', reason: '',
    recipient_xml: '<dest/>', totals_xml: '<total/>', transport_xml: '<transp/>', payment_xml: '<pag/>',
    item_taxes_confirmed: true, totals_confirmed: true };
  let reviewedLine = { draft_line_id: draftLine.id, cfop: '1202',
    product_xml: '<prod xmlns="http://www.portalfiscal.inf.br/nfe"><CFOP>1202</CFOP><qCom>1.0000</qCom></prod>',
    taxes_xml: '<imposto xmlns="http://www.portalfiscal.inf.br/nfe"><ICMS/></imposto>' };
  const saveReview = (lines = [reviewedLine]) => db.query(
    'SELECT save_nfe_operation_draft_review($1::uuid,$2::jsonb,$3::jsonb,NULL) AS id',
    [draftId, JSON.stringify(reviewData), JSON.stringify(lines)]);
  await assert.rejects(saveReview([{ ...reviewedLine, cfop: '5102' }]), /CFOP, quantidade/i);
  assert.equal((await db.query('SELECT status FROM nfe_operation_drafts WHERE id=$1', [draftId])).rows[0].status, 'draft');
  await saveReview();
  assert.equal((await db.query('SELECT status FROM nfe_operation_drafts WHERE id=$1', [draftId])).rows[0].status, 'ready');
  await db.query("UPDATE nfe_operation_drafts SET status='transmitting' WHERE id=$1", [draftId]);
  await db.query("UPDATE nfe_operation_drafts SET access_key=$2,signed_xml='<NFe/>' WHERE id=$1", [draftId, '2'.repeat(44)]);
  await assert.rejects(saveReview(), /disponível para revisão/i);
  await db.query("UPDATE nfe_operation_drafts SET status='rejected',sefaz_response_xml='<retEnviNFe><cStat>204</cStat><xMotivo>Duplicidade</xMotivo></retEnviNFe>' WHERE id=$1", [draftId]);
  const rejectedDraftId = draftId;
  const retryDraftId = (await prepare()).rows[0].id;
  assert.notEqual(retryDraftId, rejectedDraftId, 'rejeição deve iniciar novo rascunho sem apagar a tentativa anterior');
  const preservedRejected = (await db.query('SELECT status,access_key,signed_xml,sefaz_response_xml FROM nfe_operation_drafts WHERE id=$1', [rejectedDraftId])).rows[0];
  assert.equal(preservedRejected.status, 'rejected');
  assert.equal(preservedRejected.access_key, '2'.repeat(44));
  assert.equal(preservedRejected.signed_xml, '<NFe/>');
  assert.match(preservedRejected.sefaz_response_xml, /Duplicidade/);
  draftId = retryDraftId;
  draftLine = (await db.query('SELECT id FROM nfe_operation_draft_lines WHERE draft_id=$1', [draftId])).rows[0];
  reviewedLine = { ...reviewedLine, draft_line_id: draftLine.id };
  await saveReview();
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_operation_draft_allocations')).rows[0].count, 2,
    'alocação física pode permanecer vinculada ao rascunho rejeitado e ao novo ativo');
  const fiscalDocumentId = 'abababab-abab-4bab-8bab-abababababab';
  const fiscalReturnKey = `${'2'.repeat(20)}55${'001'}${'000000800'}1${'12345678'}0`;
  await db.query("UPDATE nfe_operation_drafts SET status='transmitting',access_key=$2,signed_xml='<NFe/>' WHERE id=$1", [draftId, fiscalReturnKey]);
  const authorizedItem = [{ draft_line_id: draftLine.id, item_number: 1, product_code: 'SKU-1',
    description: 'Cadeira', quantity: 1, unit_value: 25, gross_value: 25, discount_value: 0,
    product_xml: reviewedLine.product_xml, taxes_xml: reviewedLine.taxes_xml }];
  const persistAuthorized = () => db.query(`SELECT persist_authorized_nfe_operation_draft(
    $1::uuid,$2::uuid,800,'1',$3,'<NFe/>','<retEnviNFe/>','141260000999999',
    '2026-09-26T12:00:00-03:00'::timestamptz,'autorizada','Autorizado', $4::jsonb) AS id`,
  [draftId, fiscalDocumentId, fiscalReturnKey, JSON.stringify(authorizedItem)]);
  const invalidItem = [{ ...authorizedItem[0], product_xml: '<prod/>' }];
  await assert.rejects(db.query(`SELECT persist_authorized_nfe_operation_draft(
    $1::uuid,$2::uuid,800,'1',$3,'<NFe/>','<retEnviNFe/>','141260000999999',
    '2026-09-26T12:00:00-03:00'::timestamptz,'autorizada','Autorizado',$4::jsonb)`,
  [draftId, fiscalDocumentId, fiscalReturnKey, JSON.stringify(invalidItem)]), /Item transmitido/i);
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_documents WHERE id=$1', [fiscalDocumentId])).rows[0].count, 0);
  const mismatchedKey = `${fiscalReturnKey.slice(0, -1)}${fiscalReturnKey.endsWith('0') ? '1' : '0'}`;
  await assert.rejects(db.query(`SELECT persist_authorized_nfe_operation_draft(
    $1::uuid,$2::uuid,800,'1',$3,'<NFe/>','<retEnviNFe/>','141260000999999',
    '2026-09-26T12:00:00-03:00'::timestamptz,'autorizada','Autorizado',$4::jsonb)`,
  [draftId, fiscalDocumentId, mismatchedKey, JSON.stringify(authorizedItem)]), /diverge da chave\/XML/i);
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_documents WHERE id=$1', [fiscalDocumentId])).rows[0].count, 0,
    'falha ao conferir a tentativa precisa reverter a inserção fiscal inteira');
  await persistAuthorized();
  await persistAuthorized();
  assert.equal((await db.query('SELECT status FROM nfe_operation_drafts WHERE id=$1', [draftId])).rows[0].status, 'authorized');
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_document_items WHERE document_id=$1', [fiscalDocumentId])).rows[0].count, 1);
  assert.equal((await db.query('SELECT fiscal_return_document_id FROM nfe_return_item_allocations WHERE return_order_id=$1', [returnId])).rows[0].fiscal_return_document_id, fiscalDocumentId);
  await assert.rejects(db.query(`INSERT INTO nfe_operation_drafts(operation_kind,finalidade,original_document_id,
    original_access_key,return_order_id,environment) VALUES ('return',4,$1,$2,$3,1)`,
  [documentId, '1'.repeat(44), returnId]), /unique|duplicate/i);
  await assert.rejects(db.query(`INSERT INTO nfe_operation_drafts(operation_kind,finalidade,original_document_id,
    original_access_key,environment) VALUES ('estorno',4,$1,$2,1)`,
  [documentId, '1'.repeat(44)]), /check|violates/i);
  console.log('Linhas fiscais: autorização, limite faturado, vínculo, persistência atômica e replay idempotente OK');
  await db.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
