import { supabase } from '../../supabaseConfig';
import type { buildFiscalItemSelectionPayload } from '../nfeEmissionRequestState';

export async function abandonUntransmittedHmlAttempt(
  orderId: string,
  documentId: string,
  emissionRequestId: string,
  currentFiscalChoices: ReturnType<typeof buildFiscalItemSelectionPayload>
): Promise<{ success: true; alreadyAbandoned: boolean } | { success: false; error: string }> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token)
    return { success: false, error: 'Faça login novamente para encerrar a tentativa fiscal.' };

  const response = await fetch('/api/nfe/abandon-hml-attempt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({
      orderId,
      documentId,
      emissionRequestId,
      environment: 2,
      ...currentFiscalChoices,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success !== true)
    return {
      success: false,
      error:
        typeof result.error === 'string'
          ? result.error
          : 'Não foi possível encerrar a tentativa anterior com segurança.',
    };
  return { success: true, alreadyAbandoned: result.alreadyAbandoned === true };
}
