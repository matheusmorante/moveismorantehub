import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { supportSandboxMessageSchema } from '../../../../../../shared-utils/customerSupportFormSchemas';

export interface CustomerSupportTestSendResult {
  accepted: true;
  persisted: boolean;
  warning?: string;
}

export interface CustomerSupportTestSender {
  enabled: boolean;
  phoneNumberId?: string;
  phoneNumber?: string;
}

/** Sends only through the Meta test sender endpoint; the server enforces the Development sandbox. */
export async function sendCustomerSupportTestMessage(
  supabase: SupabaseClient,
  conversationId: string,
  message: string
): Promise<CustomerSupportTestSendResult> {
  const parsed = supportSandboxMessageSchema.safeParse({ message });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Mensagem inválida.');

  const sessionResponse = await withTimeout<any>(supabase.auth.getSession(), 10_000, null, 'central:envio-teste-sessao');
  const accessToken = sessionResponse?.data?.session?.access_token;
  if (sessionResponse?.error || !accessToken) throw new Error('Sessão inválida. Entre novamente.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch('/api/whatsapp-dispatch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId, message: parsed.data.message }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Não foi possível enviar a mensagem de teste.');
    if (data.accepted !== true) throw new Error('A Meta não confirmou o envio da mensagem.');
    return {
      accepted: true,
      persisted: data.persisted === true,
      ...(typeof data.warning === 'string' ? { warning: data.warning } : {}),
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Resultado do envio incerto. Atualize a conversa antes de tentar novamente.');
    }
    throw error instanceof Error ? error : new Error('Não foi possível enviar a mensagem de teste.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchCustomerSupportTestSender(): Promise<CustomerSupportTestSender> {
  try {
    const response = await withTimeout<Response | null>(fetch('/api/whatsapp-dispatch?operation=test-sender', { cache: 'no-store' }), 10_000, null, 'central:remetente-teste');
    if (!response?.ok) return { enabled: false };
    const data = await response.json();
    return data?.enabled === true && typeof data.phoneNumberId === 'string' && typeof data.phoneNumber === 'string'
      ? { enabled: true, phoneNumberId: data.phoneNumberId, phoneNumber: data.phoneNumber }
      : { enabled: false };
  } catch {
    return { enabled: false };
  }
}
