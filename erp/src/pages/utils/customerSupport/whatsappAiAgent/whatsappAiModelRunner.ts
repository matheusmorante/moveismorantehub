import {
  type AiModelErrorType,
  type AiModelErrorInfo,
  classifyAiModelError,
} from './whatsappAiErrorClassifier.js';
import {
  type OpenAiTurnLoopOptions,
  executeOpenAiTurnLoop,
} from './runners/openAiTurnRunner.js';
import {
  type RunAiTurnWithFallbackOptions,
  type RunAiTurnResult,
} from './runners/modelTurnTypes.js';
import {
  checkAndReserveAiQuota,
  releaseAiQuotaReservation,
} from './runners/quotaReservationGuard.js';

export {
  type AiModelErrorType,
  type AiModelErrorInfo,
  classifyAiModelError,
  type OpenAiTurnLoopOptions,
  executeOpenAiTurnLoop,
  type RunAiTurnWithFallbackOptions,
  type RunAiTurnResult,
};

/**
 * O nome legado é mantido para preservar os chamadores existentes. Todos os
 * turnos do agente de atendimento usam GPT-6 Luna, sem troca de provedor.
 */
export async function runAiTurnWithFallback(
  options: RunAiTurnWithFallbackOptions
): Promise<RunAiTurnResult> {
  const {
    modelToUse,
    openAiApiKey,
    fetchOpenAi,
    systemInstructionText,
    historyForOpenAi,
    toolsDeclarations,
    supabase,
    toolContext,
    onToolExecuted,
  } = options;

  const model = 'gpt-6-luna';
  const apiKey = openAiApiKey?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada para o agente de atendimento.');

  const quotaCheck = await checkAndReserveAiQuota(
    supabase,
    'openai',
    model,
    toolContext
  );

  if (quotaCheck.blocked && quotaCheck.blockedResult) {
    return quotaCheck.blockedResult;
  }

  let reservationCommitted = false;
  try {
    const result = await executeOpenAiTurnLoop({
      fetchOpenAi,
      apiKey,
      model,
      systemInstructionText,
      historyMessages: historyForOpenAi,
      tools: toolsDeclarations,
      supabase,
      toolContext: toolContext || {},
      onToolExecuted,
      reservationId: quotaCheck.reservationId,
    });
    reservationCommitted = result.reservationCommitted;
    return {
      text: result.text,
      toolsCalled: result.toolsCalled,
      modelRequested: modelToUse || model,
      modelEffective: model,
      fallbackReason: null,
      reservationId: quotaCheck.reservationId,
    };
  } finally {
    if (!reservationCommitted) {
      await releaseAiQuotaReservation(supabase, quotaCheck.reservationId);
    }
  }
}
