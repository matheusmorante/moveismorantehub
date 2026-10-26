import { useEffect, useState } from 'react';
import { fetchMobileProductExitFlags } from '../services/mobileProductExitFlagsService';

interface ProductVariationReference {
  readonly id?: unknown;
  readonly variationId?: unknown;
  readonly isVirtual?: boolean;
}

interface ProductVariationCollection {
  readonly allVariations?: readonly ProductVariationReference[];
  readonly variations?: readonly ProductVariationReference[];
}

const EMPTY_EXITED_VARIATIONS: ReadonlySet<string> = new Set();

export const getMobileProductVariationIds = (
  products: readonly ProductVariationCollection[]
): string[] => {
  const ids = new Set<string>();

  products.forEach((product) => {
    const variations = Array.isArray(product.allVariations)
      ? product.allVariations
      : Array.isArray(product.variations)
        ? product.variations
        : [];

    variations.forEach((variation) => {
      if (variation.isVirtual) return;
      const id = String(variation.variationId || variation.id || '').trim();
      if (id) ids.add(id);
    });
  });

  return [...ids].sort();
};

export function useMobileVariationExitFlags(
  products: readonly ProductVariationCollection[],
  enabled = true
): ReadonlySet<string> {
  const requestKey = JSON.stringify(enabled ? getMobileProductVariationIds(products) : []);
  const [result, setResult] = useState<{
    readonly requestKey: string;
    readonly exitedVariationIds: ReadonlySet<string>;
  }>({ requestKey: '', exitedVariationIds: EMPTY_EXITED_VARIATIONS });

  useEffect(() => {
    let isCurrentRequest = true;
    const variationIds = JSON.parse(requestKey) as string[];

    if (variationIds.length === 0) {
      setResult({ requestKey, exitedVariationIds: EMPTY_EXITED_VARIATIONS });
      return () => {
        isCurrentRequest = false;
      };
    }

    setResult({ requestKey, exitedVariationIds: EMPTY_EXITED_VARIATIONS });
    void fetchMobileProductExitFlags(variationIds)
      .then((exitedVariationIds) => {
        if (isCurrentRequest) setResult({ requestKey, exitedVariationIds });
      })
      .catch(() => {
        // A falha desse indicador não deve impedir o carregamento da lista.
        if (isCurrentRequest) {
          setResult({ requestKey, exitedVariationIds: EMPTY_EXITED_VARIATIONS });
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [requestKey]);

  return result.requestKey === requestKey ? result.exitedVariationIds : EMPTY_EXITED_VARIATIONS;
}
