# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: order-normalization.spec.ts >> Auditoria E2E via Browser - Normalização de Pedidos Morante Hub >> Cenário 1: Fluxo Real no Navegador - Criação de Pedido via UI e Gravação Atômica nas Tabelas Normalizadas
- Location: tests\e2e\orders\order-normalization.spec.ts:45:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 4550
Received: 0
```

# Test source

```ts
  88  |                 {
  89  |                     code: 'MES-01',
  90  |                     description: 'Mesa de Jantar 6 Lugares Madeira Nobre',
  91  |                     quantity: 1,
  92  |                     unitPrice: 2500.00,
  93  |                     unitDiscount: 200.00,
  94  |                     discountType: 'fixed',
  95  |                     costPrice: 1200.00,
  96  |                     condition: 'novo',
  97  |                     handlingType: 'montagem_inclusa',
  98  |                     observation: 'Embalagem reforçada teste E2E',
  99  |                     itemSnapshot: { sku: 'MES-NOB-6L', color: 'Marrom Tabaco' }
  100 |                 },
  101 |                 {
  102 |                     code: 'CAD-01',
  103 |                     description: 'Cadeira Estofada Bege Linho',
  104 |                     quantity: 6,
  105 |                     unitPrice: 350.00,
  106 |                     unitDiscount: 0.00,
  107 |                     discountType: 'fixed',
  108 |                     costPrice: 150.00,
  109 |                     condition: 'novo',
  110 |                     handlingType: 'montagem_inclusa',
  111 |                     observation: 'Tecido impermeabilizado teste E2E',
  112 |                     itemSnapshot: { sku: 'CAD-BEG-LIN', color: 'Bege Linho' }
  113 |                 }
  114 |             ],
  115 |             payments: [
  116 |                 {
  117 |                     method: 'Pix',
  118 |                     amount: 1550.00,
  119 |                     fee: 0,
  120 |                     feeType: 'fixed',
  121 |                     status: 'PAGO',
  122 |                     installments: 1
  123 |                 },
  124 |                 {
  125 |                     method: 'Cartão de Crédito 3x',
  126 |                     amount: 3000.00,
  127 |                     fee: 90.00,
  128 |                     feeType: 'percentage',
  129 |                     status: 'PAGO',
  130 |                     installments: 3
  131 |                 }
  132 |             ]
  133 |         };
  134 | 
  135 |         // 3. Pressionar botão Preenchimento Inteligente IA no FormHeader
  136 |         const aiModalButton = page.getByRole('button', { name: /Preenchimento Inteligente IA/i });
  137 |         await expect(aiModalButton).toBeVisible();
  138 |         await aiModalButton.click();
  139 | 
  140 |         // 4. Na modal, mudar para a aba JSON
  141 |         const jsonTabButton = page.getByRole('button', { name: /JSON/i });
  142 |         await expect(jsonTabButton).toBeVisible();
  143 |         await jsonTabButton.click();
  144 | 
  145 |         // 5. Preencher o textarea e clicar em "Processar e Preencher"
  146 |         const textarea = page.locator('textarea[placeholder*="Cole aqui o JSON estruturado"]');
  147 |         await expect(textarea).toBeVisible();
  148 |         await textarea.fill(JSON.stringify(uiPayload));
  149 | 
  150 |         const processButton = page.getByRole('button', { name: /Processar e Preencher/i });
  151 |         await processButton.click();
  152 | 
  153 |         // 6. Validar que os dados foram carregados nos passos do formulário na UI
  154 |         await expect(page.locator('input[placeholder*="buscar vendedor"]')).toHaveValue(sellerName);
  155 | 
  156 |         // Avançar para o Step 5 (Pagamentos / Conclusão) pelo stepper ou botão Próxima
  157 |         const step5Button = page.getByTitle(/Passo 5: Pagamento/i);
  158 |         if (await step5Button.isVisible()) {
  159 |             await step5Button.click();
  160 |         }
  161 | 
  162 |         // 7. Clicar em "Concluir Pedido" / "Salvar" no FormFooter
  163 |         console.log('[E2E UI] Clicando no botão Concluir Pedido no FormFooter...');
  164 |         const saveButton = page.locator('button:has-text("Concluir Pedido"), button:has-text("Finalizar Cadastro"), button:has-text("Salvar")').last();
  165 |         await expect(saveButton).toBeVisible();
  166 |         await saveButton.click();
  167 | 
  168 |         // 8. Esperar o feedback da UI (toast de sucesso ou transição de tela)
  169 |         await page.waitForTimeout(3000);
  170 | 
  171 |         // 9. Localizar no PostgreSQL o pedido recém-criado pela UI
  172 |         const orderQuery = await pgClient.query(`
  173 |             SELECT * FROM public.orders 
  174 |             WHERE customer_name = $1 
  175 |             ORDER BY created_at DESC 
  176 |             LIMIT 1;
  177 |         `, [customerName]);
  178 | 
  179 |         expect(orderQuery.rows.length).toBe(1);
  180 |         const orderRow = orderQuery.rows[0];
  181 |         const createdId = orderRow.id;
  182 |         createdOrderIds.push(createdId);
  183 |         console.log(`[E2E UI] Pedido gravado no PostgreSQL com ID: ${createdId}`);
  184 | 
  185 |         // Asserções no Banco - Cabeçalho
  186 |         expect(orderRow.customer_name).toBe(customerName);
  187 |         expect(orderRow.seller_name).toBe(sellerName);
> 188 |         expect(Number(orderRow.total_amount)).toBe(4550.00);
      |                                               ^ Error: expect(received).toBe(expected) // Object.is equality
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
  288 |         await expect(saveButton).toBeVisible();
```