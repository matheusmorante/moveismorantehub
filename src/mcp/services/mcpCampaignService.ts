import {
  McpCampaignData,
  McpCampaignPromptElement,
  McpGeneratedReference,
} from '../types/mcp.js';
import { mcpSupabase } from './mcpProductService.js';

const DEFAULT_GLOBAL_GUIDELINES = `COMPOSIÇÃO GERAL
- Preservar informações comerciais exatamente como fornecidas; preço, nome, parcelamento, logo e selo são renderizados deterministicamente.
- Manter área comercial legível, sem sobrepor produto ou fotos.

FOTOS DO PRODUTO (FONTE DE VERDADE ABSOLUTA):
- A variação principal usa FOTO 1 como PRIMARY: maior destaque visual.
- A FOTO 2 da variação principal é SECONDARY: menor, próxima da foto principal e nunca uma duplicação da FOTO 1.
- Cada outra variação usa somente sua FOTO 1 como miniatura representativa.
- As fotos das outras variações ficam em galeria horizontal, com borda branca fina e sem texto dentro das imagens.
- Nunca misturar fotos de variações diferentes ou inventar fotos.`;

export class McpCampaignService {
  /**
   * Obtém as diretrizes globais da marca configuradas no ERP.
   */
  async getGlobalGuidelines(): Promise<string> {
    try {
      const { data } = await mcpSupabase
        .from('post_creator_global_rules')
        .select('guidelines')
        .eq('id', true)
        .maybeSingle();

      if (data?.guidelines) return data.guidelines;
    } catch {}

    return DEFAULT_GLOBAL_GUIDELINES;
  }

  /**
   * Busca uma campanha pelo ID ou Nome.
   */
  async getCampaignByIdOrName(identifier: string): Promise<McpCampaignData> {
    const clean = identifier.trim();

    const { data: campaign, error } = await mcpSupabase
      .from('post_creator_campaigns')
      .select('*')
      .or(`id.eq.${clean},name.ilike.%${clean}%`)
      .limit(1)
      .maybeSingle();

    if (error || !campaign) {
      // Fallback para Campanha Padrão se não encontrada
      if (clean.toLowerCase().includes('padrão') || clean.toLowerCase().includes('padrao')) {
        return {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Campanha Padrão',
          description: 'Campanha padrão oficial do MoranteHub para geração de posts.',
          generalGuidelines: await this.getGlobalGuidelines(),
          active: true,
          availableFormats: ['4:5', '9:16', 'mobile'],
          prompts: await this.getCampaignPrompts('00000000-0000-4000-8000-000000000001'),
        };
      }
      throw new Error(`CAMPAIGN_NOT_FOUND: Campanha "${identifier}" não encontrada no MoranteHub.`);
    }

    const prompts = await this.getCampaignPrompts(campaign.id);
    const globalRules = await this.getGlobalGuidelines();

    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description || '',
      generalGuidelines: campaign.general_guidelines || globalRules,
      active: campaign.active !== false,
      availableFormats: ['4:5', '9:16', 'mobile'],
      prompts,
    };
  }

  /**
   * Obtém todos os prompts de elementos configurados para a campanha.
   */
  async getCampaignPrompts(campaignId: string): Promise<McpCampaignPromptElement[]> {
    const { data: links, error: linkErr } = await mcpSupabase
      .from('post_creator_campaign_element_models')
      .select('*, post_creator_element_models(*)')
      .eq('campaign_id', campaignId)
      .eq('active', true);

    if (linkErr || !links || links.length === 0) {
      // Retorna prompts padrão dos elementos essenciais
      return [
        {
          key: 'TITLE',
          name: 'Título do Produto',
          prompt: 'Posicione o título do produto em destaque com tipografia forte e legibilidade cristalina.',
        },
        {
          key: 'PRICE',
          name: 'Preço Principal',
          prompt: 'Destaque o valor comercial com container nítido, fundo contrastante e moeda R$ visível.',
        },
        {
          key: 'INSTALLMENT',
          name: 'Parcelamento',
          prompt: 'Indique a condição de parcelamento em texto menor logo abaixo do preço.',
        },
        {
          key: 'OPEN_VIEW',
          name: 'Visão Interna / Foto Secundária',
          prompt: 'Quando houver fotografia do produto aberto, apresente-a em card secundário e discreto, sem rótulos ou textos sobrepostos.',
        },
        {
          key: 'VARIATION_GALLERY',
          name: 'Galeria de Outras Cores',
          prompt: 'Apresente as miniaturas reais das DEMAIS cores disponíveis (nunca duplicando a cor principal já em destaque no post).',
        },
        {
          key: 'CTA',
          name: 'Chamada para Ação',
          prompt: 'Insira botão/chamada discreta "Peça já pelo WhatsApp" ou "Confira no site".',
        },
      ];
    }

    return links.map((item: any) => {
      const model = item.post_creator_element_models;
      return {
        key: item.element_type || model?.element_type || 'ELEMENT',
        name: model?.name || item.element_type,
        prompt: model?.prompt || '',
        assetUrl: model?.generated_asset_url || null,
        referenceFiles: (model?.reference_files || []).map((f: any) => ({
          name: f.name || 'Anexo',
          url: f.fileUrl || f.url || '',
        })),
      };
    });
  }

  /**
   * Obtém histórico de artes já geradas para o produto/campanha como REFERÊNCIA VISUAL.
   */
  async getGeneratedPostReferences(productId: string, campaignId?: string, limit = 5): Promise<McpGeneratedReference[]> {
    let query = mcpSupabase
      .from('post_creator_previews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 10));

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data } = await query;
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      kind: 'generated_reference',
      productId: row.product_id,
      campaignId: row.campaign_id,
      format: row.format || '4:5',
      url: row.image_url,
      note: 'Esta imagem é apenas uma REFERÊNCIA VISUAL gerada anteriormente. Não substitui as fotos oficiais do produto.',
    }));
  }
}

export const mcpCampaignService = new McpCampaignService();
