import { supabase } from './supabaseConfig';

export interface AppNotificationPayload {
    orderId?: string;
    title: string;
    message: string;
    type: 'order_created' | 'order_edited' | 'order_schedule_changed' | 'assembly_outside' | 'assembly_depot' | 'system';
    scheduleText?: string;
    orderData?: any;
}

/**
 * Dispatch an app notification:
 * 1. Inserts into Supabase `app_notifications` table (triggering Realtime listeners in mobile).
 * 2. Fetches push tokens from `push_tokens` table and dispatches Expo Push Notifications.
 */
export async function dispatchAppNotification(payload: AppNotificationPayload): Promise<void> {
    try {
        // 1. Insert into Supabase database table
        const { error: dbError } = await supabase.from('app_notifications').insert([{
            order_id: payload.orderId || null,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            schedule_text: payload.scheduleText || null,
            order_data: payload.orderData || null,
            read: false,
            created_at: new Date().toISOString()
        }]);

        if (dbError) {
            console.error('[PushNotificationService] Erro ao gravar notificação no Supabase:', dbError);
        }

        // 2. Fetch active Expo push tokens
        const { data: tokensData, error: tokensError } = await supabase
            .from('push_tokens')
            .select('token');

        if (tokensError || !tokensData || tokensData.length === 0) {
            return;
        }

        const pushMessages = tokensData.map(({ token }) => ({
            to: token,
            sound: 'default',
            title: payload.title,
            body: payload.message,
            data: {
                orderId: payload.orderId,
                type: payload.type,
                scheduleText: payload.scheduleText
            }
        }));

        // Send push notifications via Expo Push API in batches
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pushMessages)
        });
    } catch (err) {
        console.error('[PushNotificationService] Erro ao enviar notificação:', err);
    }
}
