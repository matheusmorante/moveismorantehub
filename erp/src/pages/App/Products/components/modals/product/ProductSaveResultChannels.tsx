import React from 'react';
import type { EcomLegibilityResult } from '../../../../../../../../shared-utils/catalogPublicationValidation';
import type { ProductSaveResult } from './ProductSaveResultModal';

interface ProductSaveResultChannelsProps {
  readonly saveResult: ProductSaveResult;
  readonly isNonConventional: boolean;
  readonly isERPActive: boolean;
  readonly isCatalogPublished: boolean;
  readonly catalogReadinessStatus: 'checking' | 'ready' | 'error';
  readonly catalogCheck?: EcomLegibilityResult;
  readonly canPublishToCatalog: boolean;
  readonly canPublishNow: boolean;
  readonly finishing: boolean;
  readonly updatingErp: boolean;
  readonly updatingEcom: boolean;
  readonly channelUncertain: boolean;
  readonly onToggleErp: () => void;
  readonly onToggleCatalog: () => void;
}

export const ProductSaveResultChannels = ({
  saveResult,
  isNonConventional,
  isERPActive,
  isCatalogPublished,
  catalogReadinessStatus,
  catalogCheck,
  canPublishToCatalog,
  canPublishNow,
  finishing,
  updatingErp,
  updatingEcom,
  channelUncertain,
  onToggleErp,
  onToggleCatalog,
}: ProductSaveResultChannelsProps) => {
  return (
    <div
      className={`grid grid-cols-1 ${canPublishToCatalog ? 'md:grid-cols-2' : ''} gap-4 text-left mb-6`}
    >
      {/* Canal ERP */}
      <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <i
                className="bi bi-box-seam text-blue-600 dark:text-blue-400 text-base"
                aria-hidden="true"
              />
              <span className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                ERP Interno
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                isNonConventional
                  ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  : isERPActive
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {isNonConventional ? 'Desativado' : isERPActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2">
            Requisitos do ERP:
          </p>
          <ul className="space-y-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <i
                className={`bi ${
                  saveResult.checksErp?.description
                    ? 'bi-check-circle-fill text-emerald-500'
                    : 'bi-exclamation-circle-fill text-amber-500'
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px]">Nome / Descrição</span>
            </li>
            <li className="flex items-center gap-2">
              <i
                className={`bi ${
                  saveResult.checksErp?.unitPrice
                    ? 'bi-check-circle-fill text-emerald-500'
                    : 'bi-exclamation-circle-fill text-amber-500'
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px]">Preço de Venda</span>
            </li>
            <li className="flex items-center gap-2">
              <i
                className={`bi ${
                  saveResult.checksErp?.categories
                    ? 'bi-check-circle-fill text-emerald-500'
                    : 'bi-exclamation-circle-fill text-amber-500'
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px]">Categoria Principal</span>
            </li>
            <li className="flex items-center gap-2">
              <i
                className={`bi ${
                  saveResult.checksErp?.supplier
                    ? 'bi-check-circle-fill text-emerald-500'
                    : 'bi-exclamation-circle-fill text-amber-500'
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px]">Fornecedor Vinculado</span>
            </li>
            <li className="flex items-center gap-2">
              <i
                className={`bi ${
                  saveResult.checksErp?.origin
                    ? 'bi-check-circle-fill text-emerald-500'
                    : 'bi-exclamation-circle-fill text-amber-500'
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px]">Origem do Estoque Convencional</span>
            </li>
          </ul>
          {isNonConventional && (
            <div className="mt-3 p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-[10px] font-bold flex items-center gap-2">
              <i className="bi bi-slash-circle text-slate-400 text-xs shrink-0" aria-hidden="true" />
              <span>
                Produtos de origem <strong>Salvados</strong> ou <strong>Usados</strong> não podem ser ativados no ERP, apenas no Catálogo Digital.
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={isNonConventional ? undefined : onToggleErp}
          disabled={finishing || updatingErp || updatingEcom || channelUncertain || isNonConventional}
          title={
            isNonConventional
              ? 'Produtos de origem de estoque Salvados ou Usados não podem ser ativados no ERP, apenas no catálogo digital.'
              : undefined
          }
          aria-label={
            isNonConventional
              ? 'Ativar no ERP: Desativado para produtos com origem Salvados ou Usados'
              : isERPActive
                ? 'Desativar no ERP'
                : 'Ativar no ERP'
          }
          className={`w-full mt-3 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 select-none ${
            isNonConventional
              ? 'border border-slate-300 dark:border-slate-700 bg-slate-200/80 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed grayscale shadow-none'
              : isERPActive
                ? 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950/40 dark:text-slate-200 dark:hover:text-red-400 shadow-xs'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 shadow-xs'
          }`}
        >
          <i
            className={`bi ${
              isNonConventional
                ? 'bi-slash-circle'
                : isERPActive
                  ? 'bi-pause-circle-fill'
                  : 'bi-play-circle-fill'
            }`}
            aria-hidden="true"
          />
          {updatingErp
            ? 'Atualizando...'
            : isNonConventional
              ? 'Ativar no ERP'
              : isERPActive
                ? 'Desativar no ERP'
                : 'Ativar no ERP'}
        </button>
      </div>

      {canPublishToCatalog && (
        <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <i
                className="bi bi-globe2 text-purple-600 dark:text-purple-400 text-base"
                aria-hidden="true"
              />
              <span className="text-xs font-black text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                Catálogo Digital
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                isCatalogPublished
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {isCatalogPublished ? 'Publicado' : 'Não Publicado'}
            </span>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              Requisitos do Catálogo:
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                canPublishNow
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : catalogReadinessStatus === 'error'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
              }`}
            >
              {catalogReadinessStatus === 'checking'
                ? 'Verificando'
                : catalogReadinessStatus === 'error'
                  ? 'Não verificado'
                  : canPublishNow ? 'Pronto' : 'Pendências'}
            </span>
          </div>

          <ul className="space-y-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <i
                className={`bi ${
                  catalogCheck?.checks.marketplaceTitle
                    ? 'bi-check-circle-fill text-emerald-500'
                    : 'bi-exclamation-circle-fill text-amber-500'
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px]">Nome do Produto</span>
            </li>
            <li className="flex items-center gap-2">
              <i
                className={`bi ${
                  catalogCheck?.checks.description
                    ? 'bi-check-circle-fill text-emerald-500'
                    : 'bi-exclamation-circle-fill text-amber-500'
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px]">Descrição Completa</span>
            </li>
            <li className="flex items-center gap-2">
              <i
                className={`bi ${
                  catalogCheck?.checks.dimensions
                    ? 'bi-check-circle-fill text-emerald-500'
                    : 'bi-exclamation-circle-fill text-amber-500'
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px]">Dimensões Físicas</span>
            </li>
            <li className="flex items-center gap-2">
              <i
                className={`bi ${
                  catalogCheck?.checks.categories
                    ? 'bi-check-circle-fill text-emerald-500'
                    : 'bi-exclamation-circle-fill text-amber-500'
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px]">Categorias do Produto</span>
            </li>
            <li className="flex items-center gap-2">
              <i
                className={`bi ${
                  catalogCheck?.checks.images
                    ? 'bi-check-circle-fill text-emerald-500'
                    : 'bi-exclamation-circle-fill text-amber-500'
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px]">Fotos do Produto</span>
            </li>
            <li className="flex items-center gap-2">
              <i
                className={`bi ${
                  catalogReadinessStatus === 'ready' &&
                  catalogCheck?.checks.categoryCharacteristics
                    ? 'bi-check-circle-fill text-emerald-500'
                    : catalogReadinessStatus === 'error'
                      ? 'bi-x-circle-fill text-rose-500'
                      : 'bi-exclamation-circle-fill text-amber-500'
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px]">
                {catalogReadinessStatus === 'checking'
                  ? 'Verificando características da categoria…'
                  : catalogReadinessStatus === 'error'
                    ? 'Características da categoria não verificadas'
                    : catalogCheck?.missingCategoryCharacteristics.length
                      ? `Características obrigatórias: ${catalogCheck.missingCategoryCharacteristics.join(', ')}`
                      : 'Características obrigatórias da categoria'}
              </span>
            </li>
          </ul>
          {catalogReadinessStatus === 'error' && (
            <p role="status" className="mt-2 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
              A publicação ficará bloqueada até ser possível consultar os requisitos das categorias.
            </p>
          )}
        </div>

        <div>
          {!canPublishNow && !isCatalogPublished && catalogReadinessStatus === 'ready' && (
            <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mb-1 text-center">
              💡 Complete os requisitos acima para publicar.
            </p>
          )}
          <button
            type="button"
            disabled={finishing || updatingEcom || updatingErp || channelUncertain || (!canPublishNow && !isCatalogPublished)}
            onClick={onToggleCatalog}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
              isCatalogPublished
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
            }`}
          >
            <i
              className={`bi ${isCatalogPublished ? 'bi-eye-slash-fill' : 'bi-globe2'}`}
              aria-hidden="true"
            />
            {updatingEcom
              ? 'Atualizando...'
              : isCatalogPublished
                ? 'Despublicar do Catálogo'
                : 'Publicar no Catálogo'}
          </button>
        </div>
        </div>
      )}
    </div>
  );
};
