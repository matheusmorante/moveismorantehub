import React from 'react';

export interface GenerationContextData {
  productName: string;
  productPrice: string;
  productOldPrice?: string;
  opportunityName?: string;
  resolvedOpportunity: string;
  format: string;
  hasPrimaryImage: boolean;
  hasSecondaryImage: boolean;
  variationImagesCount: number;
  hasPrimaryVisualReference: boolean;
  hasLogoAsset: boolean;
  hasOpportunityAsset: boolean;
  hasInstallmentAsset: boolean;
  finalPrompt: string;
}

interface GenerationContextModalProps {
  data: GenerationContextData;
  onClose: () => void;
}

export const GenerationContextModal: React.FC<GenerationContextModalProps> = ({
  data,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">
              i
            </span>
            <h3 className="text-sm font-bold text-white">Contexto da Geração (Debug)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Dados Gerais */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Produto:</span>
              <span className="font-semibold text-white">{data.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Preço Atual:</span>
              <span className="font-semibold text-emerald-400">{data.productPrice}</span>
            </div>
            {data.productOldPrice && (
              <div className="flex justify-between">
                <span className="text-slate-400">Preço Anterior:</span>
                <span className="line-through text-slate-500">{data.productOldPrice}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Oportunidade Solicitada:</span>
              <span className="text-amber-400">{data.opportunityName || 'Nenhuma'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Oportunidade Resolvida:</span>
              <span className="font-mono text-indigo-300">{data.resolvedOpportunity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Formato:</span>
              <span className="font-mono text-slate-300">{data.format}</span>
            </div>
          </div>

          {/* Checklist de Assets e Imagens */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Imagens e Assets Multimodais
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/60 py-1">
                <span className="text-slate-300">Primary image:</span>
                <span className={data.hasPrimaryImage ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {data.hasPrimaryImage ? '✓' : '✗ ausente'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/60 py-1">
                <span className="text-slate-300">Secondary image:</span>
                <span className={data.hasSecondaryImage ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {data.hasSecondaryImage ? '✓' : 'não fornecida'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/60 py-1">
                <span className="text-slate-300">Variation images:</span>
                <span className="font-mono text-indigo-300">{data.variationImagesCount}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/60 py-1">
                <span className="text-slate-300">Primary visual reference:</span>
                <span className={data.hasPrimaryVisualReference ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {data.hasPrimaryVisualReference ? '✓' : '✗ ausente'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/60 py-1">
                <span className="text-slate-300">Logo oficial:</span>
                <span className={data.hasLogoAsset ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {data.hasLogoAsset ? '✓' : '✗ ausente'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/60 py-1">
                <span className="text-slate-300">Opportunity asset:</span>
                <span className={data.hasOpportunityAsset ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {data.hasOpportunityAsset ? '✓' : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 col-span-2">
                <span className="text-slate-300">Installment asset:</span>
                <span className={data.hasInstallmentAsset ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {data.hasInstallmentAsset ? '✓' : '✗ ausente'}
                </span>
              </div>
            </div>
          </div>

          {/* Prompt Final Resolvido */}
          <div>
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Prompt Final Enviado à IA (Sem Placeholders)
            </h4>
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300 select-all">
              {data.finalPrompt}
            </pre>
          </div>
        </div>

        <footer className="border-t border-slate-800 px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
};
