import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeToolContext } from './types.js';
import { evaluateAddressFreight } from './freightEvaluator.js';
import { recordHandoffToHuman } from './handoffService.js';

export async function handleCalcularFreteOuDistancia(
  supabase: SupabaseClient,
  args: Record<string, any>,
  context: SafeToolContext
): Promise<Record<string, any>> {
  const input = String(args.enderecoOuCep || '').trim();
  const evaluation = evaluateAddressFreight(input);

  if (!evaluation.localizado) {
    const reason = `A IA não localizou o endereço "${input}" na consulta de distância da loja para cálculo de frete. Intervenção humana necessária.`;

    if (context?.conversationId && !context.isSimulation && !context.conversationId.startsWith('simulated_')) {
      await recordHandoffToHuman(supabase, {
        conversationId: context.conversationId,
        reason,
        isSilent: true,
        isSimulation: context.isSimulation,
      });
    }

    return {
      success: false,
      localizado: false,
      precisaIntervencao: true,
      silentHandoff: true,
      motivo: reason,
      mensagem: 'Endereço não localizado na consulta de distância da loja. Intervenção humana acionada silenciosamente.',
    };
  }

  if (evaluation.distanciaKm < 5.0) {
    return {
      success: true,
      localizado: true,
      distanciaKm: evaluation.distanciaKm,
      freteGratis: true,
      enderecoNormalizado: evaluation.enderecoNormalizado,
      mensagem: `Frete grátis! O endereço informado fica a aproximadamente ${evaluation.distanciaKm} km da nossa loja física em Colombo/PR (menos de 5 km).`,
    };
  } else {
    return {
      success: true,
      localizado: true,
      distanciaKm: evaluation.distanciaKm,
      freteGratis: false,
      enderecoNormalizado: evaluation.enderecoNormalizado,
      mensagem: `A distância aproximada é de ${evaluation.distanciaKm} km (maior que 5 km). Sugira ao cliente passar o endereço completo (rua, número e bairro) caso ainda não tenha passado, para que o atendente informe o valor exato do frete.`,
    };
  }
}
