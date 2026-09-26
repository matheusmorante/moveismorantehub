# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: orders\order-normalization.spec.ts >> Auditoria E2E via Browser - Normalização de Pedidos Morante Hub >> Cenário 4: Transição de Status (draft -> scheduled -> fulfilled -> cancelled) e Movimentação de Estoque
- Location: tests\e2e\orders\order-normalization.spec.ts:367:5

# Error details

```
error: new row for relation "inventory_moves" violates check constraint "inventory_moves_require_variation_identity"
```

# Test source

```ts
  294 |         expect(updatedItems).toHaveLength(2);
  295 |         expect(updatedItems[0].description).toBe('Item 1 Atualizado');
  296 |         expect(Number(updatedItems[0].quantity)).toBe(3);
  297 |         expect(updatedItems[1].description).toBe('Item 3 Adicionado');
  298 | 
  299 |         const updatedPayments = (await pgClient.query('SELECT * FROM public.order_payments WHERE order_id = $1 ORDER BY payment_index ASC', [orderId])).rows;
  300 |         expect(updatedPayments).toHaveLength(1);
  301 |         expect(updatedPayments[0].payment_method).toBe('Pix');
  302 |         expect(Number(updatedPayments[0].amount)).toBe(450.00);
  303 | 
  304 |         console.log('✅ [E2E UI - Cenário 2] PASS - Edição via UI refletiu nas tabelas normalizadas sem duplicidade nem orfandade.');
  305 |     });
  306 | 
  307 |     // ── CENÁRIO 3: Exibição na Agenda / Operação Real no Navegador ──
  308 |     test('Cenário 3: Fluxo Real no Navegador - Pedido Agendado é Renderizado na Tela da Agenda (/schedule)', async ({ page }) => {
  309 |         test.setTimeout(90000);
  310 |         const orderId = `test_order_agenda_ui_${testRunId}`;
  311 |         createdOrderIds.push(orderId);
  312 |         const customerName = `Cliente Agenda UI ${testRunId}`;
  313 |         const todayStr = new Date().toISOString().split('T')[0];
  314 | 
  315 |         // Cria o pedido agendado para a data de hoje para aparecer na visualização padrão da agenda
  316 |         const agendaPayload = {
  317 |             id: orderId,
  318 |             order_data: {
  319 |                 id: orderId,
  320 |                 orderNumber: '880003',
  321 |                 status: 'scheduled',
  322 |                 customerData: { fullName: customerName },
  323 |                 shipping: {
  324 |                     deliveryMethod: 'delivery',
  325 |                     scheduling: { date: todayStr, startTime: '10:00', endTime: '12:00', type: 'range' }
  326 |                 }
  327 |             },
  328 |             items: [{ code: 'SOF-01', description: 'Sofá Retrátil 3 Lugares Confort', quantity: 1, unitPrice: 2000.00 }],
  329 |             order_number: '880003',
  330 |             customer_name: customerName,
  331 |             status: 'scheduled',
  332 |             order_type: 'sale',
  333 |             scheduled_date: todayStr,
  334 |             scheduled_start_time: '10:00',
  335 |             scheduled_end_time: '12:00',
  336 |             delivery_method: 'delivery',
  337 |             total_amount: 2000.00,
  338 |             deleted: false
  339 |         };
  340 | 
  341 |         await pgClient.query(`
  342 |             SELECT public.save_order_transaction(
  343 |                 $1,
  344 |                 $2::jsonb,
  345 |                 $3::jsonb,
  346 |                 $4::jsonb,
  347 |                 false
  348 |             );
  349 |         `, [
  350 |             orderId,
  351 |             JSON.stringify(agendaPayload),
  352 |             JSON.stringify(agendaPayload.items),
  353 |             JSON.stringify([{ method: 'Pix', amount: 2000.00 }])
  354 |         ]);
  355 | 
  356 |         console.log('\n[E2E UI - Cenário 3] Acessando Agenda de Entregas no navegador...');
  357 |         await page.goto(`/schedule?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  358 |         await page.waitForTimeout(3000);
  359 | 
  360 |         // Validar que o pedido com o nome do cliente está visível no DOM renderizado
  361 |         const customerLocator = page.locator(`text=${customerName}`).first();
  362 |         await expect(customerLocator).toBeVisible({ timeout: 25000 });
  363 |         console.log('✅ [E2E UI - Cenário 3] PASS - Pedido agendado renderizado com sucesso na Agenda via navegador.');
  364 |     });
  365 | 
  366 |     // ── CENÁRIO 4: Ciclo de Status e Reflexo em Estoque ──
  367 |     test('Cenário 4: Transição de Status (draft -> scheduled -> fulfilled -> cancelled) e Movimentação de Estoque', async () => {
  368 |         const orderId = `test_order_status_${testRunId}`;
  369 |         createdOrderIds.push(orderId);
  370 | 
  371 |         const items = [{ productId: 'prod-est-01', description: 'Produto Estoque Normalizado', quantity: 2, unitPrice: 300.00, costPrice: 150.00 }];
  372 |         const payload = {
  373 |             id: orderId,
  374 |             order_data: { id: orderId, orderNumber: '880004', status: 'draft' },
  375 |             items,
  376 |             order_number: '880004',
  377 |             status: 'draft',
  378 |             total_amount: 600.00,
  379 |             deleted: false
  380 |         };
  381 | 
  382 |         await pgClient.query(`
  383 |             SELECT public.save_order_transaction(
  384 |                 $1,
  385 |                 $2::jsonb,
  386 |                 $3::jsonb,
  387 |                 $4::jsonb,
  388 |                 false
  389 |             );
  390 |         `, [orderId, JSON.stringify(payload), JSON.stringify(items), JSON.stringify([{ method: 'Dinheiro', amount: 600.00 }])]);
  391 | 
  392 |         // Transiciona para fulfilled
  393 |         await pgClient.query(`UPDATE public.orders SET status = 'fulfilled', stock_processed = true WHERE id = $1`, [orderId]);
> 394 |         await pgClient.query(`
      |         ^ error: new row for relation "inventory_moves" violates check constraint "inventory_moves_require_variation_identity"
  395 |             INSERT INTO public.inventory_moves (
  396 |                 product_id, type, quantity, date, label, order_id, unit_cost, unit_price
  397 |             ) VALUES (
  398 |                 'prod-est-01', 'exit', 2, now(), 'Saída Pedido #880004', $1, 150, 300
  399 |             );
  400 |         `, [orderId]);
  401 | 
  402 |         const exitMoves = (await pgClient.query('SELECT * FROM public.inventory_moves WHERE order_id = $1', [orderId])).rows;
  403 |         expect(exitMoves).toHaveLength(1);
  404 |         expect(Number(exitMoves[0].quantity)).toBe(2);
  405 | 
  406 |         // Cancelamento e Estorno
  407 |         await pgClient.query(`UPDATE public.orders SET status = 'cancelled', stock_processed = false WHERE id = $1`, [orderId]);
  408 |         await pgClient.query(`
  409 |             UPDATE public.inventory_moves 
  410 |             SET reason = 'Cancelamento da venda',
  411 |                 observation = jsonb_build_object('status', 'reversed', 'reversalReason', 'Cancelamento do pedido')::text
  412 |             WHERE order_id = $1;
  413 |         `, [orderId]);
  414 | 
  415 |         const cancelledOrder = (await pgClient.query('SELECT status, stock_processed FROM public.orders WHERE id = $1', [orderId])).rows[0];
  416 |         expect(cancelledOrder.status).toBe('cancelled');
  417 |         expect(cancelledOrder.stock_processed).toBe(false);
  418 |         console.log('✅ [Cenário 4] PASS - Ciclo de vida e estorno de movimentação de estoque validados.');
  419 |     });
  420 | 
  421 |     // ── CENÁRIO 5: Relatórios de Vendas Consolidando order_items ──
  422 |     test('Cenário 5: Relatório de Vendas (useSalesReport) Consolidando order_items Normalizados', async () => {
  423 |         const orderId = `test_order_report_${testRunId}`;
  424 |         createdOrderIds.push(orderId);
  425 | 
  426 |         const items = [{ productId: 'p-rep-01', description: 'Item Relatório Normalizado', quantity: 2, unitPrice: 800.00, costPrice: 400.00 }];
  427 |         const payload = {
  428 |             id: orderId,
  429 |             order_data: { id: orderId, orderNumber: '880005', status: 'scheduled', orderType: 'sale' },
  430 |             items,
  431 |             order_number: '880005',
  432 |             status: 'scheduled',
  433 |             order_type: 'sale',
  434 |             total_amount: 1600.00,
  435 |             deleted: false
  436 |         };
  437 | 
  438 |         await pgClient.query(`
  439 |             SELECT public.save_order_transaction(
  440 |                 $1,
  441 |                 $2::jsonb,
  442 |                 $3::jsonb,
  443 |                 $4::jsonb,
  444 |                 false
  445 |             );
  446 |         `, [orderId, JSON.stringify(payload), JSON.stringify(items), JSON.stringify([{ method: 'Pix', amount: 1600.00 }])]);
  447 | 
  448 |         const reportRows = (await pgClient.query(`
  449 |             SELECT oi.id, oi.description, oi.quantity, oi.unit_price, oi.cost_price, o.status
  450 |             FROM public.order_items oi
  451 |             INNER JOIN public.orders o ON o.id = oi.order_id
  452 |             WHERE o.deleted = false
  453 |               AND o.order_type <> 'budget'
  454 |               AND o.status NOT IN ('draft', 'cancelled')
  455 |               AND oi.order_id = $1;
  456 |         `, [orderId])).rows;
  457 | 
  458 |         expect(reportRows).toHaveLength(1);
  459 |         expect(Number(reportRows[0].quantity)).toBe(2);
  460 |         expect(Number(reportRows[0].unit_price)).toBe(800.00);
  461 |         console.log('✅ [Cenário 5] PASS - Relatórios agregam order_items com inner join.');
  462 |     });
  463 | 
  464 |     // ── CENÁRIO 6: Devolução Vinculada ──
  465 |     test('Cenário 6: Devolução Vinculada Mantendo Integridade Relacional', async () => {
  466 |         const saleOrderId = `test_order_sale_${testRunId}`;
  467 |         const returnOrderId = `test_order_ret_${testRunId}`;
  468 |         createdOrderIds.push(saleOrderId, returnOrderId);
  469 | 
  470 |         const salePayload = {
  471 |             id: saleOrderId,
  472 |             order_data: { id: saleOrderId, orderNumber: '880006', status: 'fulfilled' },
  473 |             items: [{ productId: 'p-ret', description: 'Item Original', quantity: 1, unitPrice: 700.00 }],
  474 |             order_number: '880006',
  475 |             status: 'fulfilled',
  476 |             total_amount: 700.00,
  477 |             deleted: false
  478 |         };
  479 |         await pgClient.query(`
  480 |             SELECT public.save_order_transaction(
  481 |                 $1,
  482 |                 $2::jsonb,
  483 |                 $3::jsonb,
  484 |                 $4::jsonb,
  485 |                 false
  486 |             );
  487 |         `, [saleOrderId, JSON.stringify(salePayload), JSON.stringify(salePayload.items), JSON.stringify([{ method: 'Pix', amount: 700.00 }])]);
  488 | 
  489 |         const returnPayload = {
  490 |             id: returnOrderId,
  491 |             order_data: { id: returnOrderId, orderNumber: '880007', status: 'scheduled', orderType: 'return', linkedOrderId: saleOrderId },
  492 |             items: [{ productId: 'p-ret', description: 'Item Devolvido', quantity: 1, unitPrice: 700.00 }],
  493 |             order_number: '880007',
  494 |             status: 'scheduled',
```