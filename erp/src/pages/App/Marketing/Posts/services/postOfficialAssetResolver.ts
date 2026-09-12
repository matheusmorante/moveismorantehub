/**
 * postOfficialAssetResolver.ts — Resolução e renderização estrita de Assets Oficiais.
 *
 * Responsabilidade:
 * - Resolver os assets oficiais (Logo e Selo de Oportunidade) com URLs públicas absolutas.
 * - Renderizar a seção textual "ASSETS OFICIAIS (NÃO RECRIAR / NÃO REDESENHAR)".
 * - Garantir que produtos sem oportunidade NÃO recebam qualquer menção ou asset de badge.
 */

import {
  OFFICIAL_MORANTE_LOGO_URL,
  OFFICIAL_QUEIMA_BADGE_URL,
  OFFICIAL_LIQUIDACAO_BADGE_URL,
  OFFICIAL_ASSET_MASTER_RULE,
  buildOfficialLogoStrictInstructions,
  buildOfficialBadgeStrictInstructions,
  normalizeConfiguredAssetUrl,
  normalizeOfficialAssetUrl,
} from './postOfficialAssetConstants';
import { createOpportunitySealImage } from '../opportunitySealImage';

export interface ResolvedOfficialAssets {
  logo: {
    name: string;
    url: string;
    role: 'OFFICIAL_ASSET';
    /** Caminho do arquivo local no ZIP. Ex: 'official-assets/logo.png' */
    file?: string | null;
  };
  badge: {
    name: string;
    url: string;
    role: 'OFFICIAL_ASSET';
    opportunityId: string;
    opportunityName?: string;
    /** Caminho do arquivo local no ZIP. Ex: 'official-assets/badge.png' */
    file?: string | null;
  } | null;
}

/**
 * Resolve somente o asset configurado no modelo da Biblioteca de Elementos.
 * `referenceFiles[0]` mantém compatibilidade com selos antigos salvos como anexo.
 */
export function resolveConfiguredBadgeAssetUrl(model: any): string | null {
  const rawUrl =
    model?.generatedAssetUrl ||
    model?.generated_asset_url ||
    model?.referenceFiles?.[0]?.fileUrl ||
    model?.reference_files?.[0]?.fileUrl ||
    model?.reference_files?.[0]?.file_url ||
    null;
  return rawUrl ? normalizeConfiguredAssetUrl(rawUrl) : null;
}

export function resolveOfficialAssets(params: {
  product?: any | null;
  activeModels?: any[];
  elementModels?: any[];
}): ResolvedOfficialAssets {
  const { product, activeModels = [], elementModels = [] } = params;
  const candidateModels = [...activeModels, ...elementModels];

  // 1. Resolver LOGO oficial (sempre ativo com URL absoluta)
  let logoUrl = OFFICIAL_MORANTE_LOGO_URL;
  const logoModel = candidateModels.find(
    (m: any) =>
      m.elementType === 'LOGO' ||
      m.element_type === 'LOGO' ||
      (/logo|marca/i.test(m.name || '') && !/selo|badge/i.test(m.name || ''))
  );
  if (logoModel?.generatedAssetUrl || logoModel?.generated_asset_url) {
    logoUrl = normalizeOfficialAssetUrl(logoModel.generatedAssetUrl || logoModel.generated_asset_url);
  }

  // 2. Resolver BADGE oficial (SOMENTE se o produto tiver oportunidade correspondente)
  let badge: ResolvedOfficialAssets['badge'] = null;
  const oppId =
    product?.opportunity_id ??
    product?.opportunityId ??
    (typeof product?.opportunity === 'object' ? product?.opportunity?.id : null) ??
    (typeof product?.opportunity === 'string' && product.opportunity.trim() ? product.opportunity.trim() : null) ??
    (product?.opportunityName?.trim() ? 'opp-by-name' : null);

  if (oppId) {
    const oppName =
      product?.opportunityName ||
      (typeof product?.opportunity === 'object' ? product?.opportunity?.name : null) ||
      (typeof product?.opportunity === 'string' ? product.opportunity : null) ||
      'Oportunidade';

    // 1. Tentar obter do modelo BADGE configurado da campanha / biblioteca de elementos.
    // Prioriza modelos que possuem asset real configurado (generatedAssetUrl ou anexo) e mais recente.
    const matchingBadgeModels = candidateModels.filter(
      (m: any) =>
        (m.elementType === 'BADGE' || m.element_type === 'BADGE') &&
        ((oppId && (m.opportunityId === oppId || m.opportunity_id === oppId)) ||
          (oppName && m.name && m.name.toLowerCase().includes(oppName.toLowerCase())))
    );

    const sortedBadgeModels = [...matchingBadgeModels].sort((a: any, b: any) => {
      const urlA = resolveConfiguredBadgeAssetUrl(a);
      const urlB = resolveConfiguredBadgeAssetUrl(b);
      if (urlA && !urlB) return -1;
      if (!urlA && urlB) return 1;
      const dateA = new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    const exactBadgeModel = sortedBadgeModels[0] || null;
    const isQueimaSalvados = /queima|salvad/i.test(`${oppName} ${oppId}`);

    if (exactBadgeModel) {
      let badgeUrl = resolveConfiguredBadgeAssetUrl(exactBadgeModel);

      // Se o asset for a imagem antiga retangular sem fogo ou nulo para Queima dos Salvados:
      if (isQueimaSalvados && (!badgeUrl || badgeUrl.includes('1787790409290.png') || badgeUrl.includes('1787790000192.png'))) {
        badgeUrl = OFFICIAL_QUEIMA_BADGE_URL;
      }

      // Se ainda não houver asset no modelo, usa o asset da oportunidade do produto (sem forçar imagem legada)
      if (!badgeUrl) {
        badgeUrl =
          product?.opportunityImageUrl ||
          (typeof product?.opportunity === 'object' ? product?.opportunity?.image_url : null) ||
          null;
      }

      if (badgeUrl) {
        badge = {
          name: exactBadgeModel.name || (isQueimaSalvados ? 'Selo Queima dos Salvados' : 'Selo de Oportunidade'),
          url: badgeUrl,
          role: 'OFFICIAL_ASSET',
          opportunityId: oppId,
          opportunityName: oppName,
        };
      }
    }
  }

  return {
    logo: {
      name: 'Logo Oficial Móveis Morante',
      url: logoUrl,
      role: 'OFFICIAL_ASSET',
    },
    badge,
  };
}

const SEP = '='.repeat(50);
const SUB_SEP = '-'.repeat(50);

export function renderOfficialAssetsPromptSection(
  assets: ResolvedOfficialAssets,
  options: { localFilesOnly?: boolean } = {},
): string {
  const lines: string[] = [
    SEP,
    'ASSETS OFICIAIS (NÃO RECRIAR / NÃO REDESENHAR)',
    SEP,
    OFFICIAL_ASSET_MASTER_RULE,
    '',
  ];

  if (!options.localFilesOnly || assets.logo.file) {
    lines.push(buildOfficialLogoStrictInstructions(assets.logo.url, assets.logo.file));
  }

  if (assets.badge && (!options.localFilesOnly || assets.badge.file)) {
    lines.push('');
    lines.push(SUB_SEP);
    lines.push('');
    lines.push(
      buildOfficialBadgeStrictInstructions(
        assets.badge.url,
        assets.badge.opportunityName || 'Oportunidade',
        assets.badge.file || null,
      )
    );
  }

  return lines.join('\n');
}
