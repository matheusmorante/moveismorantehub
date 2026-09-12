# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: order-normalization.spec.ts >> Auditoria E2E via Browser - Normalização de Pedidos Morante Hub >> Cenário 2: Fluxo Real no Navegador - Edição do Pedido via UI sem Orfandade nem Duplicações
- Location: tests\e2e\orders\order-normalization.spec.ts:221:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button:has-text("Salvar Edição"), button:has-text("Finalizar Cadastro"), button:has-text("Salvar"), button:has-text("Concluir Pedido")').last()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('button:has-text("Salvar Edição"), button:has-text("Finalizar Cadastro"), button:has-text("Salvar"), button:has-text("Concluir Pedido")').last() with timeout 5000ms
  - waiting for locator('button:has-text("Salvar Edição"), button:has-text("Finalizar Cadastro"), button:has-text("Salvar"), button:has-text("Concluir Pedido")').last()

```

```yaml
- region "Notifications Alt+T"
- main:
  - text: 
  - heading "Editar Pedido" [level=2]
  - paragraph: Pedido de Venda
  - button " Passo 1 Informações básicas"
  - button " Passo 2 Itens"
  - button " Passo 3 Cliente"
  - button " Passo 4 Logística"
  - button " Passo 5 Pagamento"
  - button ""
  - button " Entrega"
  - button " Retirada"
  - button " Preenchimento Inteligente IA"
  - text: 
  - heading "Informações básicas" [level=3]
  - text:  Vendedor
  - textbox "Digite para buscar vendedor...": Vendedora Beatriz Atualizada UI
  - button ""
  - text:  Data do Pedido
  - textbox: 2026-09-12T16:20
  - text: Total do Pedido R$ 0,00 Salvamento Automático
  - button "Próxima Etapa "
- text: Seu Lizandro Agente IA do ERP
- button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP":
  - img "Seu Lizandro - Agente IA"
- region "Notifications Alt+T":
  - img
  - text: Pedido preenchido com sucesso via JSON!
  - button "close"
  - progressbar "notification timer"
```

# Test source

```ts
  188 |         expect(Number(orderRow.total_amount)).toBe(4550.00);
  189 |         expect(orderRow.status).toBe('scheduled');
  190 |         expect(orderRow.scheduled_date ? orderRow.scheduled_date.toISOString().slice(0, 10) : '').toBe('2026-09-30');
  191 | 
  192 |         // Asserções no Banco - order_items normalizados
  193 |         const itemRows = (await pgClient.query('SELECT * FROM public.order_items WHERE order_id = $1 ORDER BY item_index ASC', [createdId])).rows;
  194 |         expect(itemRows).toHaveLength(2);
  195 |         expect(itemRows[0].description).toBe('Mesa de Jantar 6 Lugares Madeira Nobre');
  196 |         expect(Number(itemRows[0].quantity)).toBe(1);
  197 |         expect(Number(itemRows[0].unit_price)).toBe(2500.00);
  198 |         expect(Number(itemRows[0].unit_discount)).toBe(200.00);
  199 | 
  200 |         expect(itemRows[1].description).toBe('Cadeira Estofada Bege Linho');
  201 |         expect(Number(itemRows[1].quantity)).toBe(6);
  202 |         expect(Number(itemRows[1].unit_price)).toBe(350.00);
  203 | 
  204 |         // Asserções no Banco - order_payments normalizados
  205 |         const payRows = (await pgClient.query('SELECT * FROM public.order_payments WHERE order_id = $1 ORDER BY payment_index ASC', [createdId])).rows;
  206 |         expect(payRows).toHaveLength(2);
  207 |         expect(payRows[0].payment_method).toBe('Pix');
  208 |         expect(Number(payRows[0].amount)).toBe(1550.00);
  209 |         expect(payRows[1].payment_method).toBe('Cartão de Crédito 3x');
  210 |         expect(Number(payRows[1].amount)).toBe(3000.00);
  211 | 
  212 |         // Batimento Matemático
  213 |         const sumItems = itemRows.reduce((acc, r) => acc + (Number(r.quantity) * Number(r.unit_price)) - (Number(r.unit_discount) || 0), 0);
  214 |         const sumPayments = payRows.reduce((acc, r) => acc + Number(r.amount), 0);
  215 |         expect(sumItems + 150.00).toBe(Number(orderRow.total_amount));
  216 |         expect(sumPayments).toBe(Number(orderRow.total_amount));
  217 |         console.log('✅ [E2E UI - Cenário 1] PASS - Criação via UI persistiu tabelas normalizadas com fidelidade total.');
  218 |     });
  219 | 
  220 |     // ── CENÁRIO 2: Edição do Pedido pela Interface (Browser) e Sincronização Relacional ──
  221 |     test('Cenário 2: Fluxo Real no Navegador - Edição do Pedido via UI sem Orfandade nem Duplicações', async ({ page }) => {
  222 |         test.setTimeout(90000);
  223 |         const orderId = `test_order_edit_ui_${testRunId}`;
  224 |         createdOrderIds.push(orderId);
  225 | 
  226 |         // Pré-requisito: Cria o pedido inicial no banco via RPC
  227 |         const initialPayload = {
  228 |             id: orderId,
  229 |             order_data: { id: orderId, orderNumber: '880002', status: 'draft', seller: 'Vendedor Original' },
  230 |             items: [
  231 |                 { code: 'IT-1', description: 'Item 1 Original', quantity: 1, unitPrice: 100.00 },
  232 |                 { code: 'IT-2', description: 'Item 2 Original', quantity: 2, unitPrice: 50.00 }
  233 |             ],
  234 |             order_number: '880002',
  235 |             seller_name: 'Vendedor Original',
  236 |             status: 'draft',
  237 |             total_amount: 200.00,
  238 |             deleted: false
  239 |         };
  240 |         await pgClient.query(`
  241 |             SELECT public.save_order_transaction(
  242 |                 $1,
  243 |                 $2::jsonb,
  244 |                 $3::jsonb,
  245 |                 $4::jsonb,
  246 |                 false
  247 |             );
  248 |         `, [
  249 |             orderId,
  250 |             JSON.stringify(initialPayload),
  251 |             JSON.stringify(initialPayload.items),
  252 |             JSON.stringify([{ method: 'Dinheiro', amount: 200.00 }])
  253 |         ]);
  254 | 
  255 |         console.log(`\n[E2E UI - Cenário 2] Abrindo edição do pedido ${orderId} no navegador...`);
  256 |         await page.goto(`/sales-order/edit/${orderId}?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  257 |         await page.waitForTimeout(2000);
  258 | 
  259 |         // Atualizar vendedor via input na UI
  260 |         const sellerInput = page.locator('input[placeholder*="buscar vendedor"]');
  261 |         if (await sellerInput.isVisible()) {
  262 |             await sellerInput.fill('Vendedora Beatriz Atualizada UI');
  263 |         }
  264 | 
  265 |         // Utilizar atalho de injeção ou aplicar payload de edição via UI
  266 |         const aiModalButton = page.getByRole('button', { name: /Preenchimento Inteligente IA/i });
  267 |         if (await aiModalButton.isVisible()) {
  268 |             await aiModalButton.click();
  269 |             await page.getByRole('button', { name: /JSON/i }).click();
  270 | 
  271 |             const editPayload = {
  272 |                 seller: 'Vendedora Beatriz Atualizada UI',
  273 |                 items: [
  274 |                     { code: 'IT-1', description: 'Item 1 Atualizado', quantity: 3, unitPrice: 100.00 },
  275 |                     { code: 'IT-3', description: 'Item 3 Adicionado', quantity: 1, unitPrice: 150.00 }
  276 |                 ],
  277 |                 payments: [
  278 |                     { method: 'Pix', amount: 450.00, status: 'PAGO' }
  279 |                 ]
  280 |             };
  281 | 
  282 |             await page.locator('textarea[placeholder*="Cole aqui o JSON estruturado"]').fill(JSON.stringify(editPayload));
  283 |             await page.getByRole('button', { name: /Processar e Preencher/i }).click();
  284 |         }
  285 | 
  286 |         // Salvar as alterações pela UI
  287 |         const saveButton = page.locator('button:has-text("Salvar Edição"), button:has-text("Finalizar Cadastro"), button:has-text("Salvar"), button:has-text("Concluir Pedido")').last();
> 288 |         await expect(saveButton).toBeVisible();
      |                                  ^ Error: expect(locator).toBeVisible() failed
  289 |         await saveButton.click();
  290 |         await page.waitForTimeout(3000);
  291 | 
  292 |         // Checagens no PostgreSQL após a edição pela UI
  293 |         const updatedItems = (await pgClient.query('SELECT * FROM public.order_items WHERE order_id = $1 ORDER BY item_index ASC', [orderId])).rows;
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
```