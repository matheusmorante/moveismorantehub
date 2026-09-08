import { DeliverySummaryRecord, SummaryStatus } from './deliverySummaryService';
import { supabase } from './supabaseClient';

type SummaryScope = DeliverySummaryRecord['scope'];

export interface SharedAudioGenerationResult {
  status: SummaryStatus;
  isOwner: boolean;
}

/**
 * O backend é a autoridade do cache, da trava e da geração. A tela apenas
 * solicita o estado e acompanha o resultado pelo Realtime.
 */
export async function ensureSharedSummaryAudio(
  scope: SummaryScope,
  text: string,
): Promise<SharedAudioGenerationResult> {
  try {
    if (!supabase.functions?.invoke) return { status: 'MISSING', isOwner: false };
    const { data, error } = await supabase.functions.invoke('generate-delivery-summary-audio', { body: { scope, text } });
    if (error) throw error;
    return { status: (data?.status || 'FAILED') as SummaryStatus, isOwner: Boolean(data?.isOwner) };
  } catch (error) {
    console.warn('[DeliverySummaryAudio] Falha ao solicitar áudio compartilhado:', error);
    return { status: 'FAILED', isOwner: false };
  }
}
