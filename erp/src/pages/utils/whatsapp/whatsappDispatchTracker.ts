import { supabase } from '@/pages/utils/supabaseConfig';

export interface WebhookWaitResult {
  status: 'delivered' | 'sent' | 'failed' | 'timeout';
  failureReason?: string | null;
  errorCode?: string | null;
}

export interface RecordDispatchInput {
  orderId?: string;
  recipientPhone: string;
  messageType?: string;
  messageContent?: string;
  apiMessageId: string;
}

/**
 * Registra um novo despacho de mensagem na tabela `whatsapp_dispatches`
 */
export async function recordWhatsAppDispatch(input: RecordDispatchInput): Promise<void> {
  try {
    if (!input.apiMessageId) return;
    await supabase.from('whatsapp_dispatches').insert({
      order_id: input.orderId || null,
      recipient_phone: input.recipientPhone,
      message_type: input.messageType || 'order_confirmation',
      message_content: input.messageContent || null,
      api_message_id: input.apiMessageId,
      status: 'pending',
    });
  } catch (err) {
    console.warn('[whatsappDispatchTracker] Falha ao registrar despacho:', err);
  }
}

/**
 * Aguarda a confirmação assíncrona do Webhook da Meta via Supabase Realtime + Polling failsafe.
 * - Se a Meta rejeitar (ex: spam, rate limit, erro de integridade): retorna status 'failed' com failureReason
 * - Se a Meta entregar: retorna status 'delivered' ou 'sent'
 * - Se atingir o timeout (default 7s): retorna status 'timeout'
 */
export async function waitForMetaDeliveryConfirmation(
  apiMessageId: string,
  options?: { timeoutMs?: number; pollIntervalMs?: number }
): Promise<WebhookWaitResult> {
  const timeoutMs = options?.timeoutMs ?? 7000;
  const pollIntervalMs = options?.pollIntervalMs ?? 1000;

  if (!apiMessageId) {
    return { status: 'timeout' };
  }

  return new Promise<WebhookWaitResult>((resolve) => {
    let finished = false;
    let pollTimer: any = null;
    let timeoutTimer: any = null;
    let channel: any = null;

    const cleanup = () => {
      finished = true;
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore cleanup errors
        }
      }
    };

    const handleRecordUpdate = (record: any) => {
      if (finished || !record) return;
      const status = String(record.status || '').toLowerCase();
      if (status === 'failed') {
        cleanup();
        resolve({
          status: 'failed',
          failureReason: record.failure_reason,
          errorCode: record.error_code,
        });
      } else if (status === 'delivered' || status === 'read') {
        cleanup();
        resolve({ status: 'delivered' });
      } else if (status === 'sent') {
        cleanup();
        resolve({ status: 'sent' });
      }
    };

    // 1. Ouvir via Supabase Realtime
    try {
      const ch = supabase.channel(`dispatch-status-${apiMessageId}`);
      if (ch && typeof ch.on === 'function') {
        const configuredChannel = ch.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'whatsapp_dispatches',
            filter: `api_message_id=eq.${apiMessageId}`,
          },
          (payload: any) => {
            handleRecordUpdate(payload?.new);
          }
        );
        channel = configuredChannel;
        if (configuredChannel && typeof configuredChannel.subscribe === 'function') {
          configuredChannel.subscribe();
        }
      }
    } catch (err) {
      console.warn('[whatsappDispatchTracker] Erro ao assinar canal realtime:', err);
    }

    // 2. Failsafe Polling regular
    const checkCurrentDbStatus = async () => {
      if (finished) return;
      try {
        const { data } = await supabase
          .from('whatsapp_dispatches')
          .select('status, failure_reason, error_code')
          .eq('api_message_id', apiMessageId)
          .maybeSingle();

        if (data) {
          handleRecordUpdate(data);
        }
      } catch (err) {
        console.warn('[whatsappDispatchTracker] Erro no checkCurrentDbStatus:', err);
      }
    };

    pollTimer = setInterval(checkCurrentDbStatus, pollIntervalMs);
    // Executa uma checagem imediata caso o webhook já tenha chegado
    checkCurrentDbStatus();

    // 3. Failsafe Timeout
    timeoutTimer = setTimeout(() => {
      if (!finished) {
        cleanup();
        resolve({ status: 'timeout' });
      }
    }, timeoutMs);
  });
}
