import React from 'react';
import Product, { Variation } from '@/pages/types/product.type';
import { formatCurrency } from '@/pages/utils/formatters';
import { getSelectedProductDisplayName } from '@/pages/utils/productVariationDefaults';
import { getSelectedProductPricing } from '@/pages/utils/productPricing';

interface ProductSearchItemProps {
  product: Product;
  variation?: Variation;
  priceType: 'unit' | 'cost';
  onClick: () => void;
}

export const ProductSearchItem = ({
  product,
  variation,
  priceType,
  onClick,
}: ProductSearchItemProps) => {
  const pricing = getSelectedProductPricing(product, variation);
  const price = variation
    ? priceType === 'cost'
      ? variation.costPrice || product.costPrice || 0
      : pricing.finalUnitPrice
    : priceType === 'cost'
      ? product.costPrice || 0
      : pricing.finalUnitPrice;

  const title = getSelectedProductDisplayName(product, variation);

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0 shadow-sm">
          {product.code || 'N/A'}
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h4>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">
            {product.category || 'Sem Categoria'} {variation?.sku ? `• SKU: ${variation.sku}` : ''}
          </p>
        </div>
      </div>
      <div className="text-right">
        {priceType === 'unit' && pricing.hasDiscount ? <span className="block text-[10px] font-semibold text-slate-400 line-through">{formatCurrency(pricing.unitPrice)}</span> : null}
        <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
          {formatCurrency(price)}
        </span>
        {priceType === 'unit' && pricing.promotionId ? <span className="mt-0.5 block max-w-36 truncate text-[9px] font-bold text-blue-600 dark:text-blue-400" title={pricing.promotionName || 'Promoção ativa'}>{pricing.promotionName || `${pricing.promotionDiscountPercent}% de desconto`}</span> : null}
      </div>
    </div>
  );
};
