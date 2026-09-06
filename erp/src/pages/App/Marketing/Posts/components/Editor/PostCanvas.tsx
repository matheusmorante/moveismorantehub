import React, { useLayoutEffect, useRef, useState } from 'react';
import { Layer, AspectRatioType, AssetLayer, DynamicTextLayer, VariationGalleryLayer } from '../../types';
import { VariationGalleryView } from './VariationGalleryView';
import { FittedLayerText } from './FittedLayerText';
import { PaymentBrands } from './PaymentBrands';

export interface PostProductData {
  name: string; price: string; oldPrice?: string; slogan?: string; installmentValue?: string;
  mainImageUrl: string; ambiented?: boolean; galleryImages?: Array<{ id: string; image_url: string }>;
  variations?: Array<{ id: string; image_url?: string }>; activeVariationId?: string;
}
interface Props {
  aspectRatio: AspectRatioType; layers: Layer[]; product: PostProductData; backgroundColor?: string;
  selectedLayerId?: string | null; onSelectLayer?: (id: string) => void;
  onUpdateLayerPos?: (id: string, x: number, y: number) => void;
  showRegions?: boolean;
}
export const PostCanvas: React.FC<Props> = ({ aspectRatio, layers, product, backgroundColor = '#24170e',
  selectedLayerId, onSelectLayer, onUpdateLayerPos, showRegions = false }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(675);
  useLayoutEffect(() => { const observer = new ResizeObserver(() => setHeight(ref.current?.clientHeight || 675));
    observer.observe(ref.current!); return () => observer.disconnect(); }, []);
  const resolve = (binding: string) => binding.replaceAll('{{product.name}}', product.name)
    .replaceAll('{{product.price}}', product.price).replaceAll('{{product.oldPrice}}', product.oldPrice || '')
    .replaceAll('{{product.slogan}}', product.slogan || '').replaceAll('{{product.installmentValue}}', product.installmentValue || '');
  const drag = (event: React.PointerEvent, layer: Layer) => {
    onSelectLayer?.(layer.id);
    if (layer.locked || !onUpdateLayerPos || !ref.current) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    const rect = ref.current.getBoundingClientRect(), x = event.clientX, y = event.clientY;
    const target = event.currentTarget;
    const move = (e: Event) => { const p = e as PointerEvent;
      onUpdateLayerPos(layer.id, Math.max(0, Math.min(1 - layer.width, layer.x + (p.clientX - x) / rect.width)),
        Math.max(0, Math.min(1 - (layer.height || .1), layer.y + (p.clientY - y) / rect.height))); };
    const end = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', end); target.removeEventListener('pointercancel', end); };
    target.addEventListener('pointermove', move); target.addEventListener('pointerup', end); target.addEventListener('pointercancel', end);
  };
  return <div ref={ref} id="marketing-post-canvas" className="relative w-full max-w-[540px] overflow-hidden shadow-2xl"
    style={{ aspectRatio: aspectRatio.replace(':', '/'), backgroundColor }}>
    {showRegions && <><div className="pointer-events-none absolute z-50 border border-dashed border-cyan-300/80" style={{ inset: '3%' }} />
      <div className="pointer-events-none absolute z-50 left-[3%] top-[3%] bg-cyan-950/80 px-1 text-[8px] text-cyan-100">SAFE AREA</div></>}
    {[...layers].sort((a, b) => a.zIndex - b.zIndex).map(layer => {
      if (!layer.visible) return null;
      const textLayer = layer as DynamicTextLayer;
      if (textLayer.textBinding === '{{product.oldPrice}}' && !product.oldPrice) return null;
      return <div key={layer.id} onPointerDown={event => drag(event, layer)} data-layer-id={layer.id}
        style={{ position: 'absolute', left: layer.x * 100 + '%', top: layer.y * 100 + '%', width: layer.width * 100 + '%',
          height: (layer.height || .1) * 100 + '%', transform: 'rotate(' + (layer.rotation || 0) + 'deg)', zIndex: layer.zIndex,
          opacity: layer.opacity ?? 1, touchAction: 'none', cursor: layer.locked ? 'default' : 'move',
          outline: selectedLayerId === layer.id ? '2px solid #818cf8' : undefined }}>
        {showRegions && <span className="pointer-events-none absolute left-0 top-0 z-50 bg-fuchsia-950/80 px-1 text-[8px] text-fuchsia-100">{layer.role || layer.name}</span>}
        {layer.type === 'PRODUCT_MAIN_IMAGE' && <>
          <img crossOrigin="anonymous" src={product.mainImageUrl} alt={product.name} draggable={false}
            className="w-full h-full pointer-events-none" style={{ objectFit: product.ambiented ? 'cover' : 'contain', objectPosition: 'left center' }} />
          {product.ambiented && <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent 45%,rgba(20,10,4,.6)),linear-gradient(0deg,rgba(20,10,4,.4),transparent 25%)' }} />}
        </>}
        {layer.type === 'ASSET' && (layer as AssetLayer).assetUrl && <img crossOrigin="anonymous" src={(layer as AssetLayer).assetUrl}
          alt={layer.name} draggable={false} className="w-full h-full object-contain pointer-events-none" />}
        {['DYNAMIC_TEXT', 'DYNAMIC_PRICE', 'DYNAMIC_INSTALLMENT'].includes(layer.type) && textLayer.textBinding !== undefined && <div className="w-full h-full flex flex-col justify-center overflow-hidden"
          style={{ background: textLayer.backgroundColor, padding: (textLayer.backgroundPadding || 0) * height / 1350,
            clipPath: textLayer.backgroundShape === 'brush' ? 'polygon(3% 4%,97% 0,94% 5%,100% 9%,97% 19%,100% 25%,98% 83%,100% 91%,94% 95%,3% 100%,5% 94%,0 89%,3% 75%,0 66%,2% 22%,0 12%)' : undefined,
            borderRadius: textLayer.borderRadius || 0 }}>
          <FittedLayerText layer={textLayer} text={resolve(textLayer.textBinding)} canvasHeight={height} />
          {layer.role === 'installment' && <PaymentBrands />}
        </div>}
        {layer.type === 'VARIATION_GALLERY' && <VariationGalleryView layer={layer as VariationGalleryLayer}
          variations={product.galleryImages || product.variations || []} activeVariationId={product.galleryImages ? undefined : product.activeVariationId} />}
      </div>;
    })}
  </div>;
};
