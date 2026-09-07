import { McpStoreAsset } from '../types/mcp.js';
import { mcpSupabase } from './mcpProductService.js';

export const OFFICIAL_STORE_ASSETS: McpStoreAsset[] = [
  {
    id: 'asset-logo-morante',
    name: 'Logo Oficial Móveis Morante',
    kind: 'asset',
    category: 'logo',
    url: 'https://www.moveismorante.com.br/logo-morante.png',
    mimeType: 'image/png',
    strictInstructions:
      'REGRA INVIOLÁVEL: Arquivo gráfico oficial da marca. É PROIBIDO redesenhar, recriar, trocar tipografia ou alterar cores. Utilizar exatamente este arquivo no rodapé/topo.',
  },
  {
    id: 'asset-badge-queima-salvados',
    name: 'Selo Oficial Queima dos Salvados',
    kind: 'asset',
    category: 'badge',
    url: 'https://hkoxhourxwlddgsfdgws.supabase.co/storage/v1/object/public/products/marketing/seals/9d8bedae-b366-4f8c-ac49-74b85b882bde-1787790409290.png',
    mimeType: 'image/png',
    strictInstructions:
      'REGRA INVIOLÁVEL: Selo oficial da Queima dos Salvados em alta resolução. Nunca aproximar nem redesenhar as chamas ou textos.',
  },
];

export class McpAssetService {
  /**
   * Obtém todos os assets oficiais da loja e campanhas.
   */
  async getStoreAssets(category?: 'logo' | 'badge' | 'installment' | 'seal' | 'other'): Promise<McpStoreAsset[]> {
    const assets = [...OFFICIAL_STORE_ASSETS];

    // Busca assets adicionais cadastrados no módulo de marketing do Supabase se houver
    try {
      const { data } = await mcpSupabase
        .from('post_creator_element_models')
        .select('*')
        .not('generated_asset_url', 'is', null);

      if (data) {
        data.forEach((row: any) => {
          if (row.generated_asset_url && !assets.some(a => a.url === row.generated_asset_url)) {
            assets.push({
              id: `asset-model-${row.id}`,
              name: row.name || 'Asset de Campanha',
              kind: 'asset',
              category: row.element_type === 'BADGE' ? 'badge' : row.element_type === 'LOGO' ? 'logo' : 'other',
              url: row.generated_asset_url,
              mimeType: 'image/png',
              strictInstructions: 'Asset oficial fornecido pela campanha. Preserve sem estilização artificial.',
            });
          }
        });
      }
    } catch {}

    if (category) {
      return assets.filter(a => a.category === category);
    }

    return assets;
  }

  /**
   * Resolve o selo oficial correto com base na oportunidade vinculada ao produto.
   */
  async resolveBadgeForOpportunity(opportunityName?: string | null): Promise<McpStoreAsset | null> {
    if (!opportunityName) return null;

    const lower = opportunityName.toLowerCase();
    if (lower.includes('queima') || lower.includes('salvado')) {
      return OFFICIAL_STORE_ASSETS.find(a => a.id === 'asset-badge-queima-salvados') || null;
    }

    const allAssets = await this.getStoreAssets('badge');
    const matched = allAssets.find(a => a.name.toLowerCase().includes(lower));
    return matched || null;
  }
}

export const mcpAssetService = new McpAssetService();
