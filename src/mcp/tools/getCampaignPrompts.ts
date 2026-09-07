import { GetCampaignPromptsSchema } from '../schemas/mcpSchemas.js';
import { mcpCampaignService } from '../services/mcpCampaignService.js';

export const getCampaignPromptsTool = {
  name: 'get_campaign_prompts',
  description:
    'Obtém a lista de prompts específicos de cada elemento da campanha (TITLE, PRICE, INSTALLMENT, OPEN_VIEW, VARIATION_GALLERY, CTA, BADGE) armazenados no ERP.',
  inputSchema: GetCampaignPromptsSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
  async handler(params: unknown) {
    const input = GetCampaignPromptsSchema.parse(params);
    let campaignId = input.campaignId;

    if (!campaignId && input.campaignName) {
      const camp = await mcpCampaignService.getCampaignByIdOrName(input.campaignName);
      campaignId = camp.id;
    }

    const effectiveId = campaignId || '00000000-0000-4000-8000-000000000001';
    const prompts = await mcpCampaignService.getCampaignPrompts(effectiveId);
    const globalRule = await mcpCampaignService.getGlobalGuidelines();

    return {
      campaignId: effectiveId,
      generalGuidelines: globalRule,
      elements: prompts,
    };
  },
};
