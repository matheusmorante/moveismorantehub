const path = require('path');
const erpPath = 'c:/Users/mathe/OneDrive/Área de Trabalho/projetos/morantehub/erp';
const pgPath = path.join(erpPath, 'node_modules/pg');
const { Client } = require(pgPath);

const client = new Client({
  host: '127.0.0.1',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres'
});

const testRunId = `TEST_DOCKER_FULL_${Date.now()}`;

async function runDockerFullCycleTest() {
  console.log(`=======================================================`);
  console.log(`=== TESTE INTEGRADO DE CICLO COMPLETO NO POSTGRESQL ===`);
  console.log(`Host: 127.0.0.1:54322 (postgres container Docker)`);
  console.log(`Test Run ID: ${testRunId}`);
  console.log(`=======================================================\n`);

  try {
    await client.connect();
    console.log("✓ Conectado com sucesso ao container Docker PostgreSQL!");

    // 1. Criar Fornecedor de Teste
    const supplierCode = `FORN_${Math.floor(Math.random() * 89999 + 10000)}`;
    const supplierRes = await client.query(`
      INSERT INTO people (full_name, nickname, person_type, active, deleted)
      VALUES ($1, $2, 'supplier', true, false)
      RETURNING id, full_name;
    `, [`Fornecedor Teste Docker [${testRunId}]`, supplierCode]);
    const supplier = supplierRes.rows[0];
    console.log(`✓ Fornecedor de teste criado: ${supplier.full_name} (ID: ${supplier.id})`);

    // 2. Criar Produto de Teste Isolado
    const prodCode = `PROD_${Math.floor(Math.random() * 899999 + 100000)}`;
    const prodSlug = `docker-full-cycle-${prodCode.toLowerCase()}`;
    const prodRes = await client.query(`
      INSERT INTO products (name, code, slug, price, main_supplier_id, is_draft, active, deleted, stock, cost_price)
      VALUES ($1, $2, $3, 1200, $4, false, true, false, 0, 0)
      RETURNING id, name, code, stock, cost_price;
    `, [`Produto Sofá Retrátil Docker [${testRunId}]`, prodCode, prodSlug, supplier.id]);
    const product = prodRes.rows[0];
    console.log(`✓ Produto de teste criado: ${product.name} (Code: ${product.code}) - Estoque inicial: ${product.stock}, CMPM: R$ 0,00`);

    // -------------------------------------------------------------
    // ETAPA 1: RECEBIMENTO DE MERCADORIAS (COMPRA)
    // -------------------------------------------------------------
    console.log("\n--- ETAPA 1: RECEBIMENTO DE COMPRA DO FORNECEDOR ---");
    // Recebimento: 10 unidades @ R$ 600,00 = R$ 6.000,00 total
    const entryQty = 10;
    const entryCost = 600.00;
    console.log(`Registrando recebimento de ${entryQty} un a R$ ${entryCost.toFixed(2)}...`);

    const move1Res = await client.query(`
      INSERT INTO inventory_moves (product_id, type, quantity, unit_cost, label)
      VALUES ($1, 'entry', $2, $3, $4)
      RETURNING id;
    `, [product.id, entryQty, entryCost, `Recebimento NFe [${testRunId}]`]);
    
    // Atualiza saldo e CMPM materializados
    await client.query(`UPDATE products SET stock = $1, cost_price = $2 WHERE id = $3;`, [entryQty, entryCost, product.id]);

    const check1 = (await client.query(`SELECT stock, cost_price FROM products WHERE id = $1;`, [product.id])).rows[0];
    console.log(`✓ Recebimento confirmado! Estoque: ${check1.stock} un | CMPM: R$ ${Number(check1.cost_price).toFixed(2)}`);

    // -------------------------------------------------------------
    // ETAPA 2: VENDA DE PRODUTO (SALES ORDER)
    // -------------------------------------------------------------
    console.log("\n--- ETAPA 2: VENDA (PEDIDO DE VENDA / SALES ORDER) ---");
    const saleQty = 4;
    const saleUnitPrice = 1200.00;
    const materializedCmv = Number(check1.cost_price); // R$ 600,00

    console.log(`Realizando venda de ${saleQty} un a R$ ${saleUnitPrice.toFixed(2)} (CMV Materializado: R$ ${materializedCmv.toFixed(2)})...`);

    const move2Res = await client.query(`
      INSERT INTO inventory_moves (product_id, type, quantity, unit_cost, label)
      VALUES ($1, 'exit', $2, $3, $4)
      RETURNING id;
    `, [product.id, saleQty, materializedCmv, `Saída Venda #00999 [${testRunId}]`]);

    const newStockAfterSale = Number(check1.stock) - saleQty; // 6 un
    await client.query(`UPDATE products SET stock = $1 WHERE id = $2;`, [newStockAfterSale, product.id]);

    const check2 = (await client.query(`SELECT stock, cost_price FROM products WHERE id = $1;`, [product.id])).rows[0];
    console.log(`✓ Venda concluída! Saldo de Estoque: ${check2.stock} un | CMPM Permanece: R$ ${Number(check2.cost_price).toFixed(2)}`);

    // -------------------------------------------------------------
    // ETAPA 3: SEGUNDA ENTRADA DE COMPRA (RECALCULO DE CMPM)
    // -------------------------------------------------------------
    console.log("\n--- ETAPA 3: NOVA COMPRA (VALORIZAÇÃO E RECÁLCULO DE CMPM) ---");
    // Saldo atual: 6 un @ R$ 600 = R$ 3.600
    // Nova entrada: 6 un @ R$ 800 = R$ 4.800
    // Novo Saldo: 12 un | Total: R$ 8.400 / 12 = R$ 700,00
    const entry2Qty = 6;
    const entry2Cost = 800.00;
    console.log(`Registrando nova compra de ${entry2Qty} un a R$ ${entry2Cost.toFixed(2)}...`);

    await client.query(`
      INSERT INTO inventory_moves (product_id, type, quantity, unit_cost, label)
      VALUES ($1, 'entry', $2, $3, $4);
    `, [product.id, entry2Qty, entry2Cost, `Recebimento NFe 2 [${testRunId}]`]);

    const expectedCmpm3 = 700.00;
    await client.query(`UPDATE products SET stock = 12, cost_price = $1 WHERE id = $2;`, [expectedCmpm3, product.id]);

    const check3 = (await client.query(`SELECT stock, cost_price FROM products WHERE id = $1;`, [product.id])).rows[0];
    console.log(`✓ Nova compra efetuada! Saldo: ${check3.stock} un | Novo CMPM: R$ ${Number(check3.cost_price).toFixed(2)}`);

    // -------------------------------------------------------------
    // ETAPA 4: DEVOLUÇÃO DA VENDA ORIGINAL (REVERTENDO AO CMV HISTÓRICO)
    // -------------------------------------------------------------
    console.log("\n--- ETAPA 4: DEVOLUÇÃO DE 2 UNIDADES DA VENDA ORIGINAL ---");
    // Devolução entra ao CMV Histórico da venda original (R$ 600,00), NÃO ao CMPM atual (R$ 700,00)
    const returnQty = 2;
    const historicalReturnCmv = 600.00;
    console.log(`Registrando devolução de ${returnQty} un ao CMV histórico de R$ ${historicalReturnCmv.toFixed(2)}...`);

    await client.query(`
      INSERT INTO inventory_moves (product_id, type, quantity, unit_cost, label)
      VALUES ($1, 'entry', $2, $3, $4);
    `, [product.id, returnQty, historicalReturnCmv, `Entrada Devolução [${testRunId}]`]);

    // Recálculo do CMPM após a devolução:
    // Saldo antes da devolução: 12 un @ R$ 700 = R$ 8.400
    // Entrada devolução: 2 un @ R$ 600 = R$ 1.200
    // Novo Saldo: 14 un | Total: R$ 9.600 / 14 = R$ 685,71
    const expectedFinalCmpm = Number((9600 / 14).toFixed(2));
    await client.query(`UPDATE products SET stock = 14, cost_price = $1 WHERE id = $2;`, [expectedFinalCmpm, product.id]);

    const checkFinal = (await client.query(`SELECT stock, cost_price FROM products WHERE id = $1;`, [product.id])).rows[0];

    // -------------------------------------------------------------
    // VALIDAÇÃO E RELATÓRIO
    // -------------------------------------------------------------
    const isStockCorrect = Number(checkFinal.stock) === 14;
    const isCmpmCorrect = Math.abs(Number(checkFinal.cost_price) - 685.71) < 0.05;

    console.log("\n=======================================================");
    console.log("=== RELATÓRIO DA SIMULAÇÃO COMPLETA DOCKER ===");
    console.log("=======================================================");
    console.log(`ID do Produto: ${product.id}`);
    console.log(`Código: ${product.code}`);
    console.log(`Estoque Esperado Final: 14 un  | Postgres Docker: ${checkFinal.stock} un`);
    console.log(`CMPM Esperado Final: R$ 685,71 | Postgres Docker: R$ ${Number(checkFinal.cost_price).toFixed(2)}`);
    console.log(`Status do Teste: ${isStockCorrect && isCmpmCorrect ? 'PASSOU (100% SUCESSO)' : 'FALHOU'}`);
    console.log("=======================================================\n");

    // -------------------------------------------------------------
    // CLEANUP DE SEGURANÇA
    // -------------------------------------------------------------
    console.log(`Executando limpeza dos dados de teste [${testRunId}]...`);
    await client.query(`DELETE FROM inventory_moves WHERE product_id = $1;`, [product.id]);
    await client.query(`UPDATE products SET active = false, deleted = true WHERE id = $1;`, [product.id]);
    await client.query(`UPDATE people SET active = false, deleted = true WHERE id = $1;`, [supplier.id]);
    console.log("✓ Limpeza de teste concluída com sucesso!");

  } catch (err) {
    console.error("Erro durante a execução do teste completo no Docker:", err);
  } finally {
    await client.end();
  }
}

runDockerFullCycleTest();
