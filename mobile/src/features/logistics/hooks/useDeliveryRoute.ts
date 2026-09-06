import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { subscribeToLogisticsChanges } from '../../../services/logisticsRealtimeService';
import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { getLocationMapsUrl, parseCoordinatesFromMapsUrl, isCancelledOrder, formatOrderCode } from '../../../utils/orderUtils';
import { hasDeliveryExceeded12Hours, autoFulfillOrderIfExceeded12Hours } from '../../orders/utils/deliveryAutoFulfillment';

export interface DeliveryRouteItem {
  id: string;
  order: any;
  orderIndex?: string;
  customerName: string;
  fullAddress: string;
  mapsUrl?: string | null;
  itemsCount: number;
  sequence: number; // 1, 2, 3... Ordem do Roteiro (routeOrder)
  status: 'pending' | 'in_progress' | 'in_service' | 'completed' | 'unattended' | 'cancelled';
  coords: { latitude: number; longitude: number } | null;
  hasValidCoords: boolean;
  distanceKm?: number;
  durationMin?: number;
  phone?: string;
  observations?: string;
  isCurrent: boolean;
  isNext: boolean;
  // Conceitos de Janela e Período de Atendimento
  periodLabel: string; // Ex: "MANHÃ · 08:00–12:00", "TARDE · 13:00–18:00", "🔒 10:30"
  isFixedTime: boolean; // Se for horário exato/restrito
  windowStart?: string;
  windowEnd?: string;
  isSuggestedFirst?: boolean;
  restrictionLevel?: 'free' | 'priority' | 'fixed';
}

// Extrai e normaliza a janela de atendimento prometida ao cliente
function formatDeliveryPeriod(shipping: any): { label: string; isFixed: boolean; windowStart?: string; windowEnd?: string; sortWeight: number } {
  const sched = shipping?.scheduling || {};
  const rawTime = String(sched.time || '').trim();
  const startTime = String(sched.startTime || '').trim();
  const endTime = String(sched.endTime || '').trim();
  const schedType = String(sched.type || sched.dateType || '').toLowerCase();

  // 1. Se houver início e fim de janela (ex: 13:00 e 18:00) ou tipo 'range', trata como período compacto
  if ((startTime && endTime && startTime !== endTime) || schedType === 'range' || rawTime.includes('-') || rawTime.includes('às') || rawTime.includes('ate')) {
    const start = startTime || (rawTime.split('-')[0] || rawTime).trim();
    const end = endTime || (rawTime.split('-')[1] || '').trim();
    const displayLabel = (start && end) ? `${start}–${end}` : (start || end || rawTime);
    return {
      label: displayLabel,
      isFixed: false,
      windowStart: start,
      windowEnd: end,
      sortWeight: getMinutesFromTime(start, 480),
    };
  }

  // 2. Se for explicitamente horário fixo/combinado ou apenas uma hora exata informada (sem fim)
  const isFixed = schedType === 'fixed' || (startTime && !endTime) || (rawTime.includes(':') && !rawTime.includes('-'));
  if (isFixed) {
    const timeDisplay = startTime || rawTime || 'Horário Combinado';
    return {
      label: `🔒 ${timeDisplay}`,
      isFixed: true,
      windowStart: startTime || rawTime,
      windowEnd: endTime,
      sortWeight: getMinutesFromTime(startTime || rawTime, 480),
    };
  }

  // 3. Checa nomenclaturas de período por palavras-chave
  const lowerTime = rawTime.toLowerCase();
  if (lowerTime.includes('manhã') || lowerTime.includes('manha')) {
    return {
      label: 'MANHÃ · 08:00–12:00',
      isFixed: false,
      windowStart: '08:00',
      windowEnd: '12:00',
      sortWeight: 480,
    };
  }
  if (lowerTime.includes('tarde')) {
    return {
      label: 'TARDE · 13:00–18:00',
      isFixed: false,
      windowStart: '13:00',
      windowEnd: '18:00',
      sortWeight: 780,
    };
  }
  if (lowerTime.includes('noite')) {
    return {
      label: 'NOITE · 18:00–21:00',
      isFixed: false,
      windowStart: '18:00',
      windowEnd: '21:00',
      sortWeight: 1080,
    };
  }

  return {
    label: rawTime ? rawTime.toUpperCase() : 'HORÁRIO COMERCIAL',
    isFixed: false,
    sortWeight: 480,
  };
}

function getMinutesFromTime(timeStr: string, fallback: number): number {
  if (!timeStr) return fallback;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  return fallback;
}

export function useDeliveryRoute() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  const fetchOrders = useCallback(async () => {
    try {
      // 1. Tenta carregar do cache local primeiro para exibição offline instantânea
      const cached = await offlineStorageService.getWorkingSet<any[]>('logistics_orders');
      if (cached?.data && orders.length === 0) {
        setOrders(cached.data);
        setLoading(false);
      }

      // 2. Busca do Supabase
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data);
        await offlineStorageService.cacheWorkingSet('logistics_orders', data);
      }
    } catch (err) {
      console.warn('[useDeliveryRoute] Erro ao buscar pedidos (usando cache):', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orders.length]);

  useEffect(() => {
    fetchOrders();
    const unsub = subscribeToLogisticsChanges(() => fetchOrders());
    return () => unsub();
  }, [fetchOrders]);

  // Filtra e normaliza os pedidos do roteiro de hoje
  const routeItems = useMemo<DeliveryRouteItem[]>(() => {
    const todayOrders = orders.filter((o) => {
      const oData = o.order_data || {};
      if (oData.deleted || o.deleted || isCancelledOrder(o)) return false;
      const orderStatus = (o.status || oData.status || '').toLowerCase();
      if (orderStatus === 'draft' || orderStatus === 'rascunho') return false;

      const rawSchedDate = getOperationalScheduleDate(o);
      return rawSchedDate === todayStr;
    });

    // Ordenação do Roteiro:
    // 1º: routeSequence explícito do pedido se definido (ex: 1, 2, 3...)
    // 2º: Período/Janela de Atendimento (Manhã < Tarde < Noite, priorizando horários fixos)
    // 3º: Ordem de criação do registro
    const sorted = [...todayOrders].sort((a, b) => {
      const seqA = a.order_data?.routeSequence ?? 9999;
      const seqB = b.order_data?.routeSequence ?? 9999;
      if (seqA !== seqB) return seqA - seqB;

      const shippingA = a.order_data?.shipping || {};
      const shippingB = b.order_data?.shipping || {};
      const periodA = formatDeliveryPeriod(shippingA);
      const periodB = formatDeliveryPeriod(shippingB);

      if (periodA.sortWeight !== periodB.sortWeight) {
        return periodA.sortWeight - periodB.sortWeight;
      }

      return (a.created_at || '').localeCompare(b.created_at || '');
    });

    // Encontra primeira parada em andamento ou primeira parada pendente na sequência
    let firstInProgressId: string | null = null;
    let firstPendingId: string | null = null;

    for (const o of sorted) {
      if (hasDeliveryExceeded12Hours(o)) {
        autoFulfillOrderIfExceeded12Hours(o);
      }
      const isAutoFulfilled = hasDeliveryExceeded12Hours(o);
      const dStatus = isAutoFulfilled
        ? 'completed'
        : (o.order_data?.deliveryStatus || (o.status === 'fulfilled' ? 'completed' : 'pending'));
      if (dStatus === 'in_progress' || dStatus === 'in_service') {
        if (!firstInProgressId) firstInProgressId = o.id;
      } else if (dStatus !== 'completed' && dStatus !== 'unattended') {
        if (!firstPendingId) firstPendingId = o.id;
      }
    }

    const activeTargetId = firstInProgressId || firstPendingId;

    // Encontra o ID da primeira parada pendente na sequência sugerida
    const topPendingItem = sorted.find(o => {
      if (hasDeliveryExceeded12Hours(o)) return false;
      const dStatus = o.order_data?.deliveryStatus || (o.status === 'fulfilled' ? 'completed' : 'pending');
      return dStatus !== 'completed' && dStatus !== 'unattended' && dStatus !== 'in_progress' && dStatus !== 'in_service';
    });
    const topPendingId = topPendingItem?.id;

    return sorted.map((o, idx) => {
      const oData = o.order_data || {};
      const customer = oData.customerData || o.customer || {};
      const shipping = oData.shipping || {};
      const dCoords = shipping.destinationCoords;
      const mapsUrl = getLocationMapsUrl(o);

      let coords: { latitude: number; longitude: number } | null = null;
      let hasValidCoords = false;

      // 1º Prioridade Absoluta: Tenta extrair coordenadas diretamente da URL do Google Maps (se houver)
      if (mapsUrl) {
        const parsedCoords = parseCoordinatesFromMapsUrl(mapsUrl);
        if (parsedCoords) {
          coords = parsedCoords;
          hasValidCoords = true;
        }
      }

      // 2º Se não encontrou na URL, utiliza as coordenadas salvas em destinationCoords
      if (!hasValidCoords && Array.isArray(dCoords) && dCoords.length === 2 && dCoords[0] !== 0 && dCoords[1] !== 0) {
        coords = { latitude: Number(dCoords[1]), longitude: Number(dCoords[0]) };
        hasValidCoords = true;
      }

      const isAutoFulfilled = hasDeliveryExceeded12Hours(o);
      const rawDeliveryStatus = isAutoFulfilled ? 'completed' : oData.deliveryStatus;
      let status: DeliveryRouteItem['status'] = 'pending';
      if (isAutoFulfilled || o.status === 'fulfilled' || rawDeliveryStatus === 'completed' || rawDeliveryStatus === 'fulfilled') {
        status = 'completed';
      } else if (rawDeliveryStatus === 'unattended') {
        status = 'unattended';
      } else if (rawDeliveryStatus === 'in_service') {
        status = 'in_service';
      } else if (rawDeliveryStatus === 'in_progress') {
        status = 'in_progress';
      }

      const items = oData.items || o.items || oData.assistanceItems || [];
      const isCurrent = (status === 'in_progress' || status === 'in_service');
      const isNext = !firstInProgressId && o.id === activeTargetId;

      const periodInfo = formatDeliveryPeriod(shipping);
      const isSuggestedFirst = (o.id === topPendingId);

      let restrictionLevel: DeliveryRouteItem['restrictionLevel'] = 'free';
      if (periodInfo.isFixed) {
        restrictionLevel = 'fixed';
      } else if (periodInfo.label.includes('⚠️') || periodInfo.label.includes('URGENTE')) {
        restrictionLevel = 'priority';
      }

      return {
        id: o.id,
        order: o,
        orderIndex: formatOrderCode(o),
        customerName: (customer.fullName || o.customer_name || 'Consumidor').toUpperCase(),
        fullAddress: [
          shipping.deliveryAddress?.street || customer.fullAddress?.street,
          shipping.deliveryAddress?.number || customer.fullAddress?.number,
          shipping.deliveryAddress?.neighborhood || customer.fullAddress?.neighborhood,
          shipping.deliveryAddress?.city || customer.fullAddress?.city || 'Colombo',
        ].filter(Boolean).join(', '),
        mapsUrl,
        itemsCount: items.reduce((acc: number, item: any) => acc + Number(item.quantity || item.qty || 1), 0),
        sequence: idx + 1, // Ordem do Roteiro
        status,
        coords,
        hasValidCoords,
        distanceKm: shipping.distance ? Number(Number(shipping.distance).toFixed(1)) : undefined,
        durationMin: shipping.durationMinutes ? Number(shipping.durationMinutes) : undefined,
        phone: customer.phone,
        observations: oData.observations || o.observations,
        isCurrent,
        isNext,
        periodLabel: periodInfo.label,
        isFixedTime: periodInfo.isFixed,
        windowStart: periodInfo.windowStart,
        windowEnd: periodInfo.windowEnd,
        isSuggestedFirst,
        restrictionLevel,
      };
    });
  }, [orders, todayStr]);

  // Entrega em andamento (se houver alguma em rota ou em atendimento)
  const currentDelivery = useMemo(() => {
    return routeItems.find((item) => item.isCurrent) || null;
  }, [routeItems]);

  // Próxima entrega do roteiro
  const nextDelivery = useMemo(() => {
    if (currentDelivery) return currentDelivery;
    return routeItems.find((item) => item.isNext) || null;
  }, [currentDelivery, routeItems]);

  // Estatísticas do roteiro de hoje
  const stats = useMemo(() => {
    const total = routeItems.length;
    const completed = routeItems.filter((i) => i.status === 'completed').length;
    const unattended = routeItems.filter((i) => i.status === 'unattended').length;
    const pending = total - completed - unattended;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      unattended,
      pending,
      percent,
    };
  }, [routeItems]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  return {
    orders,
    routeItems,
    currentDelivery,
    nextDelivery,
    stats,
    loading,
    refreshing,
    onRefresh,
  };
}

export function checkOutOfOrderRisk(
  targetItem: DeliveryRouteItem | null,
  routeItems: DeliveryRouteItem[]
): { hasRisk: boolean; riskyItemName?: string; riskyTime?: string; riskyOrderCode?: string } {
  if (!targetItem || targetItem.status !== 'pending') {
    return { hasRisk: false };
  }

  const pendingItems = routeItems.filter(i => i.status === 'pending');
  if (pendingItems.length <= 1) return { hasRisk: false };

  const topSuggested = pendingItems[0];
  if (topSuggested.id === targetItem.id) return { hasRisk: false };

  const targetIndexInPending = pendingItems.findIndex(i => i.id === targetItem.id);
  if (targetIndexInPending <= 0) return { hasRisk: false };

  const bypassedItems = pendingItems.slice(0, targetIndexInPending);
  const riskyPriorItem = bypassedItems.find(i => i.isFixedTime || i.restrictionLevel === 'fixed' || i.periodLabel.includes('🔒') || i.periodLabel.includes('⚠️'));

  if (riskyPriorItem) {
    return {
      hasRisk: true,
      riskyItemName: riskyPriorItem.customerName,
      riskyTime: riskyPriorItem.periodLabel,
      riskyOrderCode: riskyPriorItem.orderIndex,
    };
  }

  return { hasRisk: false };
}

