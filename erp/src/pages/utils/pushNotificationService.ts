import { supabase } from './supabaseConfig';

export interface AppNotificationPayload {
    orderId?: string;
    title: string;
    message: string;
    type: 'order_created' | 'order_edited' | 'order_schedule_changed' | 'assembly_outside' | 'assembly_depot' | 'system';
    scheduleText?: string;
    orderData?: any;
}

export async function dispatchAppNotification(payload: AppNotificationPayload): Promise<void> {
    try {
        // 1. Salva no banco de dados para a central interna de notificações e realtime
        const { error } = await supabase.from('app_notifications').insert({
            order_id: payload.orderId || null,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            schedule_text: payload.scheduleText || null,
            order_data: payload.orderData || null,
            read: false,
        });
        if (error) {
            console.error('[PushNotificationService] Erro ao inserir na tabela app_notifications:', error);
        }

        // 2. Dispara Push Remoto diretamente pela Expo Push API para acordar o celular mesmo fechado
        const { data: pushTokens } = await supabase
            .from('push_tokens')
            .select('token');

        if (pushTokens && pushTokens.length > 0) {
            const validTokens = pushTokens
                .map((t: any) => t.token)
                .filter((token: string) => token && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')));

            if (validTokens.length > 0) {
                const pushMessages = validTokens.map((token: string) => ({
                    to: token,
                    sound: 'default',
                    title: payload.title,
                    body: payload.message,
                    channelId: 'default',
                    priority: 'high',
                    _displayInForeground: true,
                    data: {
                        orderId: payload.orderId,
                        type: payload.type,
                        scheduleText: payload.scheduleText,
                    },
                }));

                await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(pushMessages),
                }).catch(e => console.warn('[PushNotificationService] Erro no envio Expo Push:', e));
            }
        }
    } catch (err) {
        console.error('[PushNotificationService] Erro ao despachar notificação push:', err);
    }
}
