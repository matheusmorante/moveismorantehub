import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppAiAgentConfig } from '../../../settings/types.js';
import type { WhatsAppAiAgentDependencies } from '../whatsappAiAgentTypes.js';
import { enforceMandatoryPhrases } from '../whatsappAiRuleEngine.js';
import { runAiTurnWithFallback } from '../whatsappAiModelRunner.js';
import { buildAiFailureHandoffReason, recordHandoffToHuman } from '../tools/handoffService.js';
import type {
  SimulationTurnResult,
  SimulationHistoryTurn,
  SimulationToolCallRecord,
} from './simulatorTypes.js';
import { buildSimulatorContext } from './simulatorContext.js';

export async function simulateWhatsAppAiTurn(
  supabase: SupabaseClient,
  userQuery: string,
  config: WhatsAppAiAgentConfig,
  settings?: any,
  dependencies: WhatsAppAiAgentDependencies = {},
  history: SimulationHistoryTurn[] = []
): Promise<SimulationTurnResult> {
  const startTime = Date.now();
  try {
  const fetchOpenAi = dependencies.fetchOpenAi;

  const {
    situation,
    matchedKeywords,
    relevantArticles,
    activeWorkflow,
    activeToolDeclarations,
    systemInstructionText,
    historyForOpenAi,
  } = buildSimulatorContext(userQuery, config, history);

  if (!fetchOpenAi) throw new Error('O simulador precisa usar o proxy autenticado da OpenAI.');

  const targetModel = 'gpt-6-luna';

  const toolsCalled: SimulationToolCallRecord[] = [];

  const modelResult = await runAiTurnWithFallback({
    modelToUse: targetModel,
    // O proxy no servidor injeta a chave real; este marcador nunca é enviado
    // à OpenAI porque o fetch abaixo substitui a chamada externa.
    openAiApiKey: 'server-managed',
    fetchOpenAi,
    systemInstructionText,
    historyForOpenAi,
    toolsDeclarations: activeToolDeclarations,
    supabase,
    toolContext: {
      conversationId: 'simulated_test_chat',
      contactPhone: '5541999998888',
      settings,
      isSimulation: true,
    },
    onToolExecuted: (name, args, result) => {
      toolsCalled.push({ name, args, result });
    },
  });

  if (!modelResult.handoffConfirmed && !modelResult.text?.trim()) {
    throw new Error('O modelo não gerou uma resposta após consultar as informações disponíveis.');
  }

  const enforced = modelResult.handoffConfirmed
    ? { text: '', enforcedPhrases: [] as string[] }
    : enforceMandatoryPhrases(modelResult.text, situation?.mandatoryPhrases || [], userQuery);

  return {
    executed: true,
    userQuery,
    situation: situation
      ? {
          key: situation.situationKey,
          name: situation.name,
          action: situation.action,
          priority: situation.priority,
        }
      : null,
    matchedKeywords,
    articlesUsed: relevantArticles.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      priority: a.priority,
    })),
    workflowApplied: activeWorkflow?.workflowKey || null,
    toolsCalled,
    mandatoryPhrasesEnforced: enforced.enforcedPhrases,
    aiResponseText: modelResult.handoffConfirmed ? '' : enforced.text,
    executionTimeMs: Date.now() - startTime,
    nativeCatalogProducts: modelResult.handoffConfirmed ? undefined : modelResult.nativeCatalogProducts,
  };
  } catch (error) {
    const reason = buildAiFailureHandoffReason(error, 'simulação do atendimento');
    const args = { motivo: reason, silencioso: true };
    const handoffResult = await recordHandoffToHuman(supabase, {
      conversationId: 'simulated_test_chat',
      reason,
      isSilent: true,
      isSimulation: true,
    });

    return {
      executed: handoffResult.success,
      userQuery,
      situation: null,
      matchedKeywords: [],
      articlesUsed: [],
      workflowApplied: null,
      toolsCalled: [{ name: 'encaminharParaAtendimentoHumano', args, result: handoffResult }],
      mandatoryPhrasesEnforced: [],
      aiResponseText: '',
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/** Cria o transporte autenticado do simulador; a chave OpenAI fica no servidor. */
export function createSimulatorOpenAiFetch(supabase: SupabaseClient): typeof fetch {
  return async (_input, init = {}) => {
    const { data, error } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (error || !accessToken) {
      return new Response(JSON.stringify({ error: 'Sessão inválida. Entre novamente.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let request: unknown;
    try {
      request = JSON.parse(String(init.body || '{}'));
    } catch {
      return new Response(JSON.stringify({ error: 'Solicitação do simulador inválida.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return fetch('/api/openai-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'responses',
        request,
        moduleSource: 'whatsapp_ai_simulator',
      }),
      signal: init.signal,
    });
  };
}
