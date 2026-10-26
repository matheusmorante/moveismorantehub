import React from 'react';
import type Product from '@/pages/types/product.type';
import {
  resolveStockOrigin,
  type StockOrigin,
} from '../../../../../../../../shared-utils/productStockOrigin';

export { resolveStockOrigin, type StockOrigin };

export interface StockOriginBadgeProps {
  readonly product?: Partial<Product> | null;
  readonly singleVariation?: any;
  readonly oppName?: string | null;
  readonly size?: 'sm' | 'xs';
  readonly className?: string;
}

/**
 * Rótulo de Origem do Estoque:
 * - Sem ícones
 * - Convencional: azul (container azul, texto azul escuro)
 * - Salvados: avermelhado quente
 * - Usados: âmbar/dourado
 */
export const StockOriginBadge: React.FC<StockOriginBadgeProps> = ({
  product,
  singleVariation,
  oppName,
  size = 'sm',
  className = '',
}) => {
  const origin = resolveStockOrigin(product, singleVariation, oppName);

  const colorStyles: Record<StockOrigin, string> = {
    Convencional:
      'bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/50',
    Salvados:
      'bg-red-100 text-red-900 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900/50',
    Usados:
      'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-955/60 dark:text-amber-300 dark:border-amber-800/60',
  };

  const sizeStyles =
    size === 'xs'
      ? 'px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider'
      : 'px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider';

  return (
    <span
      data-testid="stock-origin-badge"
      className={`inline-flex items-center justify-center border select-none ${colorStyles[origin]} ${sizeStyles} ${className}`}
      title={`Origem do estoque: ${origin}`}
    >
      {origin}
    </span>
  );
};

export default StockOriginBadge;
