import { supabase } from '../supabaseConfig';

export async function removeCustomerSupportMessagesFromCentral(
  conversationId: string,
  messageIds: string[],
): Promise<number> {
  const { data, error: sessionError } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (sessionError || !accessToken) throw new Error('Sua sessão expirou. Entre novamente.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch('/api/whatsapp-support-remove-messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId, messageIds }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof result.error === 'string'
        ? result.error
        : 'Não foi possível remover as mensagens da Central.');
    }
    return Number(result.removedCount) || 0;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('A remoção demorou demais. Atualize a conversa e tente novamente.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
