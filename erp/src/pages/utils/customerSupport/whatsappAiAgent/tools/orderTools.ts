import type { SupabaseClient } from '@supabase/supabase-js';
import {
  extractDigits,
  getPhoneLookupCandidates,
  parseBrazilianPhone,
} from '../../phoneUtils.js';
import type { SafeToolContext } from './types.js';

export async function handleConsultarMeusPedidos(
  supabase: SupabaseClient,
  _args: Record<string, any>,
  context: SafeToolContext
): Promise<Record<string, any>> {
  let customerId = context.customerId || null;
  if (!customerId) {
    const candidates = Array.from(
      new Set(getPhoneLookupCandidates(context.contactPhone).map(extractDigits).filter((item) => item.length >= 8))
    ).slice(0, 6);
    if (!candidates.length) {
      return {
        success: true,
        pedidos: [],
        mensagem: 'Não consegui confirmar o cadastro do cliente por este telefone. Posso encaminhar para nossa equipe verificar.',
      };
    }

    const phoneFilter = candidates.map((digits) => `phone.ilike.%${digits}%`).join(',');
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('id, phone')
      .eq('person_type', 'customers')
      .or('deleted.is.null,deleted.eq.false')
      .or(phoneFilter)
      .limit(21);

    if (peopleError) {
      return {
        success: false,
        code: 'DATABASE_ERROR',
        mensagem: 'Não consegui consultar seus pedidos agora. Tente novamente mais tarde ou posso encaminhar para nossa equipe.',
      };
    }
    if ((people || []).length > 20) {
      return {
        success: true,
        pedidos: [],
        mensagem:
          'Encontrei muitos cadastros relacionados a este telefone e não consigo confirmar quais pedidos são seus. Posso encaminhar para nossa equipe verificar.',
      };
    }

    const targetDigits = extractDigits(context.contactPhone);
    const target = parseBrazilianPhone(context.contactPhone);
    const exactMatches = (people || []).filter((person: any) => {
      const phone = String(person.phone || '');
      const digits = extractDigits(phone);
      if (!digits) return false;
      const parsed = parseBrazilianPhone(phone);
      if (target.isBrazilian && parsed.isBrazilian && target.ddd && parsed.ddd) {
        return target.ddd === parsed.ddd && target.number.slice(-8) === parsed.number.slice(-8);
      }
      return digits === targetDigits;
    });
    const uniqueCustomerIds = Array.from(
      new Set(exactMatches.map((person: any) => String(person.id || '')).filter(Boolean))
    );
    if (uniqueCustomerIds.length !== 1) {
      return {
        success: true,
        pedidos: [],
        mensagem:
          uniqueCustomerIds.length > 1
            ? 'Encontrei mais de um cadastro associado a este telefone e não consigo confirmar quais pedidos são seus. Posso encaminhar para nossa equipe verificar.'
            : 'Não encontrei um cadastro de cliente vinculado a este telefone. Posso encaminhar para nossa equipe verificar.',
      };
    }
    customerId = uniqueCustomerIds[0];
  }

  const { data: rows, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, order_index, status, order_type, customer_name, total_amount, scheduled_date, delivery_method, delivery_status, items, order_data'
    )
    .or('deleted.is.null,deleted.eq.false')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    return {
      success: false,
      code: 'DATABASE_ERROR',
      mensagem: 'Não consegui consultar seus pedidos agora. Tente novamente mais tarde ou posso encaminhar para nossa equipe.',
    };
  }

  if (!rows || rows.length === 0) {
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
