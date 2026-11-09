import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeToolContext } from './types.js';
import { recordHandoffToHuman } from './handoffService.js';

export async function handleEncaminharParaAtendimentoHumano(
  supabase: SupabaseClient,
  args: Record<string, any>,
  context: SafeToolContext
): Promise<Record<string, any>> {
  const reason = String(args.motivo || 'Dúvida sem resposta segura ou solicitação de atendimento').trim();
  const isSilent = args.silencioso !== false;

  return recordHandoffToHuman(supabase, {
    conversationId: context.conversationId,
    reason,
    isSilent,
    isSimulation: context.isSimulation,
  });
}
