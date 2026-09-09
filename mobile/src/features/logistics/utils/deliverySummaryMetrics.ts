import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { getLocalDateString, parseOrderDateStr, isCancelledOrder } from '../../../utils/orderUtils';
import { getOperationActivityType } from '../../schedule/utils/operationActivity';

export type DeliveryPeriodFilter = 'today' | 'next_days';

export interface DeliverySummaryMetrics {
  filteredOrders: any[];
  totalCount: number;
  morningCount: number;
  afternoonCount: number;
  morningClients: string[];
  afternoonClients: string[];
  defaultSummaryText: string;
}

/**
 * Calcula de forma pura e determinística as métricas de contagem de entregas
 * por turno (manhã / tarde) e monta o texto canônico de resumo operacional.
 */
export function calculateDeliverySummaryMetrics(
  orders: any[] = [],
  periodFilter: DeliveryPeriodFilter = 'today',
  referenceDateStr?: string
): DeliverySummaryMetrics {
  const todayStr = referenceDateStr || getLocalDateString(new Date());

  // 1. Filtrar pedidos conforme o período selecionado
  const filteredOrders = (orders || []).filter((order) => {
    if (!order) return false;
    const oData = order.order_data || {};

    // Ignorar pedidos deletados ou cancelados
    if (order.deleted || order.is_deleted || order.status === 'deleted' || oData.deleted) return false;
    const orderStatus = (order.status || oData.status || '').toLowerCase();
    if (
      orderStatus === 'draft' ||
      orderStatus === 'rascunho' ||
      orderStatus === 'cancelled' ||
      orderStatus === 'cancelado' ||
      isCancelledOrder(order)
    ) {
      return false;
    }

    // A operação inclui entrega, assistência e devolução; retiradas continuam fora.
    const shipping = oData.shipping || order.shipping || {};
    const deliveryMethod = shipping.deliveryMethod || order.delivery_method;
    const activityType = getOperationActivityType(order);
    if (activityType === 'delivery' && deliveryMethod && deliveryMethod !== 'delivery') return false;

    // Ignorar agendamentos pendentes
    const sched = shipping.scheduling || oData.schedule || oData.scheduling || order.schedule || {};
    if (
      sched.pendingScheduling ||
      oData.pendingScheduling ||
      order.pending_scheduling ||
      orderStatus === 'pending_scheduling' ||
      orderStatus === 'agendar_depois'
    ) {
      return false;
    }

    const rawDate =
      getOperationalScheduleDate(order) ||
      order.delivery_date ||
      order.scheduled_date ||
      shipping.scheduledDate ||
      '';
    const cleanDate = parseOrderDateStr(rawDate);
    if (!cleanDate || cleanDate === 'sem_data') return false;

    if (periodFilter === 'today') {
      return cleanDate === todayStr;
    } else {
      // Dias Seguintes: todas as entregas agendadas para datas futuras (> hoje)
      return cleanDate > todayStr;
    }
  });

  // 2. Métricas por turno (Manhã: 08:00-12:00, Tarde: 13:00-18:00)
  let morningCount = 0;
  let afternoonCount = 0;
  const morningClients: string[] = [];
  const afternoonClients: string[] = [];

  filteredOrders.forEach((order) => {
    const oData = order.order_data || {};
    const custData = oData.customerData || oData.customer || {};
    const clientFullName = String(
      order.customer_name ||
      custData.fullName ||
      custData.name ||
      oData.customerName ||
      order.client_name ||
      order.shipping?.customerName ||
      'Cliente'
    ).trim();

    // Primeiro nome e sobrenome
    const clientName = clientFullName.split(/\s+/).slice(0, 2).join(' ') || 'Cliente';

    const rawItems = order.items || order.order_items || oData.items || [];
    const itemsCount = Array.isArray(rawItems) && rawItems.length > 0 ? rawItems.length : 1;
    const activityLabel = getOperationActivityType(order) === 'assistance'
      ? 'Assistência'
      : getOperationActivityType(order) === 'return' ? 'Devolução' : 'Entrega';
    const itemLabel = `${activityLabel}: ${clientName} (${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'})`;

    // Normalizar horário/período
    const shipping = oData.shipping || order.shipping || {};
    const sched = shipping.scheduling || oData.schedule || oData.scheduling || order.schedule || {};
    const periodStr = String(
      sched.time ||
      sched.period ||
      sched.startTime ||
      shipping.period ||
      shipping.time ||
      ''
    ).toLowerCase().trim();

    let isMorning = false;
    let isAfternoon = false;

    if (periodStr.includes('manhã') || periodStr.includes('manha')) {
      isMorning = true;
    } else if (periodStr.includes('tarde') || periodStr.includes('noite')) {
      isAfternoon = true;
    } else {
      // Extrair primeira hora numérica (ex: "09:00", "09:00 às 12:00", "13:00 - 18:00")
      const hourMatch = periodStr.match(/(\d{1,2}):/);
      if (hourMatch) {
        const hour = parseInt(hourMatch[1], 10);
        if (hour < 12) {
          isMorning = true;
        } else {
          isAfternoon = true;
        }
      }
    }

    if (isMorning) {
      morningCount++;
      morningClients.push(itemLabel);
    } else if (isAfternoon) {
      afternoonCount++;
      afternoonClients.push(itemLabel);
    } else {
      // Fallback proporcional se não houver horário especificado
      if (morningCount <= afternoonCount) {
        morningCount++;
        morningClients.push(itemLabel);
      } else {
        afternoonCount++;
        afternoonClients.push(itemLabel);
      }
    }
  });

  const totalCount = filteredOrders.length;

  // 3. Montar texto canônico de resumo
  let defaultSummaryText = '';
  if (totalCount === 0) {
    defaultSummaryText =
      periodFilter === 'today'
        ? 'Nenhuma atividade operacional programada para o dia de hoje.'
        : 'Nenhuma atividade operacional agendada para os próximos dias.';
  } else {
    const morningPart =
      morningClients.length > 0
        ? `Manhã: ${morningClients.join(', ')}.`
        : 'Manhã: sem atividades.';
    const afternoonPart =
      afternoonClients.length > 0
        ? `Tarde: ${afternoonClients.join(', ')}.`
        : '';
    defaultSummaryText = `${morningPart} ${afternoonPart}`.trim();
  }

  return {
    filteredOrders,
    totalCount,
    morningCount,
    afternoonCount,
    morningClients,
    afternoonClients,
    defaultSummaryText,
  };
}
