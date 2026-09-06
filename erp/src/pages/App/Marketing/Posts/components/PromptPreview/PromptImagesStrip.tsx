import React, { useState } from 'react';
import {
  PostProductImagesSpec,
  PostProductImagesValidation,
} from '../../types/postSpecification';
import { copyImageUrlToClipboard } from '../../services/imageClipboardUtils';

interface PromptImagesStripProps {
  product?: any | null;
  productImages?: PostProductImagesSpec | null;
  validation?: PostProductImagesValidation | null;
  opportunityName?: string | null;
  opportunityBadgeUrl?: string | null;
  onChangePrimary?: (url: string) => void;
  onChangeOpenView?: (url: string | null) => void;
  onChangeVariation?: (variationId: string, url: string) => void;
  onResetOverrides?: () => void;
  hasManualOverrides?: boolean;
}

type PickerTarget =
  | { type: 'PRIMARY'; title: 'Trocar Imagem Principal (PRIMARY)' }
  | { type: 'OPEN_VIEW'; title: 'Trocar Foto do Produto Aberto / Interno (OPEN_VIEW)' }
  | { type: 'VARIATION'; variationId: string; variationName: string; title: string };

export const PromptImagesStrip: React.FC<PromptImagesStripProps> = ({
  product,
  productImages,
  validation,
  opportunityName,
  opportunityBadgeUrl,
  onChangePrimary,
  onChangeOpenView,
  onChangeVariation,
  onResetOverrides,
  hasManualOverrides,
}) => {
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  if (!productImages) return null;

  const hasPrimary = Boolean(productImages.primary?.url);
  const hasOpenView = Boolean(productImages.openView?.url);
  const variations = productImages.variations || [];

  // Coletar todas as fotos candidatas do produto para o modal de troca
  const allAvailablePhotos: string[] = [];
  if (product) {
    if (Array.isArray(product.images)) {
      product.images.forEach((img: any) => {
        const u = typeof img === 'string' ? img : img?.url || img?.image_url;
        if (u && !allAvailablePhotos.includes(u)) allAvailablePhotos.push(u);
      });
    }
    if ((product as any).image_url && typeof (product as any).image_url === 'string') {
      const u = (product as any).image_url;
      if (!allAvailablePhotos.includes(u)) allAvailablePhotos.push(u);
    }
    if (Array.isArray(product.photos)) {
      product.photos.forEach((p: any) => {
        const u = typeof p === 'string' ? p : Array.isArray(p) ? p[1] : p?.url || p?.image_url;
        if (u && !allAvailablePhotos.includes(u)) allAvailablePhotos.push(u);
      });
    }
    if (Array.isArray(product.product_images)) {
      product.product_images.forEach((img: any) => {
        const u = typeof img === 'string' ? img : img?.image_url || img?.url;
        if (u && !allAvailablePhotos.includes(u)) allAvailablePhotos.push(u);
      });
    }
    const vars = Array.isArray(product.variations)
      ? product.variations
      : Array.isArray((product as any).product_variations)
      ? (product as any).product_variations
      : [];
    vars.forEach((v: any) => {
      const imgs = Array.isArray(v.images) ? v.images : [];
      imgs.forEach((img: any) => {
        const u = typeof img === 'string' ? img : img?.url || img?.image_url;
        if (u && !allAvailablePhotos.includes(u)) allAvailablePhotos.push(u);
      });
      if (v.image_url && typeof v.image_url === 'string') {
        if (!allAvailablePhotos.includes(v.image_url)) allAvailablePhotos.push(v.image_url);
      }
    });
  }

  const handleSelectPhoto = (url: string) => {
    if (!pickerTarget) return;
    if (pickerTarget.type === 'PRIMARY') {
      onChangePrimary?.(url);
    } else if (pickerTarget.type === 'OPEN_VIEW') {
      onChangeOpenView?.(url);
    } else if (pickerTarget.type === 'VARIATION') {
      onChangeVariation?.(pickerTarget.variationId, url);
    }
    setPickerTarget(null);
  };

  const handleRemoveOpenView = () => {
    onChangeOpenView?.(null);
    setPickerTarget(null);
  };

  return (
    <div className="rounded-xl border border-slate-750 bg-slate-900/95 p-3.5 space-y-3 shadow-lg">
      {/* Cabeçalho com Oportunidade e Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
          <span className="text-indigo-400 text-sm">📸</span>
          <span>Imagens do produto para IA</span>
          {hasManualOverrides && (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
              Seleção manual ativa
            </span>
          )}
        </div>

        {/* Indicador visual da Oportunidade e Botão Baixar Todas */}
        <div className="flex flex-wrap items-center gap-2">
          {opportunityName ? (
            <div className="flex items-center gap-1.5 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-md text-[10px] font-semibold text-purple-200">
              {opportunityBadgeUrl && (
                <img src={opportunityBadgeUrl} alt="" className="w-3.5 h-3.5 rounded-full object-contain" />
              )}
              <span>Oportunidade: {opportunityName}</span>
            </div>
          ) : (
            <div className="bg-slate-800/70 border border-slate-700/60 px-2 py-0.5 rounded-md text-[10px] text-slate-400">
              Oportunidade: <span className="font-semibold text-slate-300">Nenhuma</span>
            </div>
          )}



          {hasManualOverrides && onResetOverrides && (
            <button
              type="button"
              onClick={onResetOverrides}
              className="text-[10px] text-slate-400 hover:text-white underline transition ml-1"
              title="Restaurar seleção automática de fotos"
            >
              Restaurar padrão
            </button>
          )}
        </div>
      </div>

      {/* Alerta se não houver foto principal */}
      {validation && !validation.valid && (
        <div className="rounded-lg bg-amber-950/70 border border-amber-800/80 p-2 text-[11px] text-amber-200 flex items-start gap-2">
          <span className="text-base leading-none">⚠️</span>
          <div>
            <p className="font-semibold">Foto principal não encontrada</p>
            <p className="text-[10px] text-amber-300/80">
              O produto selecionado não possui foto de capa. Clique em [ Trocar ] para selecionar uma imagem da galeria.
            </p>
          </div>
        </div>
      )}

      {/* Grid das Imagens: PRIMARY, OPEN_VIEW e VARIATIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* 1. IMAGEM PRINCIPAL (PRIMARY) */}
        <div className="flex flex-col justify-between rounded-xl bg-slate-950/90 border border-indigo-900/40 p-3 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
              IMAGEM PRINCIPAL
            </span>
            <div className="flex items-center gap-1">
              {hasPrimary && (
                <>
                  <button
                    type="button"
                    onClick={() => void copyImageUrlToClipboard(productImages.primary!.url, 'Foto Principal')}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-1.5 py-0.5 rounded transition"
                    title="Copiar imagem para colar no ChatGPT com Ctrl+V"
                  >
                    <span>📋</span>
                    <span>Copiar</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setPickerTarget({ type: 'PRIMARY', title: 'Trocar Imagem Principal (PRIMARY)' })}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-700/50 px-1.5 py-0.5 rounded transition"
              >
                <span>✎</span>
                <span>Trocar</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasPrimary ? (
              <img
                src={productImages.primary!.url}
                alt="Foto Principal"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border-2 border-indigo-500 shrink-0 shadow bg-slate-900 cursor-pointer hover:opacity-90"
                onClick={() => void copyImageUrlToClipboard(productImages.primary!.url, 'Foto Principal')}
                title="Clique para copiar a foto (Ctrl+V no ChatGPT)"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border border-dashed border-red-500/60 bg-red-950/30 flex items-center justify-center text-red-400 text-sm shrink-0">
                ✕
              </div>
            )}
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-bold text-white leading-snug break-words" title={productImages.primary?.variationName || productImages.primaryVariation?.name || 'Variação Padrão'}>
                {productImages.primary?.variationName || productImages.primaryVariation?.name || 'Variação Padrão'}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight mt-1">
                Foto prioritária do produto real
              </p>
            </div>
          </div>
        </div>

        {/* 2. IMAGEM SECUNDÁRIA (OPEN_VIEW / FOTO SECUNDÁRIA) */}
        <div className="flex flex-col justify-between rounded-xl bg-slate-950/90 border border-amber-900/40 p-3 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
              IMAGEM SECUNDÁRIA
            </span>
            <div className="flex items-center gap-1">
              {hasOpenView && (
                <>
                  <button
                    type="button"
                    onClick={() => void copyImageUrlToClipboard(productImages.openView!.url, 'Imagem Secundária')}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-1.5 py-0.5 rounded transition"
                    title="Copiar imagem para colar no ChatGPT com Ctrl+V"
                  >
                    <span>📋</span>
                    <span>Copiar</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() =>
                  setPickerTarget({
                    type: 'OPEN_VIEW',
                    title: 'Trocar Imagem Secundária (Visão Interna ou Detalhe)',
                  })
                }
                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/50 px-1.5 py-0.5 rounded transition"
              >
                <span>✎</span>
                <span>Trocar</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasOpenView ? (
              <img
                src={productImages.openView!.url}
                alt="Imagem Secundária"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border-2 border-amber-500 shrink-0 shadow bg-slate-900 cursor-pointer hover:opacity-90"
                onClick={() => void copyImageUrlToClipboard(productImages.openView!.url, 'Imagem Secundária')}
                title="Clique para copiar a foto (Ctrl+V no ChatGPT)"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 flex items-center justify-center text-slate-500 text-sm shrink-0">
                —
              </div>
            )}
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-bold text-slate-200 truncate">
                {hasOpenView ? 'Imagem Secundária' : 'Sem foto secundária'}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight mt-1">
                {hasOpenView ? 'Card secundário no post (ex: aberto ou ângulo)' : 'Opcional (clique em Trocar)'}
              </p>
            </div>
          </div>
        </div>

        {/* 3. VARIAÇÕES */}
        <div className="flex flex-col justify-between rounded-xl bg-slate-950/90 border border-purple-900/40 p-3 space-y-2.5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
              DEMAIS VARIAÇÕES ({variations.length})
            </span>
            <span className="text-[10px] text-slate-400">Outras cores do produto</span>
          </div>

          {variations.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2 overflow-y-auto max-h-32 py-1 scrollbar-thin scrollbar-thumb-slate-700">
              {variations.map((v, i) => (
                <div key={`${v.variationId}-${i}`} className="text-center flex flex-col items-center bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                  <img
                    src={v.url}
                    alt={v.variationName}
                    className="w-12 h-12 rounded object-cover border border-slate-700 hover:border-purple-400 transition shadow-sm bg-slate-950 cursor-pointer"
                    onClick={() => void copyImageUrlToClipboard(v.url, `Foto Variação: ${v.variationName}`)}
                    title="Clique para copiar a foto (Ctrl+V no ChatGPT)"
                  />
                  <span className="block text-[9px] text-slate-200 truncate max-w-[70px] mt-1 font-semibold" title={v.variationName}>
                    {v.variationName}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <button
                      type="button"
                      onClick={() => void copyImageUrlToClipboard(v.url, `Variação ${v.variationName}`)}
                      className="text-[9px] text-slate-400 hover:text-white"
                      title="Copiar imagem"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPickerTarget({
                          type: 'VARIATION',
                          variationId: v.variationId,
                          variationName: v.variationName,
                          title: `Trocar Foto da Variação: ${v.variationName}`,
                        })
                      }
                      className="text-[9px] text-purple-400 hover:text-purple-300 hover:underline"
                    >
                      ✎ Trocar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-3">Variação única (sem variações adicionais)</p>
          )}
        </div>
      </div>

      {/* Modal / Seletor de Troca de Foto */}
      {pickerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {pickerTarget.title}
              </h4>
              <button
                type="button"
                onClick={() => setPickerTarget(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Selecione uma das fotos oficiais do produto para usar neste papel visual:
            </p>

            <div className="grid grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-700">
              {allAvailablePhotos.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPhoto(url)}
                  className="group relative aspect-square rounded-lg border border-slate-700 hover:border-indigo-500 overflow-hidden bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <span className="absolute bottom-1 right-1 text-[8px] bg-black/70 text-white px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                    Escolher
                  </span>
                </button>
              ))}
              {allAvailablePhotos.length === 0 && (
                <p className="col-span-3 text-xs text-slate-500 text-center py-4">
                  Nenhuma imagem cadastrada no produto.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              {pickerTarget.type === 'OPEN_VIEW' ? (
                <button
                  type="button"
                  onClick={handleRemoveOpenView}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remover foto aberta
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setPickerTarget(null)}
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
