import React from 'react';
import { PostOfficialAssetsSpec } from '../../types/postSpecification';
import { copyImageUrlToClipboard } from '../../services/imageClipboardUtils';

interface PromptOfficialAssetsCardProps {
  officialAssets: PostOfficialAssetsSpec | null;
}

export const PromptOfficialAssetsCard: React.FC<PromptOfficialAssetsCardProps> = ({
  officialAssets,
}) => {
  if (!officialAssets) return null;

  const { logo, badge } = officialAssets;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-2.5 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <span className="text-emerald-400">🛡️</span>
          <span>Assets Oficiais (Preservação Fiel Obrigatória)</span>
        </div>
        <span className="text-[10px] text-slate-400">
          Arquivo pronto (não recriar)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Card do Logo */}
        <div className="flex items-center gap-2.5 rounded-lg bg-slate-950/70 border border-slate-800/90 p-2">
          <div className="w-11 h-11 rounded-md border border-slate-700 bg-slate-900 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-sm">
            <img
              src={logo.url}
              alt="Logo Oficial Móveis Morante"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/30">
                  LOGO
                </span>
                <span className="text-[10px] font-bold text-emerald-400">✓ Disponível</span>
              </div>
              <button
                type="button"
                onClick={() => void copyImageUrlToClipboard(logo.url, 'Logo Oficial Móveis Morante')}
                className="text-[9px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-1.5 py-0.5 rounded shadow-sm transition"
                title="Copiar imagem do logo para colar no ChatGPT"
              >
                📋 Copiar
              </button>
            </div>
            <p className="text-xs font-semibold text-white truncate mt-0.5" title={logo.name}>
              {logo.name}
            </p>
            <a
              href={logo.url}
              target="_blank"
              rel="noreferrer"
              className="text-[9px] font-mono text-indigo-400 hover:underline inline-flex items-center gap-0.5"
              title="Abrir arquivo do logo em nova aba"
            >
              <span>Ver arquivo</span> ↗
            </a>
          </div>
        </div>

        {/* Card do Badge / Selo */}
        <div className="flex items-center gap-2.5 rounded-lg bg-slate-950/70 border border-slate-800/90 p-2">
          {badge ? (
            <>
              <div className="w-11 h-11 rounded-md border border-purple-800/60 bg-purple-950/30 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-sm">
                <img
                  src={badge.url}
                  alt={badge.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded border border-purple-500/30">
                      SELO
                    </span>
                    <span className="text-[10px] font-bold text-purple-300">✓ Ativo</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyImageUrlToClipboard(badge.url, badge.name || 'Selo Oficial')}
                    className="text-[9px] font-bold text-white bg-purple-600 hover:bg-purple-500 px-1.5 py-0.5 rounded shadow-sm transition"
                    title="Copiar imagem do selo para colar no ChatGPT"
                  >
                    📋 Copiar
                  </button>
                </div>
                <p className="text-xs font-semibold text-white truncate mt-0.5" title={badge.name}>
                  {badge.name}
                </p>
                <a
                  href={badge.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[9px] font-mono text-purple-400 hover:underline inline-flex items-center gap-0.5"
                  title="Abrir arquivo do selo em nova aba"
                >
                  <span>Ver arquivo</span> ↗
                </a>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-11 h-11 rounded-md border border-dashed border-slate-800 bg-slate-900/40 flex items-center justify-center text-slate-500 text-xs shrink-0">
                —
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-1 py-0.5 rounded border border-slate-700">
                    SELO
                  </span>
                  <span className="text-[10px] text-slate-400">Não aplicável</span>
                </div>
                <p className="text-xs font-medium text-slate-300 mt-0.5 truncate" title="Produto sem oportunidade correspondente">
                  Sem oportunidade vinculada
                </p>
                <span className="text-[9px] text-slate-500">
                  Nenhum selo enviado à IA
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
