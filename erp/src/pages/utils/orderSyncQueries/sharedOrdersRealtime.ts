import Order from '../../types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { capitalizeOrder } from '../shared/formatters';
import { mapOrderFromDatabase } from '../orderMapper';
import { TABLE_NAME, ORDER_LIST_COLUMNS, recordOrdersReadMetric } from './orderSyncConstants';
import { OrdersChangeEvent, OrdersSubscriber, OrdersChangeSubscriber } from './orderSyncTypes';
import { isValidOrderRow, enrichOrdersWithPeopleOrigins } from './orderPeopleEnrichment';

// Uma única consulta e um único canal são compartilhados pelos módulos que
// precisam dos pedidos. Antes, cada tela abria sua própria assinatura e fazia
// uma leitura completa de até 300 pedidos para o mesmo evento do Realtime.
const ordersSubscribers = new Set<OrdersSubscriber>();
const orderChangeSubscribers = new Set<OrdersChangeSubscriber>();
let sharedOrdersChannel: ReturnType<typeof supabase.channel> | null = null;
let sharedOrdersSnapshot: Order[] | null = null;
let sharedOrdersRequest: Promise<void> | null = null;
let sharedOrdersRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let sharedOrdersReconnectPending = false;

const notifyOrdersSubscribers = () => {
  if (!sharedOrdersSnapshot) return;
  ordersSubscribers.forEach((callback) => callback(sharedOrdersSnapshot!));
};

const fetchSharedOrders = async () => {
  if (sharedOrdersRequest || ordersSubscribers.size === 0) return sharedOrdersRequest;

  sharedOrdersRequest = (async () => {
    const startedAt = performance.now();
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(ORDER_LIST_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('[OrdersSync] Fetch error:', error);
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      recordOrdersReadMetric(rows, startedAt);
      const mappedOrders = rows.filter(isValidOrderRow).map((row: any) => {
        try {
          return mapOrderFromDatabase(row);
        } catch {
          return capitalizeOrder({ ...(row.order_data || {}), id: String(row.id) } as Order);
        }
      });

      sharedOrdersSnapshot = await enrichOrdersWithPeopleOrigins(mappedOrders);
      notifyOrdersSubscribers();
    } catch (error) {
      console.error('[OrdersSync] Exception fetching orders:', error);
    } finally {
      sharedOrdersRequest = null;
    }
  })();

  return sharedOrdersRequest;
};

const scheduleSharedOrdersRefresh = (reconnected = false) => {
  if (ordersSubscribers.size === 0 && orderChangeSubscribers.size === 0) return;
  if (reconnected) sharedOrdersReconnectPending = true;
  if (sharedOrdersRefreshTimer) return;
  sharedOrdersRefreshTimer = setTimeout(() => {
    sharedOrdersRefreshTimer = null;
    const event: OrdersChangeEvent = {
      reason: sharedOrdersReconnectPending ? 'reconnected' : 'change',
    };
    sharedOrdersReconnectPending = false;
    orderChangeSubscribers.forEach((callback) => callback(event));
    if (ordersSubscribers.size > 0) void fetchSharedOrders();
  }, 3000);
};

const notifyOrderChange = () => {
  scheduleSharedOrdersRefresh();
};

const ensureSharedOrdersChannel = () => {
  if (sharedOrdersChannel) return;
  let hasSubscribedOnce = false;
  let hadIssueBeforeFirstSubscription = false;
  sharedOrdersChannel = supabase
    .channel('orders_changes_shared')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, notifyOrderChange)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (!hasSubscribedOnce) {
          hasSubscribedOnce = true;
          if (hadIssueBeforeFirstSubscription) scheduleSharedOrdersRefresh(true);
          return;
        }
        // A later SUBSCRIBED means the shared channel rejoined after a drop.
        // Use the same debounce as database changes to recover missed updates.
        scheduleSharedOrdersRefresh(true);
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        hadIssueBeforeFirstSubscription = true;
      }
    });
};

const releaseSharedOrdersChannelIfUnused = () => {
  if (ordersSubscribers.size > 0 || orderChangeSubscribers.size > 0) return;
  if (sharedOrdersRefreshTimer) {
    clearTimeout(sharedOrdersRefreshTimer);
    sharedOrdersRefreshTimer = null;
  }
  sharedOrdersReconnectPending = false;
  if (sharedOrdersChannel) {
    void supabase.removeChannel(sharedOrdersChannel);
    sharedOrdersChannel = null;
  }
  sharedOrdersSnapshot = null;
};

export const subscribeToOrders = (callback: OrdersSubscriber) => {
  ordersSubscribers.add(callback);
  ensureSharedOrdersChannel();

  if (sharedOrdersSnapshot) {
    callback(sharedOrdersSnapshot);
  } else {
    void fetchSharedOrders();
  }

  return () => {
    ordersSubscribers.delete(callback);
    releaseSharedOrdersChannelIfUnused();
  };
};

// Para telas que já possuem sua própria consulta paginada, o Realtime deve
// apenas sinalizar uma mudança. Isso evita baixar a lista completa sem usar os
// dados recebidos.
export const subscribeToOrderChanges = (callback: OrdersChangeSubscriber) => {
  orderChangeSubscribers.add(callback);
  ensureSharedOrdersChannel();

  return () => {
    orderChangeSubscribers.delete(callback);
    releaseSharedOrdersChannelIfUnused();
  };
};
