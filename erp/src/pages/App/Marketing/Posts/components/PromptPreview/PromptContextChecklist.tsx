import React from 'react';
import {
  PostProductImagesSpec,
  PostProductImagesValidation,
  PostOfficialAssetsSpec,
} from '../../types/postSpecification';

interface PromptContextChecklistProps {
  product?: any | null;
  productImages?: PostProductImagesSpec | null;
  validation?: PostProductImagesValidation | null;
  officialAssets?: PostOfficialAssetsSpec | null;
  opportunityName?: string | null;
}

export const PromptContextChecklist: React.FC<PromptContextChecklistProps> = ({
  product,
  productImages,
  validation,
  officialAssets,
  opportunityName,
}) => {
  if (!product) return null;

  const hasPrimary = Boolean(productImages?.primary?.url);
  const hasOpenView = Boolean(productImages?.openView?.url);
  const variationsCount = productImages?.variations?.length || 0;
  const hasLogo = Boolean(officialAssets?.logo?.url);
  const hasOpportunity = Boolean(product?.opportunity_id || product?.opportunityId || opportunityName);
  const hasBadge = Boolean(officialAssets?.badge?.url);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-850 pb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <span>📋</span> Checklist de Contexto para IA
        </span>
        {validation && !validation.valid ? (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
            Incompleto
          </span>
        ) : (
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
            Pronto para IA
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
        {/* Produto */}
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400 font-bold">✓</span>
          <span className="text-slate-300 truncate" title={product.name || 'Produto identificado'}>
            Produto
          </span>
        </div>

        {/* Imagem Principal */}
        <div className="flex items-center gap-1.5">
          {hasPrimary ? (
            <>
              <span className="text-emerald-400 font-bold">✓</span>
              <span className="text-slate-300">Foto principal</span>
            </>
          ) : (
            <>
              <span className="text-amber-400 font-bold">⚠</span>
              <span className="text-amber-300 font-semibold">Sem foto principal</span>
            </>
          )}
        </div>

        {/* Imagem Secundária */}
        <div className="flex items-center gap-1.5">
          {hasOpenView ? (
            <>
              <span className="text-emerald-400 font-bold">✓</span>
              <span className="text-slate-300">Foto secundária</span>
            </>
          ) : (
            <>
              <span className="text-slate-500">—</span>
              <span className="text-slate-500">Sem foto secundária</span>
            </>
          )}
        </div>

        {/* Variações */}
        <div className="flex items-center gap-1.5">
          {variationsCount > 0 ? (
            <>
              <span className="text-emerald-400 font-bold">✓</span>
              <span className="text-slate-300">{variationsCount} variação{variationsCount > 1 ? 'ões' : ''}</span>
            </>
          ) : (
            <>
              <span className="text-slate-500">—</span>
              <span className="text-slate-500">1 variação única</span>
            </>
          )}
        </div>

        {/* Logo Oficial */}
        <div className="flex items-center gap-1.5">
          {hasLogo ? (
            <>
              <span className="text-emerald-400 font-bold">✓</span>
              <span className="text-slate-300">Logo oficial</span>
            </>
          ) : (
            <>
              <span className="text-amber-400 font-bold">⚠</span>
              <span className="text-amber-300">Sem logo</span>
            </>
          )}
        </div>

        {/* Oportunidade */}
        <div className="flex items-center gap-1.5 col-span-2">
          {hasOpportunity ? (
            <>
              <span className="text-purple-400 font-bold">✓</span>
              <span className="text-purple-200 truncate" title={opportunityName || 'Oportunidade ativa'}>
                {opportunityName || 'Oportunidade ativa'}
              </span>
              {hasBadge && <span className="text-[10px] text-purple-300">(Selo ativo)</span>}
            </>
          ) : (
            <>
              <span className="text-slate-500">—</span>
              <span className="text-slate-400">Oportunidade: nenhuma (selo omitido)</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
