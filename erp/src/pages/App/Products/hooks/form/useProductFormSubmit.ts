import { getEnteredProductName } from './rules/productDraftRules';
import { useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import Product from '@/pages/types/product.type';
import { saveProduct } from '@/pages/utils/productService';
import { checkERPLegibility, checkEcomLegibility, buildPublishedCatalogEditConfirmationMessage } from '../../domain/productLegibilityRules';
import { toast } from 'react-toastify';
import { resolveVariationDimensions } from '../../domain/variationRegistrationRules';
import { normalizeProductForSave } from '@/pages/utils/productKindRules';
import {
  isTestProduct,
  shouldValidatePublishedCatalogEdit,
} from '@/pages/utils/hmlTestData';
import { validateProductFormSubmission } from './productFormValidation';
import { createProductFormSchema } from './productFormValidation';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import type { useProductFormDraft } from './useProductFormDraft';
import { PRODUCT_SUPPLIER_REQUIRED_MESSAGE } from '../../../../../../../shared-utils/productSupplierRequirement';
import { PRODUCT_COMPOSITION_PRODUCT_COMPONENTS_REQUIRED_MESSAGE } from '../../../../../../../shared-utils/productCompositionRequirements';
import { fetchTechnicalFieldDefinitions } from '../../services/technicalFieldService';
import { fetchCharacteristicGroups } from '@/pages/utils/characteristicGroupService';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

const PRODUCT_FORM_ERROR_TOAST_OPTIONS = { autoClose: 8000 } as const;

interface SubmitProps {
  formData: Partial<Product>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  product?: Product | null;
  isRegisteredProduct: boolean;
  isStockistOnly?: boolean;
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setActiveTab: (tab: any) => void;
  variations: any;
  draft: Partial<Pick<ReturnType<typeof useProductFormDraft>, 'beginManualSave' | 'endManualSave'>>;
  setLoading: (loading: boolean) => void;
  setSaveResult: (result: any) => void;
  hasChanged: React.MutableRefObject<boolean>;
  initialFormDataRef: React.MutableRefObject<string>;
  onSuccess?: (product: Product) => void | boolean | Promise<void | boolean>;
  onSave?: (product?: Product) => void | Promise<void>;
  onClose: () => void;
  closeAfterSuccessfulRegistration?: boolean;
  isTestArtifact?: boolean;
}

export const useProductFormSubmit = ({
  formData,
  setFormData,
  product,
  isRegisteredProduct,
  isStockistOnly = false,
  setValidationErrors,
  setActiveTab,
  variations,
  draft,
  setLoading,
  setSaveResult,
  hasChanged,
  initialFormDataRef,
  onSuccess,
  onSave,
  onClose,
  closeAfterSuccessfulRegistration = false,
  isTestArtifact = false,
}: SubmitProps) => {
  const validationOptions = { isStockistOnly };
  const { validateAndRun: validateFinalProduct } = useZodForm(createProductFormSchema({ ...validationOptions, saveAsDraft: false }), formData);
  const { validateAndRun: validateDraftProduct } = useZodForm(createProductFormSchema({ ...validationOptions, saveAsDraft: true }), formData);
  const submissionInFlight = useRef(false);
  const handleSubmit = useCallback(
    async (_showResult = true, saveAsDraft = false): Promise<boolean> => {
      const actualSaveAsDraft = isRegisteredProduct ? false : saveAsDraft;
      if (submissionInFlight.current) return false;
      submissionInFlight.current = true;
      let savedProduct: Product | undefined;
      setLoading(true);
      try {
        const draftIdentity = await draft.beginManualSave?.();
        const submissionData = {
          ...formData,
          id: draftIdentity?.id || formData.id,
          updatedAt: draftIdentity?.updatedAt || formData.updatedAt,
        };
        const reportValidation = () => {
          if (!actualSaveAsDraft) {
            const validationResult = validateProductFormSubmission(submissionData, {
              ...validationOptions,
              saveAsDraft: actualSaveAsDraft,
            });
            const { errors, invalidVariation, singleVariationParentIssue } = validationResult;

            if (Object.keys(errors).length > 0) {
              setValidationErrors(errors);
              if (
                errors.name ||
                errors.categoryIds ||
                errors.productKind ||
                errors.opportunityId
              ) {
                setActiveTab('geral');
              } else if (errors.unitPrice || errors.mainSupplierId) {
                setActiveTab('estoque');
              } else if (errors.ncm) {
                setActiveTab('fiscal');
              } else if (singleVariationParentIssue) {
                setActiveTab(singleVariationParentIssue.tab);
              } else if (errors.composicao) {
                setActiveTab('composicao');
              } else if (errors.dimensions || errors.technicalValues) {
                setActiveTab('technical');
              } else if (errors.variations || errors.variationRegistration) {
                setActiveTab('variacoes');
              }

              if (singleVariationParentIssue) {
                if (errors.unitPrice) {
                  toast.warn(
                    'Por favor, informe o Preço de Venda do produto na aba Estoque e Precificação.',
                    PRODUCT_FORM_ERROR_TOAST_OPTIONS
                  );
                } else {
                  toast.error(singleVariationParentIssue.message, PRODUCT_FORM_ERROR_TOAST_OPTIONS);
                }
              } else if (errors.unitPrice) {
                toast.warn(
                  'Por favor, informe o Preço de Venda do produto na aba Estoque e Precificação.',
                  PRODUCT_FORM_ERROR_TOAST_OPTIONS
                );
              } else if (errors.productKind) {
                toast.error('Selecione a origem do estoque do produto.', PRODUCT_FORM_ERROR_TOAST_OPTIONS);
              } else if (errors.opportunityId) {
                toast.error('Selecione uma oportunidade.', PRODUCT_FORM_ERROR_TOAST_OPTIONS);
              } else if (errors.ncm) {
                toast.error('Informe um NCM válido com 8 dígitos na aba Tributário / NF.', PRODUCT_FORM_ERROR_TOAST_OPTIONS);
              } else if (errors.dimensions || errors.technicalValues) {
                toast.error('Preencha os campos obrigatórios na aba Características.', PRODUCT_FORM_ERROR_TOAST_OPTIONS);
              } else if ((errors.variations || errors.variationRegistration) && invalidVariation?.issue) {
                variations.setEditingVariationIssue?.({
                  fieldKey: invalidVariation.issue.fieldKey || '',
                  message: invalidVariation.issue.message,
                });
                variations.setEditingVariationId(invalidVariation.variation.id);
                toast.error(invalidVariation.issue.message, PRODUCT_FORM_ERROR_TOAST_OPTIONS);
              } else if (errors.composicao) {
                toast.error(PRODUCT_COMPOSITION_PRODUCT_COMPONENTS_REQUIRED_MESSAGE, PRODUCT_FORM_ERROR_TOAST_OPTIONS);
              } else if (errors.variations) {
                toast.error(validationResult.errorMessage || 'Adicione pelo menos uma variação ao produto.', PRODUCT_FORM_ERROR_TOAST_OPTIONS);
              } else if (errors.mainSupplierId) {
                toast.error(PRODUCT_SUPPLIER_REQUIRED_MESSAGE, PRODUCT_FORM_ERROR_TOAST_OPTIONS);
              } else {
                toast.error(
                  validationResult.errorMessage || 'Preencha todos os campos obrigatórios.',
                  PRODUCT_FORM_ERROR_TOAST_OPTIONS
                );
              }
              return false;
            }
            setValidationErrors({});
          } else {
            const validationResult = validateProductFormSubmission(submissionData, {
              ...validationOptions,
              saveAsDraft: actualSaveAsDraft,
            });
            if (Object.keys(validationResult.errors).length > 0) {
              setValidationErrors(validationResult.errors);
              toast.error(validationResult.errorMessage || 'Confira os valores informados para o rascunho.', PRODUCT_FORM_ERROR_TOAST_OPTIONS);
              return false;
            }
          }

          return true;
        };

        if (!reportValidation()) return false;

        return await (actualSaveAsDraft ? validateDraftProduct : validateFinalProduct)(submissionData, async (validatedData) => {
          let ecomVal = checkEcomLegibility(validatedData as any);
          const isCatalogTestProduct = isTestProduct(product) || isTestProduct(formData);
          const validatePublishedCatalogEdit = shouldValidatePublishedCatalogEdit(
            formData.status,
            product,
            formData,
          );
          if (validatePublishedCatalogEdit) {
            try {
              const [categoryRequirements, groupData] = await Promise.all([
                withTimeout(
                  fetchTechnicalFieldDefinitions('product-form', {
                    forceRefresh: true,
                    requireCategoryLinks: true,
                  }),
                  15000,
                  null,
                  'produto:verificar-requisitos-do-catalogo'
                ),
                withTimeout(
                  fetchCharacteristicGroups(),
                  15000,
                  null,
                  'produto:verificar-grupos-de-características'
                ),
              ]);
              if (!categoryRequirements) throw new Error('Requisitos de categoria indisponíveis.');
              if (!groupData) throw new Error('Grupos de características indisponíveis.');
              ecomVal = checkEcomLegibility(validatedData as any, categoryRequirements, {
                characteristicGroups: groupData.groups,
              });
            } catch {
              toast.error('Não foi possível verificar as características obrigatórias da categoria. O produto publicado não foi alterado.', PRODUCT_FORM_ERROR_TOAST_OPTIONS);
              return false;
            }
          }
          if (validatePublishedCatalogEdit && !ecomVal.isLegible) {
            const confirmationMessage = buildPublishedCatalogEditConfirmationMessage(ecomVal);
            setLoading(false);
            const confirmation = await Swal.fire({
              title: 'Ocultar produto do Catálogo Digital?',
              text: confirmationMessage,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Salvar e ocultar',
              cancelButtonText: 'Continuar editando',
              reverseButtons: true,
            });
            if (!confirmation.isConfirmed) return false;
          }

          setLoading(true);
          try {
            const enteredName = getEnteredProductName(validatedData as Partial<Product>);

            let targetCatalogStatus: 'draft' | 'published' | 'hidden' = 'hidden';
            if (actualSaveAsDraft) {
              targetCatalogStatus = 'draft';
            } else if (
              !isCatalogTestProduct &&
              isRegisteredProduct &&
              product?.status === 'published' &&
              ecomVal.isLegible
            ) {
              targetCatalogStatus = 'published';
            } else {
              targetCatalogStatus = 'hidden';
            }

            // Ao concluir um rascunho, o canal ERP inicia ativo para o produto e variações
            const isCompletingDraft = !actualSaveAsDraft && !isRegisteredProduct;
            const normalizedData = normalizeProductForSave({
              ...validatedData,
              variations: actualSaveAsDraft ? validatedData.variations : validatedData.variations?.map((variation) => ({
                ...variation,
                ...resolveVariationDimensions(validatedData as Partial<Product>, variation as NonNullable<Product['variations']>[number]),
              })),
            } as Partial<Product>, {
              isDraft: actualSaveAsDraft,
              isCompletingDraft,
              catalogStatus: targetCatalogStatus,
              name: enteredName,
            });

            const savedId = isTestArtifact && !isRegisteredProduct
              ? await saveProduct(normalizedData, false, { isTestArtifact: true })
              : await saveProduct(normalizedData);
            if (savedId && typeof savedId === 'string') {
              normalizedData.id = savedId;
            }
            savedProduct = normalizedData;

            setFormData((prev) => ({
              ...prev,
              id: normalizedData.id,
              updatedAt: normalizedData.updatedAt,
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
              if (closeAfterSuccessfulRegistration) onClose();
            } else {
              toast.success('Produto salvo com sucesso!');
              if (onSuccess && await onSuccess(normalizedData) === false) return false;
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

            toast.warn(friendlyMsg, PRODUCT_FORM_ERROR_TOAST_OPTIONS);
            console.error('[useProductFormSubmit] Falha ao salvar produto:', error);
            return false;
          } finally {
            setLoading(false);
          }
        }, (errors) => {
          if (errors.variations && submissionData.variations?.length) {
            setValidationErrors({ variations: true });
            setActiveTab('variacoes');
            toast.error(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados das variações.', PRODUCT_FORM_ERROR_TOAST_OPTIONS);
            return;
          }
          if (!actualSaveAsDraft && !reportValidation()) return;
          setValidationErrors(Object.fromEntries(Object.keys(errors).map((key) => [key, true])));
          toast.error(Object.values(flattenFormErrors(errors))[0] || 'Confira os campos do produto.', PRODUCT_FORM_ERROR_TOAST_OPTIONS);
        });
      } finally {
        draft.endManualSave?.(savedProduct);
        setLoading(false);
        submissionInFlight.current = false;
      }
    },
    [
      formData,
      validateDraftProduct,
      validateFinalProduct,
      setFormData,
      draft,
      variations,
      isRegisteredProduct,
      isStockistOnly,
      product,
      setValidationErrors,
      setActiveTab,
      setLoading,
      setSaveResult,
      hasChanged,
      onSuccess,
      onSave,
      onClose,
      closeAfterSuccessfulRegistration,
      isTestArtifact,
    ]
  );

  return { handleSubmit };
};
