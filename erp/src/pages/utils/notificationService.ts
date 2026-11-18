import { supabase } from '@/pages/utils/supabaseConfig';
import Product from '../types/product.type';
import { getSettings, subscribeToSettings } from '@/pages/utils/settingsService';
import { fetchServerOrderPage } from '../../../../shared-utils/orderListServerQuery';
import { isIdentifiedTestArtifact } from '../../../../shared-utils/testArtifactPolicy';
import { withAbortTimeout } from '../../../../shared-utils/withAbortTimeout';
import { subscribeToOrderChanges } from './orderSyncQueries/sharedOrdersRealtime';

export type NotificationSeverity = 'critical' | 'warning' | 'info';
export type NotificationCategory = 'stock' | 'order' | 'system' | 'match';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  icon: string;
  link?: string;
  createdAt: Date;
  read?: boolean;
}

const READ_KEY = 'pdv_notifications_read';

const getReadIds = (): Set<string> => {
  try {
    const saved = localStorage.getItem(READ_KEY);
    return new Set(saved ? JSON.parse(saved) : []);
  } catch {
    return new Set();
  }
};

export const markAsRead = (id: string) => {
  const readIds = getReadIds();
  readIds.add(id);
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(readIds)));
  publishNotifications();
};

export const markAllAsRead = (ids: string[]) => {
  const readIds = getReadIds();
  ids.forEach((id) => readIds.add(id));
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(readIds)));
  publishNotifications();
};

/**
 * Build product-based notifications:
 * - Skips products with condition === 'salvado'
 * - Respects per-product notificationConfig
 * - Critical: stock == 0 (if notifyZeroStock is true or not configured)
 * - Warning: stock <= minStock (if notifyMinStock is true or not configured)
 * - Support Variations: If product has variations, checks each variation's stock
 */
const buildProductNotifications = (products: Product[]): AppNotification[] => {
  const readIds = getReadIds();
  const notifications: AppNotification[] = [];
  const settings = getSettings();
  const allowedConditions = settings.stockNotificationConditions || ['novo'];

  products
    .filter((p) => {
      if (p.deleted || !p.active || p.itemType !== 'product') return false;

      // Allow notification if the product's condition is in the allowed list
      // If condition is empty/null, we might treat it as 'novo' or skip it.
      // Let's assume empty condition is not filtered unless explicitly handled.
      const condition = p.condition || 'novo';
      return allowedConditions.includes(condition as any);
    })
    .forEach((product) => {
      const cfg = product.notificationConfig;

      // If product has notifications explicitly disabled, skip
      if (cfg && cfg.enabled === false) return;

      const customNote = cfg?.notifyCustom ? `\nNota: ${cfg.notifyCustom}` : '';

      // Helper to add notification
      const addNotif = (
        id: string,
        title: string,
        description: string,
        severity: NotificationSeverity
      ) => {
        notifications.push({
          id,
          title,
          description: description + customNote,
          severity,
          category: 'stock',
          icon:
            severity === 'critical'
              ? 'bi-exclamation-octagon-fill'
              : 'bi-exclamation-triangle-fill',
          link: '/registrations/products',
          createdAt: new Date(),
          read: readIds.has(id),
        });
      };

      // CASE 1: Product has variations
      if (product.hasVariations && product.variations && product.variations.length > 0) {
        product.variations.forEach((v) => {
          const stock = v.stock ?? 0;
          const minStock = v.minStock ?? 0;

          // Zero stock alert for variation
          const wantsZero = !cfg || cfg.notifyZeroStock !== false;
          if (wantsZero && stock === 0) {
            const id = `stock_zero_var_${product.id}_${v.id}`;
            addNotif(
              id,
              'Variação sem Estoque',
              `"${product.description}" (${v.name}) está sem estoque.`,
              'critical'
            );
          }

          // Min stock alert for variation
          const wantsMin = !cfg || cfg.notifyMinStock !== false;
          if (wantsMin && minStock > 0 && stock > 0 && stock <= minStock) {
            const id = `stock_min_var_${product.id}_${v.id}`;
            addNotif(
              id,
              'Variação em Estoque Mínimo',
              `"${product.description}" (${v.name}) atingiu o mínimo (${stock}/${minStock}).`,
              'warning'
            );
          }
        });
      }
      // CASE 2: Single product (no variations)
      else if (!product.hasVariations) {
        const stock = product.stock ?? 0;
        const minStock = product.minStock ?? 0;

        // Zero stock alert
        const wantsZero = !cfg || cfg.notifyZeroStock !== false;
        if (wantsZero && stock === 0) {
          const id = `stock_zero_${product.id}`;
          addNotif(
            id,
            'Estoque Zerado',
            `"${product.description}" está sem estoque (0 ${product.unit || 'un'}).`,
            'critical'
          );
        }

        // Min stock alert
        const wantsMin = !cfg || cfg.notifyMinStock !== false;
        if (wantsMin && minStock > 0 && stock > 0 && stock <= minStock) {
          const id = `stock_min_${product.id}`;
          addNotif(
            id,
            'Estoque Mínimo Atingido',
            `"${product.description}" com ${stock} ${product.unit || 'un'} (mínimo: ${minStock}).`,
            'warning'
          );
        }
      }
    });

  return notifications;
};

const buildMatchNotifications = async (
  products: Product[],
  signal?: AbortSignal,
): Promise<AppNotification[]> => {
  const readIds = getReadIds();
  const notifications: AppNotification[] = [];

  // Busca matches pendentes de notificação
  const { data: matches, error } = await withAbortTimeout(supabase
    .from('desire_matches')
    .select('id,product_id,created_at,customer_desires(customer_name)')
    .eq('notified', false), 'alertas:interesses', 15_000, signal);

  if (error || !matches) return [];

  matches.forEach((m) => {
    const desire = Array.isArray(m.customer_desires) ? m.customer_desires[0] : m.customer_desires;
    const product = products.find((p) => p.id === String(m.product_id));

    if (desire && product) {
      const id = `match_alert_${m.id}`;
      notifications.push({
        id,
        title: 'Oportunidade de Venda!',
        description: `"${product.description}" (Salvado) coincide com o desejo de ${desire.customer_name || 'um cliente'}.`,
        severity: 'info',
        category: 'match',
        icon: 'bi-stars',
        link: '/customers/desires',
        createdAt: new Date(m.created_at || new Date()),
        read: readIds.has(id),
      });
    }
  });

  return notifications;
};

const buildOrderNotifications = (draftCount: number): AppNotification[] => {
  const readIds = getReadIds();
  const notifications: AppNotification[] = [];

  if (draftCount > 0) {
    const id = `draft_orders_alert_${draftCount}`;
    notifications.push({
      id,
      title: 'Pedidos em Rascunho',
      description:
        draftCount === 1
          ? `Existe 1 pedido em rascunho aguardando finalização.`
          : `Existem ${draftCount} pedidos em rascunho aguardando finalização.`,
      severity: 'info',
      category: 'order',
      icon: 'bi-file-earmark-text-fill',
      link: '/sales-order',
      createdAt: new Date(),
      read: readIds.has(id),
    });
  }

  return notifications;
};

/**
 * Subscribe to all system notifications.
 * Returns an unsubscribe function.
 */
const notificationSubscribers = new Set<(notifications: AppNotification[]) => void>();
let notificationSnapshot: AppNotification[] = [];
let notificationRequest: Promise<void> | null = null;
let notificationGeneration = 0;
let notificationFetchedAt = 0;
let notificationSessionInvalidated = false;
let notificationStop: (() => void) | null = null;
let notificationNeedsRefresh = false;
let notificationAbortController: AbortController | null = null;
let notificationRequestStartedAt = 0;
let notificationLastAttemptStartedAt = 0;
let notificationLastAttemptSucceeded = false;
let notificationReconnectBatchStartedAt = 0;
let notificationReconnectBatchUntil = 0;
const publishNotifications = () => {
  const read = getReadIds();
  const snapshot = notificationSnapshot.map((entry) => ({ ...entry, read: read.has(entry.id) }));
  notificationSubscribers.forEach((subscriber) => subscriber(snapshot));
};

const invalidateNotificationWork = () => {
  notificationGeneration += 1;
  notificationAbortController?.abort();
  notificationAbortController = null;
  notificationRequest = null;
  notificationRequestStartedAt = 0;
  notificationNeedsRefresh = false;
  notificationLastAttemptStartedAt = 0;
  notificationLastAttemptSucceeded = false;
  notificationReconnectBatchStartedAt = 0;
  notificationReconnectBatchUntil = 0;
};

const fetchAndNotify = async () => {
  if (!notificationSubscribers.size || notificationSessionInvalidated) return;
  if (notificationRequest) return notificationRequest;
  const generation = notificationGeneration;
  const controller = new AbortController();
  const requestStartedAt = Date.now();
  notificationAbortController = controller;
  notificationRequestStartedAt = requestStartedAt;
  notificationLastAttemptStartedAt = requestStartedAt;
  notificationLastAttemptSucceeded = false;
  const isCurrent = () => generation === notificationGeneration &&
    !controller.signal.aborted && notificationSubscribers.size > 0 && !notificationSessionInvalidated;

  notificationRequest = (async () => {
    let succeeded = false;
    try {
      // Fetch Products
      const { data: pData, error: pError } = await withAbortTimeout(supabase.rpc('notification_product_summaries', {
        p_conditions: getSettings().stockNotificationConditions || ['novo'],
      }), 'alertas:produtos', 15_000, controller.signal);
      if (!isCurrent()) return;

      // O alerta usa apenas a contagem já filtrada, sem baixar pedidos candidatos.
      let draftCount: number;
      try {
        const page = await fetchServerOrderPage(supabase, {
          filters: { includeAllTypes: true, isDraft: true }, page: 1, pageSize: 1, mode: 'erp',
          signal: controller.signal,
        });
        draftCount = page.total;
      } catch { return; }
      if (!isCurrent() || pError || !Array.isArray(pData)) return;

      const products: Product[] = pData.filter((d: any) => !isIdentifiedTestArtifact(d)).map((d: any) => ({
        id: String(d.id),
        description: d.description,
        stock: Number(d.stock ?? 0),
        minStock: Number(d.min_stock ?? 0),
        unit: d.unit || 'un',
        active: d.active,
        deleted: d.deleted,
        hasVariations: d.has_variations,
        variations: d.variations,
        itemType: d.item_type || 'product',
        unitPrice: Number(d.unit_price ?? 0),
        condition: d.condition || '',
        notificationConfig: d.notification_config,
      }));

      const productNotifs = buildProductNotifications(products);
      const orderNotifs = buildOrderNotifications(draftCount);
      const matchNotifs = await buildMatchNotifications(products, controller.signal);
      if (!isCurrent()) return;

      const allNotifications = [...productNotifs, ...orderNotifs, ...matchNotifs];

      // Sort: critical first, then warning, then match/info
      allNotifications.sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2, match: 2 };
        return (order[a.severity] || 3) - (order[b.severity] || 3);
      });

      notificationSnapshot = allNotifications;
      notificationFetchedAt = Date.now();
      succeeded = true;
    } catch (error) {
      if (isCurrent()) console.warn('[Alertas] Não foi possível atualizar os alertas:', error);
    } finally {
      if (generation === notificationGeneration && notificationAbortController === controller) {
        notificationAbortController = null;
        notificationRequest = null;
        notificationRequestStartedAt = 0;
        notificationLastAttemptSucceeded = succeeded;
        publishNotifications();
        if (notificationNeedsRefresh && notificationSubscribers.size) {
          notificationNeedsRefresh = false;
          void fetchAndNotify();
        }
      }
    }
  })();
  return notificationRequest;
};

export const subscribeToNotifications = (callback: (notifications: AppNotification[]) => void) => {
  notificationSubscribers.add(callback);
  if (!notificationStop) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let reconnectRefreshScheduled = false;
    const runRefresh = () => {
      timer = undefined;
      reconnectRefreshScheduled = false;
      if (stopped || !notificationSubscribers.size || notificationSessionInvalidated) return;
      if (notificationRequest) notificationNeedsRefresh = true;
      else void fetchAndNotify();
    };
    const refresh = () => {
      if (stopped || !notificationSubscribers.size || notificationSessionInvalidated) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(runRefresh, 750);
    };
    const refreshAfterReconnect = (delayMs = 750) => {
      if (stopped || !notificationSubscribers.size || notificationSessionInvalidated) return;
      const now = Date.now();
      if (notificationReconnectBatchUntil <= now) {
        notificationReconnectBatchStartedAt = now;
        notificationReconnectBatchUntil = now + 3_500;
      }

      const batchStartedAt = notificationReconnectBatchStartedAt;
      const requestAlreadyCoversReconnect = notificationRequest !== null &&
        notificationRequestStartedAt >= batchStartedAt;
      const successfulAttemptAlreadyCoversReconnect = notificationLastAttemptSucceeded &&
        notificationLastAttemptStartedAt >= batchStartedAt;
      if (requestAlreadyCoversReconnect || successfulAttemptAlreadyCoversReconnect) return;
      if (reconnectRefreshScheduled) return;
      reconnectRefreshScheduled = true;
      // Keep an already scheduled regular refresh; it will fetch the same current snapshot.
      if (timer) return;
      timer = setTimeout(runRefresh, delayMs);
    };
    const focus = () => { if (document.visibilityState === 'visible') refresh(); };
    let hasSubscribedOnce = false;
    let hadIssueBeforeFirstSubscription = false;
    const channel = supabase.channel('notification-snapshot-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variations' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'desire_matches' }, refresh)
      .subscribe((status) => {
        if (stopped) return;
        if (status === 'SUBSCRIBED') {
          if (!hasSubscribedOnce) {
            hasSubscribedOnce = true;
            if (hadIssueBeforeFirstSubscription) refreshAfterReconnect(3_250);
            return;
          }
          refreshAfterReconnect(3_250);
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          hadIssueBeforeFirstSubscription = true;
        }
      });
    let conditionKey = JSON.stringify(getSettings().stockNotificationConditions || ['novo']);
    const stopSettings = subscribeToSettings((settings) => {
      const key = JSON.stringify(settings.stockNotificationConditions || ['novo']);
      if (key !== conditionKey) { conditionKey = key; refresh(); }
    });
    const stopOrders = subscribeToOrderChanges((event) => {
      if (event?.reason === 'reconnected') refreshAfterReconnect();
      else refresh();
    });
    const auth = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        notificationSessionInvalidated = event === 'SIGNED_OUT';
        if (timer) clearTimeout(timer);
        timer = undefined;
        reconnectRefreshScheduled = false;
        invalidateNotificationWork();
        notificationSnapshot = []; notificationFetchedAt = 0;
        publishNotifications(); if (event === 'SIGNED_IN') refresh();
      }
    });
    document.addEventListener('visibilitychange', focus);
    window.addEventListener('focus', focus);
    notificationStop = () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = undefined;
      reconnectRefreshScheduled = false;
      stopSettings(); stopOrders(); auth.data.subscription.unsubscribe(); void supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', focus); window.removeEventListener('focus', focus);
    };
  }
  if (notificationFetchedAt) publishNotifications();
  if (!notificationFetchedAt || Date.now() - notificationFetchedAt > 30_000) void fetchAndNotify();
  return () => {
    notificationSubscribers.delete(callback);
    if (!notificationSubscribers.size) {
      notificationStop?.(); notificationStop = null;
      invalidateNotificationWork(); notificationSnapshot = []; notificationFetchedAt = 0;
    }
  };
};
