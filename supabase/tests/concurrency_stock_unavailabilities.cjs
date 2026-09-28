const { Client } = require('pg');
const assert = require('assert');
const { randomUUID } = require('node:crypto');
const { verifyLocalSupabase } = require('../../scripts/testing/supabase-local-preflight.cjs');

async function runRealConcurrencyTests() {
  const { dbUrl: DB_URL } = await verifyLocalSupabase();
  console.log('=== Iniciando Teste de Concorrência Transacional Real (Multi-Session PostgreSQL) ===');
  
  const clientA = new Client({ connectionString: DB_URL });
  const clientB = new Client({ connectionString: DB_URL });
  const setupClient = new Client({ connectionString: DB_URL });
  let userId;
  let prodId;
  let varId;
  let unavailId;

  try {
    await Promise.all([clientA.connect(), clientB.connect(), setupClient.connect()]);
    // 1. Setup Test Fixture with dynamic UUIDs
    userId = randomUUID();
    prodId = randomUUID();
    varId = randomUUID();
    const testRunId = `TEST_AUT_${randomUUID()}`;

    console.log('[Setup] Inserindo usuário, permissões, produto e variação com saldo = 1...');
    await setupClient.query(`
      INSERT INTO auth.users (id, email)
      VALUES ($1, $2);
    `, [userId, `${testRunId.toLowerCase()}@example.test`]);

    await setupClient.query('BEGIN');
    await setupClient.query("SET LOCAL session_replication_role = 'replica'");
    await setupClient.query(`
      INSERT INTO public.profiles (id, role, roles, name)
      VALUES ($1, 'administrator', ARRAY['administrator'], $2)
      ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, roles = EXCLUDED.roles, name = EXCLUDED.name;
    `, [userId, `${testRunId} Admin Teste`]);
    await setupClient.query('COMMIT');

    await setupClient.query(`
      INSERT INTO public.products (id, name, slug, price, stock, product_kind)
      VALUES ($1, $2, $3, 100, 1, 'normal');
    `, [prodId, `${testRunId} Mesa Teste Concorrência`, `${testRunId.toLowerCase()}-mesa`]);

    await setupClient.query(`
      INSERT INTO public.product_variations (id, product_id, name, stock)
      VALUES ($1, $2, 'Cor Natural', 1);
    `, [varId, prodId]);

    // Função auxiliar para definir contexto auth na conexão
    const setAuth = async (client) => {
      await client.query(`
        SET LOCAL request.jwt.claim.sub = '${userId}';
        SET LOCAL request.jwt.claims = '{"sub": "${userId}", "role": "authenticated"}';
        SET LOCAL role = 'authenticated';
      `);
    };

    console.log('[Teste 1] Concorrência Real: Sessão A e Sessão B disputando a ÚLTIMA unidade (saldo = 1)');
    // Conexão A abre transação e segura lock da linha da variação
    await clientA.query('BEGIN');
    await setAuth(clientA);

    // Conexão B também abre transação e tentará a mesma operação
    await clientB.query('BEGIN');
    await setAuth(clientB);

    // Sessão A executa a retirada
    const promiseA = clientA.query(`
      SELECT public.create_stock_unavailability(
        $1, $2, 1, 'Avaria Conexão A', 'Descarte/perda', 'Depósito', 'Retirada A', NULL, NULL
      ) as res;
    `, [prodId, varId]);

    // Sessão B executa simultaneamente em outra conexão física
    const promiseB = (async () => {
      // Pequeno delay para garantir que A atingiu o FOR UPDATE primeiro
      await new Promise(r => setTimeout(r, 50));
      return clientB.query(`
        SELECT public.create_stock_unavailability(
          $1, $2, 1, 'Avaria Conexão B', 'Descarte/perda', 'Depósito', 'Retirada B', NULL, NULL
        ) as res;
      `, [prodId, varId]);
    })();

    // Aguarda A concluir a execução dentro de sua transação (linha bloqueada)
    const resA = await promiseA;
    unavailId = resA.rows[0].res.id;
    assert.ok(unavailId, 'Sessão A deve gerar o ID da indisponibilidade');

    // Agora A faz commit e libera o lock para B
    await clientA.query('COMMIT');

    // Sessão B deve despertar do lock e FALHAR com "Estoque insuficiente"
    let errorB = null;
    try {
      await promiseB;
      await clientB.query('COMMIT');
    } catch (err) {
      errorB = err;
      await clientB.query('ROLLBACK');
    }

    assert.ok(errorB, 'Sessão B obrigatoriamente DEVE falhar ao disputar a última unidade!');
    assert.match(errorB.message, /Estoque insuficiente/, 'Erro da Sessão B deve ser de estoque insuficiente');
    console.log('✔ Sucesso Concorrência Criação: Aprovada Sessão A, Sessão B rejeitada com "Estoque insuficiente"');

    // Validação do estado no PostgreSQL
    const checkStock = await setupClient.query('SELECT stock FROM public.product_variations WHERE id = $1', [varId]);
    assert.equal(Number(checkStock.rows[0].stock), 0, 'Saldo da variação deve ser exatamente 0');

    const moves = await setupClient.query(
      "SELECT * FROM public.inventory_moves WHERE product_id = $1 AND type = 'exit'",
      [prodId]
    );
    assert.equal(moves.rows.length, 1, 'Deve existir exatamente UMA movimentação de saída');
    assert.equal(moves.rows[0].related_entity_id, unavailId);

    console.log('[Teste 2] Rollback Induzido: Falha forçada no meio da transação reverte tudo');
    await clientA.query('BEGIN');
    await setAuth(clientA);
    // Insere estoque temporário
    await setupClient.query('UPDATE public.product_variations SET stock = 5 WHERE id = $1', [varId]);
    
    // Executa retirada de 2 itens
    await clientA.query(`
      SELECT public.create_stock_unavailability(
        $1, $2, 2, 'Teste Rollback', 'Descarte/perda', 'Depósito', 'Teste', NULL, NULL
      );
    `, [prodId, varId]);

    // Força ROLLBACK
    await clientA.query('ROLLBACK');

    const checkStockAfterRollback = await setupClient.query('SELECT stock FROM public.product_variations WHERE id = $1', [varId]);
    assert.equal(Number(checkStockAfterRollback.rows[0].stock), 5, 'Saldo após rollback deve permanecer 5 intacto');

    // Restaura saldo para 0 para testar reversão da indisponibilidade de A
    await setupClient.query('UPDATE public.product_variations SET stock = 0 WHERE id = $1', [varId]);

    console.log('[Teste 3] Concorrência Real: Sessão A e B tentando DESFAZER a mesma indisponibilidade simultaneamente');
    await clientA.query('BEGIN');
    await setAuth(clientA);
    await clientB.query('BEGIN');
    await setAuth(clientB);

    const revA = clientA.query('SELECT public.undo_stock_unavailability($1) as res', [unavailId]);
    const revB = (async () => {
      await new Promise(r => setTimeout(r, 50));
      return clientB.query('SELECT public.undo_stock_unavailability($1) as res', [unavailId]);
    })();

    const resultRevA = await revA;
    assert.equal(resultRevA.rows[0].res.status, 'cancelled');
    await clientA.query('COMMIT');

    let errorRevB = null;
    try {
      await revB;
      await clientB.query('COMMIT');
    } catch (err) {
      errorRevB = err;
      await clientB.query('ROLLBACK');
    }

    assert.ok(errorRevB, 'Sessão B deve ser rejeitada na reversão concorrente!');
    assert.match(errorRevB.message, /cancelada/, 'Mensagem deve indicar que já foi cancelada');
    console.log('✔ Sucesso Concorrência Reversão: Apenas uma reversão foi aceita; segunda foi barrada pelo lock');

    const finalStock = await setupClient.query('SELECT stock FROM public.product_variations WHERE id = $1', [varId]);
    assert.equal(Number(finalStock.rows[0].stock), 1, 'Saldo final após reversão única deve ser exatamente 1 (não 2!)');

    const allMoves = await setupClient.query(
      'SELECT type, quantity, related_entity_type FROM public.inventory_moves WHERE related_entity_id = $1 ORDER BY date ASC',
      [unavailId]
    );
    assert.equal(allMoves.rows.length, 2, 'Devem existir exatamente 2 movimentações: 1 saída original e 1 entrada de estorno');
    assert.equal(allMoves.rows[0].type, 'exit');
    assert.equal(allMoves.rows[1].type, 'entry');

    console.log('✔ Preservação de Histórico: Saída original preservada e entrada vinculada registrada!');
    console.log('=== TODOS OS TESTES DE CONCORRÊNCIA E TRANSAÇÃO EM POSTGRES REAL PASSARAM COM SUCESSO! ===');

  } finally {
    for (const client of [clientA, clientB]) {
      try { await client.query('ROLLBACK'); } catch { /* sem transação ativa */ }
    }
    try { await setupClient.query('ROLLBACK'); } catch { /* sem transação ativa */ }
    if (userId) {
      try {
        if (unavailId) {
          await setupClient.query('DELETE FROM public.stock_unavailabilities WHERE id = $1', [unavailId]);
          await setupClient.query('DELETE FROM public.inventory_moves WHERE related_entity_id = $1::text', [unavailId]);
        }
        if (varId) await setupClient.query('DELETE FROM public.product_variations WHERE id = $1', [varId]);
        if (prodId) await setupClient.query('DELETE FROM public.products WHERE id = $1', [prodId]);
        await setupClient.query('DELETE FROM public.profiles WHERE id = $1', [userId]);
        await setupClient.query('DELETE FROM auth.users WHERE id = $1', [userId]);
      } catch (cleanupError) {
        console.error(`Cleanup incompleto do test run próprio (produto=${prodId}, usuário=${userId}): ${cleanupError.message}`);
        process.exitCode = 1;
      }
    }
    await Promise.all([clientA.end(), clientB.end(), setupClient.end()]);
  }
}

runRealConcurrencyTests().catch(err => {
  console.error('❌ FALHA NO TESTE DE CONCORRÊNCIA:', err);
  process.exit(1);
});
