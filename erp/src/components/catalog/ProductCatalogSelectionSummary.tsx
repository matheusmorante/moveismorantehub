import React from 'react';
import type { ProductCatalogPrepareInput } from '../../../../shared-utils/productCatalogFormSchemas';
import { formatPrice, type CatalogItem } from './productCatalogPresentation';

type BulkScope = NonNullable<ProductCatalogPrepareInput['bulkScope']>;

interface ProductCatalogSelectionSummaryProps {
  bulkScope: BulkScope | null;
  selectedCount: number;
  selectedItemsPreview: Array<[string, CatalogItem]>;
  selectedItemCount: number;
  onClearSelection: () => void;
  onUndoBulkSelection: () => void;
  onRemoveItem: (key: string) => void;
}

export const ProductCatalogSelectionSummary: React.FC<ProductCatalogSelectionSummaryProps> = ({
  bulkScope,
  selectedCount,
  selectedItemsPreview,
  selectedItemCount,
  onClearSelection,
  onUndoBulkSelection,
  onRemoveItem,
}) => (
  <aside className="catalog-selection-summary" aria-label="Resumo dos produtos selecionados">
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
      <div>
        <h3 className="text-sm font-bold">Seleção</h3>
        <p className="text-xs text-slate-500">{selectedCount} produto{selectedCount === 1 ? '' : 's'}</p>
      </div>
      <button type="button" onClick={onClearSelection} disabled={selectedCount === 0} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800">Limpar</button>
    </div>
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
      {bulkScope && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-sm font-semibold">Todos os resultados atuais</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Até {bulkScope.total} produtos · {bulkScope.categoryName}</p>
          {(bulkScope.filters.search || bulkScope.filters.brand) && <p className="mt-1 text-[11px] text-slate-500">Filtros: {[bulkScope.filters.search && `pesquisa “${bulkScope.filters.search}”`, bulkScope.filters.brand].filter(Boolean).join(' · ')}</p>}
          {bulkScope.excludedProductIds.length > 0 && <p className="mt-1 text-[11px] text-slate-500">{bulkScope.excludedProductIds.length} produto(s) removido(s) da lista.</p>}
          <p className="mt-2 text-[11px] text-slate-500">No envio, a lista será recalculada com os produtos que corresponderem aos filtros naquele momento.</p>
          <button type="button" onClick={onUndoBulkSelection} className="mt-2 text-xs font-semibold text-emerald-800 underline dark:text-emerald-200">Desfazer seleção</button>
        </div>
      )}
      {selectedItemsPreview.length ? (
        <>
          {selectedItemsPreview.map(([key, item]) => (
            <article key={key} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-800">
              {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" decoding="async" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800"><i className="bi bi-image" aria-hidden="true" /></span>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{[item.name, item.variationName].filter(Boolean).join(' · ')}</p>
                <p className="text-[11px] text-slate-500">{formatPrice(item.price)}</p>
              </div>
              <button type="button" aria-label={`Remover ${item.name} da seleção`} onClick={() => onRemoveItem(key)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"><i className="bi bi-x-lg text-xs" aria-hidden="true" /></button>
            </article>
          ))}
          {selectedItemCount > selectedItemsPreview.length && <p className="px-1 text-xs text-slate-500">Mais {selectedItemCount - selectedItemsPreview.length} produto{selectedItemCount - selectedItemsPreview.length === 1 ? '' : 's'} selecionado{selectedItemCount - selectedItemsPreview.length === 1 ? '' : 's'}.</p>}
        </>
      ) : !bulkScope ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700">Selecione produtos para revisar aqui.</p>
      ) : null}
    </div>
  </aside>
);
