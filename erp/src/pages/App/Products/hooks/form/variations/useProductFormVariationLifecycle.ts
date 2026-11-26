import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { requestConfirmation } from '@/components/shared/confirmationService';
import type Product from '@/pages/types/product.type';
import { physicalDeleteVariation } from '@/pages/utils/productService/productService';
import { ensureDefaultVariation } from '@/pages/utils/productService/productVariationDefaults';
import { inheritSimpleProductVariationFromParent } from '../../../../../../../../shared-utils/simpleProductVariationInheritance';
import { PRODUCT_FORM_ERROR_TOAST_OPTIONS } from './useProductFormVariationSave';

interface UseProductFormVariationLifecycleParams {
  latestFormDataRef: React.MutableRefObject<Partial<Product>>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  isRegisteredProduct: boolean;
  onClose: () => void;
  pendingNewVariationIdRef: React.MutableRefObject<string | null>;
  setEditingVariationId: (id: string | null) => void;
  setEditingVariationIssue?: (issue: any) => void;
}

export function useProductFormVariationLifecycle({
  latestFormDataRef,
  setFormData,
  isRegisteredProduct,
  onClose,
  pendingNewVariationIdRef,
  setEditingVariationId,
  setEditingVariationIssue,
}: UseProductFormVariationLifecycleParams) {
  const [deletingVariationId, setDeletingVariationId] = useState<string | null>(null);

  const handleCloseVariationModal = useCallback(() => {
    const pendingVariationId = pendingNewVariationIdRef.current;
    if (pendingVariationId) {
      setFormData((prev) => {
        const remaining = (prev.variations || []).filter(
          (v) => v.id !== pendingVariationId && String(v.id) !== String(pendingVariationId)
        );
        const next = {
          ...prev,
          variations: remaining,
        };
        const ensured = remaining.length === 0 ? ensureDefaultVariation(next) : next;
        latestFormDataRef.current = ensured;
        return ensured;
      });
      pendingNewVariationIdRef.current = null;
    } else {
      setFormData((prev) => {
        if (!prev.variations || prev.variations.length === 0) {
          const ensured = ensureDefaultVariation(prev);
          latestFormDataRef.current = ensured;
          return ensured;
        }
        latestFormDataRef.current = prev;
        return prev;
      });
    }
    setEditingVariationId(null);
    setEditingVariationIssue?.(null);
  }, [latestFormDataRef, pendingNewVariationIdRef, setEditingVariationId, setEditingVariationIssue, setFormData]);

  const handleDeleteVariation = useCallback(
    async (variationId: string, skipConfirm = false) => {
      const current = latestFormDataRef.current;
      if ((current.variations?.length || 0) <= 1) {
        toast.info('A última variação só pode ser excluída junto com o produto.');
        return;
      }
      if (!isRegisteredProduct) return;
      if (
        !skipConfirm &&
        !(await requestConfirmation({
          title: 'Excluir variação permanentemente?',
          message: 'O sistema verificará se o UUID possui vínculos antes de continuar.',
          confirmLabel: 'Excluir variação',
          type: 'danger',
        }))
      ) {
        return;
      }

      setDeletingVariationId(variationId);
      try {
        const productId = String(current.parentId || current.id || '');
        const result = await physicalDeleteVariation(productId, variationId);
        if (!result.success) {
          toast.error(
            result.message || 'Não foi possível excluir a variação.',
            PRODUCT_FORM_ERROR_TOAST_OPTIONS
          );
          return;
        }
        if (result.parentDeactivated) {
          toast.success(result.message || 'Produto e variação desativados com sucesso.');
          onClose();
          return;
        }
        setFormData((previous) => {
          const remainingVariations = (previous.variations || []).filter(
            (variation) => variation.id !== variationId
          );
          const variations =
            remainingVariations.length === 1
              ? [
                  inheritSimpleProductVariationFromParent(previous, remainingVariations[0], {
                    preserveVariationStock: true,
                    preserveVariationAttributes: true,
                  }),
                ]
              : remainingVariations;

          return {
            ...previous,
            variations,
            hasVariations: remainingVariations.length > 1,
          };
        });
        toast.success(result.message || 'Variação excluída com sucesso.');
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Erro ao excluir a variação.',
          PRODUCT_FORM_ERROR_TOAST_OPTIONS
        );
        console.error('[ProductForm] Falha ao excluir variação:', error);
      } finally {
        setDeletingVariationId(null);
      }
    },
    [isRegisteredProduct, latestFormDataRef, onClose, setFormData]
  );

  return {
    deletingVariationId,
    handleCloseVariationModal,
    handleDeleteVariation,
  };
}
