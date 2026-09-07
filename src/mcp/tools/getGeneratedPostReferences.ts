import { GetGeneratedPostReferencesSchema } from '../schemas/mcpSchemas.js';
import { mcpCampaignService } from '../services/mcpCampaignService.js';

export const getGeneratedPostReferencesTool = {
  name: 'get_generated_post_references',
  description:
    'Obtém artes geradas anteriormente para o produto no MoranteHub. Estas imagens são estritamente REFERÊNCIAS VISUAIS para direção de arte e estilo, nunca substituindo as fotos oficiais do produto.',
  inputSchema: GetGeneratedPostReferencesSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
  async handler(params: unknown) {
    const input = GetGeneratedPostReferencesSchema.parse(params);
    const references = await mcpCampaignService.getGeneratedPostReferences(
      input.productId,
      input.campaignId,
      input.limit,
    );
    return {
      productId: input.productId,
      references,
      totalFound: references.length,
      warning: 'Imagens geradas anteriormente servem exclusivamente para referência visual de iluminação/layout.',
    };
  },
};
