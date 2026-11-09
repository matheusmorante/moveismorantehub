import type { WhatsAppAiAgentConfig } from '../../../settings/types.js';
import {
  DEFAULT_SITUATION_RULES,
  DEFAULT_KNOWLEDGE_ARTICLES,
  DEFAULT_WORKFLOWS,
  DEFAULT_WHATSAPP_AI_AGENT_PROMPT,
} from '../../../../../../../shared-utils/whatsappAiAgentSchemas.js';
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
import type { AiKnowledgeArticle, AiSituationRule, AiWorkflowConfig } from '../../../../../../../shared-utils/whatsappAiAgentSchemas.js';

export interface TurnContext {
  situation: AiSituationRule | null;
  matchedKeywords: string[];
  relevantArticles: readonly AiKnowledgeArticle[];
  activeWorkflow: AiWorkflowConfig | null;
  systemInstructionText: string;
}

/**
 * Monta o contexto cognitivo e de negócio para o turno da IA:
 * - Detecta situação e intenção do cliente
 * - Recupera artigos relevantes da base de conhecimento
 * - Determina fluxo de trabalho aplicável
 * - Compõe as instruções de sistema com prompts, diretrizes e regras
 */
export function buildTurnContext(
  userText: string,
  config: WhatsAppAiAgentConfig
): TurnContext {
  const situationRules =
    Array.isArray(config.situationRules) && config.situationRules.length > 0
      ? config.situationRules
      : DEFAULT_SITUATION_RULES;

  const { situation, matchedKeywords } = detectCustomerSituation(userText, situationRules);

  const knowledgeBase =
    Array.isArray(config.knowledgeBase) && config.knowledgeBase.length > 0
      ? config.knowledgeBase
      : DEFAULT_KNOWLEDGE_ARTICLES;

  const relevantArticles = retrieveRelevantKnowledge(
    userText,
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

  const baseInstruction = (config.systemPrompt || DEFAULT_WHATSAPP_AI_AGENT_PROMPT).trim();
  const knowledgeBlock = formatKnowledgeForPrompt(relevantArticles);
  const situationBlock = formatSituationDirectivesForPrompt(situation);
  const workflowBlock = formatWorkflowForPrompt(activeWorkflow);

  const systemInstructionText = [baseInstruction, knowledgeBlock, situationBlock, workflowBlock]
    .filter(Boolean)
    .join('\n\n');

  return {
    situation,
    matchedKeywords,
    relevantArticles,
    activeWorkflow,
    systemInstructionText,
  };
}
