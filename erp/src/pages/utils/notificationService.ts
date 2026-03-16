import { supabase } from '@/pages/utils/supabaseConfig';
import Product from "../types/product.type";
import Order from "../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';

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

const TABLE_NAME = "products";
const READ_KEY = "pdv_notifications_read";

const getReadIds = (): Set<string> => {
    try {
        const saved = localStorage.getItem(READ_KEY);
        return new Set(saved ? JSON.parse(saved) : []);
    } catch { return new Set(); }
};

export const markAsRead = (id: string) => {
    const readIds = getReadIds();
    readIds.add(id);
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(readIds)));
};

export const markAllAsRead = (ids: string[]) => {
    const readIds = getReadIds();
    ids.forEach(id => readIds.add(id));
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(readIds)));
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
        .filter(p => {
            if (p.deleted || !p.active || p.itemType !== 'product') return false;
            
            // Allow notification if the product's condition is in the allowed list
            // If condition is empty/null, we might treat it as 'novo' or skip it. 
            // Let's assume empty condition is not filtered unless explicitly handled.
            const condition = p.condition || 'novo';
            return allowedConditions.includes(condition as any);
        })
        .forEach(product => {
            const cfg = product.notificationConfig;

            // If product has notifications explicitly disabled, skip
            if (cfg && cfg.enabled === false) return;

            const customNote = cfg?.notifyCustom ? `\nNota: ${cfg.notifyCustom}` : '';

            // Helper to add notification
            const addNotif = (id: string, title: string, description: string, severity: NotificationSeverity) => {
                notifications.push({
                    id,
                    title,
                    description: description + customNote,
                    severity,
                    category: 'stock',
                    icon: severity === 'critical' ? 'bi-exclamation-octagon-fill' : 'bi-exclamation-triangle-fill',
                    link: '/registrations/products',
                    createdAt: new Date(),
                    read: readIds.has(id)
                });
            };

            // CASE 1: Product has variations
            if (product.hasVariations && product.variations && product.variations.length > 0) {
                product.variations.forEach(v => {
                    const stock = v.stock ?? 0;
                    const minStock = v.minStock ?? 0;

                    // Zero stock alert for variation
                    const wantsZero = !cfg || cfg.notifyZeroStock !== false;
                    if (wantsZero && stock === 0) {
                        const id = `stock_zero_var_${product.id}_${v.id}`;
                        addNotif(id, 'Variação sem Estoque', `"${product.description}" (${v.name}) está sem estoque.`, 'critical');
                    }

                    // Min stock alert for variation
                    const wantsMin = !cfg || cfg.notifyMinStock !== false;
                    if (wantsMin && minStock > 0 && stock > 0 && stock <= minStock) {
                        const id = `stock_min_var_${product.id}_${v.id}`;
                        addNotif(id, 'Variação em Estoque Mínimo', `"${product.description}" (${v.name}) atingiu o mínimo (${stock}/${minStock}).`, 'warning');
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
                    addNotif(id, 'Estoque Zerado', `"${product.description}" está sem estoque (0 ${product.unit || 'un'}).`, 'critical');
                }

                // Min stock alert
                const wantsMin = !cfg || cfg.notifyMinStock !== false;
                if (wantsMin && minStock > 0 && stock > 0 && stock <= minStock) {
                    const id = `stock_min_${product.id}`;
                    addNotif(id, 'Estoque Mínimo Atingido', `"${product.description}" com ${stock} ${product.unit || 'un'} (mínimo: ${minStock}).`, 'warning');
                }
            }
        });

    return notifications;
};

const buildMatchNotifications = async (products: Product[]): Promise<AppNotification[]> => {
    const readIds = getReadIds();
    const notifications: AppNotification[] = [];

    // Busca matches pendentes de notificação
    const { data: matches, error } = await supabase
        .from('desire_matches')
        .select('*, customer_desires(*)')
        .eq('notified', false);

    if (error || !matches) return [];

    matches.forEach(m => {
        const desire = m.customer_desires;
        const product = products.find(p => p.id === String(m.product_id));
        
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
                read: readIds.has(id)
            });
        }
    });

    return notifications;
};

const buildOrderNotifications = (orders: Order[]): AppNotification[] => {
    const readIds = getReadIds();
    const notifications: AppNotification[] = [];

    const draftOrders = orders.filter(o => !o.deleted && o.status === 'draft');

    if (draftOrders.length > 0) {
        const id = `draft_orders_alert_${draftOrders.length}`;
        notifications.push({
            id,
            title: 'Pedidos em Rascunho',
            description: draftOrders.length === 1
                ? `Existe 1 pedido em rascunho aguardando finalização.`
                : `Existem ${draftOrders.length} pedidos em rascunho aguardando finalização.`,
            severity: 'info',
            category: 'order',
            icon: 'bi-file-earmark-text-fill',
            link: '/sales-order',
            createdAt: new Date(),
            read: readIds.has(id)
        });
    }

    return notifications;
};

/**
 * Subscribe to all system notifications.
 * Returns an unsubscribe function.
 */
export const subscribeToNotifications = (callback: (notifications: AppNotification[]) => void) => {
    const fetchAndNotify = async () => {
        // Fetch Products
        const { data: pData, error: pError } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('deleted', false)
            .eq('active', true);

        // Fetch Orders
        const { data: oData, error: oError } = await supabase
            .from('orders')
            .select('*');

        if (pError || oError) return;

        const products: Product[] = (pData || []).map((d: any) => ({
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
            notificationConfig: d.notification_config
        }));

        const orders: Order[] = (oData || []).map((row: any) => {
            try {
                return { ...(row.order_data || {}), id: String(row.id) } as Order;
            } catch (_e) {
                return { id: String(row.id) } as any;
            }
        });

        const productNotifs = buildProductNotifications(products);
        const orderNotifs = buildOrderNotifications(orders);
        const matchNotifs = await buildMatchNotifications(products);

        const allNotifications = [...productNotifs, ...orderNotifs, ...matchNotifs];

        // Sort: critical first, then warning, then match/info
        allNotifications.sort((a, b) => {
            const order = { critical: 0, warning: 1, info: 2, match: 2 };
            return (order[a.severity] || 3) - (order[b.severity] || 3);
        });

        callback(allNotifications);
    };

    fetchAndNotify();

    const pChannel = supabase.channel('notifications_products')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => fetchAndNotify())
        .subscribe();

    const oChannel = supabase.channel('notifications_orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchAndNotify())
        .subscribe();

    return () => {
        supabase.removeChannel(pChannel);
        supabase.removeChannel(oChannel);
    };
};
