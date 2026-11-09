import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppAiAgentConfig } from '../../../settings/types.js';
import type { WhatsAppAiAgentDependencies } from '../whatsappAiAgentTypes.js';
import { enforceMandatoryPhrases } from '../whatsappAiRuleEngine.js';
import { runAiTurnWithFallback } from '../whatsappAiModelRunner.js';
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
  const fetchOpenAi = dependencies.fetchOpenAi || ((input, init) => globalThis.fetch(input, init));
  const openAiApiKey = dependencies.openAiApiKey || process.env.OPENAI_API_KEY?.trim() || '';

  const {
    situation,
    matchedKeywords,
    relevantArticles,
    activeWorkflow,
    activeToolDeclarations,
    systemInstructionText,
    historyForOpenAi,
  } = buildSimulatorContext(userQuery, config, history);

  if (!openAiApiKey) {
    const samplePreview = `[Simulação sem chave de API] Olá! Sou o Seu Lizandro da Móveis Morante. Identifiquei que você perguntou sobre "${
      matchedKeywords.join(', ') || situation?.name || 'móveis'
    }".`;
    const { text: validatedResponseText, enforcedPhrases } = enforceMandatoryPhrases(
      samplePreview,
      situation?.mandatoryPhrases || [],
      userQuery
    );

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
      toolsCalled: [],
      mandatoryPhrasesEnforced: enforcedPhrases,
      aiResponseText: validatedResponseText,
      executionTimeMs: Date.now() - startTime,
    };
  }

  const targetModel = 'gpt-6-luna';

  const toolsCalled: SimulationToolCallRecord[] = [];

  const modelResult = await runAiTurnWithFallback({
    modelToUse: targetModel,
    openAiApiKey,
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

  const aiResponseText = modelResult.text;

  const { text: validatedResponseText, enforcedPhrases } = enforceMandatoryPhrases(
    aiResponseText || 'Não foi possível gerar a resposta no momento.',
    situation?.mandatoryPhrases || [],
    userQuery
  );

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
    mandatoryPhrasesEnforced: enforcedPhrases,
    aiResponseText: validatedResponseText,
    executionTimeMs: Date.now() - startTime,
  };
}
