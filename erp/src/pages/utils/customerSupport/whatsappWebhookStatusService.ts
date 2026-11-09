import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Mapeia erros reportados pela Meta Cloud API em mensagens legíveis e códigos de erro.
 */
export function parseMetaStatusFailure(errors?: any[]): {
  failureReason: string | null;
  errorCode: string | null;
} {
  if (!Array.isArray(errors) || errors.length === 0) return { failureReason: null, errorCode: null };
  const first = errors[0] || {};
  const code = String(first.code || '');
  const details = first.error_data?.details || first.message || first.title || '';
  let failureReason: string;
  if (code === '131056') {
    failureReason = 'Mensagem descartada pela Meta (proteção anti-spam ou envio repetido). Aguarde 1 minuto ou altere o conteúdo do pedido antes de reenviar.';
  } else if (code === '131049') {
    failureReason = 'Disparo bloqueado por restrições de integridade ou política da Meta.';
  } else if (code === '131047') {
    failureReason = 'Janela de 24h fechada. É obrigatório o uso de modelo de mensagem aprovado.';
  } else if (code === '131026') {
    failureReason = 'Número não encontrado ou incapaz de receber mensagens no WhatsApp.';
  } else if (code === '130429') {
    failureReason = 'Limite temporário de taxa de envio atingido na Meta Cloud API. Aguarde alguns instantes.';
  } else {
    failureReason = first.title || first.message || `Falha reportada pela Meta (Código #${code})`;
  }
  if (details && !failureReason.includes(details)) failureReason += ` Detalhes: ${details}`;
  return { failureReason, errorCode: code || null };
}

/**
 * Persiste a atualização de status de entrega da mensagem no banco de dados
 * através de sincronização atômica em whatsapp_dispatches, warranty_terms e whatsapp_messages.
 */
export async function persistDeliveryStatusUpdate(
  supabase: SupabaseClient,
  msgId: string,
  deliveryStatus: string,
  updatedAt: string,
  statusItem: any,
  failureReason: string | null,
  errorCode: string | null
): Promise<void> {
  const commonFailure = failureReason ? { failure_reason: failureReason } : {};
  const commonError = errorCode ? { error_code: errorCode } : {};

  await Promise.allSettled([
    supabase
      .from('whatsapp_dispatches')
      .update({
        status: deliveryStatus,
        updated_at: updatedAt,
        raw_payload: statusItem,
        ...commonFailure,
        ...commonError,
      })
      .eq('api_message_id', msgId),

    supabase
      .from('warranty_terms')
      .update({
        delivery_status: deliveryStatus,
        delivery_status_updated_at: updatedAt,
        ...commonFailure,
      })
      .eq('api_message_id', msgId),

    supabase
      .from('whatsapp_messages')
      .update({
        status: deliveryStatus,
        ...commonFailure,
        ...commonError,
      })
      .eq('api_message_id', msgId),
  ]);
}
