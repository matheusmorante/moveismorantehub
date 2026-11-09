import type { WhatsAppAiAgentConfig } from '../../../settings/types.js';
import {
  DEFAULT_WHATSAPP_AI_AGENT_PROMPT,
  DEFAULT_KNOWLEDGE_ARTICLES,
  DEFAULT_SITUATION_RULES,
  DEFAULT_WORKFLOWS,
} from '../../../../../../../shared-utils/whatsappAiAgentSchemas.js';
import { whatsappAgentToolDeclarations } from '../whatsappAiAgentTools.js';
import {
  detectCustomerSituation,
  formatSituationDirectivesForPrompt,
} from '../whatsappAiRuleEngine.js';
import {
  retrieveRelevantKnowledge,
  formatKnowledgeForPrompt,
} from '../whatsappAiKnowledgeService.js';
import {
  findApplicableWorkflow,
  formatWorkflowForPrompt,
} from '../whatsappAiWorkflowEngine.js';
import type { SimulationHistoryTurn } from './simulatorTypes.js';

export function buildSimulatorContext(
  userQuery: string,
  config: WhatsAppAiAgentConfig,
  history: SimulationHistoryTurn[] = []
) {
  const situationRules =
    Array.isArray(config.situationRules) && config.situationRules.length > 0
      ? config.situationRules
      : DEFAULT_SITUATION_RULES;

  const { situation, matchedKeywords } = detectCustomerSituation(userQuery, situationRules);

  const knowledgeBase =
    Array.isArray(config.knowledgeBase) && config.knowledgeBase.length > 0
      ? config.knowledgeBase
      : DEFAULT_KNOWLEDGE_ARTICLES;

  const relevantArticles = retrieveRelevantKnowledge(
    userQuery,
    situation?.situationKey || null,
    knowledgeBase,
    3
  );

  const workflows =
    Array.isArray(config.workflows) && config.workflows.length > 0
      ? config.workflows
      : DEFAULT_WORKFLOWS;

  const activeWorkflow = findApplicableWorkflow(
    situation?.situationKey || null,
    workflows
  );

  const allowedToolIds = new Set(config.enabledTools || []);
  const activeToolDeclarations = whatsappAgentToolDeclarations.filter((tool) =>
    allowedToolIds.has(tool.name)
  );

  const toolsPayload =
    activeToolDeclarations.length > 0
      ? [
          {
            functionDeclarations: activeToolDeclarations,
          },
        ]
      : undefined;

  const baseInstruction = (config.systemPrompt || DEFAULT_WHATSAPP_AI_AGENT_PROMPT).trim();
  const knowledgeBlock = formatKnowledgeForPrompt(relevantArticles);
  const situationBlock = formatSituationDirectivesForPrompt(situation);
  const workflowBlock = formatWorkflowForPrompt(activeWorkflow);

  const systemInstructionText = [baseInstruction, knowledgeBlock, situationBlock, workflowBlock]
    .filter(Boolean)
    .join('\n\n');

  let currentContents: any[] = [];
  if (Array.isArray(history) && history.length > 0) {
    currentContents = history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    }));
  }

  if (
    currentContents.length === 0 ||
    currentContents[currentContents.length - 1].role !== 'user' ||
    currentContents[currentContents.length - 1].parts?.[0]?.text !== userQuery
  ) {
    currentContents.push({
      role: 'user',
      parts: [{ text: userQuery }],
    });
  }

  const historyForOpenAi: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (Array.isArray(history)) {
    for (const item of history) {
      historyForOpenAi.push({
        role: item.role === 'model' ? 'assistant' : 'user',
        content: item.text,
      });
    }
  }
  if (
    historyForOpenAi.length === 0 ||
    historyForOpenAi[historyForOpenAi.length - 1].content !== userQuery
  ) {
    historyForOpenAi.push({ role: 'user', content: userQuery });
  }

  return {
    situation,
    matchedKeywords,
    relevantArticles,
    activeWorkflow,
    activeToolDeclarations,
    toolsPayload,
    systemInstructionText,
    currentContents,
    historyForOpenAi,
  };
}
