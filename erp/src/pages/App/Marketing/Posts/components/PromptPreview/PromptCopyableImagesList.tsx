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
  OFFICIAL_PRICING_CONTAINER_EXAMPLE_URL,
  OFFICIAL_FOOTER_BENEFITS_URL,
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
  onChangeOpenView?: (url: string | null) => void;
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
  canChange?: boolean;
}

export const PromptCopyableImagesList: React.FC<PromptCopyableImagesListProps> = ({
  productImages,
  officialAssets,
  product,
  models = [],
  elementModels = [],
  className = '',
  onChangeOpenView,
}) => {
  const [openViewPickerOpen, setOpenViewPickerOpen] = React.useState(false);

  // Coletar todas as fotos candidatas do produto para o modal de troca
  const allAvailablePhotos = React.useMemo(() => {
    const list: string[] = [];
    if (!product) return list;
    if (Array.isArray(product.images)) {
      product.images.forEach((img: any) => {
        const u = typeof img === 'string' ? img : img?.url || img?.image_url;
        if (u && !list.includes(u)) list.push(u);
      });
    }
    if (product.image_url && typeof product.image_url === 'string') {
      const u = product.image_url;
      if (!list.includes(u)) list.push(u);
    }
    if (Array.isArray(product.photos)) {
      product.photos.forEach((p: any) => {
        const u = typeof p === 'string' ? p : Array.isArray(p) ? p[1] : p?.url || p?.image_url;
        if (u && !list.includes(u)) list.push(u);
      });
    }
    if (Array.isArray(product.product_images)) {
      product.product_images.forEach((img: any) => {
        const u = typeof img === 'string' ? img : img?.image_url || img?.url;
        if (u && !list.includes(u)) list.push(u);
      });
    }
    const vars = Array.isArray(product.variations)
      ? product.variations
      : Array.isArray(product.product_variations)
      ? product.product_variations
      : [];
    vars.forEach((v: any) => {
      const imgs = Array.isArray(v.images) ? v.images : [];
      imgs.forEach((img: any) => {
        const u = typeof img === 'string' ? img : img?.url || img?.image_url;
        if (u && !list.includes(u)) list.push(u);
      });
      if (v.image_url && typeof v.image_url === 'string') {
        if (!list.includes(v.image_url)) list.push(v.image_url);
      }
    });
    return list;
  }, [product]);

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
      canChange: true,
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

    const isQueimaSalvados = /queima|salvad/i.test(`${oppNameRaw} ${oppId}`);

    // A imagem configurada no elemento da campanha (modelBadgeUrl ou officialAssets?.badge?.url)
    // tem PRIORIDADE MÁXIMA e NUNCA é sobreposta por fallbacks forçados legados.
    let badgeUrl =
      modelBadgeUrl ||
      officialAssets?.badge?.url ||
      null;

    // Se o asset retornado for o selo retangular antigo sem fogo ou se for queima dos salvados sem asset personalizado:
    if (isQueimaSalvados && (!badgeUrl || badgeUrl.includes('1787790409290.png') || badgeUrl.includes('1787790000192.png'))) {
      badgeUrl = OFFICIAL_QUEIMA_BADGE_URL;
    }

    // Se ainda não houver asset configurado no elemento, utiliza a imagem cadastrada na própria oportunidade do produto
    if (!badgeUrl) {
      badgeUrl =
        product?.opportunityImageUrl ||
        (typeof product?.opportunity === 'object' ? product?.opportunity?.image_url : null) ||
        null;
    }

    // Fallback garantido: para Queima dos Salvados é sempre o selo oficial com fogo; para outras, SVG dinâmico
    const oppObj = typeof product?.opportunity === 'object' ? product?.opportunity : null;
    const fallbackUrl = isQueimaSalvados
      ? OFFICIAL_QUEIMA_BADGE_URL
      : createOpportunitySealImage({
          id: String(oppId),
          name: oppNameRaw || 'Oportunidade',
          slug: oppObj?.slug,
          badge_color: oppObj?.badge_color,
          border_color: oppObj?.border_color,
        });

    if (!badgeUrl) {
      badgeUrl = fallbackUrl;
    }

    if (badgeUrl) {
      items.push({
        id: 'badge',
        order: orderIndex++,
        label: 'Selo de Oportunidade',
        badge: 'SELO DE OPORTUNIDADE',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        title: configuredBadgeModel?.name || (isQueimaSalvados ? 'Selo Queima dos Salvados' : 'Selo de Oportunidade'),
        subtitle: oppNameRaw ? `Oportunidade: ${oppNameRaw}` : 'Selo oficial da oportunidade',
        url: badgeUrl,
        fallbackUrl: fallbackUrl !== badgeUrl ? fallbackUrl : undefined,
        aspectClass: 'object-contain p-1 bg-slate-900 rounded',
      });
    }
  }

  // 6. Exemplo Oficial de Precificação e Parcelamento
  items.push({
    id: 'pricing_example',
    order: orderIndex++,
    label: 'Exemplo de Precificação e Parcelamento',
    badge: 'PREÇO & PARCELAS',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    title: 'Container de Preço e Parcelamento',
    subtitle: 'Exemplo visual de layout com De/Por e cartão',
    url: OFFICIAL_PRICING_CONTAINER_EXAMPLE_URL,
    aspectClass: 'object-contain p-1 bg-slate-950 rounded',
  });

  // 7. Rodapé Oficial de Benefícios + Logo
  items.push({
    id: 'footer_benefits',
    order: orderIndex++,
    label: 'Rodapé Oficial de Benefícios',
    badge: 'RODAPÉ OFICIAL',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    title: 'Faixa de Rodapé Completa',
    subtitle: 'Entrega Rápida, Montagem Inclusa, Compra Segura e Logo',
    url: OFFICIAL_FOOTER_BENEFITS_URL,
    aspectClass: 'object-contain p-1 bg-slate-950 rounded',
  });

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
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => void copyImageUrlToClipboard(item.url, item.label)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 border border-indigo-400/40 px-2 py-0.5 rounded shadow-sm transition"
                  title="Copiar imagem para colar no ChatGPT com Ctrl+V"
                >
                  <span>📋</span>
                  <span>Copiar Imagem</span>
                </button>

                {item.canChange && onChangeOpenView && (
                  <button
                    type="button"
                    onClick={() => setOpenViewPickerOpen(true)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 px-2 py-0.5 rounded shadow-sm transition"
                    title="Trocar por outra foto cadastrada do produto"
                  >
                    <span>✎</span>
                    <span>Trocar Foto</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Escolha da Imagem Secundária */}
      {openViewPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Trocar Imagem Secundária
              </h4>
              <button
                type="button"
                onClick={() => setOpenViewPickerOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Selecione uma das fotos oficiais do produto para usar como imagem secundária (aberto, ângulo alternativo ou detalhe):
            </p>

            <div className="grid grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-700">
              {allAvailablePhotos.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChangeOpenView?.(url);
                    setOpenViewPickerOpen(false);
                  }}
                  className="group relative aspect-square rounded-lg border border-slate-700 hover:border-amber-500 overflow-hidden bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <span className="absolute bottom-1 right-1 text-[8px] bg-black/70 text-white px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                    Escolher
                  </span>
                </button>
              ))}
              {allAvailablePhotos.length === 0 && (
                <p className="col-span-3 text-xs text-slate-500 text-center py-4">
                  Nenhuma outra foto encontrada no produto.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => {
                  onChangeOpenView?.(null);
                  setOpenViewPickerOpen(false);
                }}
                className="text-xs text-red-400 hover:underline"
              >
                Remover imagem secundária
              </button>

              <button
                type="button"
                onClick={() => setOpenViewPickerOpen(false)}
                className="rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
