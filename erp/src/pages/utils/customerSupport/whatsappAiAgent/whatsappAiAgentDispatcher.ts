/**
 * whatsappAiAgentDispatcher.ts
 *
 * Despachante e finalizador de respostas do Agente de IA Comercial (Móveis Morante).
 * Padrão Strategy / Facade:
 * - `./dispatcher/preDispatchGuards.js`: Revalidação da conversa, de configurações e números autorizados
 * - `./dispatcher/dispatchAssistedMode.js`: Modo assistido (gera sugestão interna para validação humana)
 * - `./dispatcher/dispatchAutomaticMode.js`: Modo automático (idempotência, envio Meta Cloud API e persistência)
 */

import type { WhatsAppAiAgentResult } from './whatsappAiAgentTypes.js';
import {
  DispatchAiResponseParams,
  evaluatePreDispatchGuards,
  dispatchAssistedMode,
  dispatchAutomaticMode,
} from './dispatcher/index.js';

export * from './dispatcher/index.js';

export async function dispatchAiResponse(
  params: DispatchAiResponseParams
): Promise<WhatsAppAiAgentResult> {
  // 1. Revalidação da conversa, escalonamento silencioso, configurações e número de teste autorizado
  const guardCheck = await evaluatePreDispatchGuards(params);
  if (!guardCheck.canProceed && guardCheck.earlyResult) {
    return guardCheck.earlyResult;
  }

  const supportMode = params.config.supportMode || 'automatico';

  // 2. Modo "assistido": grava sugestão para o atendente aprovar no painel sem disparar mensagem externa
  if (supportMode === 'assistido') {
    return dispatchAssistedMode(params);
  }

  // 3. Modo "automatico": idempotência estrita de despacho, envio Meta API e persistência
  return dispatchAutomaticMode(params);
}
