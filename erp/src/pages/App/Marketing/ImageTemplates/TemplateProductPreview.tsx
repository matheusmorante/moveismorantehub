import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { listPreviewProductGroups, listPreviewProducts, mapPreviewProduct, PREVIEW_PRODUCT_PAGE_SIZE, readPreviewProduct,
  type PreviewProductSource } from './productPreviewService';
import { imageTemplateError } from './imageTemplateService';
import { PRODUCT_LIST_SEARCH_DEBOUNCE_MS, PRODUCT_LIST_SEARCH_MIN_LENGTH } from '../../../../../../shared-utils/productListSearch';
import type { TemplatePreviewProduct } from '../../../../../../shared-utils/catalogImageTemplate';

export function useTemplateProductPreview(userId: string, requiredImageCount = 1,
  onProductWarm?: (product: TemplatePreviewProduct) => void) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [pendingPageEdge, setPendingPageEdge] = useState<'first' | 'last' | null>(null);
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const timer = window.setTimeout(() => {
      setSearch(next); setPage(1); setPendingPageEdge(null);
    }, PRODUCT_LIST_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  const searchLength = searchInput.trim().replace(/[^\p{L}\p{N}]/gu, '').length;
  const searchReady = searchInput.trim() === search
    && (!searchInput.trim() || searchLength >= PRODUCT_LIST_SEARCH_MIN_LENGTH);
  const initialProducts = useQuery({
    queryKey: ['image-template-erp-products', userId, 1, '', ''],
    queryFn: ({ signal }) => listPreviewProducts(1, '', signal),
    staleTime: 30_000, retry: false, refetchOnWindowFocus: false,
  });
  const products = useQuery({
    queryKey: ['image-template-erp-products', userId, page, search, categoryId],
    queryFn: ({ signal }) => categoryId
      ? listPreviewProducts(page, search, signal, categoryId)
      : listPreviewProducts(page, search, signal),
    enabled: searchReady, staleTime: 30_000, retry: false, refetchOnWindowFocus: false,
  });
  const groups = useQuery({
    queryKey: ['image-template-erp-product-groups', userId],
    queryFn: ({ signal }) => listPreviewProductGroups(signal),
    staleTime: 60_000, retry: false, refetchOnWindowFocus: false,
  });
  const rows = useMemo(() => products.data?.rows ?? [], [products.data?.rows]);
  const initialProductId = initialProducts.data?.rows[0]?.id;
  const fallbackProductId = initialProductId || (initialProducts.isError ? rows[0]?.id : undefined);
  useEffect(() => {
    if (!selectedProduct && fallbackProductId) setSelectedProduct(fallbackProductId);
  }, [selectedProduct, fallbackProductId]);
  const productId = selectedProduct || fallbackProductId;
  const found = rows.findIndex((row) => row.id === productId);
  const position = found >= 0 ? found : -1;
  const detail = useQuery({
    queryKey: ['image-template-erp-product', userId, productId, requiredImageCount],
    queryFn: ({ signal }) => readPreviewProduct(productId!, signal, requiredImageCount),
    enabled: !!productId, staleTime: 30_000, gcTime: 5 * 60_000, retry: false, refetchOnWindowFocus: false,
  });
  const selectedDetail = detail.data?.id === productId ? detail.data : undefined;
  const selectedRow = rows.find((row) => row.id === productId)
    ?? initialProducts.data?.rows.find((row) => row.id === productId);
  const variations = selectedDetail?.variations ?? [];
  const variation = variations.find((entry) => entry.active !== false) ?? variations[0];
  const variationId = variation?.id ?? '';
  const product = useMemo(() => selectedDetail ? mapPreviewProduct(selectedDetail, variationId)
    : selectedRow ? mapPreviewProduct(selectedRow.previewSource) : null,
  [selectedDetail, selectedRow, variationId]);

  useEffect(() => {
    if (!productId || position < 0 || !searchReady) return;
    let cancelled = false;
    const nextPageNumber = page + 1;
    const hasNextPage = page * PREVIEW_PRODUCT_PAGE_SIZE < (products.data?.total ?? 0);
    const nearbyRows = rows.slice(position + 1, position + 6);
    const nextPagePromise = nearbyRows.length < 5 && hasNextPage
      ? queryClient.fetchQuery({
        queryKey: ['image-template-erp-products', userId, nextPageNumber, search, categoryId],
        queryFn: ({ signal }) => categoryId
          ? listPreviewProducts(nextPageNumber, search, signal, categoryId)
          : listPreviewProducts(nextPageNumber, search, signal),
        staleTime: 30_000, gcTime: 5 * 60_000, retry: false, refetchOnWindowFocus: false,
      }).catch(() => null)
      : Promise.resolve(null);

    const warmUpcomingProducts = async () => {
      const upcoming = [...nearbyRows];
      for (const row of nearbyRows) onProductWarm?.(mapPreviewProduct(row.previewSource));

      const warmProduct = async (row: typeof rows[number]) => {
        if (cancelled) return;
        try {
          const source = await queryClient.fetchQuery({
            queryKey: ['image-template-erp-product', userId, row.id, requiredImageCount],
            queryFn: ({ signal }) => readPreviewProduct(row.id, signal, requiredImageCount),
            staleTime: 30_000, gcTime: 5 * 60_000, retry: false, refetchOnWindowFocus: false,
          });
          if (cancelled) return;
          const variation = source.variations.find((entry) => entry.active !== false) ?? source.variations[0];
          onProductWarm?.(mapPreviewProduct(source, variation?.id ?? ''));
        } catch {
          // A prévia continua carregando normalmente se o aquecimento em segundo plano falhar.
        }
        return !cancelled;
      };

      for (const row of upcoming) if (!await warmProduct(row)) return;

      if (cancelled || upcoming.length >= 5) return;
      const nextPage = await nextPagePromise;
      if (cancelled || !nextPage) return;
      for (const row of nextPage.rows.slice(0, 5 - upcoming.length)) {
        onProductWarm?.(mapPreviewProduct(row.previewSource));
        if (!await warmProduct(row)) return;
      }
    };

    void warmUpcomingProducts();
    return () => { cancelled = true; };
  }, [categoryId, onProductWarm, page, position, products.data?.total, queryClient, requiredImageCount,
    rows, search, searchReady, userId, productId]);

  useEffect(() => {
    if (!pendingPageEdge || !products.isSuccess || !rows.length) return;
    const next = pendingPageEdge === 'last' ? rows[rows.length - 1] : rows[0];
    setSelectedProduct(next.id);
    setPendingPageEdge(null);
  }, [pendingPageEdge, products.isSuccess, rows]);

  function selectProduct(id: string) {
    setSelectedProduct(id);
    setPendingPageEdge(null);
  }

  function stepProduct(direction: -1 | 1) {
    const next = rows[position + direction];
    if (next) { selectProduct(next.id); return; }
    if (direction === 1 && page * PREVIEW_PRODUCT_PAGE_SIZE < (products.data?.total ?? 0)) {
      setPage(page + 1);
    } else if (direction === -1 && page > 1) {
      setPage(page - 1);
    } else return;
    setPendingPageEdge(direction === -1 ? 'last' : 'first');
  }

  function selectCategory(id: string) {
    setCategoryId(id); setPage(1); setPendingPageEdge(null);
  }

  return {
    searchInput, setSearchInput, searchReady, products, groups, rows, page, position, productId, detail, product,
    categoryId, selectCategory, variationId, selectProduct, stepProduct,
    initialProducts,
    resolveFresh: (source: PreviewProductSource) => mapPreviewProduct(source, variationId),
  };
}

type Preview = ReturnType<typeof useTemplateProductPreview>;

export function TemplateProductPreview({ preview, disabled, onProductIntent }: {
  preview: Preview; disabled: boolean; onProductIntent?: (id: string) => void;
}) {
  const { products, groups, detail, rows, position, productId, categoryId, page, initialProducts } = preview;
  const setSearchInput = preview.setSearchInput;
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const pickerAnchorRef = useRef<HTMLDivElement>(null);
  const pickerSearchRef = useRef<HTMLInputElement>(null);
  const failure = products.isError ? products : detail.isError ? detail : null;
  const hasNext = position < rows.length - 1 || page * PREVIEW_PRODUCT_PAGE_SIZE < (products.data?.total ?? 0);
  const searchLength = preview.searchInput.trim().replace(/[^\p{L}\p{N}]/gu, '').length;
  const selectedDetails = detail.data?.id === productId ? detail.data : null;
  const optionRows = rows.map((row) => ({ id: row.id, name: row.name, code: row.code }));
  if (productId && !optionRows.some((row) => row.id === productId)) {
    const retainedRow = initialProducts.data?.rows.find((row) => row.id === productId);
    if (selectedDetails) optionRows.push({ id: selectedDetails.id, name: selectedDetails.name, code: selectedDetails.code });
    else if (retainedRow) optionRows.push({ id: retainedRow.id, name: retainedRow.name, code: retainedRow.code });
    else optionRows.push({ id: productId, name: 'Produto selecionado', code: '' });
  }
  const selectedProduct = optionRows.find((row) => row.id === productId);
  const menuRows = rows.slice(0, PREVIEW_PRODUCT_PAGE_SIZE);
  const closeProductPicker = useCallback(() => {
    setProductPickerOpen(false);
    setSearchInput('');
  }, [setSearchInput]);
  useEffect(() => {
    if (!productPickerOpen) return;
    const frame = window.requestAnimationFrame(() => pickerSearchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [productPickerOpen]);
  useEffect(() => {
    if (disabled) closeProductPicker();
  }, [closeProductPicker, disabled]);

  function openProductPicker() {
    if (disabled) return;
    setSearchInput('');
    setProductPickerOpen(true);
  }

  function chooseProduct(id: string) {
    preview.selectProduct(id);
    closeProductPicker();
  }

  return <section className="ct-preview-controls" aria-label="Prévia do produto">
    <fieldset className="ct-preview-fields" disabled={disabled}>
      <label className="ct-field ct-preview-group">
        <span>Conjunto de produtos</span>
        <select value={categoryId} onChange={(event) => preview.selectCategory(event.target.value)}>
          <option value="">Todos os produtos</option>
          {(groups.data ?? []).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </label>
      <div ref={pickerAnchorRef} className="ct-field ct-preview-product">
        <span id="ct-preview-product-label">Produto do preview</span>
        <button type="button" className="ct-button ct-preview-product-trigger"
          aria-labelledby="ct-preview-product-label ct-preview-product-selected"
          aria-haspopup="listbox" aria-expanded={productPickerOpen} aria-controls="ct-preview-product-options"
          disabled={disabled} onClick={productPickerOpen ? closeProductPicker : openProductPicker}>
          <span id="ct-preview-product-selected">{selectedProduct?.name || 'Produto de exemplo'}</span>
          <i className={`bi ${productPickerOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" />
        </button>
        <DropdownPortal anchorRef={pickerAnchorRef} isOpen={productPickerOpen} placement="top" onClose={closeProductPicker}>
          <div className="ct-preview-picker ct-surface">
            <label className="ct-preview-picker-search">
              <span>Buscar produto</span>
              <input ref={pickerSearchRef} type="search" maxLength={120} value={preview.searchInput}
                placeholder="Nome ou código (mín. 3 caracteres)" disabled={disabled}
                onChange={(event) => setSearchInput(event.target.value)} />
            </label>
            <div id="ct-preview-product-options" className="ct-preview-picker-options" role="listbox" aria-label="Produtos">
              {!preview.searchReady ? <p className="ct-preview-picker-status">
                {searchLength < PRODUCT_LIST_SEARCH_MIN_LENGTH
                  ? 'Digite pelo menos três letras ou números para pesquisar.'
                  : 'Aguarde a busca…'}
              </p> : products.isFetching ? <p className="ct-preview-picker-status" role="status">Buscando produtos…</p>
                : !menuRows.length ? <p className="ct-preview-picker-status">Nenhum produto encontrado.</p>
                  : menuRows.map((row) => <button key={row.id} type="button" role="option" aria-selected={row.id === productId}
                    className="ct-preview-picker-option" disabled={disabled}
                    onMouseEnter={() => onProductIntent?.(row.id)} onFocus={() => onProductIntent?.(row.id)}
                    onClick={() => chooseProduct(row.id)}>
                    <span>{row.name}</span><small>{row.code || 'Sem código'}</small>
                  </button>)}
            </div>
          </div>
        </DropdownPortal>
      </div>
      <div className="ct-arrows">
        <button className="ct-button" type="button" aria-label="Produto anterior" disabled={products.isFetching || (position < 1 && page === 1)}
          onMouseEnter={() => { const row = rows[position - 1]; if (row) onProductIntent?.(row.id); }}
          onFocus={() => { const row = rows[position - 1]; if (row) onProductIntent?.(row.id); }}
          onClick={() => preview.stepProduct(-1)}><i className="bi bi-arrow-left" aria-hidden="true" /></button>
        <button className="ct-button" type="button" aria-label="Próximo produto" disabled={products.isFetching || !hasNext}
          onMouseEnter={() => { const row = rows[position + 1]; if (row) onProductIntent?.(row.id); }}
          onFocus={() => { const row = rows[position + 1]; if (row) onProductIntent?.(row.id); }}
          onClick={() => preview.stepProduct(1)}><i className="bi bi-arrow-right" aria-hidden="true" /></button>
      </div>
    </fieldset>
    {groups.isError && <p className="ct-preview-message" role="alert">Não foi possível carregar as categorias do ERP.
      <button className="ct-link" type="button" disabled={disabled} onClick={() => void groups.refetch()}>Tentar novamente</button>
    </p>}
    {failure && <p className="ct-preview-message" role="alert">{imageTemplateError(failure.error)} <button className="ct-link" type="button" disabled={disabled} onClick={() => void failure.refetch()}>Tentar novamente</button></p>}
    {!failure && (detail.isFetching || (!productId && initialProducts.isFetching)) && <p className="ct-preview-message" role="status">Carregando a prévia do produto…</p>}
    {!failure && !products.isFetching && !rows.length && !productId && <p className="ct-preview-message">
      Nenhum produto encontrado. A tela mostra uma imagem de exemplo.
    </p>}
  </section>;
}
