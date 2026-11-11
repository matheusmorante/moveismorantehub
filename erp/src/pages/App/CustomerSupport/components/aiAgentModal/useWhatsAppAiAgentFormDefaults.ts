import {
  DEFAULT_WHATSAPP_AI_AGENT_PROMPT,
  DEFAULT_KNOWLEDGE_ARTICLES,
  DEFAULT_SITUATION_RULES,
  DEFAULT_WORKFLOWS,
  WHATSAPP_SAFE_TOOLS,
  type WhatsAppAiAgentFormData,
} from '../../../../../../../shared-utils/whatsappAiAgentSchemas';
import type { AppSettings } from '@/pages/utils/settings/types';

type WhatsAppAiAgentConfig = AppSettings['whatsappAiAgent'];

export function buildDefaultAiAgentFormValues(
  config?: WhatsAppAiAgentConfig
): WhatsAppAiAgentFormData {
  return {
    enabled: config?.enabled ?? false,
    testMode: true,
    testPhoneNumbers: config?.testPhoneNumbers ? [...config.testPhoneNumbers] : [],
    supportMode: config?.supportMode ?? 'automatico',
    provider: 'openai',
    model: 'gpt-6-luna',
    systemPrompt: config?.systemPrompt || DEFAULT_WHATSAPP_AI_AGENT_PROMPT,
    enabledTools: config?.enabledTools
      ? [...config.enabledTools]
      : WHATSAPP_SAFE_TOOLS.map((t) => t.id),
    knowledgeBase: config?.knowledgeBase?.length
      ? [...config.knowledgeBase]
      : [...DEFAULT_KNOWLEDGE_ARTICLES],
    situationRules: (config?.situationRules?.length
      ? config.situationRules
      : DEFAULT_SITUATION_RULES).map((rule) => ({ ...rule, description: rule.description ?? '' })),
    workflows: (config?.workflows?.length
      ? config.workflows
      : DEFAULT_WORKFLOWS).map((workflow) => ({
        ...workflow,
        description: workflow.description ?? '',
        handoffTrigger: workflow.handoffTrigger ?? false,
      })),
  };
}
