import React from 'react';
import ProductImage from '@/components/ProductImage';
import { formatPrice, type CatalogItem } from './productCatalogPresentation';
import { priceOf, productImageOf } from './productCatalogItems';
import type { SupportCatalogProduct, SupportCatalogVariation } from './supportCatalogService';

const getCardClassName = (isSelected: boolean) =>
  `catalog-product-card rounded-2xl border p-3 transition-colors ${isSelected ? 'border-emerald-400 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`;

const ProductImageThumbnail: React.FC<{ src: string }> = ({ src }) => (
  src ? (
    <ProductImage src={src} size="thumbnail" alt="" loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 object-cover dark:bg-slate-800" />
  ) : (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800"><i className="bi bi-image" aria-hidden="true" /></div>
  )
);

interface ProductCatalogVariationCardProps {
  product: SupportCatalogProduct;
  variation: SupportCatalogVariation;
  item: CatalogItem;
  isBulkProduct: boolean;
  isSelected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export const ProductCatalogVariationCard: React.FC<ProductCatalogVariationCardProps> = ({
  product,
  variation,
  item,
  isBulkProduct,
  isSelected,
  disabled,
  onToggle,
}) => {
  const variationLabel = item.variationName || (variation.sku ? `SKU ${variation.sku}` : 'Variação');
  const image = productImageOf(product, variation);

  return (
    <article className={getCardClassName(isSelected)}>
      <label className="flex min-w-0 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={disabled}
          onChange={onToggle}
          aria-label={`${isBulkProduct ? 'Remover todas as variações de' : 'Selecionar'} ${product.title || product.name} · ${variationLabel}`}
          className="mt-1 h-4 w-4 accent-emerald-600 disabled:cursor-not-allowed"
        />
        <ProductImageThumbnail src={image} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold">{variationLabel}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{product.title || product.name} · {product.category || 'Sem categoria'}{product.brand ? ` · ${product.brand}` : ''}</p>
          {variation.sku && <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">SKU {variation.sku}</p>}
          <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatPrice(item.price)}</p>
        </div>
      </label>
    </article>
  );
};

interface ProductCatalogSingleProductCardProps {
  product: SupportCatalogProduct;
  hasMatchingBulkScope: boolean;
  isSelected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export const ProductCatalogSingleProductCard: React.FC<ProductCatalogSingleProductCardProps> = ({
  product,
  hasMatchingBulkScope,
  isSelected,
  disabled,
  onToggle,
}) => {
  const image = productImageOf(product, product.variations?.[0]);

  return (
    <article className={getCardClassName(isSelected)}>
      <div className="flex gap-3">
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={disabled}
            onChange={onToggle}
            aria-label={`${hasMatchingBulkScope ? 'Incluir ou remover' : 'Selecionar'} ${product.name || 'produto'}`}
            className="mt-1 h-4 w-4 accent-emerald-600 disabled:cursor-not-allowed"
          />
          <ProductImageThumbnail src={image} />
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold">{product.title || product.name}</h3>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{product.category || 'Sem categoria'}{product.brand ? ` · ${product.brand}` : ''}</p>
            <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatPrice(priceOf(product, product.variations?.[0]))}</p>
          </div>
        </label>
      </div>
    </article>
  );
};
