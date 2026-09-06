import React from 'react';
import {
  PostProductImagesSpec,
  PostOfficialAssetsSpec,
} from '../../types/postSpecification';
import { copyImageUrlToClipboard } from '../../services/imageClipboardUtils';

interface PromptCopyableImagesListProps {
  productImages: PostProductImagesSpec | null;
  officialAssets: PostOfficialAssetsSpec | null;
  product?: any | null;
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
  aspectClass?: string;
}

export const PromptCopyableImagesList: React.FC<PromptCopyableImagesListProps> = ({
  productImages,
  officialAssets,
  product,
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

  // 2. Visão Interna / Aberto (OPEN_VIEW)
  if (productImages?.openView?.url) {
    items.push({
      id: 'open-view',
      order: orderIndex++,
      label: 'Visão Interna',
      badge: '2. ABERTO / INTERNO',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      title: 'Móvel Aberto',
      subtitle: 'Estrutura, divisões e cabideiro',
      url: productImages.openView.url,
      aspectClass: 'object-cover',
    });
  }

  // 3. Logo Oficial da Móveis Morante (OFFICIAL_ASSET)
  if (officialAssets?.logo?.url) {
    items.push({
      id: 'logo',
      order: orderIndex++,
      label: 'Logo Oficial',
      badge: '3. LOGO OFICIAL',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      title: 'Móveis Morante',
      subtitle: 'Asset oficial (não redesenhar)',
      url: officialAssets.logo.url,
      aspectClass: 'object-contain p-1 bg-white rounded',
    });
  }

  // 4. Selo de Oportunidade (resolvido de officialAssets ou diretamente do produto)
  const oppNameRaw =
    officialAssets?.badge?.name ||
    product?.opportunityName ||
    product?.opportunity?.name ||
    (typeof product?.opportunity === 'string' ? product.opportunity : '');

  const badgeUrl =
    officialAssets?.badge?.url ||
    product?.opportunity?.image_url ||
    product?.opportunityImageUrl ||
    product?.opportunityBadgeUrl ||
    (/queima|salvados/i.test(oppNameRaw)
      ? 'https://hkoxhourxwlddgsfdgws.supabase.co/storage/v1/object/public/products/marketing/seals/9d8bedae-b366-4f8c-ac49-74b85b882bde-1787790409290.png'
      : null);

  if (badgeUrl) {
    const titleText = oppNameRaw
      ? (oppNameRaw.startsWith('Selo') ? oppNameRaw : `Selo Oficial ${oppNameRaw}`)
      : 'Selo Oficial de Oportunidade';

    items.push({
      id: 'badge',
      order: orderIndex++,
      label: 'Selo Oficial',
      badge: '4. SELO OFICIAL',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      title: titleText,
      subtitle: 'Selo oficial da campanha (copiar para o ChatGPT)',
      url: badgeUrl,
      aspectClass: 'object-contain p-1 bg-slate-900 rounded',
    });
  }

  // 5. Demais Variações (excluindo categoricamente a variação 1 principal)
  if (Array.isArray(productImages?.variations)) {
    const primaryId = productImages.primaryVariation?.id;
    const primaryUrl = productImages.primary?.url;

    productImages.variations
      .filter((v) => {
        if (primaryId && v.variationId === primaryId) return false;
        if (primaryUrl && v.url === primaryUrl) return false;
        return true;
      })
      .forEach((v) => {
        items.push({
          id: `var-${v.variationId}`,
          order: orderIndex++,
          label: `Outra Cor: ${v.variationName}`,
          badge: 'OUTRA COR',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          title: v.variationName,
          subtitle: 'Miniatura para galeria de outras cores',
          url: v.url,
          aspectClass: 'object-cover',
        });
      });
  }

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-3 shadow-md ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📸</span>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Fotos e Assets para Colar no ChatGPT / Gemini
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
