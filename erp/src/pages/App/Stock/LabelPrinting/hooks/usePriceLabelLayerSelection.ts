import { useCallback } from 'react';
import type { Dispatch, MouseEvent, SetStateAction } from 'react';
import type { PriceLabelLayerKey } from '../types/PriceLabelArtEditorTypes';

interface UsePriceLabelLayerSelectionParams {
  previousSelectedRef: { current: PriceLabelLayerKey };
  setSelectedElement: Dispatch<SetStateAction<PriceLabelLayerKey>>;
  setSelectedElements: Dispatch<SetStateAction<Set<PriceLabelLayerKey>>>;
  showTitle: boolean;
  showDe: boolean;
  showNormalPrice: boolean;
  showPor: boolean;
  showCurrency: boolean;
  showPromoPrice: boolean;
  showCents: boolean;
  showInstallments: boolean;
}

export function usePriceLabelLayerSelection({
  previousSelectedRef,
  setSelectedElement,
  setSelectedElements,
  showTitle,
  showDe,
  showNormalPrice,
  showPor,
  showCurrency,
  showPromoPrice,
  showCents,
  showInstallments,
}: UsePriceLabelLayerSelectionParams) {
  return useCallback(
    (layerKey: PriceLabelLayerKey, e: MouseEvent) => {
      e.stopPropagation();

      const visibleLayers: { key: PriceLabelLayerKey; label: string }[] = [
        { key: 'title', label: 'Nome do Produto' },
        { key: 'dePricePorGroup', label: 'Grupo De / Preço / Por (Flex)' },
        { key: 'deText', label: 'Texto "De"' },
        { key: 'normalPrice', label: 'Preço Original' },
        { key: 'porText', label: 'Texto "Por"' },
        { key: 'currencySymbol', label: 'Símbolo R$' },
        { key: 'promoPrice', label: 'Preço Principal' },
        { key: 'cents', label: 'Centavos' },
        { key: 'installments', label: 'Parcelamento' },
      ];

      if (e.shiftKey) {
        if (['deText', 'normalPrice', 'porText', 'dePricePorGroup'].includes(layerKey as string)) {
          setSelectedElement('dePricePorGroup');
          setSelectedElements(new Set<PriceLabelLayerKey>(['dePricePorGroup']));
          return;
        }

        setSelectedElements((prev) => {
          const next = new Set(prev);
          if (next.has(layerKey)) {
            next.delete(layerKey);
          } else {
            next.add(layerKey);
          }

          if (next.size > 0) {
            const arr = Array.from(next);
            setSelectedElement(arr[arr.length - 1]);
          } else {
            setSelectedElement(null);
          }
          return next;
        });
      } else {
        setSelectedElements(new Set<PriceLabelLayerKey>([layerKey]));

        if (previousSelectedRef.current === layerKey) {
          const activeList = visibleLayers.filter((layer) => {
            if (layer.key === 'title') return showTitle;
            if (layer.key === 'deText') return showDe;
            if (layer.key === 'normalPrice') return showNormalPrice;
            if (layer.key === 'porText') return showPor;
            if (layer.key === 'currencySymbol') return showCurrency;
            if (layer.key === 'promoPrice') return showPromoPrice;
            if (layer.key === 'cents') return showCents;
            if (layer.key === 'installments') return showInstallments;
            return false;
          });

          const currentIndex = activeList.findIndex((layer) => layer.key === layerKey);
          if (currentIndex !== -1 && activeList.length > 1) {
            const nextLayer = activeList[(currentIndex + 1) % activeList.length];
            setSelectedElement(nextLayer.key);
            setSelectedElements(new Set([nextLayer.key]));
            return;
          }
        }

        setSelectedElement(layerKey);
      }
    },
    [
      previousSelectedRef,
      setSelectedElement,
      setSelectedElements,
      showTitle,
      showDe,
      showNormalPrice,
      showPor,
      showCurrency,
      showPromoPrice,
      showCents,
      showInstallments,
    ]
  );
}
