import { GetProductSchema } from '../schemas/mcpSchemas.js';
import { mcpProductService } from '../services/mcpProductService.js';

export const getProductTool = {
  name: 'get_product',
  description:
    'Obtém os dados completos e oficiais de um produto do ERP: medidas, materiais, categoria, preço atual, preço anterior, parcelamento, oportunidade e variações.',
  inputSchema: GetProductSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
  async handler(params: unknown) {
    const input = GetProductSchema.parse(params);
    return await mcpProductService.getProductById(input.productId);
  },
};
