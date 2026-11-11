import type { SupabaseClient } from '@supabase/supabase-js';
import { executeSafeTool, type SafeToolContext } from '../whatsappAiAgentTools.js';
import { createAgentToolCallGuard } from '../../../../../../../shared-utils/agentToolCallGuard.js';
import { checkAndReserveAiQuota, releaseAiQuotaReservation } from './quotaReservationGuard.js';
import type { RunAiTurnResult } from './modelTurnTypes.js';

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
}

const normalizeGreeting = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[!?.;,]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const isGreetingOnly = (value: string): boolean =>
  /^(oi|ola|bom dia|boa tarde|boa noite|e ai|tudo bem)$/.test(normalizeGreeting(value));

const safeToolOutput = (result: any): Record<string, any> => {
  if (!result || result.success !== false) return result || {};
  const code = String(result.code || '');
  if (
    ['PRODUCT_NOT_FOUND', 'AMBIGUOUS_IDENTIFIER', 'INVALID_IDENTIFIER', 'SEARCH_TOO_BROAD'].includes(code)
  ) {
    return {
      success: false,
      code,
      message: result.erro || result.error || 'Não encontrei uma correspondência exata no catálogo.',
    };
  }
  if (code === 'PERMISSION_DENIED') {
    return { success: false, code, message: 'Não tenho autorização para consultar esses dados.' };
  }
  return {
    success: false,
    code: 'TEMPORARY_FAILURE',
    message: 'Não consegui consultar essas informações agora. Tente novamente mais tarde ou posso encaminhar para a equipe.',
  };
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
    content: [{ type: 'input_text', text: message.content }],
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
  const turnStartedAt = Date.now();
  const turnDeadlineMs = 45_000;

  for (let round = 0; round < 4; round++) {
    const remainingTurnMs = turnDeadlineMs - (Date.now() - turnStartedAt);
    if (remainingTurnMs <= 0) {
      throw new Error('O turno do agente excedeu o tempo máximo permitido.');
    }
    const continuityInstructions = [
      'Responda ao cliente com naturalidade. Não mencione códigos de erro, detalhes internos, banco de dados, ferramentas ou limites técnicos.',
      'Ao buscar produtos, apresente apenas correspondências do tipo, finalidade e modelo pedidos. Se não houver correspondência exata, diga isso claramente e pergunte se o cliente aceita alternativas; nunca apresente um produto incompatível como equivalente.',
      greetingOnly
        ? 'A última mensagem do cliente é apenas uma saudação. Cumprimente de volta e, se houver um assunto recente pendente, pergunte com naturalidade se ele ainda quer ajuda com esse assunto. Não repita produto ou erro e não use ferramentas.'
        : '',
    ].filter(Boolean).join('\n');
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

    const estimatedTokens = new TextEncoder().encode(JSON.stringify(requestBody)).length * 2 + 3072;
    let res: Response | undefined;
    let reservationId: string | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const remainingMs = turnDeadlineMs - (Date.now() - turnStartedAt);
      if (remainingMs <= 0) throw new Error('O turno do agente excedeu o tempo máximo permitido.');
      if (!toolContext.isSimulation) {
        const quota = await checkAndReserveAiQuota(supabase, 'openai', model, toolContext, estimatedTokens);
        if (quota.blockedResult) {
          return { text: quota.blockedResult.text, toolsCalled, reservationCommitted, handoffConfirmed: true,
            quotaBlockedResult: { ...quota.blockedResult, toolsCalled: [...toolsCalled, ...quota.blockedResult.toolsCalled] } };
        }
        reservationId = quota.reservationId;
      }
      const controller = new AbortController();
      const timeoutMs = Math.max(1, Math.min(15_000, remainingMs));
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        res = await fetchOpenAi('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } catch (requestError) {
        clearTimeout(timeout);
        (requestError as any).preserveQuotaReservation = true;
        throw requestError;
      }
      clearTimeout(timeout);

      if (!res.ok && res.status < 500 && !toolContext.isSimulation) {
        await releaseAiQuotaReservation(supabase, reservationId);
      }

      // A requisição de modelo ainda não executou ferramentas. Repetir uma vez
      // apenas em indisponibilidade transitória 502/503 é seguro antes do despacho externo.
      if (attempt === 0 && [502, 503].includes(res.status)) {
        await res.body?.cancel().catch(() => {});
        if (Date.now() - turnStartedAt < turnDeadlineMs - 1_000) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }
      }
      break;
    }

    if (!res) throw new Error('A OpenAI não retornou uma resposta.');

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as any;
      const errMsg = errBody?.error?.message || `HTTP ${res.status}`;
      const errCode = errBody?.error?.code;
      const err = new Error(`OpenAI (${model}) error: ${errMsg}${errCode ? ` [${errCode}]` : ''}`);
      (err as any).statusCode = res.status;
      (err as any).code = errCode;
      (err as any).errorBody = errBody;
      throw err;
    }

    let data: any;
    try {
      data = await res.json();
    } catch (responseError) {
      (responseError as any).preserveQuotaReservation = true;
      throw responseError;
    }

    // Registro atômico de tokens e custos em BRL
    const usage = data.usage;
    if (!toolContext.isSimulation && (!Number.isFinite(usage?.input_tokens) || !Number.isFinite(usage?.output_tokens)
      || usage.input_tokens < 0 || usage.output_tokens < 0)) {
      throw new Error('A OpenAI não informou o consumo necessário para registrar a chamada.');
    }
    const promptTokens = Number(usage?.input_tokens || 0);
    const completionTokens = Number(usage?.output_tokens || 0);
    const totalTokens = Number(usage?.total_tokens || 0) || (promptTokens + completionTokens);
    const cachedTokens = Number(usage?.input_tokens_details?.cached_tokens ?? 0);

    if (typeof supabase?.rpc === 'function' && !toolContext.isSimulation) {
      const { data: usageRecord, error: usageError } = await Promise.resolve()
        .then(() => supabase.rpc('record_ai_token_usage', {
          p_provider: 'openai',
          p_service: 'whatsapp_ai_agent',
          p_operation: 'responses',
          p_prompt_tokens: promptTokens,
          p_completion_tokens: completionTokens,
          p_total_tokens: totalTokens,
          p_module_source: 'customer_support',
          p_environment: 'production',
          p_status: 'SUCCESS',
          p_reservation_id: reservationId || null,
          p_cached_tokens: cachedTokens,
        }));
      if (usageError || !usageRecord?.log_id || usageRecord.reservation_committed !== true) {
        // Preserve a reserva pendente; a geração já teve custo mesmo sem a
        // confirmação do registro contábil. Não envie uma resposta sem auditoria.
        reservationCommitted = true;
        const usageRecordError: any = new Error('A utilização da IA não pôde ser registrada.');
        usageRecordError.preserveQuotaReservation = true;
        throw usageRecordError;
      }
      reservationCommitted = true;
    }

    const outputItems = Array.isArray(data.output) ? data.output : [];
    const responseText = typeof data.output_text === 'string'
      ? data.output_text
      : outputItems
          .filter((item: any) => item?.type === 'message')
          .flatMap((item: any) => item?.content || [])
          .filter((content: any) => content?.type === 'output_text' && typeof content.text === 'string')
          .map((content: any) => content.text)
          .join('');
    if (responseText) aiResponseText = responseText.trim();

    const toolCalls = outputItems.filter((item: any) => item?.type === 'function_call');
    if (toolCalls.length === 0) {
      break;
    }

    if (greetingOnly) {
      return {
        text: aiResponseText || 'Oi! Você ainda quer ajuda com o que estava procurando?',
        toolsCalled,
        reservationCommitted,
      };
    }

    input.push(...outputItems);
    let executedInRound = 0;
    let budgetExceeded = false;

    for (const call of toolCalls) {
      const fnName = call.name;
      let fnArgs: any = {};
      try {
        fnArgs = JSON.parse(call.arguments || '{}');
      } catch {
        fnArgs = {};
      }

      toolsCalled.push(fnName);
      const guarded = await toolCallGuard.run(fnName, fnArgs, async () => {
        const isHandoff = fnName === 'encaminharParaAtendimentoHumano' || fnName === 'calcularFreteOuDistancia';
        let result: any;
        try {
          result = await executeSafeTool(supabase, fnName, fnArgs, toolContext);
        } catch {
          if (isHandoff) throw new Error('A transferência humana não pôde ser confirmada.');
          return safeToolOutput({ success: false, code: 'TEMPORARY_FAILURE' });
        }
        if (isHandoff) {
          const confirmed = fnName === 'calcularFreteOuDistancia' ? result?.silentHandoff === true : result?.success === true;
          if (!confirmed) throw new Error('A transferência humana não pôde ser confirmada.');
          handoffConfirmed = true;
        }
        return safeToolOutput(result);
      });
      if (guarded.status === 'limit') {
        budgetExceeded = true;
        input.push({
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify({
            success: false,
            code: 'TOOL_CALL_LIMIT',
            message: 'A consulta excedeu o número seguro de chamadas nesta mensagem.',
          }),
        });
        continue;
      }
      const result = guarded.value || {};
      if (guarded.status === 'executed') {
        executedInRound += 1;
        onToolExecuted?.(fnName, fnArgs, result);
      }

      input.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify(result ?? {}),
      });
    }

    if (handoffConfirmed) {
      return { text: 'Atendimento encaminhado à equipe.', toolsCalled, reservationCommitted, handoffConfirmed };
    }
    if (budgetExceeded) {
      return {
        text: 'Não consegui concluir essa consulta agora. Tente pedir uma informação mais específica ou posso encaminhar para nossa equipe.',
        toolsCalled,
        reservationCommitted,
      };
    }
    if (executedInRound === 0) {
      return {
        text:
          aiResponseText ||
          'Já consultei essas mesmas informações nesta mensagem. Se ainda precisar, diga qual detalhe quer verificar.',
        toolsCalled,
        reservationCommitted,
      };
    }
  }

  return { text: aiResponseText, toolsCalled, reservationCommitted };
}
