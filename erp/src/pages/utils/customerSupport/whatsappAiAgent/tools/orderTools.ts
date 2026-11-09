import type { SupabaseClient } from '@supabase/supabase-js';
import { extractDigits, getPhoneLookupCandidates } from '../../phoneUtils.js';
import type { SafeToolContext } from './types.js';

export async function handleConsultarMeusPedidos(
  supabase: SupabaseClient,
  _args: Record<string, any>,
  context: SafeToolContext
): Promise<Record<string, any>> {
  const phoneCandidates: string[] = getPhoneLookupCandidates(context.contactPhone);
  phoneCandidates.push(extractDigits(context.contactPhone));

  let query = supabase
    .from('orders')
    .select(
      'id, order_number, order_index, status, order_type, customer_name, total_amount, scheduled_date, delivery_method, delivery_status, items, order_data'
    )
    .or('deleted.is.null,deleted.eq.false');

  if (context.customerId) {
    query = query.eq('customer_id', context.customerId);
  } else {
    // Busca com segurança por telefone do cliente
    const phoneExpr = phoneCandidates.slice(0, 4).map((p) => `customer_name.ilike.%${p}%`).join(',');
    query = query.or(phoneExpr);
  }

  const { data: rows, error } = await query
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !rows || rows.length === 0) {
    return {
      success: true,
      pedidos: [],
      mensagem:
        'Não foram encontrados pedidos recentes vinculados a este número de telefone. Caso seu pedido tenha sido cadastrado com outro número ou CPF, posso encaminhar para nossa equipe verificar.',
    };
  }

  const pedidos = rows.map((r: any) => {
    const rawItems = Array.isArray(r.items)
      ? r.items
      : Array.isArray(r.order_data?.items)
        ? r.order_data.items
        : [];
    return {
      numeroPedido: String(r.order_number ?? r.order_index ?? ''),
      status: r.status,
      tipo: r.order_type === 'sale' ? 'Pedido de Venda' : r.order_type,
      dataAgendada: r.scheduled_date ? String(r.scheduled_date).slice(0, 10) : null,
      modalidadeEntrega: r.delivery_method || 'Entrega',
      statusEntrega: r.delivery_status || null,
      valorTotal: Number(r.total_amount || 0),
      itens: rawItems.map((it: any) => ({
        produto: it.name || it.product_title || it.description || 'Item',
        quantidade: Number(it.quantity || 1),
      })),
    };
  });

  return {
    success: true,
    totalPedidos: pedidos.length,
    pedidos,
  };
}
