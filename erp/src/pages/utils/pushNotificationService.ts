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
            sound: 'default',
            channelId: 'morante_alerts_v2',
            priority: 'high',
            _displayInForeground: true,
            _android: {
                sound: true,
                priority: 'max',
                visibility: 'public',
                channelId: 'morante_alerts_v2',
            },
            data: {
                orderId: payload.orderId,
                type: payload.type,
                scheduleText: payload.scheduleText,
            },
        }));

        const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pushMessages),
        });

        const expoData = await expoResponse.json();
        console.log('[PushNotificationService] Expo Push enviado com sucesso:', expoData);
    } catch (err) {
        console.error('[PushNotificationService] Erro ao despachar notificação push:', err);
    }
}

