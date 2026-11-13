import React from 'react';
import type { ProductCatalogPrepareInput } from '../../../../../shared-utils/productCatalogFormSchemas';
import type {
  SupportCatalogProduct,
  SupportCatalogProductDetails,
} from '../supportCatalogService';
import type { CatalogItem } from '../productCatalogPresentation';
import { itemKey, makeCatalogItem } from '../productCatalogItems';
import {
  ProductCatalogSingleProductCard,
  ProductCatalogVariationCard,
} from '../ProductCatalogProductCards';

type BulkScope = NonNullable<ProductCatalogPrepareInput['bulkScope']>;

interface ProductCatalogProductListProps {
  catalogListRef: React.Ref<HTMLDivElement>;
  error: string;
  hasProductDetailsError: boolean;
  onRetryCatalog: () => void;
  onRetryProductDetails: () => void;
  isLoading: boolean;
  products: SupportCatalogProduct[];
  productDetailsById: Map<string, SupportCatalogProductDetails>;
  variationProductBatches: string[][];
  productDetailsQueries: Array<{ isLoading?: boolean; isError?: boolean }>;
  hasMatchingBulkScope: boolean;
  bulkScope: BulkScope | null;
  selectedItems: Map<string, CatalogItem>;
  isSearchDebouncing: boolean;
  toggleProduct: (item: CatalogItem, productId: string) => void;
  toggleProductCard: (
    productId: string,
    selectedManualItemCount: number,
    simpleItem: CatalogItem | null,
  ) => void;
  loadMoreRef: React.Ref<HTMLDivElement>;
  isLoadingNext: boolean;
  hasNextPage: boolean;
  onFetchNextPage: () => void;
}

export const ProductCatalogProductList: React.FC<ProductCatalogProductListProps> = ({
  catalogListRef,
  error,
  hasProductDetailsError,
  onRetryCatalog,
  onRetryProductDetails,
  isLoading,
  products,
  productDetailsById,
  variationProductBatches,
  productDetailsQueries,
  hasMatchingBulkScope,
  bulkScope,
  selectedItems,
  isSearchDebouncing,
  toggleProduct,
  toggleProductCard,
  loadMoreRef,
  isLoadingNext,
  hasNextPage,
  onFetchNextPage,
}) => {
  return (
    <div ref={catalogListRef} className="catalog-product-list">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetryCatalog}
            className="mt-2 font-semibold underline"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {hasProductDetailsError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <p>Não foi possível carregar algumas variações.</p>
          <button
            type="button"
            onClick={onRetryProductDetails}
            className="mt-2 font-semibold underline"
          >
            Tentar carregar novamente
          </button>
        </div>
      )}
      {isLoading &&
        Array.from({ length: 6 }, (_, index) => (
          <div
            key={`catalog-skeleton-${index}`}
            aria-hidden="true"
            className="flex animate-pulse gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
          >
            <span className="h-16 w-16 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <span className="flex-1 space-y-2 pt-1">
              <span className="block h-3 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
              <span className="block h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
              <span className="block h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
            </span>
          </div>
        ))}
      {products.map((product) => {
        if (product.hasVariations) {
          const productDetails = productDetailsById.get(product.id);
          const detailsQueryIndex = variationProductBatches.findIndex((batch) =>
            batch.includes(product.id),
          );
          const detailsQuery = productDetailsQueries[detailsQueryIndex];
          if (!productDetails || productDetails.variations.length === 0) {
            return (
              <div
                key={`variations-${product.id}`}
                role={detailsQuery?.isLoading ? 'status' : detailsQuery?.isError ? 'alert' : undefined}
                className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700"
              >
                {detailsQuery?.isLoading
                  ? 'Carregando variações…'
                  : detailsQuery?.isError
                    ? 'Variações indisponíveis no momento.'
                    : 'Nenhuma variação ativa disponível.'}
              </div>
            );
          }

          return (
            <React.Fragment key={`variations-${product.id}`}>
              {productDetails.variations.map((variation) => {
                const item = makeCatalogItem(product, variation);
                if (!item) return null;
                const isBulkProduct =
                  hasMatchingBulkScope &&
                  Boolean(bulkScope) &&
                  !bulkScope!.excludedProductIds.includes(product.id);
                const isSelected = isBulkProduct || selectedItems.has(itemKey(item));
                return (
                  <ProductCatalogVariationCard
                    key={itemKey(item)}
                    product={product}
                    variation={variation}
                    item={item}
                    isBulkProduct={isBulkProduct}
                    isSelected={isSelected}
                    disabled={isSearchDebouncing}
                    onToggle={() => toggleProduct(item, product.id)}
                  />
                );
              })}
            </React.Fragment>
          );
        }

        const simpleItem = makeCatalogItem(product, product.variations?.[0]);
        const isBulkProduct =
          hasMatchingBulkScope &&
          Boolean(bulkScope) &&
          !bulkScope!.excludedProductIds.includes(product.id);
        const isSelected =
          isBulkProduct || Boolean(simpleItem && selectedItems.has(itemKey(simpleItem)));
        return (
          <ProductCatalogSingleProductCard
            key={product.id}
            product={product}
            hasMatchingBulkScope={hasMatchingBulkScope}
            isSelected={isSelected}
            disabled={
              isSearchDebouncing ||
              !simpleItem ||
              (!isSelected && selectedItems.size >= 500)
            }
            onToggle={() => toggleProductCard(product.id, isSelected ? 1 : 0, simpleItem)}
          />
        );
      })}
      {!isLoading && products.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
          Nenhum produto ativo disponível com esses filtros.
        </div>
      )}
      <div ref={loadMoreRef} aria-hidden="true" className="h-px w-full" />
      {isLoadingNext && (
        <div className="flex items-center justify-center gap-2 py-5 text-sm text-slate-500">
          <i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" /> Carregando mais produtos…
        </div>
      )}
      {hasNextPage && !isLoadingNext && (
        <button
          type="button"
          onClick={onFetchNextPage}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Carregar mais produtos
        </button>
      )}
    </div>
  );
};
