import { Alert } from 'react-native';
import {
  moveMobileProductToTrash,
  restoreMobileProductFromTrash,
} from '../services/mobileProductMutationService';

interface UseMobileProductTrashActionsParams {
  currentPage: number;
  loadProducts: (pull?: boolean, page?: number) => Promise<void>;
}

export function useMobileProductTrashActions({
  currentPage,
  loadProducts,
}: UseMobileProductTrashActionsParams) {
  const handleMoveToTrash = async (productId: string) => {
    try {
      await moveMobileProductToTrash(productId);
      await loadProducts(true, currentPage);
    } catch (error: any) {
      Alert.alert('Não foi possível mover para a lixeira', error?.message || 'Tente novamente.');
    }
  };

  const handleRestoreFromTrash = async (productId: string) => {
    try {
      await restoreMobileProductFromTrash(productId);
      await loadProducts(true, currentPage);
    } catch (error: any) {
      Alert.alert('Não foi possível restaurar o produto', error?.message || 'Tente novamente.');
    }
  };

  return { handleMoveToTrash, handleRestoreFromTrash };
}
