import { BuildPostPromptContextSchema } from '../schemas/mcpSchemas.js';
import { mcpPostContextService } from '../services/mcpPostContextService.js';

export const buildPostPromptContextTool = {
  name: 'build_post_prompt_context',
  description:
    'Monta um briefing estruturado pronto com todo o contexto técnico, links de imagens e a lista de restrições invioláveis (hardConstraints) para que o assistente de IA construa o prompt de imagem final sem ambiguidades.',
  inputSchema: BuildPostPromptContextSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
  async handler(params: unknown) {
    const input = BuildPostPromptContextSchema.parse(params);
    return await mcpPostContextService.buildPostPromptContext({
      productId: input.productId,
      campaign: input.campaign,
      campaignId: input.campaignId,
      format: input.format,
      variationId: input.variationId,
    });
  },
};
