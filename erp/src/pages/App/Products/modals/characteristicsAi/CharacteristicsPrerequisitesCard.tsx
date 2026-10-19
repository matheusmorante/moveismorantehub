import React from 'react';

export interface CharacteristicsPrerequisitesCardProps {
  readonly productName: string;
  readonly effectiveCategory: string;
  readonly brand: string;
  readonly model: string;
  readonly hasName: boolean;
  readonly hasCategory: boolean;
  readonly hasBrand: boolean;
  readonly hasModel: boolean;
  readonly hasDescription: boolean;
  readonly imageCount: number;
  readonly isPrerequisitesMet: boolean;
}

export const CharacteristicsPrerequisitesCard: React.FC<CharacteristicsPrerequisitesCardProps> = ({
  productName,
  effectiveCategory,
  brand,
  model,
  hasName,
  hasCategory,
  hasBrand,
  hasModel,
  hasDescription,
  imageCount,
  isPrerequisitesMet,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3.5">
      {/* Seção 1: Obrigatórios */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Campo Obrigatório
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            Obrigatório
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <i
              className={`bi ${hasName ? 'bi-check-circle-fill text-emerald-500' : 'bi-exclamation-circle-fill text-amber-500'}`}
            />
            <span className="text-slate-700 dark:text-slate-300 truncate">
              Nome: <strong>{hasName ? productName : 'Faltando'}</strong>
            </span>
          </div>

        </div>
      </div>

      {/* Seção 2: Opcionais / Enriquecimento */}
      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Dados Adicionais (A IA usará se estiverem preenchidos)
          </span>
          <span className="text-[10px] text-slate-400 italic">
            Opcionais
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/40 dark:border-slate-700/40">
            <i
              className={`bi ${hasBrand ? 'bi-check-circle-fill text-emerald-500' : 'bi-dash-circle text-slate-400'}`}
            />
            <span className="text-slate-700 dark:text-slate-300 truncate">
              Marca: <strong>{hasBrand ? brand : 'Não informada'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/40 dark:border-slate-700/40">
            <i
              className={`bi ${hasModel ? 'bi-check-circle-fill text-emerald-500' : 'bi-dash-circle text-slate-400'}`}
            />
            <span className="text-slate-700 dark:text-slate-300 truncate">
              Linha/Modelo: <strong>{hasModel ? model : 'Não informado'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/40 dark:border-slate-700/40">
            <i
              className={`bi ${hasCategory ? 'bi-check-circle-fill text-emerald-500' : 'bi-dash-circle text-slate-400'}`}
            />
            <span className="text-slate-700 dark:text-slate-300 truncate">
              Categoria: <strong>{hasCategory ? effectiveCategory : 'Não informada'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/40 dark:border-slate-700/40">
            <i
              className={`bi ${hasDescription ? 'bi-check-circle-fill text-emerald-500' : 'bi-dash-circle text-slate-400'}`}
            />
            <span className="text-slate-700 dark:text-slate-300 truncate">
              Descrição: <strong>{hasDescription ? 'Preenchida' : 'Não informada'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/40 dark:border-slate-700/40">
            <i
              className={`bi ${imageCount > 0 ? 'bi-check-circle-fill text-emerald-500' : 'bi-dash-circle text-slate-400'}`}
            />
            <span className="text-slate-700 dark:text-slate-300 truncate">
              Fotos: <strong>{imageCount > 0 ? `${imageCount} foto(s)` : 'Nenhuma'}</strong>
            </span>
          </div>
        </div>
      </div>

      {!isPrerequisitesMet && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
          <i className="bi bi-exclamation-triangle-fill shrink-0" />
          <span>
            Informe o nome do produto na ficha para iniciar a análise com IA. Marca, linha/modelo, categoria e fotos são opcionais e ajudam a identificar melhor o produto.
          </span>
        </div>
      )}
    </div>
  );
};
