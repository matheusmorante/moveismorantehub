import { useEffect } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { getProductCatalogPresentation } from './productCatalogPresentationMode';
import type { CatalogPresentation } from './productCatalogPresentationMode';

interface ProductCatalogPresentationObserverOptions {
  isOpen: boolean;
  availableSpaceRef?: RefObject<HTMLElement | null>;
  setPresentation: Dispatch<SetStateAction<CatalogPresentation>>;
}

export function useProductCatalogPresentationObserver({
  isOpen,
  availableSpaceRef,
  setPresentation,
}: ProductCatalogPresentationObserverOptions) {
  useEffect(() => {
    if (!isOpen) return;

    const availableSpace = availableSpaceRef?.current || null;
    const measurePresentation = () => {
      const viewportWidth = window.visualViewport?.width || window.innerWidth;
      const contentWidth = availableSpace?.getBoundingClientRect().width || viewportWidth;
      setPresentation(getProductCatalogPresentation(viewportWidth, contentWidth));
    };

    measurePresentation();
    window.addEventListener('resize', measurePresentation);
    window.visualViewport?.addEventListener('resize', measurePresentation);
    const observer = availableSpace && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measurePresentation)
      : null;
    if (observer && availableSpace) observer.observe(availableSpace);

    return () => {
      window.removeEventListener('resize', measurePresentation);
      window.visualViewport?.removeEventListener('resize', measurePresentation);
      observer?.disconnect();
    };
  }, [availableSpaceRef, isOpen]);
}
