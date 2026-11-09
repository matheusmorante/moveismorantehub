import type { SupabaseClient } from '@supabase/supabase-js';
import { executeSafeTool, type SafeToolContext } from '../whatsappAiAgentTools.js';

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
  reservationId?: string;
}

export interface TurnExecutionResult {
  text: string;
  toolsCalled: string[];
  reservationCommitted: boolean;
}

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
    reservationId,
  } = options;

  const input: any[] = historyMessages.map((message) => ({
    role: message.role,
    content: [{ type: 'input_text', text: message.content }],
  }));

  const openAiTools =
    tools.length > 0
      ? tools.map((t) => ({
          type: 'function',
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        }))
      : undefined;

  const toolsCalled: string[] = [];
  let aiResponseText = '';
  let reservationCommitted = false;

  for (let round = 0; round < 4; round++) {
    const requestBody: Record<string, any> = {
      model: model || 'gpt-6-luna',
      instructions: systemInstructionText,
      input,
      max_output_tokens: 2048,
      reasoning: { effort: 'low' },
    };

    if (openAiTools && openAiTools.length > 0) {
      requestBody.tools = openAiTools;
    }

    const res = await fetchOpenAi('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

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

    const data = (await res.json()) as any;

    // Registro atômico de tokens e custos em BRL
    const usage = data.usage;
    const promptTokens = Number(usage?.input_tokens || 0);
    const completionTokens = Number(usage?.output_tokens || 0);
    const totalTokens = Number(usage?.total_tokens || 0) || (promptTokens + completionTokens);
    const cachedTokens = Number(usage?.input_tokens_details?.cached_tokens ?? 0);

    if (typeof supabase?.rpc === 'function') {
      reservationCommitted = true;
      await Promise.resolve()
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
        }))
        .catch(() => {});
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

    input.push(...outputItems);

    for (const call of toolCalls) {
      const fnName = call.name;
      let fnArgs: any = {};
      try {
        fnArgs = JSON.parse(call.arguments || '{}');
      } catch {
        fnArgs = {};
      }

      toolsCalled.push(fnName);
      const result = await executeSafeTool(supabase, fnName, fnArgs, toolContext);
      onToolExecuted?.(fnName, fnArgs, result);

      input.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify(result ?? {}),
      });
    }
  }

  return { text: aiResponseText, toolsCalled, reservationCommitted };
}
