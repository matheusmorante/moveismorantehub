import type { SupabaseClient } from '@supabase/supabase-js';
import { processBusinessAppEcho } from '../whatsappWebhookEchoService.js';

export interface EchoBatchResult {
  processedMessages: number;
  duplicatesIgnored: number;
  errors: string[];
}

export async function processEchoBatch(
  supabase: SupabaseClient,
  businessPhoneNumberId: string,
  value: any
): Promise<EchoBatchResult> {
  const result: EchoBatchResult = {
    processedMessages: 0,
    duplicatesIgnored: 0,
    errors: [],
  };

  if (!Array.isArray(value?.message_echoes)) return result;

  for (const message of value.message_echoes) {
    try {
      const inserted = await processBusinessAppEcho(supabase, businessPhoneNumberId, value, message);
      if (inserted) result.processedMessages++;
      else if (inserted === false) result.duplicatesIgnored++;
    } catch (err: any) {
      console.error('[WhatsApp Webhook] Erro ao processar mensagem enviada pelo app:', err);
      result.errors.push(err.message || String(err));
    }
  }

  return result;
}
