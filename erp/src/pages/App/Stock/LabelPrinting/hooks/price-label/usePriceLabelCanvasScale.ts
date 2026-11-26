import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

type CanvasContainerRef = { readonly current: HTMLDivElement | null };

export function usePriceLabelCanvasScale(
  containerRef: CanvasContainerRef,
  canvasWidth: number,
  canvasHeight: number
) {
  const [scale, setScale] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateScale = () => {
      const width = element.clientWidth || element.parentElement?.clientWidth || 0;
      const height = element.clientHeight || element.parentElement?.clientHeight || 0;
      if (width > 0 && height > 0) {
        const nextScale = Math.min(width / canvasWidth, height / canvasHeight);
        setScale(nextScale > 0 ? nextScale : 1);
      } else {
        setScale(0.35);
      }
    };
    updateScale();

    const handleBeforePrint = () => {
      // O portal de impressão fica fora da tela e mede 0px antes de a
      // mídia mudar. A escala física evita o fallback nesse intervalo.
      flushSync(() => setIsPrinting(true));
      requestAnimationFrame(() => {
        requestAnimationFrame(updateScale);
      });
      setTimeout(updateScale, 100);
    };
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateScale);
      observer.observe(element);
      return () => {
        observer.disconnect();
        window.removeEventListener('beforeprint', handleBeforePrint);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [containerRef, canvasWidth, canvasHeight]);

  return { scale, isPrinting };
}
