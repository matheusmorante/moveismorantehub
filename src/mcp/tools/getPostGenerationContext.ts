import { GetPostGenerationContextSchema } from '../schemas/mcpSchemas.js';
import { mcpPostContextService } from '../services/mcpPostContextService.js';

export const getPostGenerationContextTool = {
  name: 'get_post_generation_context',
  description:
    'TOOL PRINCIPAL: Retorna todo o contexto consolidado necessário para geração de post por IA em uma única chamada: dados completos do produto, variações, imagens oficiais separadas por papel (primária, visão interna, miniaturas de cores), campanha, prompts dos elementos, assets oficiais da marca e referências visuais.',
  inputSchema: GetPostGenerationContextSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
  async handler(params: unknown) {
    const input = GetPostGenerationContextSchema.parse(params);
    return await mcpPostContextService.getPostGenerationContext({
      productId: input.productId,
      campaign: input.campaign,
      campaignId: input.campaignId,
      format: input.format,
      variationId: input.variationId,
    });
  },
};
