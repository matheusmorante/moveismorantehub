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
  OFFICIAL_ASSET_MASTER_RULE,
  OFFICIAL_LOGO_STRICT_INSTRUCTIONS,
  buildOfficialBadgeStrictInstructions,
  normalizeOfficialAssetUrl,
} from './postOfficialAssetConstants';

export interface ResolvedOfficialAssets {
  logo: {
    name: string;
    url: string;
    role: 'OFFICIAL_ASSET';
  };
  badge: {
    name: string;
    url: string;
    role: 'OFFICIAL_ASSET';
    opportunityId: string;
    opportunityName?: string;
  } | null;
}

export function resolveOfficialAssets(params: {
  product?: any | null;
  activeModels?: any[];
}): ResolvedOfficialAssets {
  const { product, activeModels = [] } = params;

  // 1. Resolver LOGO oficial (sempre ativo com URL absoluta)
  let logoUrl = OFFICIAL_MORANTE_LOGO_URL;
  const logoModel = activeModels.find(
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

    let badgeUrl =
      product?.opportunity?.image_url ||
      product?.opportunityImageUrl ||
      product?.opportunityBadgeUrl ||
      null;

    // Buscar no modelo ativo de badge (por ID ou por tipo se houver apenas 1)
    const badgeModel = activeModels.find(
      (m: any) =>
        (m.elementType === 'BADGE' || m.element_type === 'BADGE') &&
        (!oppId || m.opportunityId === oppId || m.opportunity_id === oppId)
    ) || activeModels.find((m: any) => m.elementType === 'BADGE' || m.element_type === 'BADGE');

    if (badgeModel?.generatedAssetUrl || badgeModel?.generated_asset_url) {
      badgeUrl = badgeModel.generatedAssetUrl || badgeModel.generated_asset_url;
    }

    if (!badgeUrl && /queima|salvados/i.test(oppName)) {
      badgeUrl = OFFICIAL_QUEIMA_BADGE_URL;
    }

    if (badgeUrl) {
      badge = {
        name: `Selo Oficial ${oppName}`,
        url: normalizeOfficialAssetUrl(badgeUrl),
        role: 'OFFICIAL_ASSET',
        opportunityId: oppId,
        opportunityName: oppName,
      };
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

export function renderOfficialAssetsPromptSection(assets: ResolvedOfficialAssets): string {
  const lines: string[] = [
    SEP,
    'ASSETS OFICIAIS (NÃO RECRIAR / NÃO REDESENHAR)',
    SEP,
    OFFICIAL_ASSET_MASTER_RULE,
    '',
    OFFICIAL_LOGO_STRICT_INSTRUCTIONS,
  ];

  if (assets.badge) {
    lines.push('');
    lines.push(SUB_SEP);
    lines.push('');
    lines.push(
      buildOfficialBadgeStrictInstructions(
        assets.badge.url,
        assets.badge.opportunityName || 'Oportunidade'
      )
    );
  }

  return lines.join('\n');
}
