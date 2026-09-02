import { supabase } from './supabaseConfig';
import { getNotificationSoundRoute } from './notificationSoundRouting';

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
        const soundRoute = getNotificationSoundRoute(payload);
        // 1. Grava no banco de dados para histórico e realtime do app aberto
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
            console.warn('[PushNotificationService] Aviso ao inserir app_notification:', error);
        }

        // 2. Busca todos os tokens cadastrados na tabela push_tokens
        const { data: tokenRows } = await supabase
            .from('push_tokens')
            .select('token');

        const tokens = (tokenRows || [])
            .map(r => r.token)
            .filter(t => Boolean(t) && typeof t === 'string' && t.startsWith('ExponentPushToken'));

        if (tokens.length === 0) {
            console.log('[PushNotificationService] Nenhum push token ativo encontrado para envio.');
            return;
        }

        // 3. Monta e dispara os pushes para a API da Expo / Google FCM (app fechado ou em segundo plano)
        const pushMessages = tokens.map(token => ({
            to: token,
            title: payload.title,
            body: payload.message,
            sound: soundRoute.sound,
            channelId: soundRoute.channelId,
            priority: 'high',
            _displayInForeground: true,
            _android: {
                sound: soundRoute.sound,
                priority: 'max',
                visibility: 'public',
                channelId: soundRoute.channelId,
            },
            data: {
                orderId: payload.orderId,
                type: payload.type,
                status: payload.orderData?.status,
                scheduleText: payload.scheduleText,
            },
        }));

        const pushEndpoints = [
            typeof window !== 'undefined' && window.location.origin.includes('localhost')
                ? 'http://localhost:3001/api/push-notification'
                : '/api/push-notification',
            'https://morantehub.vercel.app/api/push-notification',
            'https://exp.host/--/api/v2/push/send'
        ];

        let sent = false;
        for (const endpoint of pushEndpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(pushMessages),
                });
                if (response.ok) {
                    const resData = await response.json();
                    console.log(`[PushNotificationService] Push enviado com sucesso via ${endpoint}:`, resData);
                    sent = true;
                    break;
                }
            } catch (networkErr) {
                // Tenta o próximo endpoint
            }
        }

        if (!sent) {
            console.log('[PushNotificationService] Notificação gravada em app_notifications (disparo direto em background).');
        }
    } catch (err) {
        console.warn('[PushNotificationService] Notificação push não pôde ser entregue neste ambiente:', err);
    }
}

