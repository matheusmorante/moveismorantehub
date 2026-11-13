import type { SupabaseClient } from '@supabase/supabase-js';
import { executeSafeTool, type SafeToolContext } from '../whatsappAiAgentTools.js';
import { buildAiFailureHandoffReason } from '../tools/handoffService.js';
import type { AgentToolCallGuard } from '../../../../../../../shared-utils/agentToolCallGuard.js';
import type { WhatsAppNativeCatalogProduct } from '../whatsappAiAgentTypes.js';

export const safeToolOutput = (result: any): Record<string, any> => {
  if (!result || result.success !== false) return result || {};
  const code = String(result.code || '');
  if (
    ['PRODUCT_NOT_FOUND', 'AMBIGUOUS_IDENTIFIER', 'INVALID_IDENTIFIER', 'SEARCH_TOO_BROAD'].includes(code)
  ) {
    return {
      success: false,
      code,
      message: result.erro || result.error || 'Não encontrei uma correspondência exata.',
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

export interface ExecuteToolCallsParams {
  toolCalls: any[];
  supabase: SupabaseClient;
  toolContext: SafeToolContext;
  toolCallGuard: AgentToolCallGuard;
  input: any[];
  toolsCalled: string[];
  nativeCatalogProducts: Map<string, WhatsAppNativeCatalogProduct>;
  onToolExecuted?: (name: string, args: any, result: any) => void;
}

export interface ExecuteToolCallsResult {
  executedInRound: number;
  budgetExceeded: boolean;
  handoffConfirmed: boolean;
}

export async function executeRoundToolCalls({
  toolCalls,
  supabase,
  toolContext,
  toolCallGuard,
  input,
  toolsCalled,
  nativeCatalogProducts,
  onToolExecuted,
}: ExecuteToolCallsParams): Promise<ExecuteToolCallsResult> {
  let executedInRound = 0;
  let budgetExceeded = false;
  let handoffConfirmed = false;

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

      if (fnName === 'buscarProdutos' && Array.isArray(result?.__nativeCatalogProducts)) {
        result.__nativeCatalogProducts.forEach((product: any) => {
          const retailerId = typeof product?.retailerId === 'string' ? product.retailerId.trim() : '';
          const name = typeof product?.name === 'string' ? product.name.trim() : '';
          if (retailerId && name) nativeCatalogProducts.set(retailerId, { retailerId, name });
        });
        const { __nativeCatalogProducts: _privateCatalogProducts, ...modelResult } = result;
        result = modelResult;
      }

      if (fnName === 'buscarProdutos' && result?.success === true && Number(result.total) === 0) {
        const handoffArgs = {
          motivo: buildAiFailureHandoffReason(
            new Error([
              'a busca não encontrou produtos correspondentes',
              fnArgs.categoria ? `na categoria ${String(fnArgs.categoria).slice(0, 80)}` : '',
              fnArgs.termo ? `para o termo ${String(fnArgs.termo).slice(0, 100)}` : '',
            ].filter(Boolean).join(' ')),
            'consulta de produtos'
          ),
          silencioso: true,
        };
        const handoff = await toolCallGuard.run('encaminharParaAtendimentoHumano', handoffArgs,
          () => executeSafeTool(supabase, 'encaminharParaAtendimentoHumano', handoffArgs, toolContext));
        if (handoff.status === 'limit' || handoff.value?.success !== true) {
          throw new Error('A transferência humana não pôde ser confirmada.');
        }
        handoffConfirmed = true;
        toolsCalled.push('encaminharParaAtendimentoHumano');
        onToolExecuted?.('encaminharParaAtendimentoHumano', handoffArgs, handoff.value);
      }

      if (isHandoff) {
        const confirmed = fnName === 'calcularFreteOuDistancia'
          ? result?.silentHandoff === true
          : result?.success === true;
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

    if (handoffConfirmed) {
      return { executedInRound, budgetExceeded, handoffConfirmed };
    }

    if (result?.success === false) {
      const detail = result?.erro || result?.error || result?.message || result?.code || 'falha sem detalhe';
      const handoffArgs = {
        motivo: buildAiFailureHandoffReason(new Error(String(detail)), `consulta pela ferramenta ${fnName}`),
        silencioso: true,
      };
      const handoffResult = await executeSafeTool(
        supabase,
        'encaminharParaAtendimentoHumano',
        handoffArgs,
        toolContext
      );
      if (handoffResult?.success !== true) {
        throw new Error('A transferência humana não pôde ser confirmada.');
      }
      toolsCalled.push('encaminharParaAtendimentoHumano');
      onToolExecuted?.('encaminharParaAtendimentoHumano', handoffArgs, handoffResult);
      return { executedInRound, budgetExceeded, handoffConfirmed: true };
    }

    input.push({
      type: 'function_call_output',
      call_id: call.call_id,
      output: JSON.stringify(result ?? {}),
    });
  }

  return { executedInRound, budgetExceeded, handoffConfirmed };
}
