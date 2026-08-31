import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MAX_ORDER_CODE = 999999;

const getOrderIndex = (order) => {
    if (!order) return null;
    const rawValue = 
        order.orderIndex ?? 
        order.order_index ?? 
        order.order_data?.orderIndex ?? 
        order.order_data?.order_index ?? 
        order.orderNumber ?? 
        order.order_number ?? 
        order.id;

    const value = Number(rawValue);
    return Number.isInteger(value) && value > 0 && value <= MAX_ORDER_CODE ? value : null;
};

const formatOrderCode = (order) => {
    const orderIndex = getOrderIndex(order);
    if (orderIndex) {
        return String(orderIndex).padStart(6, '0');
    }
    return '000000';
};

async function testOrderCodeFlow() {
  console.log("Iniciando validação de códigos sequenciais de 6 dígitos...");

  // 1. Buscar os 20 pedidos mais recentes e verificar se todos têm 6 dígitos
  const { data: recentOrders, error } = await supabase
    .from('orders')
    .select('id, created_at, order_data')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error("Erro ao buscar pedidos:", error);
    return;
  }

  let allValid = true;
  for (const o of recentOrders) {
    const merged = { ...(o.order_data || {}), id: o.id };
    const code = formatOrderCode(merged);
    const isValid6Digits = /^\d{6}$/.test(code) && code !== '000000';
    console.log(`Pedido ID: ${o.id.padEnd(36, ' ')} | Código Formatado: #${code} | Válido 6 dígitos: ${isValid6Digits}`);
    if (!isValid6Digits) allValid = false;
  }

  if (allValid) {
    console.log("\n[SUCESSO] Todos os pedidos recentes possuem código sequencial de 6 dígitos válido!");
  } else {
    console.error("\n[FALHA] Alguns pedidos estão sem código válido.");
  }
}

testOrderCodeFlow();
