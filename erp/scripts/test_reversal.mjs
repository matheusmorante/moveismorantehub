import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testReversalFlow() {
  console.log("Iniciando teste de fluxo de estorno...");
  
  const { data: products, error: pErr } = await supabase.from('products').select('id, name, stock').limit(1);
  if (pErr || !products || products.length === 0) {
    console.error("Nenhum produto encontrado:", pErr);
    return;
  }
  const testProduct = products[0];
  console.log(`Produto selecionado: ${testProduct.name} (ID: ${testProduct.id})`);

  const fakeOrderId = "TEST_ORD_" + Date.now();
  const fakeOrderCode = "01TESTE";

  // 1. Inserir saída efetivada
  const initialMovePayload = {
    product_id: testProduct.id,
    product_description: testProduct.name,
    type: 'exit',
    quantity: 2,
    date: new Date().toISOString(),
    label: `Pedido #${fakeOrderId}`,
    order_id: fakeOrderId,
    reason: 'Venda agendada',
    observation: JSON.stringify({ status: 'effective', note: 'Saída de venda' })
  };

  const { data: insertedMove, error: insErr } = await supabase
    .from('inventory_moves')
    .insert([initialMovePayload])
    .select()
    .single();

  if (insErr) {
    console.error("Erro ao inserir movimentação de saída:", insErr);
    return;
  }
  console.log(`[PASS] Movimentação criada como EFETIVADA (ID: ${insertedMove.id})`);

  // 2. Estorno da movimentação com motivo
  const reversalReason = `Cancelamento da venda #${fakeOrderCode}`;
  const reversedAt = new Date().toISOString();

  const { data: reversedMove, error: revErr } = await supabase
    .from('inventory_moves')
    .update({
      reason: reversalReason,
      observation: JSON.stringify({
        status: 'reversed',
        reversalReason: reversalReason,
        reversedAt: reversedAt
      })
    })
    .eq('id', insertedMove.id)
    .select()
    .single();

  if (revErr) {
    console.error("Erro ao estornar movimentação:", revErr);
    return;
  }

  const meta = JSON.parse(reversedMove.observation || '{}');
  console.log(`[PASS] Movimentação atualizada para ESTORNADA no banco sem ser deletada:`);
  console.log(`  - ID: ${reversedMove.id}`);
  console.log(`  - Status nos metadados: ${meta.status}`);
  console.log(`  - Motivo em reason: ${reversedMove.reason}`);
  console.log(`  - Data do estorno: ${meta.reversedAt}`);

  // Limpeza
  await supabase.from('inventory_moves').delete().eq('id', insertedMove.id);
  console.log("Limpeza de teste concluída com sucesso!");
}

testReversalFlow();
