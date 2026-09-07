import { GetCampaignSchema } from '../schemas/mcpSchemas.js';
import { mcpCampaignService } from '../services/mcpCampaignService.js';

export const getCampaignTool = {
  name: 'get_campaign',
  description:
    'Obtém as configurações, diretrizes gerais e prompts dos elementos configurados em uma campanha/modelo de post do MoranteHub.',
  inputSchema: GetCampaignSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
  async handler(params: unknown) {
    const input = GetCampaignSchema.parse(params);
    const target = input.campaignId || input.campaign || 'Campanha Padrão';
    return await mcpCampaignService.getCampaignByIdOrName(target);
  },
};
