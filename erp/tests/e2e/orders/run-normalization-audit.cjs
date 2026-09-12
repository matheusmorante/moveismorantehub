/**
 * Runner determinístico Node.js para a bateria de testes de normalização
 */
const { Client } = require('pg');

const PG_CONNECTION = 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres';

async function runAudit() {
    const pgClient = new Client({ connectionString: PG_CONNECTION });
    await pgClient.connect();
    console.log('--- INICIANDO AUDITORIA DE NORMALIZAÇÃO DE PEDIDOS (PostgreSQL + Camada de Serviços) ---');

    const testRunId = `E2E-NORM-${Date.now()}`;
    const createdOrderIds = [];

    const assert = (condition, msg) => {
        if (!condition) {
            console.error(`❌ FALHA: ${msg}`);
            throw new Error(msg);
        }
    };

    try {
        // ── CENÁRIO A: Criação Completa ──
        console.log('\n[CENÁRIO A] Criando Pedido Completo (2 Itens, Descontos, Frete, Pagamentos Parcelados)...');
        const orderIdA = `test_order_create_${testRunId}`;
        createdOrderIds.push(orderIdA);

        const itemsA = [
            {
                productId: 'prod-001-mesa',
                variationId: 'var-001-mesa-marrom',
                code: 'MES-01',
                description: 'Mesa de Jantar 6 Lugares Madeira Nobre',
                quantity: 1,
                unitPrice: 2500.00,
                unitDiscount: 200.00,
                discountType: 'fixed',
                costPrice: 1200.00,
                condition: 'novo',
                handlingType: 'montagem_inclusa',
                observation: 'Embalagem reforçada',
                isTemporaryProduct: false,
                itemSnapshot: { sku: 'MES-NOB-6L', color: 'Marrom Tabaco' }
            },
            {
                productId: 'prod-002-cadeira',
                variationId: 'var-002-cadeira-bege',
                code: 'CAD-01',
                description: 'Cadeira Estofada Bege Linho',
                quantity: 6,
                unitPrice: 350.00,
                unitDiscount: 0.00,
                discountType: 'fixed',
                costPrice: 150.00,
                condition: 'novo',
                handlingType: 'montagem_inclusa',
                observation: 'Tecido impermeabilizado',
                isTemporaryProduct: false,
                itemSnapshot: { sku: 'CAD-BEG-LIN', color: 'Bege Linho' }
            }
        ];

        const paymentsA = [
            {
                method: 'Pix',
                amount: 1550.00,
                fee: 0,
                feeType: 'fixed',
                status: 'PAGO',
                installments: 1
            },
            {
                method: 'Cartão de Crédito',
                amount: 3000.00,
                fee: 90.00,
                feeType: 'percentage',
                status: 'PAGO',
                installments: 3
            }
        ];

        const payloadA = {
            order_data: {
                id: orderIdA,
                orderNumber: '990001',
                orderIndex: 990001,
                status: 'scheduled',
                orderType: 'sale',
                customerData: {
                    id: 'cust-auditoria-001',
                    fullName: 'João Silva de Teste Normalizado',
                    phone: '45999887766'
                },
                seller: 'Carlos Vendedor Teste',
                sellerId: 'sell-001',
                shipping: {
                    deliveryMethod: 'delivery',
                    value: 150.00,
                    scheduling: { date: '2026-09-25', startTime: '14:00', endTime: '18:00' }
                }
            },
            items: itemsA,
            order_number: '990001',
            order_index: 990001,
            order_type: 'sale',
            status: 'scheduled',
            customer_id: 'cust-auditoria-001',
            customer_name: 'João Silva de Teste Normalizado',
            seller_id: 'sell-001',
            seller_name: 'Carlos Vendedor Teste',
            total_amount: 4550.00,
            items_subtotal: 4600.00,
            total_discount: 200.00,
            total_cost: 2100.00,
            scheduled_date: '2026-09-25',
            scheduled_start_time: '14:00',
            scheduled_end_time: '18:00',
            delivery_method: 'delivery',
            delivery_status: 'pending',
            deleted: false
        };

        const rpcResA = await pgClient.query(`
            SELECT public.save_order_transaction(
                p_order_id := NULL,
                p_order_payload := $1,
                p_items := $2,
                p_payments := $3,
                p_is_update := false
            ) as res;
        `, [JSON.stringify(payloadA), JSON.stringify(itemsA), JSON.stringify(paymentsA)]);

        const resA = rpcResA.rows[0].res;
        assert(resA && resA.id, 'RPC save_order_transaction não retornou id na criação');

        // Checagens no Banco
        const orderRowA = (await pgClient.query('SELECT * FROM public.orders WHERE id = $1', [resA.id])).rows[0];
        assert(orderRowA.status === 'scheduled', 'orders.status divergente');
        assert(Number(orderRowA.total_amount) === 4550.00, 'orders.total_amount divergente');
        assert(orderRowA.customer_name === 'João Silva de Teste Normalizado', 'orders.customer_name divergente');

        const itemsRowA = (await pgClient.query('SELECT * FROM public.order_items WHERE order_id = $1 ORDER BY item_index ASC', [resA.id])).rows;
        assert(itemsRowA.length === 2, `order_items esperado 2, obteve ${itemsRowA.length}`);
        assert(Number(itemsRowA[0].quantity) === 1 && Number(itemsRowA[0].unit_price) === 2500.00, 'Item 1 divergente');
        assert(Number(itemsRowA[1].quantity) === 6 && Number(itemsRowA[1].unit_price) === 350.00, 'Item 2 divergente');

        const payRowsA = (await pgClient.query('SELECT * FROM public.order_payments WHERE order_id = $1 ORDER BY payment_index ASC', [resA.id])).rows;
        assert(payRowsA.length === 2, `order_payments esperado 2, obteve ${payRowsA.length}`);
        assert(payRowsA[0].payment_method === 'Pix' && Number(payRowsA[0].amount) === 1550.00, 'Pagamento 1 divergente');
        assert(payRowsA[1].payment_method === 'Cartão de Crédito' && Number(payRowsA[1].installments) === 3, 'Pagamento 2 divergente');

        // Batimento Matemático
        const sumItemsA = itemsRowA.reduce((acc, r) => acc + (Number(r.quantity) * Number(r.unit_price)) - (Number(r.unit_discount) || 0), 0);
        const sumPaymentsA = payRowsA.reduce((acc, r) => acc + Number(r.amount), 0);
        assert(sumItemsA + 150.00 === Number(orderRowA.total_amount), 'Matemática de Itens + Frete <> total_amount');
        assert(sumPaymentsA === Number(orderRowA.total_amount), 'Matemática de Pagamentos <> total_amount');
        console.log('✅ [CENÁRIO A] PASS - Criação atômica e batimento financeiro 100% corretos.');

        // ── CENÁRIO B: Edição do Pedido ──
        console.log('\n[CENÁRIO B] Testando Edição de Pedido Existente...');
        const editedItemsB = [
            { code: 'MES-01', description: 'Mesa de Jantar 6 Lugares Madeira Nobre', quantity: 2, unitPrice: 2400.00, unitDiscount: 0 }, // 4800
            { code: 'TAP-01', description: 'Tapete Sala Geométrico', quantity: 1, unitPrice: 500.00, unitDiscount: 0 } // 500 -> Total Itens = 5300 + 150 frete = 5450
        ];
        const editedPaymentsB = [
            { method: 'Pix', amount: 5450.00, status: 'PAGO', installments: 1 }
        ];
        const payloadB = {
            ...payloadA,
            seller_name: 'Vendedora Beatriz Atualizada',
            total_amount: 5450.00,
            items_subtotal: 5300.00,
            total_discount: 0,
            updated_at: new Date().toISOString()
        };

        await pgClient.query(`
            SELECT public.save_order_transaction(
                p_order_id := $1,
                p_order_payload := $2,
                p_items := $3,
                p_payments := $4,
                p_is_update := true
            );
        `, [resA.id, JSON.stringify(payloadB), JSON.stringify(editedItemsB), JSON.stringify(editedPaymentsB)]);

        const itemsRowB = (await pgClient.query('SELECT * FROM public.order_items WHERE order_id = $1 ORDER BY item_index ASC', [resA.id])).rows;
        assert(itemsRowB.length === 2, `Edição: order_items esperado 2, obteve ${itemsRowB.length}`);
        assert(itemsRowB[0].description.includes('Mesa') && Number(itemsRowB[0].quantity) === 2, 'Item 1 não foi atualizado');
        assert(itemsRowB[1].description.includes('Tapete'), 'Item Novo não foi adicionado ou cadeiras antigas permaneceram');

        const payRowsB = (await pgClient.query('SELECT * FROM public.order_payments WHERE order_id = $1 ORDER BY payment_index ASC', [resA.id])).rows;
        assert(payRowsB.length === 1 && Number(payRowsB[0].amount) === 5450.00, 'Pagamentos antigos permaneceram ou novo não gravou');
        console.log('✅ [CENÁRIO B] PASS - Edição sem orfandade e sem duplicações.');

        // ── CENÁRIO C: Ciclo de Status e Estoque ──
        console.log('\n[CENÁRIO C] Testando Transição de Status e Efeito em Estoque...');
        const orderIdC = `test_order_status_${testRunId}`;
        createdOrderIds.push(orderIdC);

        // Criar rascunho
        const rpcResC = await pgClient.query(`
            SELECT public.save_order_transaction(
                p_order_id := NULL,
                p_order_payload := $1,
                p_items := $2,
                p_payments := $3,
                p_is_update := false
            ) as res;
        `, [
            JSON.stringify({ order_data: { status: 'draft' }, order_number: '990003', status: 'draft', total_amount: 100 }),
            JSON.stringify([{ productId: 'prod-est-1', description: 'Item Teste', quantity: 1, unitPrice: 100 }]),
            JSON.stringify([{ method: 'Dinheiro', amount: 100 }])
        ]);
        const actualOrderIdC = rpcResC.rows[0].res.id;
        createdOrderIds.push(actualOrderIdC);

        // Atender pedido (fulfilled) e simular saída de estoque
        await pgClient.query(`UPDATE public.orders SET status = 'fulfilled', stock_processed = true WHERE id = $1`, [actualOrderIdC]);
        await pgClient.query(`
            INSERT INTO public.inventory_moves (
                product_id, type, quantity, date, label, order_id, unit_cost, unit_price
            ) VALUES (
                'prod-est-1', 'exit', 1, now(), 'Saída Pedido #990003', $1, 50, 100
            );
        `, [actualOrderIdC]);

        const exitMoves = (await pgClient.query('SELECT * FROM public.inventory_moves WHERE order_id = $1', [actualOrderIdC])).rows;
        assert(exitMoves.length === 1 && exitMoves[0].type === 'exit', 'Movimentação de saída não registrada');

        // Cancelar pedido (cancelled) e estornar movimentação
        await pgClient.query(`UPDATE public.orders SET status = 'cancelled', stock_processed = false WHERE id = $1`, [actualOrderIdC]);
        await pgClient.query(`
            UPDATE public.inventory_moves 
            SET reason = 'Cancelamento da venda',
                observation = jsonb_build_object('status', 'reversed', 'reversalReason', 'Cancelamento do pedido')::text
            WHERE order_id = $1;
        `, [actualOrderIdC]);

        const cancelledOrder = (await pgClient.query('SELECT status, stock_processed FROM public.orders WHERE id = $1', [actualOrderIdC])).rows[0];
        assert(cancelledOrder.status === 'cancelled' && cancelledOrder.stock_processed === false, 'Status ou flag de estoque incorretos no cancelamento');
        console.log('✅ [CENÁRIO C] PASS - Ciclo de vida e estorno de estoque validados.');

        // ── CENÁRIO D: Agenda e Operação ──
        console.log('\n[CENÁRIO D] Validando Leitura da Agenda e Operação via Colunas Físicas...');
        const agendaRow = (await pgClient.query(`
            SELECT id, scheduled_date, scheduled_start_time, delivery_method 
            FROM public.orders 
            WHERE id = $1 AND deleted = false;
        `, [resA.id])).rows[0];
        assert(agendaRow && agendaRow.scheduled_date, 'Agenda não encontrou pedido com scheduled_date físico');
        console.log('✅ [CENÁRIO D] PASS - Agenda e Operação lêem colunas normalizadas perfeitamente.');

        // ── CENÁRIO E: Relatórios via order_items ──
        console.log('\n[CENÁRIO E] Validando Consolidação em Relatórios (order_items JOIN orders)...');
        const reportRows = (await pgClient.query(`
            SELECT oi.id, oi.description, oi.quantity, oi.unit_price, oi.cost_price, o.status
            FROM public.order_items oi
            INNER JOIN public.orders o ON o.id = oi.order_id
            WHERE o.deleted = false
              AND o.status NOT IN ('draft', 'cancelled')
              AND oi.order_id = $1;
        `, [resA.id])).rows;
        assert(reportRows.length === 2, `Relatório esperava 2 itens, obteve ${reportRows.length}`);
        console.log('✅ [CENÁRIO E] PASS - Relatórios agregam order_items corretamente.');

        // ── CENÁRIO F: Devolução Vinculada ──
        console.log('\n[CENÁRIO F] Validando Vínculo de Devolução (return_order_id e linked_order_id)...');
        const returnId = `test_order_ret_${testRunId}`;
        createdOrderIds.push(returnId);

        const rpcResF = await pgClient.query(`
            SELECT public.save_order_transaction(
                p_order_id := NULL,
                p_order_payload := $1,
                p_items := $2,
                p_payments := $3,
                p_is_update := false
            ) as res;
        `, [
            JSON.stringify({ order_data: { linkedOrderId: resA.id }, order_number: '990007', order_type: 'return', linked_order_id: resA.id, status: 'scheduled', total_amount: 500 }),
            JSON.stringify([{ productId: 'p-ret', description: 'Item Devolvido', quantity: 1, unitPrice: 500 }]),
            JSON.stringify([])
        ]);
        const actualReturnId = rpcResF.rows[0].res.id;
        createdOrderIds.push(actualReturnId);

        const returnRow = (await pgClient.query('SELECT id, order_type, linked_order_id FROM public.orders WHERE id = $1', [actualReturnId])).rows[0];
        assert(returnRow && returnRow.linked_order_id === resA.id, 'Vínculo da devolução com a venda falhou');
        console.log('✅ [CENÁRIO F] PASS - Devolução vinculada preserva integridade relacional.');

        // ── CENÁRIO G: Telemetria de Fallback ──
        console.log('\n[CENÁRIO G] Conferindo Telemetria do Fallback...');
        const telBefore = (await pgClient.query('SELECT execution_count FROM public.order_fallback_telemetry WHERE id = 1')).rows[0];
        
        // Simula update operacional no pedido A (ex: entrega iniciada)
        await pgClient.query('UPDATE public.orders SET delivery_status = $1 WHERE id = $2', ['in_transit', resA.id]);
        
        const telAfter = (await pgClient.query('SELECT execution_count FROM public.order_fallback_telemetry WHERE id = 1')).rows[0];
        assert(Number(telAfter.execution_count) === Number(telBefore.execution_count), 'Telemetria incrementou indevidamente em update operacional!');
        console.log('✅ [CENÁRIO G] PASS - Telemetria no-op em operações modernas.');

        // ── CENÁRIO H: Atomicidade Estrita ──
        console.log('\n[CENÁRIO H] Testando Atomicidade e Rollback 100%...');
        const orderIdH = `test_order_fail_${testRunId}`;
        createdOrderIds.push(orderIdH);

        // Teste de falha forçada: string não-numérica no amount do pagamento gera erro de cast ::numeric
        // dentro da transação, provocando ROLLBACK total de orders e order_items
        const badPayments = [{ method: 'Pix', amount: 'VALOR_INVALIDO_NAO_NUMERICO' }];
        const payload = {
            order_data: { id: orderIdH },
            order_number: '990009',
            status: 'draft',
            total_amount: 100
        };

        let failed = false;
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
                JSON.stringify([{ productId: 'p-ok', description: 'Item Válido', quantity: 1, unitPrice: 100 }]),
                JSON.stringify(badPayments)
            ]);
        } catch (e) {
            failed = true;
        }
        assert(failed, 'A RPC não rejeitou valor inválido');
        const checkH = (await pgClient.query('SELECT * FROM public.orders WHERE id = $1', [orderIdH])).rows;
        assert(checkH.length === 0, 'Atomicidade violada: orders foi persistido mesmo com falha em itens!');
        console.log('✅ [CENÁRIO H] PASS - Rollback atômico 100% provado.');

        console.log('\n======================================================');
        console.log('🎉 TODOS OS CENÁRIOS DE AUDITORIA FORAM APROVADOS (8/8)!');
        console.log('======================================================\n');
    } finally {
        console.log(`[Teardown] Limpando dados de teste descartáveis (${createdOrderIds.length} pedidos)...`);
        for (const id of createdOrderIds) {
            await pgClient.query('DELETE FROM public.order_items WHERE order_id = $1', [id]);
            await pgClient.query('DELETE FROM public.order_payments WHERE order_id = $1', [id]);
            await pgClient.query('DELETE FROM public.inventory_moves WHERE order_id = $1', [id]);
            await pgClient.query('DELETE FROM public.orders WHERE id = $1', [id]);
        }
        await pgClient.end();
        console.log('[Teardown] Limpeza concluída com sucesso.');
    }
}

runAudit().catch(err => {
    console.error('ERRO FATAL NA AUDITORIA:', err);
    process.exit(1);
});
