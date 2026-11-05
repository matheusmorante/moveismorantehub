import { supabase } from './supabaseClient';
import { withAbortTimeout } from '../../../shared-utils/withAbortTimeout';

/** O pedido completo é consultado pelo ID somente ao abrir a notificação. */
export async function fetchAppNotificationSummaries(signal?: AbortSignal): Promise<any[]> {
  const { data, error } = await withAbortTimeout(supabase.rpc('list_app_notification_summaries', { p_limit: 50 }),
    'app:resumos-notificacoes', 15_000, signal);
  if (error) throw error;
  if (!Array.isArray(data) || data.length > 50 || data.some((row) => !row?.id)) {
    throw new Error('A consulta de notificações retornou dados inválidos.');
  }
  return data;
}
