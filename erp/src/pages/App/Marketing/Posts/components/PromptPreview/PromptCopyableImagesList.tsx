import React from 'react';
import {
  PostProductImagesSpec,
  PostOfficialAssetsSpec,
} from '../../types/postSpecification';
import { ElementModel } from '../../types/postCreator';
import { copyImageUrlToClipboard } from '../../services/imageClipboardUtils';
import {
  OFFICIAL_QUEIMA_BADGE_URL,
  OFFICIAL_LIQUIDACAO_BADGE_URL,
} from '../../services/postOfficialAssetConstants';
import { resolveConfiguredBadgeAssetUrl } from '../../services/postOfficialAssetResolver';
import { createOpportunitySealImage } from '../../opportunitySealImage';

interface PromptCopyableImagesListProps {
  productImages: PostProductImagesSpec | null;
  officialAssets: PostOfficialAssetsSpec | null;
  product?: any | null;
  models?: ElementModel[];
  elementModels?: ElementModel[];
  className?: string;
}

interface CopyableItem {
  id: string;
  order: number;
  label: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  url: string;
  fallbackUrl?: string;
  aspectClass?: string;
}

export const PromptCopyableImagesList: React.FC<PromptCopyableImagesListProps> = ({
  productImages,
  officialAssets,
  product,
  models = [],
  elementModels = [],
  className = '',
}) => {
  if (!productImages && !officialAssets && !product) return null;

  const items: CopyableItem[] = [];
  let orderIndex = 1;

  // 1. Foto Principal (PRIMARY)
  if (productImages?.primary?.url) {
    items.push({
      id: 'primary',
      order: orderIndex++,
      label: 'Foto Principal',
      badge: '1. PRINCIPAL',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      title: productImages.primary.variationName || productImages.primaryVariation?.name || 'Variação Principal',
      subtitle: 'Móvel fechado (protagonista da arte)',
      url: productImages.primary.url,
      aspectClass: 'object-cover',
    });
  }

  // 2. Imagem Secundária (OPEN_VIEW — segunda foto da variação principal)
  if (productImages?.openView?.url) {
    items.push({
      id: 'open_view',
      order: orderIndex++,
      label: 'Imagem Secundária',
      badge: '2. IMAGEM SECUNDÁRIA',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      title: 'Segunda foto da variação principal',
      subtitle: 'Pode ser aberta, detalhe ou ângulo diferente',
      url: productImages.openView.url,
      aspectClass: 'object-cover',
    });
  }

  // 3. Miniaturas das Variações Adicionais (VARIATION_GALLERY)
  if (productImages?.variations && productImages.variations.length > 0) {
    const primaryId = productImages.primaryVariation?.id;
    const primaryUrl = productImages.primary?.url;

    productImages.variations
      .filter((v) => {
        if (primaryId && v.variationId === primaryId) return false;
        if (primaryUrl && v.url === primaryUrl) return false;
        return true;
      })
      .forEach(variation => {
        items.push({
          id: `var-${variation.variationId}`,
          order: orderIndex++,
          label: `Variação: ${variation.variationName}`,
          badge: 'VARIAÇÃO ADICIONAL',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          title: variation.variationName,
          subtitle: 'Foto 1 da variação (compor com borda branca fina)',
          url: variation.url,
          aspectClass: 'object-cover',
        });
      });
  }

  // 4. Logo Oficial Móveis Morante (OFFICIAL_ASSET)
  if (officialAssets?.logo?.url) {
    items.push({
      id: 'logo',
      order: orderIndex++,
      label: 'Logo Oficial Móveis Morante',
      badge: '3. LOGO OFICIAL',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      title: 'Móveis Morante',
      subtitle: 'Asset oficial (não redesenhar)',
      url: officialAssets.logo.url,
      aspectClass: 'object-contain p-1 bg-white rounded',
    });
  }

  // 5. Selo de Oportunidade (SOMENTE se o produto tiver oportunidade vinculada)
  const oppId =
    product?.opportunity_id ??
    product?.opportunityId ??
    (typeof product?.opportunity === 'object' ? product?.opportunity?.id : null) ??
    (typeof product?.opportunity === 'string' && product.opportunity.trim() ? product.opportunity.trim() : null);

  if (oppId) {
    const oppNameRaw =
      product?.opportunityName ||
      (typeof product?.opportunity === 'object' ? product?.opportunity?.name : null) ||
      officialAssets?.badge?.opportunityName ||
      (typeof product?.opportunity === 'string' ? product.opportunity : '');

    // Busca o modelo configurado no elemento "Selo de Oportunidade" (BADGE) da campanha / biblioteca de elementos.
    // Prioriza o modelo que possui asset real configurado (generatedAssetUrl ou anexo) e mais recente.
    const candidateModels = [...models, ...elementModels].filter(
      (m: any) =>
        (m.elementType === 'BADGE' || m.element_type === 'BADGE') &&
        ((oppId && (m.opportunityId === oppId || m.opportunity_id === oppId)) ||
          (oppNameRaw && m.name && m.name.toLowerCase().includes(oppNameRaw.toLowerCase())))
    );

    // Ordena para que modelos com asset gerado/anexo venham primeiro, desempatando pelo mais recente
    const sortedBadgeModels = [...candidateModels].sort((a: any, b: any) => {
      const urlA = resolveConfiguredBadgeAssetUrl(a);
      const urlB = resolveConfiguredBadgeAssetUrl(b);
      if (urlA && !urlB) return -1;
      if (!urlA && urlB) return 1;
      const dateA = new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    const configuredBadgeModel = sortedBadgeModels[0] || null;
    const modelBadgeUrl = configuredBadgeModel ? resolveConfiguredBadgeAssetUrl(configuredBadgeModel) : null;

    // A imagem configurada no elemento da campanha (modelBadgeUrl ou officialAssets?.badge?.url)
    // tem PRIORIDADE MÁXIMA e NUNCA é sobreposta por fallbacks forçados legados.
    let badgeUrl =
      modelBadgeUrl ||
      officialAssets?.badge?.url ||
      null;

    // Se ainda não houver asset configurado no elemento, utiliza a imagem cadastrada na própria oportunidade do produto
    if (!badgeUrl) {
      badgeUrl =
        product?.opportunityImageUrl ||
        (typeof product?.opportunity === 'object' ? product?.opportunity?.image_url : null) ||
        null;
    }

    const oppObj = typeof product?.opportunity === 'object' ? product?.opportunity : null;
    const fallbackSvgUrl = createOpportunitySealImage({
      id: String(oppId),
      name: oppNameRaw || 'Oportunidade',
      slug: oppObj?.slug,
      badge_color: oppObj?.badge_color,
      border_color: oppObj?.border_color,
    });

    if (!badgeUrl) {
      badgeUrl = fallbackSvgUrl;
    }

    if (badgeUrl) {
      items.push({
        id: 'badge',
        order: orderIndex++,
        label: 'Selo de Oportunidade',
        badge: 'SELO DE OPORTUNIDADE',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        title: configuredBadgeModel?.name || 'Selo de Oportunidade',
        subtitle: oppNameRaw ? `Oportunidade: ${oppNameRaw}` : 'Selo oficial da oportunidade',
        url: badgeUrl,
        fallbackUrl: fallbackSvgUrl,
        aspectClass: 'object-contain p-1 bg-slate-900 rounded',
      });
    }
  }

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-3 shadow-md ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📸</span>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Assets para colar no ChatGPT/Gemini
            </h4>
            <p className="text-[11px] text-slate-400">
              Clique em <strong>Copiar Imagem</strong> e cole com <strong>Ctrl+V</strong> no chat. O prompt já informa à IA o que cada foto colada é.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
          {items.length} {items.length === 1 ? 'imagem pronta' : 'imagens prontas'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 hover:border-slate-700 transition group"
          >
            <div className="relative w-14 h-14 rounded-md border border-slate-700/80 bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
              <img
                src={item.url}
                alt={item.title}
                className={`w-full h-full ${item.aspectClass}`}
                loading="lazy"
                onError={(e) => {
                  if (item.fallbackUrl && e.currentTarget.src !== item.fallbackUrl) {
                    e.currentTarget.src = item.fallbackUrl;
                  }
                }}
              />
              <span className="absolute top-0.5 left-0.5 bg-black/80 text-white font-mono text-[9px] font-bold px-1 rounded">
                #{item.order}
              </span>
            </div>

            <div className="min-w-0 flex-1 text-left">
              <span className={`inline-block text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
                {item.badge}
              </span>
              <p className="text-xs font-bold text-slate-100 truncate mt-0.5" title={item.title}>
                {item.title}
              </p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">
                {item.subtitle}
              </p>
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => void copyImageUrlToClipboard(item.url, item.label)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 border border-indigo-400/40 px-2 py-0.5 rounded shadow-sm transition"
                  title="Copiar imagem para colar no ChatGPT com Ctrl+V"
                >
                  <span>📋</span>
                  <span>Copiar Imagem</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
