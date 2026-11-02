import { useEffect, useState } from 'react';
import { checkMobileProductVariationHasMoves } from '../services/mobileProductMutationService';

export const useMobileProductVariationUsage = (
  productId: string,
  shouldCheckVariationUsage: boolean,
  variationIds: string
) => {
  const [variationUsageById, setVariationUsageById] = useState<
    Record<string, boolean | undefined>
  >({});

  useEffect(() => {
    if (!shouldCheckVariationUsage) {
      setVariationUsageById({});
      return;
    }

    const ids = variationIds.split('|');
    const persistedIds = ids.filter(Boolean);
    let isCurrent = true;
    setVariationUsageById(
      Object.fromEntries(ids.map((id) => [id, id ? undefined : false]))
    );

    void Promise.all(
      persistedIds.map(async (id) => [
        id,
        await checkMobileProductVariationHasMoves(productId, id),
      ] as const)
    )
      .then((entries) => {
        if (isCurrent) {
          setVariationUsageById((current) => ({ ...current, ...Object.fromEntries(entries) }));
        }
      })
      .catch(() => {
        if (isCurrent) {
          setVariationUsageById(
            Object.fromEntries(ids.map((id) => [id, id ? true : false]))
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [productId, shouldCheckVariationUsage, variationIds]);

  return variationUsageById;
};
