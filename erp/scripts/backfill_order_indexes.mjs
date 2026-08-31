import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function backfillOrderIndexes() {
  console.log("Iniciando preenchimento sequencial de códigos de pedidos...");
  
  // Buscar todos os pedidos ordenados por data de criação
  const { data: allOrders, error } = await supabase
    .from('orders')
    .select('id, created_at, order_data')
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Erro ao buscar pedidos:", error);
    return;
  }

  let maxNumeric = 0;
  // 1. Descobrir maior número nos pedidos antigos
  for (const o of allOrders) {
    const numId = Number(o.id);
    const numIndex = Number(o.order_data?.orderIndex || o.order_data?.order_index || o.order_data?.orderNumber);
    if (Number.isInteger(numId) && numId > 0 && numId > maxNumeric) {
      maxNumeric = numId;
    }
    if (Number.isInteger(numIndex) && numIndex > 0 && numIndex > maxNumeric) {
      maxNumeric = numIndex;
    }
  }

  console.log(`Maior código numérico inicial encontrado: ${maxNumeric}`);

  let currentSequence = maxNumeric;
  let updatedCount = 0;

  for (const o of allOrders) {
    const numId = Number(o.id);
    const existingIndex = Number(o.order_data?.orderIndex || o.order_data?.order_index || o.order_data?.orderNumber);
    
    // Se o pedido já tem id numérico, garante que orderIndex = id
    if (Number.isInteger(numId) && numId > 0) {
      if (!o.order_data?.orderIndex || o.order_data.orderIndex !== numId) {
        const newOrderData = { ...(o.order_data || {}), orderIndex: numId, orderNumber: numId };
        await supabase.from('orders').update({ order_data: newOrderData }).eq('id', o.id);
        updatedCount++;
      }
    } 
    // Se o pedido não tem id numérico e não tem orderIndex válido, atribui sequencial
    else if (!Number.isInteger(existingIndex) || existingIndex <= 0) {
      currentSequence++;
      const newOrderData = { ...(o.order_data || {}), orderIndex: currentSequence, orderNumber: currentSequence };
      await supabase.from('orders').update({ order_data: newOrderData }).eq('id', o.id);
      console.log(`Pedido UUID ${o.id} (${o.created_at}) -> Atribuído código #${String(currentSequence).padStart(6, '0')}`);
      updatedCount++;
    }
  }

  console.log(`\nFinalizado! Total de pedidos atualizados: ${updatedCount}. Último código da sequência: #${String(currentSequence).padStart(6, '0')}`);
}

backfillOrderIndexes();
