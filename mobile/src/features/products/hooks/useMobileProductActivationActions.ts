import type { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { toMobileProductActivationCandidate } from '../domain/mobileProductActivationCandidate';
import { applyMobileProductActiveStatusToList } from '../domain/mobileProductActiveStatus';
import { validateProductActivationRequirements } from '../../../../../shared-utils/productActivationValidation';
import { toggleMobileProductActive } from '../services/mobileProductMutationService';

interface UseMobileProductActivationActionsParams {
  products: any[];
  setProducts: Dispatch<SetStateAction<any[]>>;
  currentPage: number;
  loadProducts: (pull?: boolean, page?: number) => Promise<void>;
}

export function useMobileProductActivationActions({
  products,
  setProducts,
  currentPage,
  loadProducts,
}: UseMobileProductActivationActionsParams) {
  const handleToggleActive = async (productId: string, currentActive: boolean) => {
    const parentProd = products.find((p) => p.id === productId);
    const variationParent = parentProd
      ? null
      : products.find((p) =>
          (p.allVariations || []).some((v: any) => String(v.id) === String(productId))
        );
    const targetProd = parentProd || variationParent;
    const targetVariation = variationParent?.allVariations?.find(
      (v: any) => String(v.id) === String(productId)
    );
    const isVariation = Boolean(targetVariation && !targetVariation.isVirtual);
    if (!currentActive && targetProd) {
      const activationProduct = toMobileProductActivationCandidate(targetProd);
      const validationId = isVariation && targetVariation
        ? `${targetProd.id}_${targetVariation.sku || targetVariation.id}`
        : String(targetProd.id);
      const validation = validateProductActivationRequirements(
        validationId,
        [activationProduct],
        [activationProduct]
      );
      if (!validation.isValid) {
        Alert.alert(
          validation.errorMessage?.includes('rascunho') ? 'Produto em Rascunho' : 'Produto incompleto',
          validation.errorMessage || 'Preencha os requisitos do ERP antes de ativar.'
        );
        return;
      }
    }
    try {
      const next = await toggleMobileProductActive(
        targetProd.id,
        currentActive,
        isVariation,
        targetVariation?.id,
        Boolean(targetVariation?.isVirtual)
      );
      setProducts((prev) =>
        applyMobileProductActiveStatusToList(
          prev,
          targetProd.id,
          next,
          isVariation,
          targetVariation,
        )
      );
      void loadProducts(true, currentPage);
    } catch (err) {
      console.warn('Erro ao alternar ativo:', err);
      Alert.alert(
        'Não foi possível alterar o status do produto',
        err instanceof Error ? err.message : 'Atualize a lista e tente novamente.'
      );
      void loadProducts(true, currentPage);
    }
  };

  return { handleToggleActive };
}
