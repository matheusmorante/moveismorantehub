import { SearchProductsSchema } from '../schemas/mcpSchemas.js';
import { mcpProductService } from '../services/mcpProductService.js';

export const searchProductsTool = {
  name: 'search_products',
  description:
    'Busca produtos reais cadastrados no MoranteHub por nome, código, slug ou ID aproximado. Retorna uma lista de identificação básica.',
  inputSchema: SearchProductsSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
  async handler(params: unknown) {
    const input = SearchProductsSchema.parse(params);
    const products = await mcpProductService.searchProducts(input.query, input.limit);
    return {
      products,
      totalFound: products.length,
    };
  },
};
