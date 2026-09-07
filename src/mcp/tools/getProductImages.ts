import { GetProductImagesSchema } from '../schemas/mcpSchemas.js';
import { mcpProductService } from '../services/mcpProductService.js';

export const getProductImagesTool = {
  name: 'get_product_images',
  description:
    'Obtém as imagens oficiais em alta definição de cada variação do produto com metadados detalhados (primária, visão interna/secundária, miniatura de cores). As imagens oficiais são a fonte visual de verdade.',
  inputSchema: GetProductImagesSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
  async handler(params: unknown) {
    const input = GetProductImagesSchema.parse(params);
    const images = await mcpProductService.getProductImages(input.productId, input.variationId);
    return {
      productId: input.productId,
      images,
      totalImages: images.length,
      note: 'As fotos oficiais são a fonte visual de verdade. Nunca recrie o produto.',
    };
  },
};
