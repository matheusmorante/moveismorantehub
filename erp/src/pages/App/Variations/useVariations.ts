import { useQuery, useQueryClient } from '@tanstack/react-query';
import VariationType from '../../types/variation.type';
import {
  fetchVariations,
  moveToTrash,
  getVariationErrorMessage,
} from '../../utils/variationService';
import { toast } from 'react-toastify';

export const VARIATIONS_QUERY_KEY = ['variations'] as const;

export const useVariations = () => {
  const queryClient = useQueryClient();

  const { data: rawVariations = [], isLoading: loading } = useQuery({
    queryKey: VARIATIONS_QUERY_KEY,
    queryFn: fetchVariations,
    staleTime: 5 * 60 * 1000, // 5 minutos: características raramente mudam
    gcTime: 10 * 60 * 1000,
  });

  const variations = rawVariations.filter((v) => !v.deleted);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: VARIATIONS_QUERY_KEY });
  };

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

