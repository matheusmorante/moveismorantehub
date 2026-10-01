import { useCallback } from 'react';
import Product from '@/pages/types/product.type';
import { saveProduct } from '@/pages/utils/productService';
import { checkERPLegibility, checkEcomLegibility } from '../../utils/productLegibilityRules';
import { toast } from 'react-toastify';
import {
  getEffectiveVariationTechnicalValues,
  getMissingRequiredCharacteristics,
} from '@/pages/utils/technicalValuesService';
import { normalizeProductForSave } from '@/pages/utils/productKindRules';

interface SubmitProps {
  formData: Partial<Product>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  product?: Product | null;
  isRegisteredProduct: boolean;
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setActiveTab: (tab: any) => void;
  variations: any;
  draft: any;
  setLoading: (loading: boolean) => void;
  setSaveResult: (result: any) => void;
  hasChanged: React.MutableRefObject<boolean>;
  onSuccess?: (product: Product) => void;
  onSave?: (product?: Product) => void | Promise<void>;
  onClose: () => void;
}

export const useProductFormSubmit = ({
  formData,
  setFormData,
  product,
  isRegisteredProduct,
  setValidationErrors,
  setActiveTab,
  variations,
  draft,
  setLoading,
  setSaveResult,
  hasChanged,
  onSuccess,
  onSave,
  onClose,
}: SubmitProps) => {
  const handleSubmit = useCallback(
    async (showResult = true, saveAsDraft = false): Promise<boolean> => {
      const actualSaveAsDraft = isRegisteredProduct ? false : saveAsDraft;

      if (!actualSaveAsDraft) {
        const errors: Record<string, boolean> = {};
        const enteredName = draft.getEnteredProductName(formData);
        if (!enteredName) errors.name = true;
        const validProductKinds = ['normal', 'salvado', 'usado'];
        if (
          formData.itemType !== 'service' &&
          !validProductKinds.includes(formData.productKind || '')
        ) {
          errors.productKind = true;
        }
        const hasVars =
          Boolean(formData.hasVariations) &&
          Array.isArray(formData.variations) &&
          formData.variations.length > 0;
        if (!hasVars) errors.variations = true;
        if (!formData.categoryIds || formData.categoryIds.length === 0) errors.categoryIds = true;
        if (!formData.mainSupplierId && !formData.supplierId) errors.mainSupplierId = true;

        const variationMissingCharacteristics = (formData.variations || [])
          .map((variation) => ({
            variation,
            missing: getMissingRequiredCharacteristics(
              getEffectiveVariationTechnicalValues(formData.technicalValues || {}, variation)
            ),
          }))
          .find(({ missing }) => missing.length > 0);
        if (variationMissingCharacteristics) errors.variationCharacteristics = true;

        // Validação de Preço de Venda (no produto pai ou em alguma variação)
        const hasParentPrice =
          formData.unitPrice !== undefined &&
          formData.unitPrice !== null &&
          !isNaN(Number(formData.unitPrice)) &&
          Number(formData.unitPrice) > 0;
        const hasVariationWithPrice = (formData.variations || []).some(
          (v: any) =>
            v.unitPrice !== undefined &&
            v.unitPrice !== null &&
            !isNaN(Number(v.unitPrice)) &&
            Number(v.unitPrice) > 0
        );

        if (Object.keys(errors).length > 0) {
          setValidationErrors(errors);
          if (errors.name || errors.categoryIds || errors.productKind) {
            setActiveTab('geral');
          } else if (errors.unitPrice || errors.mainSupplierId) {
            setActiveTab('estoque');
          } else if (errors.variations || errors.variationCharacteristics) {
            setActiveTab('variacoes');
          }

          if (errors.unitPrice) {
            toast.warn(
              'Por favor, informe o Preço de Venda do produto na aba Estoque e Precificação.'
            );
          } else if (errors.productKind) {
            toast.error('Selecione a origem do estoque do produto.');
          } else if (errors.variations) {
            toast.error('Adicione pelo menos uma variação ao produto.');
          } else if (errors.variationCharacteristics && variationMissingCharacteristics) {
            variations.setEditingVariationId(variationMissingCharacteristics.variation.id);
            toast.error(
              `Preencha as características obrigatórias da variação: ${variationMissingCharacteristics.missing.join(', ')}.`
            );
          } else if (errors.mainSupplierId) {
            toast.error('Selecione um fornecedor.');
          } else {
            toast.error('Preencha todos os campos obrigatórios.');
          }
          return false;
        }
        setValidationErrors({});
      } else {
        const enteredName = draft.getEnteredProductName(formData);
        if (!enteredName) return false;
      }

      const ecomVal = checkEcomLegibility(formData);
      if (formData.status === 'published' && !ecomVal.isLegible) {
        toast.error('Despublique o Catálogo antes de remover ou alterar um campo obrigatório.');
        return false;
      }

      setLoading(true);
      try {
        const enteredName = draft.getEnteredProductName(formData);

        let targetCatalogStatus: 'draft' | 'published' | 'hidden' = 'hidden';
        if (actualSaveAsDraft) {
          targetCatalogStatus = 'draft';
        } else if (isRegisteredProduct && product?.status === 'published' && ecomVal.isLegible) {
          targetCatalogStatus = 'published';
        } else {
          targetCatalogStatus = 'hidden';
        }

        // Ao concluir um rascunho, o canal ERP inicia ativo para o produto e variações
        const isCompletingDraft = !actualSaveAsDraft && !isRegisteredProduct;
        const normalizedData = normalizeProductForSave(formData, {
          isDraft: actualSaveAsDraft,
          isCompletingDraft,
          catalogStatus: targetCatalogStatus,
          name: enteredName,
        });

        const savedId = await saveProduct(normalizedData);
        if (savedId && typeof savedId === 'string') {
          normalizedData.id = savedId;
        }

        setFormData((prev) => ({
          ...prev,
          id: normalizedData.id,
          isDraft: actualSaveAsDraft,
          active: normalizedData.active,
          status: normalizedData.status,
          variations: normalizedData.variations,
        }));
        hasChanged.current = false;

        // Abre modal de canais tanto para produto novo quanto para conclusão de rascunho
        const isFinalizingDraft = !actualSaveAsDraft && !isRegisteredProduct;
        if (isFinalizingDraft) {
          const erpLeg = checkERPLegibility(normalizedData);
          const ecomLeg = checkEcomLegibility(normalizedData);
          setSaveResult({
            erpLegible: erpLeg.isLegible,
            ecomLegible: ecomLeg.isLegible,
            checksErp: erpLeg.checks,
            checksEcom: ecomLeg.checks,
            product: normalizedData,
          });
          toast.success('Produto cadastrado com sucesso! 🚀');
        } else {
          toast.success('Produto salvo com sucesso!');
          if (onSuccess) onSuccess(normalizedData);
          if (onSave) await onSave(normalizedData);
          onClose();
        }
        return true;
      } catch (error: any) {
        const rawMsg = String(error?.message || error || '');
        let friendlyMsg = rawMsg;

        if (
          rawMsg.includes('null value in column "price"') ||
          rawMsg.includes('violates not-null constraint')
        ) {
          friendlyMsg =
            'Por favor, informe o Preço de Venda do produto na aba "Estoque e Precificação" para concluir o cadastro.';
          setActiveTab('estoque');
          setValidationErrors((prev) => ({ ...prev, unitPrice: true }));
        } else if (
          rawMsg.includes('duplicate key') ||
          rawMsg.includes('unique constraint') ||
          rawMsg.includes('23505')
        ) {
          friendlyMsg =
            'Já existe um produto ou variação cadastrado com este código ou SKU. Um novo código foi sugerido.';
        }

        toast.warn(friendlyMsg);
        console.error('[useProductFormSubmit] Falha ao salvar produto:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [
      formData,
      setFormData,
      draft,
      variations,
      isRegisteredProduct,
      product,
      setValidationErrors,
      setActiveTab,
      setLoading,
      setSaveResult,
      hasChanged,
      onSuccess,
      onSave,
      onClose,
    ]
  );

  return { handleSubmit };
};
