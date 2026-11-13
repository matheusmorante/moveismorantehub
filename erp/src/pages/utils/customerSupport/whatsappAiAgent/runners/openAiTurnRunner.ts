import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeToolContext } from '../whatsappAiAgentTools.js';
import { createAgentToolCallGuard } from '../../../../../../../shared-utils/agentToolCallGuard.js';
import type { RunAiTurnResult } from './modelTurnTypes.js';
import type { WhatsAppNativeCatalogProduct } from '../whatsappAiAgentTypes.js';
import { isGreetingOnly, buildTurnContinuityInstructions } from './turnPromptBuilder.js';
import { callOpenAiResponsesApi, estimateTurnTokens } from './openAiResponsesClient.js';
import { checkAndReserveAiQuota, auditAndRecordTurnUsage } from './turnUsageAuditor.js';
import { executeRoundToolCalls } from './turnToolExecutor.js';

export interface OpenAiTurnLoopOptions {
  fetchOpenAi: typeof fetch;
  apiKey: string;
  model: string;
  systemInstructionText: string;
  historyMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  tools: any[];
  supabase: SupabaseClient;
  toolContext: SafeToolContext;
  onToolExecuted?: (name: string, args: any, result: any) => void;
}

export interface TurnExecutionResult {
  text: string;
  toolsCalled: string[];
  reservationCommitted: boolean;
  handoffConfirmed?: boolean;
  quotaBlockedResult?: RunAiTurnResult;
  nativeCatalogProducts?: WhatsAppNativeCatalogProduct[];
}

const extractResponseText = (data: any): string => {
  if (typeof data.output_text === 'string') return data.output_text;
  const outputItems = Array.isArray(data.output) ? data.output : [];
  return outputItems
    .filter((item: any) => item?.type === 'message')
    .flatMap((item: any) => item?.content || [])
    .filter((content: any) => content?.type === 'output_text' && typeof content.text === 'string')
    .map((content: any) => content.text)
    .join('');
};

/**
 * Executa o loop de múltiplos turnos (tool-use) com o GPT-6 Luna pela Responses API.
 * Suporta até 4 iterações de chamadas de ferramentas antes de responder.
 */
export async function executeOpenAiTurnLoop(
  options: OpenAiTurnLoopOptions
): Promise<TurnExecutionResult> {
  const {
    fetchOpenAi,
    apiKey,
    model,
    systemInstructionText,
    historyMessages,
    tools,
    supabase,
    toolContext,
    onToolExecuted,
  } = options;

  const input: any[] = historyMessages.map((message) => ({
    role: message.role,
    content: [{
      type: message.role === 'assistant' ? 'output_text' : 'input_text',
      text: message.content,
    }],
  }));

  const latestUserMessage = [...historyMessages]
    .reverse()
    .find((message) => message.role === 'user')?.content || '';
  const greetingOnly = isGreetingOnly(latestUserMessage);
  const toolCallGuard = createAgentToolCallGuard();

  const openAiTools =
    !greetingOnly && tools.length > 0
      ? tools.map((t) => ({
          type: 'function',
          name: t.name,
          description: t.description,
          parameters: t.parameters,
          strict: true,
        }))
      : undefined;

  const toolsCalled: string[] = [];
  let aiResponseText = '';
  let reservationCommitted = false;
  let handoffConfirmed = false;
  const nativeCatalogProducts = new Map<string, WhatsAppNativeCatalogProduct>();
  const turnStartedAt = Date.now();
  const turnDeadlineMs = 45_000;

  for (let round = 0; round < 4; round++) {
    const remainingTurnMs = turnDeadlineMs - (Date.now() - turnStartedAt);
    if (remainingTurnMs <= 0) {
      throw new Error('O turno do agente excedeu o tempo máximo permitido.');
    }

    const continuityInstructions = buildTurnContinuityInstructions(greetingOnly);
    const requestBody: Record<string, any> = {
      model: model || 'gpt-6-luna',
      instructions: `${systemInstructionText}\n\n${continuityInstructions}`,
      input,
      max_output_tokens: 2048,
      reasoning: { effort: 'low' },
    };

    if (openAiTools && openAiTools.length > 0) {
      requestBody.tools = openAiTools;
    }

    let reservationId: string | undefined;
    if (!toolContext.isSimulation) {
      const estimatedTokens = estimateTurnTokens(requestBody);
      const quota = await checkAndReserveAiQuota(supabase, 'openai', model, toolContext, estimatedTokens);
      if (quota.blockedResult) {
        return {
          text: quota.blockedResult.text,
          toolsCalled,
          reservationCommitted,
          handoffConfirmed: true,
          quotaBlockedResult: {
            ...quota.blockedResult,
            toolsCalled: [...toolsCalled, ...quota.blockedResult.toolsCalled],
          },
        };
      }
      reservationId = quota.reservationId;
    }

    const { data } = await callOpenAiResponsesApi({
      fetchOpenAi,
      apiKey,
      model,
      requestBody,
      remainingMs: remainingTurnMs,
      supabase,
      reservationId,
      isSimulation: Boolean(toolContext.isSimulation),
      turnStartedAt,
      turnDeadlineMs,
    });

    try {
      const audit = await auditAndRecordTurnUsage({
        supabase,
        usage: data.usage,
        reservationId,
        toolContext,
      });
      if (audit.reservationCommitted) {
        reservationCommitted = true;
      }
    } catch (auditError) {
      reservationCommitted = true;
      throw auditError;
    }

    const responseText = extractResponseText(data);
    if (responseText) aiResponseText = responseText.trim();

    const outputItems = Array.isArray(data.output) ? data.output : [];
    const toolCalls = outputItems.filter((item: any) => item?.type === 'function_call');
    if (toolCalls.length === 0) {
      break;
    }

    if (greetingOnly) {
      return {
        text: aiResponseText,
        toolsCalled,
        reservationCommitted,
      };
    }

    input.push(...outputItems);

    const roundExecution = await executeRoundToolCalls({
      toolCalls,
      supabase,
      toolContext,
      toolCallGuard,
      input,
      toolsCalled,
      nativeCatalogProducts,
      onToolExecuted,
    });

    if (roundExecution.handoffConfirmed) {
      handoffConfirmed = true;
      return {
        text: toolContext.isSimulation
          ? 'Vou pedir para um atendente te ajudar com isso.'
          : 'Atendimento encaminhado à equipe.',
        toolsCalled,
        reservationCommitted,
        handoffConfirmed,
      };
    }

    if (roundExecution.budgetExceeded) {
      return {
        text: '',
        toolsCalled,
        reservationCommitted,
      };
    }

    if (roundExecution.executedInRound === 0) {
      return {
        text: aiResponseText,
        toolsCalled,
        reservationCommitted,
      };
    }

    if (round === 3) {
      return { text: '', toolsCalled, reservationCommitted };
    }
  }

  return {
    text: aiResponseText,
    toolsCalled,
    reservationCommitted,
    ...(nativeCatalogProducts.size > 0 ? { nativeCatalogProducts: Array.from(nativeCatalogProducts.values()) } : {}),
  };
}
