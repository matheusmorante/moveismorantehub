import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';

export const MergedVariationSku: React.FC<{ variationId: string }> = ({ variationId }) => {
  const [sku, setSku] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (typeof supabase?.from === 'function') {
      supabase
        .from('product_variations')
        .select('sku')
        .eq('id', variationId)
        .single()
        .then(({ data }) => {
          if (active && data?.sku) {
            setSku(data.sku);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [variationId]);

  if (!sku) return <span className="font-bold">...</span>;
  return <span className="font-bold text-[8px] tracking-widest">{normalizeVariationSku(sku)}</span>;
};

export interface MergedBadgeProps {
  readonly targetVariationId?: string;
  readonly size?: 'sm' | 'xs';
}

export const MergedBadge: React.FC<MergedBadgeProps> = ({ targetVariationId, size = 'xs' }) => {
  const textSize = size === 'xs' ? 'text-[7px] sm:text-[8px]' : 'text-[8px] sm:text-[9px]';
  const iconSize = size === 'xs' ? 'text-[8px]' : 'text-[9px]';

  return (
    <span
      data-testid="merged-badge"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${textSize} font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 dark:bg-red-955/20 dark:text-red-400 dark:border-red-900/30 select-none shrink-0`}
      title={
        targetVariationId
          ? 'Esta variação foi mesclada e seu estoque transferido para outro cadastro.'
          : 'Este produto possui variações mescladas em outro cadastro.'
      }
    >
      <i className={`bi bi-bezier2 text-red-500 dark:text-red-400 ${iconSize}`} aria-hidden="true" />
      <span>Mesclado</span>
      {targetVariationId && (
        <>
          <span className="text-red-400 dark:text-red-500 font-normal lowercase">em</span>
          <i className="bi bi-arrow-right text-red-400 dark:text-red-500" aria-hidden="true" />
          <MergedVariationSku variationId={targetVariationId} />
        </>
      )}
    </span>
  );
};

export default MergedBadge;
