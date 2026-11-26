import type React from 'react';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { withOwnInboundVariationCost } from '../../../../../shared-utils/inboundQuickRegisterRules';
import { verifyAndConfirmMobilePublishedCatalogEdit } from '../domain/mobilePublishedCatalogConfirmation';

interface UseMobileProductSubmitFlowParams {
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  product?: any | null;
  inboundVariationCostPrice?: number;
  draftFormValidateAndRun: <TResult>(
    data: any,
    onValid: (validated: any) => TResult | Promise<TResult>,
    onInvalid?: (errors: any) => void
  ) => Promise<TResult | false>;
  finalFormValidateAndRun: <TResult>(
    data: any,
    onValid: (validated: any) => TResult | Promise<TResult>,
    onInvalid?: (errors: any) => void
  ) => Promise<TResult | false>;
  canAutoSaveDraft: (snapshot: any) => boolean;
  flushDraftAutoSave: () => Promise<boolean>;
  prepareSavePayload: (validated: any, saveAsDraft: boolean) => Promise<any>;
  presentValidationErrors: (errors: any, isDraft: boolean, navigateOnError: boolean) => void;
  onSave: (data: any) => Promise<string | void>;
  onClose: () => void;
  setNameError: React.Dispatch<React.SetStateAction<boolean>>;
  setCategoryError: React.Dispatch<React.SetStateAction<boolean>>;
  setCostPriceError: React.Dispatch<React.SetStateAction<boolean>>;
  setUnitPriceError: React.Dispatch<React.SetStateAction<boolean>>;
  setSupplierError: React.Dispatch<React.SetStateAction<boolean>>;
  setDescriptionTechnicalValidationError: React.Dispatch<React.SetStateAction<boolean>>;
  setAutoSaveStatus: React.Dispatch<React.SetStateAction<'idle' | 'saving' | 'saved' | 'error'>>;
  setAutoSaveError: React.Dispatch<React.SetStateAction<string>>;
  saveOperationIdRef: React.MutableRefObject<string | null>;
  saveRequestedAtRef: React.MutableRefObject<string | null>;
  serverProductIdRef: React.MutableRefObject<string | null>;
  dirtyRef: React.MutableRefObject<boolean>;
  formDataRef: React.MutableRefObject<any>;
  formRevisionRef: React.MutableRefObject<number>;
  persistedRevisionRef: React.MutableRefObject<number>;
  autoSavePausedRef: React.MutableRefObject<boolean>;
  unconfirmedAutoSaveRef: React.MutableRefObject<{
    entry: any;
    payload: any;
  } | null>;
}

/** Coordena confirmação do autosave pendente, validação RHF/Zod e submissão do produto mobile. */
export function useMobileProductSubmitFlow(params: UseMobileProductSubmitFlowParams) {
  const {
    saving,
    setSaving,
    product,
    inboundVariationCostPrice,
    draftFormValidateAndRun,
    finalFormValidateAndRun,
    canAutoSaveDraft,
    flushDraftAutoSave,
    prepareSavePayload,
    presentValidationErrors,
    onSave,
    onClose,
    setNameError,
    setCategoryError,
    setCostPriceError,
    setUnitPriceError,
    setSupplierError,
    setDescriptionTechnicalValidationError,
    setAutoSaveStatus,
    setAutoSaveError,
    saveOperationIdRef,
    saveRequestedAtRef,
    serverProductIdRef,
    dirtyRef,
    formDataRef,
    formRevisionRef,
    persistedRevisionRef,
    autoSavePausedRef,
    unconfirmedAutoSaveRef,
  } = params;

  const handleSubmit = useCallback(
    async (isDraft: boolean) => {
      if (saving) return;
      autoSavePausedRef.current = true;
      setSaving(true);
      try {
        const currentFormData = formDataRef.current;
        if (
          canAutoSaveDraft(currentFormData) &&
          formRevisionRef.current > persistedRevisionRef.current
        ) {
          const flushed = await flushDraftAutoSave();
          if (!flushed) {
            if (unconfirmedAutoSaveRef.current) {
              Alert.alert(
                'Rascunho ainda não confirmado',
                'A resposta do servidor foi incerta. Tente confirmar o mesmo rascunho antes de enviar outra gravação, ou descarte as alterações.'
              );
              return;
            }
            // A RPC versionada ausente é uma falha definitiva sem gravação; nesse
            // caso o botão manual ainda pode usar o contrato legado.
            saveOperationIdRef.current = null;
            saveRequestedAtRef.current = null;
          }
        }

        if (
          isDraft &&
          canAutoSaveDraft(formDataRef.current) &&
          serverProductIdRef.current &&
          formRevisionRef.current <= persistedRevisionRef.current
        ) {
          dirtyRef.current = false;
          onClose();
          return;
        }

        const existingVariationCount = Array.isArray(product?.allVariations)
          ? product.allVariations.length
          : Array.isArray(product?.product_variations)
            ? product.product_variations.length
            : Array.isArray(product?.variations)
              ? product.variations.length
              : 0;
        const currentData = formDataRef.current;
        const formDataToValidate =
          inboundVariationCostPrice !== undefined &&
          Array.isArray(currentData.variations) &&
          currentData.variations.length > existingVariationCount
            ? {
                ...currentData,
                variations: currentData.variations.map((variation: any, index: number) =>
                  index === currentData.variations.length - 1
                    ? withOwnInboundVariationCost(variation, inboundVariationCostPrice)
                    : variation
                ),
              }
            : currentData;

        setNameError(false);
        setCategoryError(false);
        setCostPriceError(false);
        setUnitPriceError(false);
        setSupplierError(false);
        await (isDraft ? draftFormValidateAndRun : finalFormValidateAndRun)(
          formDataToValidate,
          async (validated) => {
            setDescriptionTechnicalValidationError(false);
            let hideFromCatalog = false;
            const catalogCheck = await verifyAndConfirmMobilePublishedCatalogEdit(
              product,
              validated
            );
            if (!catalogCheck.shouldContinue) return;
            hideFromCatalog = catalogCheck.hideFromCatalog;

            const payload = await prepareSavePayload(validated, isDraft);
            if (hideFromCatalog && !isDraft) {
              payload.status = 'hidden';
              payload.variations = (payload.variations || []).map((variation: any) => ({
                ...variation,
                status: 'hidden',
              }));
            }
            await onSave(payload);
            saveOperationIdRef.current = null;
            saveRequestedAtRef.current = null;
            dirtyRef.current = false;
            persistedRevisionRef.current = formRevisionRef.current;
            setAutoSaveStatus(isDraft ? 'saved' : 'idle');
            setAutoSaveError('');
            onClose();
          },
          (errors) => presentValidationErrors(errors, isDraft, true)
        );
      } catch (error: any) {
        Alert.alert(
          'Erro ao Salvar',
          error?.message || 'Falha ao salvar o produto. Tente novamente.'
        );
      } finally {
        setSaving(false);
        autoSavePausedRef.current = false;
      }
    },
    [
      autoSavePausedRef,
      canAutoSaveDraft,
      dirtyRef,
      draftFormValidateAndRun,
      finalFormValidateAndRun,
      flushDraftAutoSave,
      formDataRef,
      formRevisionRef,
      inboundVariationCostPrice,
      onClose,
      onSave,
      persistedRevisionRef,
      prepareSavePayload,
      presentValidationErrors,
      product,
      saveOperationIdRef,
      saveRequestedAtRef,
      saving,
      serverProductIdRef,
      setAutoSaveError,
      setAutoSaveStatus,
      setCategoryError,
      setCostPriceError,
      setDescriptionTechnicalValidationError,
      setNameError,
      setSaving,
      setSupplierError,
      setUnitPriceError,
      unconfirmedAutoSaveRef,
    ]
  );

  return { handleSubmit };
}
