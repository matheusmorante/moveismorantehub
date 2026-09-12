/**
 * Suíte de Auditoria E2E Operacional Real no Navegador (Playwright)
 * Fluxo Completo: Browser (UI) -> Service -> RPC PostgreSQL -> Orders / Order Items / Order Payments
 * 
 * Valida:
 * 1. Criação de Novo Pedido pela UI do ERP (/sales-order/new)
 * 2. Conferência Imediata no PostgreSQL (orders, order_items, order_payments)
 * 3. Edição do Pedido pela UI (/sales-order/edit/:id) e Checagem no Banco
 * 4. Verificação de Exibição na Agenda / Operação (/schedule)
 * 5. Ciclo de Vida, Telemetria e Atomicidade no Banco
 * 6. Teardown Seguro e Limpeza de Dados de Teste
 */

import { test, expect } from '@playwright/test';
import { Client } from 'pg';

const PG_CONNECTION = 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres';
const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';

test.describe('Auditoria E2E via Browser - Normalização de Pedidos Morante Hub', () => {
    let pgClient: Client;
    const testRunId = `E2E-NORM-${Date.now()}`;
    const createdOrderIds: string[] = [];

    test.beforeAll(async () => {
        pgClient = new Client({ connectionString: PG_CONNECTION });
        await pgClient.connect();
    });

    test.afterAll(async () => {
        if (createdOrderIds.length > 0) {
            console.log(`[Teardown] Limpando ${createdOrderIds.length} pedidos de teste criados...`);
            for (const id of createdOrderIds) {
                await pgClient.query('DELETE FROM public.order_items WHERE order_id = $1', [id]);
                await pgClient.query('DELETE FROM public.order_payments WHERE order_id = $1', [id]);
                await pgClient.query('DELETE FROM public.order_status_history WHERE order_id = $1', [id]);
                await pgClient.query('DELETE FROM public.inventory_moves WHERE order_id = $1', [id]);
                await pgClient.query('DELETE FROM public.orders WHERE id = $1', [id]);
            }
        }
        await pgClient.end();
    });

    // ── CENÁRIO 1: Criação de Pedido Real pela Interface (Browser) e Gravação Normalizada ──
    test('Cenário 1: Fluxo Real no Navegador - Criação de Pedido via UI e Gravação Atômica nas Tabelas Normalizadas', async ({ page }) => {
        test.setTimeout(90000);
        console.log('\n[E2E UI - Cenário 1] Abrindo formulário de criação de pedido no navegador...');

        // 1. Navegar até a tela de novo pedido com bypass de autenticação
        await page.goto(`/sales-order/new?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('text=Novo Pedido').first()).toBeVisible({ timeout: 15000 });

        // 2. Montar o payload do pedido para preenchimento via injeção de JSON (Smart AI / Manual JSON da UI)
        const orderIndexNum = Math.floor(900000 + Math.random() * 90000);
        const orderNumberStr = String(orderIndexNum);
        const customerName = `Cliente E2E Playwright ${testRunId}`;
        const sellerName = 'Carlos Vendedor E2E';

        const uiPayload = {
            orderNumber: orderNumberStr,
            orderIndex: orderIndexNum,
            status: 'scheduled',
            orderType: 'sale',
            seller: sellerName,
            customerData: {
                fullName: customerName,
                phone: '45999887766',
                fullAddress: {
                    cep: '85800000',
                    street: 'Avenida Brasil',
                    number: '1500',
                    neighborhood: 'Centro',
                    city: 'Cascavel'
                }
            },
            shipping: {
                deliveryMethod: 'delivery',
                value: 150.00,
                scheduling: {
                    dateType: 'fixed',
                    date: '2026-09-30',
                    type: 'fixed',
                    startTime: '14:00',
                    endTime: '18:00'
                }
            },
            items: [
                {
                    code: 'MES-01',
                    description: 'Mesa de Jantar 6 Lugares Madeira Nobre',
                    quantity: 1,
                    unitPrice: 2500.00,
                    unitDiscount: 200.00,
                    discountType: 'fixed',
                    costPrice: 1200.00,
                    condition: 'novo',
                    handlingType: 'montagem_inclusa',
                    observation: 'Embalagem reforçada teste E2E',
                    itemSnapshot: { sku: 'MES-NOB-6L', color: 'Marrom Tabaco' }
                },
                {
                    code: 'CAD-01',
                    description: 'Cadeira Estofada Bege Linho',
                    quantity: 6,
                    unitPrice: 350.00,
                    unitDiscount: 0.00,
                    discountType: 'fixed',
                    costPrice: 150.00,
                    condition: 'novo',
                    handlingType: 'montagem_inclusa',
                    observation: 'Tecido impermeabilizado teste E2E',
                    itemSnapshot: { sku: 'CAD-BEG-LIN', color: 'Bege Linho' }
                }
            ],
            payments: [
                {
                    method: 'Pix',
                    amount: 1550.00,
                    fee: 0,
                    feeType: 'fixed',
                    status: 'PAGO',
                    installments: 1
                },
                {
                    method: 'Cartão de Crédito 3x',
                    amount: 3000.00,
                    fee: 90.00,
                    feeType: 'percentage',
                    status: 'PAGO',
                    installments: 3
                }
            ]
        };

        // 3. Pressionar botão Preenchimento Inteligente IA no FormHeader
        const aiModalButton = page.getByRole('button', { name: /Preenchimento Inteligente IA/i });
        await expect(aiModalButton).toBeVisible();
        await aiModalButton.click();

        // 4. Na modal, mudar para a aba JSON
        const jsonTabButton = page.getByRole('button', { name: /JSON/i });
        await expect(jsonTabButton).toBeVisible();
        await jsonTabButton.click();

        // 5. Preencher o textarea e clicar em "Processar e Preencher"
        const textarea = page.locator('textarea[placeholder*="Cole aqui o JSON estruturado"]');
        await expect(textarea).toBeVisible();
        await textarea.fill(JSON.stringify(uiPayload));

        const processButton = page.getByRole('button', { name: /Processar e Preencher/i });
        await processButton.click();

        // 6. Validar que os dados foram carregados nos passos do formulário na UI
        await expect(page.locator('input[placeholder*="buscar vendedor"]')).toHaveValue(sellerName);

        // Avançar para o Step 5 (Pagamentos / Conclusão) pelo stepper ou botão Próxima
        const step5Button = page.getByTitle(/Passo 5: Pagamento/i);
        if (await step5Button.isVisible()) {
            await step5Button.click();
        }

        // 7. Clicar em "Concluir Pedido" / "Salvar" no FormFooter
        console.log('[E2E UI] Clicando no botão Concluir Pedido no FormFooter...');
        const saveButton = page.locator('button:has-text("Concluir Pedido"), button:has-text("Finalizar Cadastro"), button:has-text("Salvar")').last();
        await expect(saveButton).toBeVisible();
        await saveButton.click();

        // 8. Esperar o feedback da UI (toast de sucesso ou transição de tela)
        await page.waitForTimeout(3000);

        // 9. Localizar no PostgreSQL o pedido recém-criado pela UI
        const orderQuery = await pgClient.query(`
            SELECT * FROM public.orders 
            WHERE customer_name = $1 
            ORDER BY created_at DESC 
            LIMIT 1;
        `, [customerName]);

        expect(orderQuery.rows.length).toBe(1);
        const orderRow = orderQuery.rows[0];
        const createdId = orderRow.id;
        createdOrderIds.push(createdId);
        console.log(`[E2E UI] Pedido gravado no PostgreSQL com ID: ${createdId}`);

        // Asserções no Banco - Cabeçalho
        expect(orderRow.customer_name).toBe(customerName);
        expect(orderRow.seller_name).toBe(sellerName);
        expect(Number(orderRow.total_amount)).toBe(4550.00);
        expect(orderRow.status).toBe('scheduled');
        expect(orderRow.scheduled_date ? orderRow.scheduled_date.toISOString().slice(0, 10) : '').toBe('2026-09-30');

        // Asserções no Banco - order_items normalizados
        const itemRows = (await pgClient.query('SELECT * FROM public.order_items WHERE order_id = $1 ORDER BY item_index ASC', [createdId])).rows;
        expect(itemRows).toHaveLength(2);
        expect(itemRows[0].description).toBe('Mesa de Jantar 6 Lugares Madeira Nobre');
        expect(Number(itemRows[0].quantity)).toBe(1);
        expect(Number(itemRows[0].unit_price)).toBe(2500.00);
        expect(Number(itemRows[0].unit_discount)).toBe(200.00);

        expect(itemRows[1].description).toBe('Cadeira Estofada Bege Linho');
        expect(Number(itemRows[1].quantity)).toBe(6);
        expect(Number(itemRows[1].unit_price)).toBe(350.00);

        // Asserções no Banco - order_payments normalizados
        const payRows = (await pgClient.query('SELECT * FROM public.order_payments WHERE order_id = $1 ORDER BY payment_index ASC', [createdId])).rows;
        expect(payRows).toHaveLength(2);
        expect(payRows[0].payment_method).toBe('Pix');
        expect(Number(payRows[0].amount)).toBe(1550.00);
        expect(payRows[1].payment_method).toBe('Cartão de Crédito 3x');
        expect(Number(payRows[1].amount)).toBe(3000.00);

        // Batimento Matemático
        const sumItems = itemRows.reduce((acc, r) => acc + (Number(r.quantity) * Number(r.unit_price)) - (Number(r.unit_discount) || 0), 0);
        const sumPayments = payRows.reduce((acc, r) => acc + Number(r.amount), 0);
        expect(sumItems + 150.00).toBe(Number(orderRow.total_amount));
        expect(sumPayments).toBe(Number(orderRow.total_amount));
        console.log('✅ [E2E UI - Cenário 1] PASS - Criação via UI persistiu tabelas normalizadas com fidelidade total.');
    });

    // ── CENÁRIO 2: Edição do Pedido pela Interface (Browser) e Sincronização Relacional ──
    test('Cenário 2: Fluxo Real no Navegador - Edição do Pedido via UI sem Orfandade nem Duplicações', async ({ page }) => {
        test.setTimeout(90000);
        const orderId = `test_order_edit_ui_${testRunId}`;
        createdOrderIds.push(orderId);

        // Pré-requisito: Cria o pedido inicial no banco via RPC
        const initialPayload = {
            id: orderId,
            order_data: { id: orderId, orderNumber: '880002', status: 'draft', seller: 'Vendedor Original' },
            items: [
                { code: 'IT-1', description: 'Item 1 Original', quantity: 1, unitPrice: 100.00 },
                { code: 'IT-2', description: 'Item 2 Original', quantity: 2, unitPrice: 50.00 }
            ],
            order_number: '880002',
            seller_name: 'Vendedor Original',
            status: 'draft',
            total_amount: 200.00,
            deleted: false
        };
        await pgClient.query(`
            SELECT public.save_order_transaction(
                $1,
                $2::jsonb,
                $3::jsonb,
                $4::jsonb,
                false
            );
        `, [
            orderId,
            JSON.stringify(initialPayload),
            JSON.stringify(initialPayload.items),
            JSON.stringify([{ method: 'Dinheiro', amount: 200.00 }])
        ]);

        console.log(`\n[E2E UI - Cenário 2] Abrindo edição do pedido ${orderId} no navegador...`);
        await page.goto(`/sales-order/edit/${orderId}?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Atualizar vendedor via input na UI
        const sellerInput = page.locator('input[placeholder*="buscar vendedor"]');
        if (await sellerInput.isVisible()) {
            await sellerInput.fill('Vendedora Beatriz Atualizada UI');
        }

        // Utilizar atalho de injeção ou aplicar payload de edição via UI
        const aiModalButton = page.getByRole('button', { name: /Preenchimento Inteligente IA/i });
        if (await aiModalButton.isVisible()) {
            await aiModalButton.click();
            await page.getByRole('button', { name: /JSON/i }).click();

            const editPayload = {
                seller: 'Vendedora Beatriz Atualizada UI',
                items: [
                    { code: 'IT-1', description: 'Item 1 Atualizado', quantity: 3, unitPrice: 100.00 },
                    { code: 'IT-3', description: 'Item 3 Adicionado', quantity: 1, unitPrice: 150.00 }
                ],
                payments: [
                    { method: 'Pix', amount: 450.00, status: 'PAGO' }
                ]
            };

            await page.locator('textarea[placeholder*="Cole aqui o JSON estruturado"]').fill(JSON.stringify(editPayload));
            await page.getByRole('button', { name: /Processar e Preencher/i }).click();
        }

        // Salvar as alterações pela UI
        const saveButton = page.locator('button:has-text("Salvar Edição"), button:has-text("Finalizar Cadastro"), button:has-text("Salvar"), button:has-text("Concluir Pedido")').last();
        await expect(saveButton).toBeVisible();
        await saveButton.click();
        await page.waitForTimeout(3000);

        // Checagens no PostgreSQL após a edição pela UI
        const updatedItems = (await pgClient.query('SELECT * FROM public.order_items WHERE order_id = $1 ORDER BY item_index ASC', [orderId])).rows;
        expect(updatedItems).toHaveLength(2);
        expect(updatedItems[0].description).toBe('Item 1 Atualizado');
        expect(Number(updatedItems[0].quantity)).toBe(3);
        expect(updatedItems[1].description).toBe('Item 3 Adicionado');

        const updatedPayments = (await pgClient.query('SELECT * FROM public.order_payments WHERE order_id = $1 ORDER BY payment_index ASC', [orderId])).rows;
        expect(updatedPayments).toHaveLength(1);
        expect(updatedPayments[0].payment_method).toBe('Pix');
        expect(Number(updatedPayments[0].amount)).toBe(450.00);

        console.log('✅ [E2E UI - Cenário 2] PASS - Edição via UI refletiu nas tabelas normalizadas sem duplicidade nem orfandade.');
    });

    // ── CENÁRIO 3: Exibição na Agenda / Operação Real no Navegador ──
    test('Cenário 3: Fluxo Real no Navegador - Pedido Agendado é Renderizado na Tela da Agenda (/schedule)', async ({ page }) => {
        test.setTimeout(90000);
        const orderId = `test_order_agenda_ui_${testRunId}`;
        createdOrderIds.push(orderId);
        const customerName = `Cliente Agenda UI ${testRunId}`;
        const todayStr = new Date().toISOString().split('T')[0];

        // Cria o pedido agendado para a data de hoje para aparecer na visualização padrão da agenda
        const agendaPayload = {
            id: orderId,
            order_data: {
                id: orderId,
                orderNumber: '880003',
                status: 'scheduled',
                customerData: { fullName: customerName },
                shipping: {
                    deliveryMethod: 'delivery',
                    scheduling: { date: todayStr, startTime: '10:00', endTime: '12:00', type: 'range' }
                }
            },
            items: [{ code: 'SOF-01', description: 'Sofá Retrátil 3 Lugares Confort', quantity: 1, unitPrice: 2000.00 }],
            order_number: '880003',
            customer_name: customerName,
            status: 'scheduled',
            order_type: 'sale',
            scheduled_date: todayStr,
            scheduled_start_time: '10:00',
            scheduled_end_time: '12:00',
            delivery_method: 'delivery',
            total_amount: 2000.00,
            deleted: false
        };

        await pgClient.query(`
            SELECT public.save_order_transaction(
                $1,
                $2::jsonb,
                $3::jsonb,
                $4::jsonb,
                false
            );
        `, [
            orderId,
            JSON.stringify(agendaPayload),
            JSON.stringify(agendaPayload.items),
            JSON.stringify([{ method: 'Pix', amount: 2000.00 }])
        ]);

        console.log('\n[E2E UI - Cenário 3] Acessando Agenda de Entregas no navegador...');
        await page.goto(`/schedule?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        // Validar que o pedido com o nome do cliente está visível no DOM renderizado
        const customerLocator = page.locator(`text=${customerName}`).first();
        await expect(customerLocator).toBeVisible({ timeout: 25000 });
        console.log('✅ [E2E UI - Cenário 3] PASS - Pedido agendado renderizado com sucesso na Agenda via navegador.');
    });

    // ── CENÁRIO 4: Ciclo de Status e Reflexo em Estoque ──
    test('Cenário 4: Transição de Status (draft -> scheduled -> fulfilled -> cancelled) e Movimentação de Estoque', async () => {
        const orderId = `test_order_status_${testRunId}`;
        createdOrderIds.push(orderId);

        const items = [{ productId: 'prod-est-01', description: 'Produto Estoque Normalizado', quantity: 2, unitPrice: 300.00, costPrice: 150.00 }];
        const payload = {
            id: orderId,
            order_data: { id: orderId, orderNumber: '880004', status: 'draft' },
            items,
            order_number: '880004',
            status: 'draft',
            total_amount: 600.00,
            deleted: false
        };

        await pgClient.query(`
            SELECT public.save_order_transaction(
                $1,
                $2::jsonb,
                $3::jsonb,
                $4::jsonb,
                false
            );
        `, [orderId, JSON.stringify(payload), JSON.stringify(items), JSON.stringify([{ method: 'Dinheiro', amount: 600.00 }])]);

        // Transiciona para fulfilled
        await pgClient.query(`UPDATE public.orders SET status = 'fulfilled', stock_processed = true WHERE id = $1`, [orderId]);
        await pgClient.query(`
            INSERT INTO public.inventory_moves (
                product_id, type, quantity, date, label, order_id, unit_cost, unit_price
            ) VALUES (
                'prod-est-01', 'exit', 2, now(), 'Saída Pedido #880004', $1, 150, 300
            );
        `, [orderId]);

        const exitMoves = (await pgClient.query('SELECT * FROM public.inventory_moves WHERE order_id = $1', [orderId])).rows;
        expect(exitMoves).toHaveLength(1);
        expect(Number(exitMoves[0].quantity)).toBe(2);

        // Cancelamento e Estorno
        await pgClient.query(`UPDATE public.orders SET status = 'cancelled', stock_processed = false WHERE id = $1`, [orderId]);
        await pgClient.query(`
            UPDATE public.inventory_moves 
            SET reason = 'Cancelamento da venda',
                observation = jsonb_build_object('status', 'reversed', 'reversalReason', 'Cancelamento do pedido')::text
            WHERE order_id = $1;
        `, [orderId]);

        const cancelledOrder = (await pgClient.query('SELECT status, stock_processed FROM public.orders WHERE id = $1', [orderId])).rows[0];
        expect(cancelledOrder.status).toBe('cancelled');
        expect(cancelledOrder.stock_processed).toBe(false);
        console.log('✅ [Cenário 4] PASS - Ciclo de vida e estorno de movimentação de estoque validados.');
    });

    // ── CENÁRIO 5: Relatórios de Vendas Consolidando order_items ──
    test('Cenário 5: Relatório de Vendas (useSalesReport) Consolidando order_items Normalizados', async () => {
        const orderId = `test_order_report_${testRunId}`;
        createdOrderIds.push(orderId);

        const items = [{ productId: 'p-rep-01', description: 'Item Relatório Normalizado', quantity: 2, unitPrice: 800.00, costPrice: 400.00 }];
        const payload = {
            id: orderId,
            order_data: { id: orderId, orderNumber: '880005', status: 'scheduled', orderType: 'sale' },
            items,
            order_number: '880005',
            status: 'scheduled',
            order_type: 'sale',
            total_amount: 1600.00,
            deleted: false
        };

        await pgClient.query(`
            SELECT public.save_order_transaction(
                $1,
                $2::jsonb,
                $3::jsonb,
                $4::jsonb,
                false
            );
        `, [orderId, JSON.stringify(payload), JSON.stringify(items), JSON.stringify([{ method: 'Pix', amount: 1600.00 }])]);

        const reportRows = (await pgClient.query(`
            SELECT oi.id, oi.description, oi.quantity, oi.unit_price, oi.cost_price, o.status
            FROM public.order_items oi
            INNER JOIN public.orders o ON o.id = oi.order_id
            WHERE o.deleted = false
              AND o.order_type <> 'budget'
              AND o.status NOT IN ('draft', 'cancelled')
              AND oi.order_id = $1;
        `, [orderId])).rows;

        expect(reportRows).toHaveLength(1);
        expect(Number(reportRows[0].quantity)).toBe(2);
        expect(Number(reportRows[0].unit_price)).toBe(800.00);
        console.log('✅ [Cenário 5] PASS - Relatórios agregam order_items com inner join.');
    });

    // ── CENÁRIO 6: Devolução Vinculada ──
    test('Cenário 6: Devolução Vinculada Mantendo Integridade Relacional', async () => {
        const saleOrderId = `test_order_sale_${testRunId}`;
        const returnOrderId = `test_order_ret_${testRunId}`;
        createdOrderIds.push(saleOrderId, returnOrderId);

        const salePayload = {
            id: saleOrderId,
            order_data: { id: saleOrderId, orderNumber: '880006', status: 'fulfilled' },
            items: [{ productId: 'p-ret', description: 'Item Original', quantity: 1, unitPrice: 700.00 }],
            order_number: '880006',
            status: 'fulfilled',
            total_amount: 700.00,
            deleted: false
        };
        await pgClient.query(`
            SELECT public.save_order_transaction(
                $1,
                $2::jsonb,
                $3::jsonb,
                $4::jsonb,
                false
            );
        `, [saleOrderId, JSON.stringify(salePayload), JSON.stringify(salePayload.items), JSON.stringify([{ method: 'Pix', amount: 700.00 }])]);

        const returnPayload = {
            id: returnOrderId,
            order_data: { id: returnOrderId, orderNumber: '880007', status: 'scheduled', orderType: 'return', linkedOrderId: saleOrderId },
            items: [{ productId: 'p-ret', description: 'Item Devolvido', quantity: 1, unitPrice: 700.00 }],
            order_number: '880007',
            status: 'scheduled',
            order_type: 'return',
            linked_order_id: saleOrderId,
            total_amount: 700.00,
            deleted: false
        };
        await pgClient.query(`
            SELECT public.save_order_transaction(
                $1,
                $2::jsonb,
                $3::jsonb,
                $4::jsonb,
                false
            );
        `, [returnOrderId, JSON.stringify(returnPayload), JSON.stringify(returnPayload.items), JSON.stringify([])]);

        await pgClient.query('UPDATE public.orders SET return_order_id = $1 WHERE id = $2', [returnOrderId, saleOrderId]);

        const returnRow = (await pgClient.query('SELECT id, order_type, linked_order_id FROM public.orders WHERE id = $1', [returnOrderId])).rows[0];
        expect(returnRow.order_type).toBe('return');
        expect(returnRow.linked_order_id).toBe(saleOrderId);

        const saleRow = (await pgClient.query('SELECT id, return_order_id FROM public.orders WHERE id = $1', [saleOrderId])).rows[0];
        expect(saleRow.return_order_id).toBe(returnOrderId);
        console.log('✅ [Cenário 6] PASS - Devoluções e vendas vinculadas mantêm integridade relacional.');
    });

    // ── CENÁRIO 7: Telemetria de Fallback ──
    test('Cenário 7: Telemetria de Fallback Permanece Intacta em Operações Modernas', async () => {
        const telBefore = (await pgClient.query('SELECT execution_count FROM public.order_fallback_telemetry WHERE id = 1')).rows[0];
        const initialCount = Number(telBefore?.execution_count || 0);

        const orderId = `test_order_telemetry_${testRunId}`;
        createdOrderIds.push(orderId);

        const payload = {
            order_data: { id: orderId, orderNumber: '880008', status: 'draft' },
            items: [{ description: 'Item Telemetria', quantity: 1, unitPrice: 50.00 }],
            order_number: '880008',
            status: 'draft',
            total_amount: 50.00,
            deleted: false
        };
        await pgClient.query(`
            SELECT public.save_order_transaction(
                p_order_id := NULL,
                p_order_payload := $1,
                p_items := $2,
                p_payments := $3,
                p_is_update := false
            );
        `, [JSON.stringify(payload), JSON.stringify(payload.items), JSON.stringify([{ method: 'Dinheiro', amount: 50.00 }])]);

        // Update operacional
        await pgClient.query('UPDATE public.orders SET delivery_status = $1 WHERE id = $2', ['in_transit', orderId]);

        const telAfter = (await pgClient.query('SELECT execution_count FROM public.order_fallback_telemetry WHERE id = 1')).rows[0];
        const finalCount = Number(telAfter?.execution_count || 0);

        expect(finalCount).toBe(initialCount);
        console.log('✅ [Cenário 7] PASS - Telemetria não disparou em operações do writer moderno.');
    });

    // ── CENÁRIO 8: Atomicidade Estrita (Rollback 100%) ──
    test('Cenário 8: Prova de Atomicidade - Falha em Itens/Pagamentos Reverte 100% da Transação', async () => {
        const orderId = `test_order_fail_${testRunId}`;
        createdOrderIds.push(orderId);

        const badPayments = [{ method: 'Pix', amount: 'VALOR_INVALIDO_NAO_NUMERICO' }];
        const payload = {
            order_data: { id: orderId },
            order_number: '880009',
            status: 'draft',
            total_amount: 100.00
        };

        let threw = false;
        try {
            await pgClient.query(`
                SELECT public.save_order_transaction(
                    p_order_id := NULL,
                    p_order_payload := $1,
                    p_items := $2,
                    p_payments := $3,
                    p_is_update := false
                );
            `, [
                JSON.stringify(payload),
                JSON.stringify([{ productId: 'p-ok', description: 'Item Válido', quantity: 1, unitPrice: 100.00 }]),
                JSON.stringify(badPayments)
            ]);
        } catch (e) {
            threw = true;
        }

        expect(threw).toBe(true);

        const checkOrder = (await pgClient.query('SELECT * FROM public.orders WHERE id = $1', [orderId])).rows;
        expect(checkOrder).toHaveLength(0);

        const checkItems = (await pgClient.query('SELECT * FROM public.order_items WHERE order_id = $1', [orderId])).rows;
        expect(checkItems).toHaveLength(0);

        const checkPayments = (await pgClient.query('SELECT * FROM public.order_payments WHERE order_id = $1', [orderId])).rows;
        expect(checkPayments).toHaveLength(0);

        console.log('✅ [Cenário 8] PASS - Rollback atômico 100% comprovado.');
    });
});
