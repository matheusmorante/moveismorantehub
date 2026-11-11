import { describe, expect, it } from 'vitest';
import type { WhatsAppAiAgentConfig } from '@/pages/utils/settings/types';
import { WHATSAPP_SAFE_TOOLS } from '../../../../../../../shared-utils/whatsappAiAgentSchemas';
import { buildDefaultAiAgentFormValues } from './useWhatsAppAiAgentFormDefaults';

describe('configuração carregada para o teste do agente', () => {
  it('preserva ferramentas vazias e completa campos opcionais legados', () => {
    const config: WhatsAppAiAgentConfig = {
      enabled: false,
      testMode: true,
      testPhoneNumbers: [],
      enabledTools: [],
      situationRules: [{
        id: 'rule', situationKey: 'duvida', name: 'Dúvida', triggerKeywords: [],
        mandatoryPhrases: [], preferentialPhrases: [], action: 'reply', priority: 5, enabled: true,
      }],
      workflows: [{ id: 'flow', workflowKey: 'flow', name: 'Fluxo', enabled: true, steps: [] }],
    };

    const result = buildDefaultAiAgentFormValues(config);
    expect(result.enabledTools).toEqual([]);
    expect(result.situationRules[0].description).toBe('');
    expect(result.workflows[0]).toMatchObject({ description: '', handoffTrigger: false });
    expect(config.situationRules?.[0].description).toBeUndefined();
    expect(config.workflows?.[0].handoffTrigger).toBeUndefined();
  });

  it('usa as ferramentas padrão quando não existe configuração', () => {
    expect(buildDefaultAiAgentFormValues().enabledTools).toEqual(WHATSAPP_SAFE_TOOLS.map((tool) => tool.id));
  });
});
