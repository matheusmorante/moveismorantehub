import React from 'react';

type Props = {
  previewStatus: 'updated' | 'stale' | 'incomplete' | 'none';
  onOpenDebug: () => void;
  previewImage?: string;
  previewError: string;
  hasPrimaryImage: boolean;
  variationImagesCount: number;
  hasSecondaryImage: boolean;
  previewDisabled: boolean;
  previewBusy: boolean;
  onGeneratePreview: () => void;
};

export function PostModelPreviewPanel({
  previewStatus,
  onOpenDebug,
  previewImage,
  previewError,
  hasPrimaryImage,
  variationImagesCount,
  hasSecondaryImage,
  previewDisabled,
  previewBusy,
  onGeneratePreview,
}: Props) {
  return (
    <aside className="flex flex-col items-center justify-between bg-slate-950/80 p-5 overflow-y-auto">
      <div className="w-full flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <b className="text-xs uppercase tracking-wider text-slate-400">
            Preview Multimodal
          </b>
          {previewStatus === 'updated' && (
            <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              ✓ Atualizado
            </span>
          )}
          {previewStatus === 'stale' && (
            <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
              ⚠ Desatualizado
            </span>
          )}
          {previewStatus === 'incomplete' && (
            <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[11px] font-semibold text-rose-400">
              ⚠ Resultado incompleto
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenDebug}
          className="inline-flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-indigo-300 hover:bg-slate-800 hover:text-indigo-200 transition-colors"
        >
          <span>[Ver contexto da geração]</span>
        </button>
      </div>

      <div className="my-auto flex flex-col items-center justify-center p-2 text-center w-full">
        {previewImage ? (
          <div className="relative group max-w-full">
            <img
              src={previewImage}
              alt="Preview do post gerado"
              className="max-h-[58vh] max-w-full rounded-lg shadow-xl object-contain border border-slate-800"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 max-w-sm">
            <p className="text-xs text-slate-400 leading-relaxed">
              Nenhum preview gerado para este produto.
              <br />
              Selecione um produto ao lado e gere uma arte para validar o modelo.
            </p>
          </div>
        )}

        {previewError && (
          <div className="mt-3 w-full max-w-md rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-300">
            {previewError}
          </div>
        )}
      </div>

      <div className="w-full pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-400">
          {hasPrimaryImage ? (
            <>
              Variações:{' '}
              <strong className="text-white">{variationImagesCount}</strong>
              {hasSecondaryImage ? ' · 2ª foto inclusa' : ''}
            </>
          ) : (
            'Selecione um produto com foto'
          )}
        </span>

        <button
          type="button"
          disabled={previewDisabled}
          onClick={onGeneratePreview}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50 shadow-lg"
        >
          {previewBusy ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Gerando preview...</span>
            </>
          ) : (
            <span>✨ {previewImage ? 'Gerar novo preview' : 'Gerar preview com IA'}</span>
          )}
        </button>
      </div>
    </aside>
  );
}
