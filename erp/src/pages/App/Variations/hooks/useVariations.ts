import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  fetchVariations,
  getVariationErrorMessage,
  moveToTrash,
} from '../../../utils/variationService';

export const VARIATIONS_QUERY_KEY = ['variations'] as const;

export const useVariations = () => {
  const queryClient = useQueryClient();

  const {
    data: rawVariations = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: VARIATIONS_QUERY_KEY,
    queryFn: () => fetchVariations({ throwOnError: true }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const variations = rawVariations.filter((variation) => !variation.deleted);

  const refresh = () => queryClient.invalidateQueries({ queryKey: VARIATIONS_QUERY_KEY });

  const handleDelete = async (id: string) => {
    const variation = variations.find((candidate) => candidate.id === id);
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
      } catch (err) {
        console.error(err);
        const message = getVariationErrorMessage(err, 'Erro ao excluir característica.');
        toast.error(message);
      }
    }
  };

  return { variations, loading, error, handleDelete, refresh };
};
