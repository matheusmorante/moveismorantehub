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
      id text PRIMARY KEY, status text, order_type text, items jsonb, order_data jsonb,
      stock_processed boolean, order_index integer, linked_order_id text, return_order_id text,
      delivery_status text, delivery_started_at timestamptz, delivery_arrived_at timestamptz,
      delivery_finished_at timestamptz, total_amount numeric DEFAULT 0, updated_at timestamptz DEFAULT now()
    );
    CREATE TABLE nfe_documents (
      id uuid PRIMARY KEY, order_id text REFERENCES orders(id), numero_nfe integer NOT NULL,
      serie varchar(4) NOT NULL DEFAULT '1', chave_acesso varchar(44), modelo varchar(2) NOT NULL DEFAULT '55',
      ambiente integer NOT NULL DEFAULT 2, status varchar(30) NOT NULL DEFAULT 'pendente', motivo_status text,
      xml_nfe text, xml_protocolo text, numero_protocolo varchar(30), danfe_url text,
      valor_total numeric(12,2) NOT NULL DEFAULT 0, destinatario_nome text, destinatario_documento text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
    );
    CREATE FUNCTION create_order_with_inventory_transaction(p_order_id text,p_order_payload jsonb,p_items jsonb,p_payments jsonb,p_is_update boolean)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE v_existing orders%ROWTYPE; BEGIN
        SELECT * INTO v_existing FROM orders WHERE id=p_order_id;
        IF FOUND THEN RETURN jsonb_build_object('id',v_existing.id,'idempotent_replay',true); END IF;
        INSERT INTO orders(id,status,order_type,items,order_data,order_index,linked_order_id,total_amount)
        VALUES(p_order_id,p_order_payload->>'status',p_order_payload->>'order_type',p_items,p_order_payload->'order_data',
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
  const nfceEstornoMigration = fs.readFileSync(path.join(__dirname,
    '../migrations/20261008120000_allow_nfce_source_for_nfe_estorno.sql'), 'utf8');
  await db.exec(nfceEstornoMigration);
  const returnEnvironmentMigration = fs.readFileSync(path.join(__dirname,
    '../migrations/20261001163000_nfe_return_environment_isolation.sql'), 'utf8');
  await db.exec(returnEnvironmentMigration);
  await db.exec(fs.readFileSync(path.join(__dirname,
    '../migrations/20261001183000_nfe_return_product_identity.sql'), 'utf8'));
  // Exercise the canonical restoration against the exact missing-RPC state
  // found remotely, including the restricted Data API grants.
  await db.exec('DROP FUNCTION public.create_return_order_with_capacity(text,jsonb,jsonb,jsonb)');
  await db.exec(fs.readFileSync(path.join(__dirname,
    '../migrations/20261001190000_restore_atomic_return_capacity_rpc.sql'), 'utf8'));
  const grants = await db.query(`SELECT
    has_function_privilege('anon', 'public.create_return_order_with_capacity(text,jsonb,jsonb,jsonb)', 'EXECUTE') AS anon,
    has_function_privilege('authenticated', 'public.create_return_order_with_capacity(text,jsonb,jsonb,jsonb)', 'EXECUTE') AS authenticated`);
  assert.deepEqual(grants.rows[0], { anon: false, authenticated: true });
  await db.exec(fs.readFileSync(path.join(__dirname,
    '../migrations/20261001200000_persist_nfe_operation_totals.sql'), 'utf8'));

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
  const originalAccessKey = '41' + '2610' + '12345678000195' + '55' + '001' + '000000700' + '1' + '00000000' + '0';
  await db.query('UPDATE nfe_documents SET chave_acesso=$2 WHERE id=$1', [documentId, originalAccessKey]);
  await db.query('UPDATE nfe_documents SET numero_protocolo=$2 WHERE id=$1', [documentId, '141260000123456']);
  const prepare = () => db.query(`SELECT prepare_nfe_operation_draft('return'::text,$1::uuid,$2::text,1::smallint,NULL::text,NULL::uuid) AS id`,
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
  await db.query("UPDATE nfe_operation_drafts SET status='transmitting',access_key=$2,signed_xml='<NFe><total><ICMSTot><vNF>25.00</vNF></ICMSTot></total></NFe>' WHERE id=$1", [draftId, fiscalReturnKey]);
  const authorizedItem = [{ draft_line_id: draftLine.id, item_number: 1, product_code: 'SKU-1',
    description: 'Cadeira', quantity: 1, unit_value: 25, gross_value: 25, discount_value: 0,
    product_xml: reviewedLine.product_xml, taxes_xml: reviewedLine.taxes_xml }];
  const authorizedXml = '<NFe><total><ICMSTot><vNF>25.00</vNF></ICMSTot></total></NFe>';
  const persistAuthorized = (xml = authorizedXml) => db.query(`SELECT persist_authorized_nfe_operation_draft(
    $1::uuid,$2::uuid,800,'1',$3,$5,'<retEnviNFe/>','141260000999999',
    '2026-09-26T12:00:00-03:00'::timestamptz,'autorizada','Autorizado', $4::jsonb) AS id`,
  [draftId, fiscalDocumentId, fiscalReturnKey, JSON.stringify(authorizedItem), xml]);
  const invalidItem = [{ ...authorizedItem[0], product_xml: '<prod/>' }];
  await assert.rejects(db.query(`SELECT persist_authorized_nfe_operation_draft(
    $1::uuid,$2::uuid,800,'1',$3,'<NFe><total><ICMSTot><vNF>25.00</vNF></ICMSTot></total></NFe>','<retEnviNFe/>','141260000999999',
    '2026-09-26T12:00:00-03:00'::timestamptz,'autorizada','Autorizado',$4::jsonb)`,
  [draftId, fiscalDocumentId, fiscalReturnKey, JSON.stringify(invalidItem)]), /Item transmitido/i);
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_documents WHERE id=$1', [fiscalDocumentId])).rows[0].count, 0);
  const mismatchedKey = `${fiscalReturnKey.slice(0, -1)}${fiscalReturnKey.endsWith('0') ? '1' : '0'}`;
  await assert.rejects(db.query(`SELECT persist_authorized_nfe_operation_draft(
    $1::uuid,$2::uuid,800,'1',$3,'<NFe><total><ICMSTot><vNF>25.00</vNF></ICMSTot></total></NFe>','<retEnviNFe/>','141260000999999',
    '2026-09-26T12:00:00-03:00'::timestamptz,'autorizada','Autorizado',$4::jsonb)`,
  [draftId, fiscalDocumentId, mismatchedKey, JSON.stringify(authorizedItem)]), /diverge da chave\/XML/i);
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_documents WHERE id=$1', [fiscalDocumentId])).rows[0].count, 0,
    'falha ao conferir a tentativa precisa reverter a inserção fiscal inteira');
  await db.query("UPDATE nfe_operation_drafts SET signed_xml='<NFe/>' WHERE id=$1", [draftId]);
  await assert.rejects(persistAuthorized('<NFe/>'), /Total vNF.*ausente/i);
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_documents WHERE id=$1', [fiscalDocumentId])).rows[0].count, 0);
  assert.equal((await db.query('SELECT fiscal_return_document_id FROM nfe_return_item_allocations WHERE return_order_id=$1', [returnId])).rows[0].fiscal_return_document_id, null);
  assert.equal((await db.query('SELECT status FROM nfe_operation_drafts WHERE id=$1', [draftId])).rows[0].status, 'transmitting');
  await db.query('UPDATE nfe_operation_drafts SET signed_xml=$2 WHERE id=$1', [draftId, authorizedXml]);
  await persistAuthorized();
  await persistAuthorized();
  assert.equal((await db.query('SELECT status FROM nfe_operation_drafts WHERE id=$1', [draftId])).rows[0].status, 'authorized');
  assert.equal(Number((await db.query('SELECT valor_total FROM nfe_documents WHERE id=$1', [fiscalDocumentId])).rows[0].valor_total), 25);
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_document_items WHERE document_id=$1', [fiscalDocumentId])).rows[0].count, 1);
  assert.equal((await db.query('SELECT fiscal_return_document_id FROM nfe_return_item_allocations WHERE return_order_id=$1', [returnId])).rows[0].fiscal_return_document_id, fiscalDocumentId);
  await assert.rejects(db.query(`INSERT INTO nfe_operation_drafts(operation_kind,finalidade,original_document_id,
    original_access_key,return_order_id,environment) VALUES ('return',4,$1,$2,$3,1)`,
  [documentId, '1'.repeat(44), returnId]), /unique|duplicate/i);
  await assert.rejects(db.query(`INSERT INTO nfe_operation_drafts(operation_kind,finalidade,original_document_id,
    original_access_key,environment) VALUES ('estorno',4,$1,$2,1)`,
  [documentId, '1'.repeat(44)]), /check|violates/i);

  const hmlSaleId = '12121212-1212-4212-8212-121212121212';
  const hmlDocumentId = '23232323-2323-4232-8232-232323232323';
  const runId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const hmlSaleData = { orderType: 'sale', is_test: true, test_environment: 'homologation', testRunId: runId };
  await db.query('INSERT INTO orders(id,status,order_type,items,order_data) VALUES ($1,\'fulfilled\',\'sale\',$2::jsonb,$3::jsonb)',
    [hmlSaleId, JSON.stringify([saleItem]), JSON.stringify(hmlSaleData)]);
  await db.query(`INSERT INTO nfe_documents(id,order_id,numero_nfe,modelo,ambiente,status,document_type)
    VALUES ($1,$2,900,'55',2,'homologada','outbound'),
           ('78787878-7878-4787-8787-787878787878',$2,901,'55',1,'autorizada','outbound')`, [hmlDocumentId, hmlSaleId]);
  await db.query(`INSERT INTO nfe_document_items(document_id,item_number,product_code,description,billed_quantity,unit_value,gross_value,product_xml,taxes_xml)
    VALUES ($1,1,$2,$3,5,25,125,'<prod/>','<imposto/>')`,
    [hmlDocumentId, saleItem.productId, 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL']);
  await db.query(`INSERT INTO nfe_document_items(document_id,item_number,product_code,description,billed_quantity,unit_value,gross_value,product_xml,taxes_xml)
    VALUES ('78787878-7878-4787-8787-787878787878',1,'SKU-1','Cadeira',5,25,125,'<prod/>','<imposto/>')`);
  const hmlReturnId = '34343434-3434-4434-8434-343434343434';
  const hmlReturnPayload = { order_type: 'return', linked_order_id: hmlSaleId, order_index: 2, status: 'scheduled',
    order_data: { orderType: 'return', linkedOrderId: hmlSaleId, returnRequestId: hmlReturnId,
      is_test: true, test_environment: 'homologation', testRunId: runId } };
  const hmlPartialItems = [{ originalOrderItemIndex: 0, productId: saleItem.productId, code: 'SKU-1',
    description: 'Cadeira', quantity: 2, returnedQuantity: 2 }];
  const hmlAllocation = [{ returnItemIndex: 0, originalOrderItemIndex: 0, originalDocumentId: hmlDocumentId,
    originalItemNumber: 1, quantity: 2 }];
  const createHmlReturn = (id, itemRows = hmlPartialItems, fiscalRows = hmlAllocation, payload = hmlReturnPayload) => db.query(
    'SELECT create_return_order_with_fiscal_capacity($1,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb) AS result',
    [id, JSON.stringify(payload), JSON.stringify(itemRows), '[]', JSON.stringify(fiscalRows)]);

  const injectedFailureReturnId = '90909090-9090-4090-8090-909090909090';
  const injectedFailurePayload = { ...hmlReturnPayload,
    order_data: { ...hmlReturnPayload.order_data, returnRequestId: injectedFailureReturnId } };
  await db.exec(`CREATE FUNCTION reject_test_return_allocation() RETURNS trigger
    LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected return allocation failure'; END $$;
    CREATE TRIGGER reject_test_return_allocation BEFORE INSERT ON nfe_return_item_allocations
    FOR EACH ROW EXECUTE FUNCTION reject_test_return_allocation();`);
  await assert.rejects(createHmlReturn(injectedFailureReturnId, hmlPartialItems, hmlAllocation, injectedFailurePayload),
    /injected return allocation failure/);
  assert.equal((await db.query('SELECT count(*) AS count FROM orders WHERE id=$1', [injectedFailureReturnId])).rows[0].count, 0,
    'falha na gravação da alocação precisa reverter a devolução comercial');
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_return_item_allocations WHERE return_order_id=$1',
    [injectedFailureReturnId])).rows[0].count, 0,
    'falha na gravação da alocação não pode deixar vínculo fiscal parcial');
  await db.exec('DROP TRIGGER reject_test_return_allocation ON nfe_return_item_allocations; DROP FUNCTION reject_test_return_allocation()');

  const concurrentReturnId = '91919191-9191-4191-8191-919191919191';
  const concurrentPayload = { ...hmlReturnPayload,
    order_data: { ...hmlReturnPayload.order_data, returnRequestId: concurrentReturnId } };
  const concurrentResults = await Promise.all([
    createHmlReturn(concurrentReturnId, hmlPartialItems, hmlAllocation, concurrentPayload),
    createHmlReturn(concurrentReturnId, hmlPartialItems, hmlAllocation, concurrentPayload),
  ]);
  const concurrentReplayFlags = concurrentResults.map((result) => result.rows[0].result.idempotent_replay).sort();
  assert.deepEqual(concurrentReplayFlags, [false, true],
    'duas chamadas concorrentes com a mesma chave comercial criam uma devolução e retornam um replay');
  assert.equal((await db.query('SELECT count(*) AS count FROM orders WHERE id=$1', [concurrentReturnId])).rows[0].count, 1);
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_return_item_allocations WHERE return_order_id=$1',
    [concurrentReturnId])).rows[0].count, 1);

  const hmlCreated = (await createHmlReturn(hmlReturnId)).rows[0].result;
  assert.equal(hmlCreated.idempotent_replay, false);
  // Real HML serialization uses the product UUID as cProd and a mandated xProd;
  // the commercial return keeps its SKU and actual product description.
  for (const [id, invalidFields] of [
    ['10101010-1010-4010-8010-101010101010', { productId: '99999999-9999-4999-8999-999999999999' }],
    ['20202020-2020-4020-8020-202020202020', { variationId: '99999999-9999-4999-8999-999999999999' }],
    ['30303030-3030-4030-8030-303030303030', { description: 'Outro produto' }],
  ]) {
    const invalidItems = [{ ...hmlPartialItems[0], quantity: 1, returnedQuantity: 1,
      code: saleItem.productId, ...invalidFields }];
    const invalidPayload = { ...hmlReturnPayload, order_data: { ...hmlReturnPayload.order_data, returnRequestId: id } };
    await assert.rejects(createHmlReturn(id, invalidItems, [{ ...hmlAllocation[0], quantity: 1 }], invalidPayload),
      /não corresponde à linha original/);
    assert.equal((await db.query('SELECT count(*) AS count FROM orders WHERE id=$1', [id])).rows[0].count, 0);
    assert.equal((await db.query('SELECT count(*) AS count FROM nfe_return_item_allocations WHERE return_order_id=$1', [id])).rows[0].count, 0);
  }
  const storedHmlMarkers = (await db.query('SELECT order_data FROM orders WHERE id=$1', [hmlReturnId])).rows[0].order_data;
  assert.deepEqual({ is_test: storedHmlMarkers.is_test, test_environment: storedHmlMarkers.test_environment,
    testRunId: storedHmlMarkers.testRunId }, { is_test: true, test_environment: 'homologation', testRunId: runId });
  assert.equal((await createHmlReturn(hmlReturnId)).rows[0].result.idempotent_replay, true,
    'replay HML com mesma origem/alocação precisa retornar o pedido existente');
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_return_item_allocations WHERE return_order_id=$1', [hmlReturnId])).rows[0].count, 1);
  const mismatchedReplayPayload = { ...hmlReturnPayload, order_data: { ...hmlReturnPayload.order_data, testRunId: `${runId}_OTHER` } };
  await assert.rejects(createHmlReturn(hmlReturnId, hmlPartialItems, hmlAllocation, mismatchedReplayPayload), /isolamento do ambiente|testRunId/);

  const excessReturnId = '45454545-4545-4454-8454-454545454545';
  const excessiveItems = [{ ...hmlPartialItems[0], quantity: 4, returnedQuantity: 4 }];
  const excessiveAllocation = [{ ...hmlAllocation[0], quantity: 4 }];
  const excessPayload = { ...hmlReturnPayload, order_data: { ...hmlReturnPayload.order_data, returnRequestId: excessReturnId } };
  await assert.rejects(createHmlReturn(excessReturnId, excessiveItems, excessiveAllocation, excessPayload), /Quantidade acima do saldo faturado/);
  assert.equal((await db.query('SELECT count(*) AS count FROM orders WHERE id=$1', [excessReturnId])).rows[0].count, 0,
    'excesso de saldo deve falhar antes de criar devolução comercial');

  // HML markers may not allocate against a Production NF-e, even on the same sale.
  const hmlWithProductionDoc = [{ ...hmlAllocation[0], originalDocumentId: '78787878-7878-4787-8787-787878787878' }];
  const badCrossEnvId = '56565656-5656-4565-8565-565656565656';
  const badCrossEnvPayload = { ...hmlReturnPayload, order_data: { ...hmlReturnPayload.order_data, returnRequestId: badCrossEnvId } };
  await assert.rejects(createHmlReturn(badCrossEnvId, hmlPartialItems, hmlWithProductionDoc, badCrossEnvPayload), /Produção/);
  assert.equal((await db.query('SELECT count(*) AS count FROM orders WHERE id=$1', [badCrossEnvId])).rows[0].count, 0);
  const hmlForProductionSourcePayload = { ...payload, order_data: { ...payload.order_data, testRunId: runId,
    is_test: true, test_environment: 'homologation' } };
  const hmlForProductionId = '67676767-6767-4676-8676-676767676767';
  await assert.rejects(createHmlReturn(hmlForProductionId, items, allocation, hmlForProductionSourcePayload), /Produção/);
  assert.equal((await db.query('SELECT count(*) AS count FROM orders WHERE id=$1', [hmlForProductionId])).rows[0].count, 0);

  await db.query('UPDATE orders SET status=\'fulfilled\' WHERE id=$1', [hmlReturnId]);
  await db.query('UPDATE nfe_documents SET chave_acesso=$2,numero_protocolo=$3 WHERE id=$1',
    [hmlDocumentId, '41' + '2610' + '12345678000195' + '55' + '001' + '000000900' + '1' + '00000000' + '0', '141260000123457']);
  const prepareHml = (environment) => db.query(`SELECT prepare_nfe_operation_draft('return'::text,$1::uuid,$2::text,$3::smallint,NULL::text,NULL::uuid) AS id`,
    [hmlDocumentId, hmlReturnId, environment]);
  await assert.rejects(prepareHml(1), /não autorizado no ambiente selecionado/,
    'uma NF-e HML não pode iniciar devolução com environment=1');
  const hmlDraftId = (await prepareHml(2)).rows[0].id;
  assert.equal((await prepareHml(2)).rows[0].id, hmlDraftId, 'rascunho de devolução HML deve ser idempotente');
  assert.equal((await db.query('SELECT environment FROM nfe_operation_drafts WHERE id=$1', [hmlDraftId])).rows[0].environment, 2);
  const hmlDraftLine = (await db.query('SELECT quantity,gross_value FROM nfe_operation_draft_lines WHERE draft_id=$1', [hmlDraftId])).rows[0];
  assert.equal(Number(hmlDraftLine.quantity), 2, 'devolução parcial mantém quantidade proporcional');
  assert.equal(Number(hmlDraftLine.gross_value), 50, 'total parcial é proporcional à quantidade devolvida');

  const nfceSaleId = '51515151-5151-4151-8151-515151515151';
  const nfceDocumentId = '52525252-5252-4252-8252-525252525252';
  const nfceAccessKey = '41' + '2610' + '12345678000195' + '65' + '001' + '000000001' + '1' + '00000000' + '0';
  const nfceXml = '<NFe><infNFe Id="NFe' + nfceAccessKey + '"><ide><mod>65</mod></ide></infNFe></NFe>';
  await db.query('INSERT INTO orders(id,status,order_type,items,order_data,delivery_status) VALUES ($1,\'cancelled\',\'sale\',\'[]\'::jsonb,$2::jsonb,\'\')',
    [nfceSaleId, JSON.stringify({ orderType: 'sale' })]);
  await db.query('INSERT INTO nfe_documents(id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,document_type,xml_nfe,numero_protocolo) VALUES ($1,$2,901,\'1\',$3,\'65\',2,\'homologada\',\'outbound\',$4,\'141260000000901\')',
    [nfceDocumentId, nfceSaleId, nfceAccessKey, nfceXml]);
  await db.query('INSERT INTO nfe_document_items(document_id,item_number,product_code,description,billed_quantity,unit_value,gross_value,product_xml,taxes_xml) VALUES ($1,1,\'SKU-NFC-E\',\'NFC-e estorno\',1,100,100,\'<prod/>\',\'<imposto/>\')',
    [nfceDocumentId]);
  const prepareNfceEstorno = () => db.query('SELECT prepare_nfe_operation_draft(\'estorno\'::text,$1::uuid,NULL::text,2::smallint,\'Operação não realizada e prazo legal expirado.\'::text,NULL::uuid) AS id',
    [nfceDocumentId]);
  const nfceDraftId = (await prepareNfceEstorno()).rows[0].id;
  assert.equal((await prepareNfceEstorno()).rows[0].id, nfceDraftId,
    'estorno de NFC-e deve reaproveitar o rascunho ativo');
  assert.deepEqual((await db.query('SELECT operation_kind,finalidade,environment,original_access_key FROM nfe_operation_drafts WHERE id=$1',
    [nfceDraftId])).rows[0], {
    operation_kind: 'estorno',
    finalidade: 3,
    environment: 2,
    original_access_key: nfceAccessKey,
  });
  assert.equal((await db.query('SELECT status FROM nfe_documents WHERE id=$1', [nfceDocumentId])).rows[0].status,
    'homologada', 'a NF-e/NFC-e original permanece autorizada e preservada');
  await assert.rejects(
    db.query('SELECT prepare_nfe_operation_draft(\'return\'::text,$1::uuid,NULL::text,2::smallint,NULL::text,NULL::uuid)',
      [nfceDocumentId]),
    /Documento fiscal original não autorizado no ambiente selecionado/,
    'origem NFC-e não pode ser usada como origem de NF-e de devolução'
  );

  const transitSaleId = '53535353-5353-4353-8353-535353535353';
  const transitDocumentId = '54545454-5454-4454-8454-545454545454';
  const transitAccessKey = nfceAccessKey.replace('000000001', '000000002');
  await db.query('INSERT INTO orders(id,status,order_type,items,order_data,delivery_status) VALUES ($1,\'cancelled\',\'sale\',\'[]\'::jsonb,$2::jsonb,\'\')',
    [transitSaleId, JSON.stringify({ orderType: 'sale', deliveryStatus: 'in_transit' })]);
  await db.query('INSERT INTO nfe_documents(id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,document_type,xml_nfe,numero_protocolo) VALUES ($1,$2,902,\'1\',$3,\'65\',2,\'homologada\',\'outbound\',\'<NFe/>\',\'141260000000902\')',
    [transitDocumentId, transitSaleId, transitAccessKey]);
  await db.query('INSERT INTO nfe_document_items(document_id,item_number,product_code,description,billed_quantity,unit_value,gross_value,product_xml,taxes_xml) VALUES ($1,1,\'SKU-NFC-E\',\'NFC-e em trânsito\',1,100,100,\'<prod/>\',\'<imposto/>\')',
    [transitDocumentId]);
  const blockedCancelOrderId = '55555555-5555-4555-8555-555555555555';
  await db.query('INSERT INTO orders(id,status,order_type,items,order_data,delivery_status) VALUES ($1,\'scheduled\',\'sale\',\'[]\'::jsonb,$2::jsonb,\'\')',
    [blockedCancelOrderId, JSON.stringify({ orderType: 'sale', deliveryStatus: 'in_transit' })]);
  await assert.rejects(
    db.query('UPDATE orders SET status=\'cancelled\' WHERE id=$1', [blockedCancelOrderId]),
    /A mercadoria já circulou/,
    'a proteção transacional também bloqueia cancelamento por status legado em trânsito'
  );
  await assert.rejects(
    db.query('SELECT prepare_nfe_operation_draft(\'estorno\'::text,$1::uuid,NULL::text,2::smallint,\'Operação não realizada e prazo legal expirado.\'::text,NULL::uuid)',
      [transitDocumentId]),
    /evidência de circulação/,
    'o RPC também bloqueia estorno quando há trânsito sem confirmação de entrega'
  );
  await db.query('UPDATE orders SET order_data=$1::jsonb, delivery_started_at=$2 WHERE id=$3',
    [JSON.stringify({ orderType: 'sale' }), '2026-10-08T12:00:00.000Z', transitSaleId]);
  await assert.rejects(
    db.query('SELECT prepare_nfe_operation_draft(\'estorno\'::text,$1::uuid,NULL::text,2::smallint,\'Operação não realizada e prazo legal expirado.\'::text,NULL::uuid)',
      [transitDocumentId]),
    /evidência de circulação/,
    'o RPC bloqueia estorno pela data estruturada de saída mesmo com status vazio'
  );

  await db.exec(`ALTER TABLE nfe_documents
    ADD COLUMN fiscal_ruleset_version text, ADD COLUMN fiscal_snapshot_id uuid,
    ADD COLUMN hml_attempt_token uuid, ADD COLUMN hml_attempt_expires_at timestamptz,
    ADD COLUMN hml_response_history jsonb DEFAULT '[]'::jsonb`);
  await db.exec(fs.readFileSync(path.join(__dirname,
    '../migrations/20261001201000_persist_hml_invoice_totals.sql'), 'utf8'));
  const totalDoc = 'f0f0f0f0-f0f0-40f0-80f0-f0f0f0f0f0f0';
  const totalToken = 'f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1';
  await db.query(`INSERT INTO nfe_documents(id,numero_nfe,serie,ambiente,status,xml_nfe,
    fiscal_ruleset_version,fiscal_snapshot_id,hml_attempt_token,hml_attempt_expires_at)
    VALUES ($1,888,'1',2,'processando','<NFe/>','HML_NORMAL_SALE_V1',$1,$2,now()+interval '1 hour')`, [totalDoc,totalToken]);
  const totalLine = [{item_number:1,product_code:'SKU-TOTAL',description:'TOTAL TESTE',billed_quantity:1,
    unit_value:100,gross_value:100,discount_value:0,product_xml:'<prod/>',taxes_xml:'<imposto/>'}];
  const persistTotal = () => db.query(`SELECT persist_hml_nfe_result($1,'homologada','100: autorizado',
    '<retEnviNFe/>','141260000888888',$2::jsonb,$3)`, [totalDoc,JSON.stringify(totalLine),totalToken]);
  await assert.rejects(persistTotal(), /AUTHORIZED_HML_TOTAL_MISSING/);
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_document_items WHERE document_id=$1',[totalDoc])).rows[0].count,0);
  assert.equal((await db.query('SELECT status FROM nfe_documents WHERE id=$1',[totalDoc])).rows[0].status,'processando');
  const totalXml='<NFe><total><ICMSTot><vNF>100.00</vNF></ICMSTot></total></NFe>';
  await db.query('UPDATE nfe_documents SET xml_nfe=$2 WHERE id=$1',[totalDoc,totalXml]);
  await persistTotal();await persistTotal();
  const totalResult=(await db.query('SELECT valor_total,xml_nfe,numero_protocolo FROM nfe_documents WHERE id=$1',[totalDoc])).rows[0];
  assert.equal(Number(totalResult.valor_total),100);assert.equal(totalResult.xml_nfe,totalXml);
  assert.equal(totalResult.numero_protocolo,'141260000888888');
  assert.equal((await db.query('SELECT count(*) AS count FROM nfe_document_items WHERE document_id=$1',[totalDoc])).rows[0].count,1);

  console.log('Linhas fiscais: ambientes Produção/HML isolados, devolução parcial, limite faturado, vínculo, persistência atômica e replay idempotente OK');
  await db.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
