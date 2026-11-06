import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { CategoryOption } from './productCatalogCategoryTree';
import type {
  ProductCatalogFiltersInput,
  ProductCatalogPrepareInput,
} from '../../../../shared-utils/productCatalogFormSchemas';

type BulkScope = NonNullable<ProductCatalogPrepareInput['bulkScope']>;

interface Props {
  filterForm: UseFormReturn<ProductCatalogFiltersInput>;
  search: string;
  categoryId: string;
  flattenedCategories: Array<{ category: CategoryOption; depth: number }>;
  onCategoryChange: (value: string) => void;
  metadataError: string;
  isMetadataLoading: boolean;
  hasMetadataError: boolean;
  onRetryMetadata: () => void;
  bulkScope: BulkScope | null;
  hasMatchingBulkScope: boolean;
  onClearBulkSelection: () => void;
}

export const ProductCatalogFilterToolbar: React.FC<Props> = ({
  filterForm,
  search,
  categoryId,
  flattenedCategories,
  onCategoryChange,
  metadataError,
  isMetadataLoading,
  hasMetadataError,
  onRetryMetadata,
  bulkScope,
  hasMatchingBulkScope,
  onClearBulkSelection,
}) => (
  <div className="catalog-filter-toolbar">
    <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-900">
      <i className="bi bi-search text-slate-400" aria-hidden="true" />
      <input
        {...filterForm.register('search')}
        value={search}
        maxLength={100}
        placeholder="Pesquisar produtos..."
        aria-label="Pesquisar produtos do catálogo"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
      {search && (
        <button
          type="button"
          aria-label="Limpar pesquisa"
          onClick={() => filterForm.setValue('search', '', { shouldDirty: true, shouldValidate: true })}
          className="text-slate-400 hover:text-slate-700"
        >
          <i className="bi bi-x-circle-fill" />
        </button>
      )}
    </label>
    <div className="catalog-filter-selects">
      <label className="sr-only" htmlFor="support-catalog-category">Categoria</label>
      <select
        id="support-catalog-category"
        value={categoryId}
        onChange={(event) => onCategoryChange(event.target.value)}
        className="catalog-category-filter h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <option value="">Todas as categorias</option>
        {flattenedCategories.map(({ category, depth }) => (
          <option key={category.id} value={category.id}>
            {`${'　'.repeat(depth)}${depth ? '↳ ' : ''}${category.name}`}
          </option>
        ))}
      </select>
    </div>
    {metadataError && <p role="status" className="text-xs text-amber-700 dark:text-amber-300">{metadataError}</p>}
    {isMetadataLoading && <p className="text-xs text-slate-400">Carregando categorias…</p>}
    {hasMetadataError && (
      <button
        type="button"
        onClick={onRetryMetadata}
        className="text-left text-xs font-semibold text-amber-700 underline dark:text-amber-300"
      >
        Tentar carregar filtros novamente
      </button>
    )}
    {bulkScope && !hasMatchingBulkScope && (
      <div className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        <span>
          Seleção em lote mantida: {Math.max(0, bulkScope.total - bulkScope.excludedProductIds.length)} produtos · {bulkScope.categoryName}. Você pode selecionar itens avulsos neste filtro.
        </span>
        <button
          type="button"
          onClick={onClearBulkSelection}
          aria-label="Remover seleção em lote"
          className="shrink-0 underline"
        >
          Remover
        </button>
      </div>
    )}
  </div>
);
