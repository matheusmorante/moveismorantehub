import React from 'react';
import { VariationGalleryLayer } from '../../types';

interface ProductVariationItem {
  id: string;
  name?: string;
  sku?: string;
  image_url?: string;
}

interface VariationGalleryViewProps {
  layer: VariationGalleryLayer;
  variations: ProductVariationItem[];
  activeVariationId?: string;
}

export const VariationGalleryView: React.FC<VariationGalleryViewProps> = ({
  layer,
  variations,
  activeVariationId
}) => {
  // Se houver apenas 1 variação ou nenhuma outra variação, não exibe o bloco
  const otherVariations = variations.filter(v => v.id !== activeVariationId && v.image_url);
  if (otherVariations.length === 0) return null;

  return (
    <div
      className="w-full h-full grid overflow-hidden"
      style={{ gap: `${(layer.gapRelative || .01) * 100}%`,
        gridTemplateColumns: `repeat(${layer.direction === 'vertical' ? 1 : layer.direction === 'grid' ? Math.ceil(Math.sqrt(otherVariations.length)) : otherVariations.length}, minmax(0, 1fr))`,
        gridAutoRows: 'minmax(0, 1fr)' }}
    >
      {otherVariations.map((varItem, idx) => (
        <div
          key={varItem.id || idx}
          className="overflow-hidden bg-white shadow-md min-h-0"
          style={{
            borderRadius: `${layer.borderRadius || 8}px`,
            borderWidth: `${layer.borderWidth || 3}px`,
            borderColor: layer.borderColor || '#ffffff'
          }}
        >
          <img
            src={varItem.image_url}
            alt=""
            crossOrigin="anonymous" draggable={false}
            className="w-full h-full object-contain block pointer-events-none"
          />
        </div>
      ))}
    </div>
  );
};
