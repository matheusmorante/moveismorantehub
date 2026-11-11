import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeToolContext } from './types.js';
import { recordHandoffToHuman } from './handoffService.js';

export async function handleCalcularFreteOuDistancia(
  supabase: SupabaseClient,
  args: Record<string, any>,
  context: SafeToolContext
): Promise<Record<string, any>> {
  const input = String(args.enderecoOuCep || '').trim();
  const reason = input
    ? 'A ferramenta não consulta uma rota real; a equipe precisa confirmar a distância e o frete.'
    : 'O endereço não foi informado; a equipe precisa confirmar a distância e o frete.';

  let handoffConfirmed = Boolean(context?.isSimulation || context?.conversationId?.startsWith('simulated_'));
  if (context?.conversationId && !context.isSimulation && !context.conversationId.startsWith('simulated_')) {
    const handoff = await recordHandoffToHuman(supabase, {
      conversationId: context.conversationId,
      reason: `${reason} Endereço informado: ${input || 'não informado'}.`,
      isSilent: true,
      isSimulation: context.isSimulation,
    });
    handoffConfirmed = handoff.success;
  }

  return {
    success: false,
    localizado: false,
    precisaIntervencao: true,
    silentHandoff: handoffConfirmed,
    motivo: reason,
    mensagem: handoffConfirmed
      ? 'A distância e o valor do frete precisam ser confirmados pela equipe. A intervenção foi registrada sem enviar uma estimativa ao cliente.'
      : 'A distância e o valor do frete precisam ser confirmados pela equipe. A intervenção não pôde ser confirmada; não envie uma estimativa ao cliente.',
  };
}
