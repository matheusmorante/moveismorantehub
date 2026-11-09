import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listPreviewProductGroups, listPreviewProducts, mapPreviewProduct, PREVIEW_PRODUCT_PAGE_SIZE, readPreviewProduct,
  type PreviewProductSource } from './productPreviewService';
import { imageTemplateError } from './imageTemplateService';
import { PRODUCT_LIST_SEARCH_DEBOUNCE_MS, PRODUCT_LIST_SEARCH_MIN_LENGTH } from '../../../../../../shared-utils/productListSearch';

export function useTemplateProductPreview(userId: string, requiredImageCount = 1) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [preferLast, setPreferLast] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<{ productId: string; id: string } | null>(null);
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const timer = window.setTimeout(() => {
      setSearch(next); setPage(1); setSelectedProduct(''); setPreferLast(false);
    }, PRODUCT_LIST_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  const searchReady = !search || search.replace(/[^\p{L}\p{N}]/gu, '').length >= PRODUCT_LIST_SEARCH_MIN_LENGTH;
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
  const rows = products.data?.rows ?? [];
  const found = rows.findIndex((row) => row.id === selectedProduct);
  const position = found >= 0 ? found : preferLast ? rows.length - 1 : 0;
  const productId = rows[position]?.id;
  const detail = useQuery({
    queryKey: ['image-template-erp-product', userId, productId, requiredImageCount],
    queryFn: ({ signal }) => readPreviewProduct(productId!, signal, requiredImageCount),
    enabled: !!productId, staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true,
  });
  const variations = detail.data?.variations ?? [];
  const chosenId = selectedVariation && selectedVariation.productId === productId ? selectedVariation.id : '';
  const variation = variations.find((entry) => entry.id === chosenId)
    ?? variations.find((entry) => entry.active !== false) ?? variations[0];
  const variationId = variation?.id ?? '';
  const product = useMemo(() => detail.data ? mapPreviewProduct(detail.data, variationId) : null, [detail.data, variationId]);

  function stepProduct(direction: -1 | 1) {
    const next = rows[position + direction];
    if (next) { setSelectedProduct(next.id); return; }
    if (direction === 1 && page * PREVIEW_PRODUCT_PAGE_SIZE < (products.data?.total ?? 0)) {
      setPage(page + 1);
    } else if (direction === -1 && page > 1) {
      setPage(page - 1);
    } else return;
    setPreferLast(direction === -1);
    setSelectedProduct('');
  }

  function selectCategory(id: string) {
    setCategoryId(id); setPage(1); setSelectedProduct(''); setPreferLast(false); setSelectedVariation(null);
  }

  return {
    searchInput, setSearchInput, searchReady, products, groups, rows, page, position, productId, detail, product,
    categoryId, selectCategory, variations, variationId, setSelectedProduct, setSelectedVariation, stepProduct,
    resolveFresh: (source: PreviewProductSource) => mapPreviewProduct(source, variationId),
  };
}

type Preview = ReturnType<typeof useTemplateProductPreview>;

export function TemplateProductPreview({ preview, disabled }: { preview: Preview; disabled: boolean }) {
  const { products, groups, detail, rows, position, productId, categoryId, variations, variationId, page } = preview;
  const failure = products.isError ? products : detail.isError ? detail : null;
  const hasNext = position < rows.length - 1 || page * PREVIEW_PRODUCT_PAGE_SIZE < (products.data?.total ?? 0);
  return <section className="ct-preview-controls" aria-label="Prévia do produto">
    <fieldset className="ct-preview-fields" disabled={disabled}>
      <label className="ct-field ct-preview-group">
        <span>Conjunto de produtos</span>
        <select value={categoryId} onChange={(event) => preview.selectCategory(event.target.value)}>
          <option value="">Todos os produtos</option>
          {(groups.data ?? []).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </label>
      <label className="ct-field ct-preview-search">
        <span>Pesquisar produtos</span>
        <input type="search" maxLength={120} value={preview.searchInput} placeholder="Nome ou código"
          onChange={(event) => preview.setSearchInput(event.target.value)} />
      </label>
      <label className="ct-field ct-preview-product">
        <span>Prévia de um produto</span>
        <select value={productId ?? ''} disabled={!rows.length} onChange={(event) => preview.setSelectedProduct(event.target.value)}>
          {!rows.length && <option value="">{products.isFetching ? 'Carregando produtos…' : 'Produto de exemplo'}</option>}
          {rows.map((row) => <option key={row.id} value={row.id}>{row.name}{row.code ? ' · ' + row.code : ''}{row.active ? '' : ' · desativado'}</option>)}
        </select>
      </label>
      {variations.length > 1 && <label className="ct-field ct-preview-variation">
        <span>Variação</span>
        <select value={variationId} onChange={(event) => productId && preview.setSelectedVariation({ productId, id: event.target.value })}>
          {variations.map((variation) => <option key={variation.id} value={variation.id}>
            {variation.name || variation.sku}{variation.active === false ? ' · desativada' : ''}
          </option>)}
        </select>
      </label>}
      <div className="ct-arrows">
        <button className="ct-button" type="button" aria-label="Produto anterior" disabled={products.isFetching || (position < 1 && page === 1)}
          onClick={() => preview.stepProduct(-1)}><i className="bi bi-arrow-left" aria-hidden="true" /></button>
        <button className="ct-button" type="button" aria-label="Próximo produto" disabled={products.isFetching || !hasNext}
          onClick={() => preview.stepProduct(1)}><i className="bi bi-arrow-right" aria-hidden="true" /></button>
      </div>
    </fieldset>
    {groups.isError && <p className="ct-preview-message" role="alert">Não foi possível carregar as categorias do ERP.
      <button className="ct-link" type="button" disabled={disabled} onClick={() => void groups.refetch()}>Tentar novamente</button>
    </p>}
    {!preview.searchReady && <p className="ct-preview-message">Digite pelo menos três letras ou números para pesquisar.</p>}
    {failure && <p className="ct-preview-message" role="alert">{imageTemplateError(failure.error)} <button className="ct-link" type="button" disabled={disabled} onClick={() => void failure.refetch()}>Tentar novamente</button></p>}
    {!failure && (products.isFetching || detail.isFetching) && <p className="ct-preview-message" role="status">Carregando a prévia do produto…</p>}
    {!failure && preview.searchReady && !products.isFetching && !rows.length && <p className="ct-preview-message">Nenhum produto encontrado. A tela mostra uma imagem de exemplo.</p>}
  </section>;
}
