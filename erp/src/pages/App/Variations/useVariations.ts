import { useState, useEffect } from 'react';
import VariationType from '../../types/variation.type';
import { subscribeToVariations } from '../../utils/variationService';

export const useVariations = () => {
  const [variations, setVariations] = useState<VariationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const refresh = () => setRefreshSignal((prev) => prev + 1);

  useEffect(() => {
    const unsubscribe = subscribeToVariations((data) => {
      setVariations(data.filter((v) => !v.deleted));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [refreshSignal]);

  return { variations, loading, refresh };
};
