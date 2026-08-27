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
        const { error } = await supabase.from('app_notifications').insert({
            order_id: payload.orderId || null,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            schedule_text: payload.scheduleText || null,
            order_data: payload.orderData || null,
            read: false,
        });
        if (error) throw error;
    } catch (err) {
        console.error('[PushNotificationService] Erro ao enviar notificação:', err);
    }
}
