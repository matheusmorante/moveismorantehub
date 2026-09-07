import { GetStoreAssetsSchema } from '../schemas/mcpSchemas.js';
import { mcpAssetService } from '../services/mcpAssetService.js';

export const getStoreAssetsTool = {
  name: 'get_store_assets',
  description:
    'Obtém os assets gráficos oficiais da marca Móveis Morante (Logo oficial, Selo Queima dos Salvados, Selos de Oportunidade) com URLs diretas e instruções estritas de não recriação.',
  inputSchema: GetStoreAssetsSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
  async handler(params: unknown) {
    const input = GetStoreAssetsSchema.parse(params);
    const assets = await mcpAssetService.getStoreAssets(input.category);
    return {
      assets,
      totalAssets: assets.length,
    };
  },
};
