import { supabase } from '../supabaseConfig';
import { isIdentifiedTestArtifact } from '../../../../../shared-utils/testing/testArtifactPolicy';

export interface AppNotificationPayload {
  orderId?: string;
  title: string;
  message: string;
  type:
    | 'order_created'
    | 'order_edited'
    | 'order_schedule_changed'
    | 'assembly_outside'
    | 'assembly_depot'
    | 'system';
  scheduleText?: string;
  orderData?: any;
}

export async function dispatchAppNotification(payload: AppNotificationPayload): Promise<void> {
  if (isIdentifiedTestArtifact(payload.orderData)) return;

  try {
    // O banco publica o evento e enfileira o push depois do commit.
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
  } catch (err) {
    console.warn(
      '[PushNotificationService] Não foi possível registrar a notificação:',
      err
    );
  }
}
