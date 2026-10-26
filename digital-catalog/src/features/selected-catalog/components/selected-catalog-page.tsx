'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, PackageSearch } from 'lucide-react';
import { fetchSelectedCatalog } from '../api/selected-catalog-api';
import type {
  SelectedCatalogItemToken,
  SelectedCatalogProduct,
  SelectedCatalogRequest,
  SelectedCatalogVariation,
} from '../types';

const formatPrice = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const removeHtml = (value: string | null) =>
  (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const imageOf = (product: SelectedCatalogProduct, variation?: SelectedCatalogVariation) =>
  variation?.image_url || product.image_url || '';

const effectivePrice = (product: SelectedCatalogProduct, variation?: SelectedCatalogVariation) => {
  const promo = Number(variation?.promo_price ?? product.promo_price ?? 0);
  return promo > 0 ? promo : Number(variation?.price ?? product.price ?? 0);
};

const detailUrl = (product: SelectedCatalogProduct, variation?: SelectedCatalogVariation) => {
  const path = `/produto/${encodeURIComponent(product.slug || product.id)}`;
  return variation?.id ? `${path}?var=${encodeURIComponent(variation.id)}` : path;
};

const variantLabel = (variation: SelectedCatalogVariation) => {
  if (variation.name) return variation.name;
  const attributes = variation.attributes;
  if (Array.isArray(attributes)) {
    return attributes.map((attribute: any) => String(attribute?.value || '')).filter(Boolean).join(' / ');
  }
  return '';
};

const displayItems = (
  products: SelectedCatalogProduct[],
  tokens: SelectedCatalogItemToken[],
  includeFilteredProducts: boolean,
): Array<{ product: SelectedCatalogProduct; variation?: SelectedCatalogVariation }> => {
  if (!tokens.length) return products.map((product) => ({
    product,
    ...(product.product_variations.length === 1 ? { variation: product.product_variations[0] } : {}),
  }));
  return products.flatMap((product) => {
    const selected = tokens.filter((token) => token.productId === product.id);
    if (!selected.length) return includeFilteredProducts ? [{ product }] : [];
    return selected.map((token) => ({
      product,
      ...(token.variationId
        ? { variation: product.product_variations.find((variation) => variation.id === token.variationId) }
        : {}),
    })).filter((item) => !selected.some((token) => token.variationId) || Boolean(item.variation));
  });
};

export function SelectedCatalogPage({ request }: { request: SelectedCatalogRequest }) {
  const [products, setProducts] = useState<SelectedCatalogProduct[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadingMoreError, setLoadingMoreError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [loadedPage, setLoadedPage] = useState(1);
  const [error, setError] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = null;
    setIsLoading(true);
    setIsLoadingMore(false);
    setError('');
    setLoadingMoreError('');
    setProducts([]);
    setTotalCount(0);
    setLoadedPage(1);
    void fetchSelectedCatalog(request, 1, controller.signal)
      .then((result) => {
        if (!active) return;
        setProducts(result.products);
        setCategoryName(result.categoryName);
        setTotalCount(result.totalCount);
        setLoadedPage(result.page);
      })
      .catch((loadError) => {
        if (!active || controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível abrir esta seleção do catálogo.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
      loadMoreControllerRef.current?.abort();
      loadMoreControllerRef.current = null;
    };
  }, [request, reloadNonce]);

  const tokens = useMemo(() => request.itemTokens.map((token) => {
    const [productId, variationId] = token.split('~');
    return { productId, ...(variationId ? { variationId } : {}) };
  }), [request.itemTokens]);
  const includeFilteredProducts = request.allProducts || Boolean(request.categoryId || request.search || request.brand);
  const items = useMemo(() => displayItems(products, tokens, includeFilteredProducts), [products, tokens, includeFilteredProducts]);
  const title = categoryName ? `Seleção de ${categoryName}` : 'Produtos selecionados para você';

  const loadMore = async () => {
    if (isLoadingMore || products.length >= totalCount) return;
    const controller = new AbortController();
    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = controller;
    setIsLoadingMore(true);
    setLoadingMoreError('');
    try {
      const result = await fetchSelectedCatalog(request, loadedPage + 1, controller.signal);
      setProducts((current) => Array.from(new Map([...current, ...result.products].map((product) => [product.id, product])).values()));
      setLoadedPage(result.page);
      setTotalCount(result.totalCount);
    } catch (loadError) {
      if (!controller.signal.aborted) setLoadingMoreError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar mais produtos.');
    } finally {
      if (loadMoreControllerRef.current === controller) {
        loadMoreControllerRef.current = null;
        setIsLoadingMore(false);
      }
    }
  };

  return (
    <main className="min-h-[65vh] bg-background px-4 py-8 sm:px-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
        </Link>
        <header className="mb-8 space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Móveis Morante</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="text-muted-foreground">
            {request.search || request.brand
              ? `Produtos filtrados${request.search ? ` por “${request.search}”` : ''}${request.brand ? ` · ${request.brand}` : ''}.`
              : 'Confira os produtos selecionados para este atendimento.'}
          </p>
        </header>

        {isLoading && (
          <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent" /> Carregando produtos…
          </div>
        )}

        {!isLoading && error && (
          <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
            <p>{error}</p>
            <button type="button" onClick={() => setReloadNonce((current) => current + 1)} className="mt-3 rounded-lg border border-destructive/40 px-3 py-2 font-semibold hover:bg-destructive/10">Tentar novamente</button>
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">{items.length} produto{items.length === 1 ? '' : 's'} carregado{items.length === 1 ? '' : 's'} · {totalCount} no total</p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map(({ product, variation }, index) => {
                const image = imageOf(product, variation);
                const productUrl = detailUrl(product, variation);
                const price = effectivePrice(product, variation);
                return (
                  <article key={`${product.id}:${variation?.id || index}`} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg">
                    <Link href={productUrl} className="relative block aspect-[4/3] overflow-hidden bg-muted">
                      {image ? (
                        // `product_images` and variant photos are public catalog assets from Supabase Storage.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={variation ? `${product.name} ${variantLabel(variation)}` : product.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground"><PackageSearch className="h-10 w-10" /></div>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-4">
                      <h2 className="line-clamp-2 text-base font-bold leading-snug text-card-foreground">{product.name}</h2>
                      {variation && variantLabel(variation) && <p className="mt-1 text-sm text-muted-foreground">{variantLabel(variation)}</p>}
                      {product.brand && <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{product.brand}</p>}
                      {removeHtml(product.description) && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{removeHtml(product.description)}</p>}
                      {!request.hidePrices && <p className="mt-3 text-lg font-extrabold text-primary">{formatPrice(price)}</p>}
                      <Link href={productUrl} className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-bold text-primary hover:underline">
                        Ver produto <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
            {loadingMoreError && <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{loadingMoreError}</p>}
            {products.length < totalCount && <button type="button" onClick={() => void loadMore()} disabled={isLoadingMore} className="mt-6 w-full rounded-xl border border-border px-4 py-3 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-50">{isLoadingMore ? 'Carregando…' : loadingMoreError ? 'Tentar carregar mais' : 'Carregar mais produtos'}</button>}
          </>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 text-center">
            <PackageSearch className="mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-bold">Nenhum produto disponível nesta seleção</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">Os produtos podem ter sido ocultados ou desativados desde que o link foi criado.</p>
            <Link href="/" className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Ver catálogo completo</Link>
          </div>
        )}
      </div>
    </main>
  );
}
