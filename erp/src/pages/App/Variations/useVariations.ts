import { useState, useEffect } from 'react';
import VariationType from '../../types/variation.type';
import {
  subscribeToVariations,
  moveToTrash,
  getVariationErrorMessage,
} from '../../utils/variationService';
import { toast } from 'react-toastify';

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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const variation = variations.find((v) => v.id === id);
    if (!variation) return;

    if (
      window.confirm(
        `Excluir "${variation.name}"? Se estiver vinculada a produtos, ela será desativada e os valores existentes serão preservados.`
      )
    ) {
      try {
        const result = await moveToTrash(id);
        toast.success(
          result === 'deactivated'
            ? 'Característica desativada. Os valores já cadastrados foram preservados.'
            : 'Característica excluída.'
        );
        refresh();
      } catch (error) {
        console.error(error);
        const message = getVariationErrorMessage(error, 'Erro ao excluir característica.');
        toast.error(message);
      }
    }
  };

  return { variations, loading, handleDelete, refresh };
};
