import type React from 'react';
import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { hasRequiredProductName } from '../../../../../shared-utils/productNameRequirement';
import {
  isVersionedProductSaveRpcUnavailable,
  type MobileProductSaveAcknowledgement,
} from '../../../../../shared-utils/mobileProductSaveAcknowledgement';
import { buildMobileProductSavePayload } from '../domain/productSavePayload';
import {
  createMobileProductDraftSaveQueue,
  type MobileProductDraftSaveEntry,
} from '../domain/mobileProductDraftSaveQueue';
import { getNextSequentialProductCode } from '../services/products/mobileProductCodeService';

export const createMobileProductOperationUuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });

const isVersionedSaveAcknowledgement = (
  value: unknown
): value is MobileProductSaveAcknowledgement =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'productId' in value &&
      typeof value.productId === 'string' &&
      'updatedAt' in value &&
      typeof value.updatedAt === 'string' &&
      Number.isFinite(Date.parse(value.updatedAt))
  );

interface UseMobileProductDraftAutoSaveParams {
  visible: boolean;
  saving: boolean;
  product?: any | null;
  formData: any;
  setFormDataRaw: React.Dispatch<React.SetStateAction<any>>;
  enableDraftAutoSave: boolean;
  onAutoSave?: (data: any) => Promise<MobileProductSaveAcknowledgement>;
  onClose: () => void;
  autoSaveError: string;
  setAutoSaveStatus: React.Dispatch<React.SetStateAction<'idle' | 'saving' | 'saved' | 'error'>>;
  setAutoSaveError: React.Dispatch<React.SetStateAction<string>>;
  draftFormEnqueueAndRun: (
    nextValues: any,
    onValid: (data: any) => Promise<boolean> | boolean,
    onInvalid?: (errors: any) => void
  ) => Promise<boolean>;
  presentValidationErrors: (errors: any, isDraft: boolean, navigateOnError: boolean) => void;
  dirtyRef: React.MutableRefObject<boolean>;
  saveOperationIdRef: React.MutableRefObject<string | null>;
  saveRequestedAtRef: React.MutableRefObject<string | null>;
  clientProductIdRef: React.MutableRefObject<string | null>;
  clientProductCodeRef: React.MutableRefObject<string | null>;
  serverProductIdRef: React.MutableRefObject<string | null>;
  serverProductVersionRef: React.MutableRefObject<string | null>;
  formDataRef: React.MutableRefObject<any>;
  formRevisionRef: React.MutableRefObject<number>;
  persistedRevisionRef: React.MutableRefObject<number>;
  autoSaveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  autoSavePausedRef: React.MutableRefObject<boolean>;
  autoSaveRunnerRef: React.MutableRefObject<
    (entry: MobileProductDraftSaveEntry<any>) => Promise<boolean>
  >;
  autoSaveQueueRef: React.MutableRefObject<
    ReturnType<typeof createMobileProductDraftSaveQueue<any>> | null
  >;
  unconfirmedAutoSaveRef: React.MutableRefObject<{
    entry: MobileProductDraftSaveEntry<any>;
    payload: any;
  } | null>;
}

/** Gerencia fila sequencial de autosave de rascunho, debounce de 500 ms e confirmação segura ao fechar. */
export function useMobileProductDraftAutoSave(params: UseMobileProductDraftAutoSaveParams) {
  const {
    visible,
    saving,
    product,
    formData,
    setFormDataRaw,
    enableDraftAutoSave,
    onAutoSave,
    onClose,
    autoSaveError,
    setAutoSaveStatus,
    setAutoSaveError,
    draftFormEnqueueAndRun,
    presentValidationErrors,
    dirtyRef,
    saveOperationIdRef,
    saveRequestedAtRef,
    clientProductIdRef,
    clientProductCodeRef,
    serverProductIdRef,
    serverProductVersionRef,
    formDataRef,
    formRevisionRef,
    persistedRevisionRef,
    autoSaveTimerRef,
    autoSavePausedRef,
    autoSaveRunnerRef,
    autoSaveQueueRef,
    unconfirmedAutoSaveRef,
  } = params;

  const canAutoSaveDraft = useCallback(
    (snapshot: any) => {
      const isNewProduct = !product?.id;
      const isExistingDraft = Boolean(
        snapshot.isDraft ||
          product?.is_draft ||
          product?.isDraft ||
          product?.status === 'draft'
      );
      const enteredName = snapshot.name || snapshot.title || snapshot.marketplaceTitle;
      return (
        Boolean(onAutoSave) &&
        enableDraftAutoSave &&
        (isNewProduct || isExistingDraft) &&
        hasRequiredProductName(enteredName)
      );
    },
    [enableDraftAutoSave, onAutoSave, product]
  );

  const getSaveOperation = useCallback(() => {
    if (!saveOperationIdRef.current) {
      saveOperationIdRef.current = createMobileProductOperationUuid();
      saveRequestedAtRef.current = new Date().toISOString();
    }
    return {
      operationId: saveOperationIdRef.current,
      saveUpdatedAt: saveRequestedAtRef.current || new Date().toISOString(),
    };
  }, [saveOperationIdRef, saveRequestedAtRef]);

  const prepareSavePayload = useCallback(
    async (validated: any, saveAsDraft: boolean) => {
      const operation = getSaveOperation();
      const productCode =
        String(validated.code || clientProductCodeRef.current || '').trim() ||
        (product?.id ? '' : await getNextSequentialProductCode());
      clientProductCodeRef.current = productCode;
      if (productCode && !validated.code) {
        setFormDataRaw((previous: any) => ({ ...previous, code: productCode }));
      }
      const savedProductId = serverProductIdRef.current;
      const savedProductVersion = serverProductVersionRef.current;

      return buildMobileProductSavePayload({
        validated,
        product,
        productCode,
        operation,
        savedProductId,
        savedProductVersion,
        clientProductId: clientProductIdRef.current,
        saveAsDraft,
      });
    },
    [
      clientProductCodeRef,
      clientProductIdRef,
      getSaveOperation,
      product,
      serverProductIdRef,
      serverProductVersionRef,
      setFormDataRaw,
    ]
  );

  const runDraftAutoSave = useCallback(
    async (entry: MobileProductDraftSaveEntry<any>): Promise<boolean> => {
      setAutoSaveStatus('saving');
      setAutoSaveError('');
      const persistEntry = async (
        saveEntry: MobileProductDraftSaveEntry<any>,
        retryPayload?: any
      ) => {
        let attemptedPayload = retryPayload;
        const result = await draftFormEnqueueAndRun(
          {
            ...saveEntry.snapshot,
            isDraft: true,
            active: false,
            status: 'draft',
          },
          async (validated) => {
            const savePayload = retryPayload || (await prepareSavePayload(validated, true));
            attemptedPayload = savePayload;
            let response: MobileProductSaveAcknowledgement;
            try {
              response = await onAutoSave!(savePayload);
              if (!isVersionedSaveAcknowledgement(response)) {
                throw new Error('O salvamento não retornou uma versão confirmada do rascunho.');
              }
            } catch (error: any) {
              if (
                attemptedPayload &&
                !isVersionedProductSaveRpcUnavailable(error) &&
                !unconfirmedAutoSaveRef.current
              ) {
                unconfirmedAutoSaveRef.current = { entry: saveEntry, payload: attemptedPayload };
              }
              throw error;
            }

            clientProductIdRef.current = response.productId;
            serverProductIdRef.current = response.productId;
            serverProductVersionRef.current = response.updatedAt;
            persistedRevisionRef.current = Math.max(
              persistedRevisionRef.current,
              saveEntry.revision
            );
            if (saveOperationIdRef.current === savePayload.operationId) {
              saveOperationIdRef.current = null;
              saveRequestedAtRef.current = null;
            }
            if (unconfirmedAutoSaveRef.current?.payload.operationId === savePayload.operationId) {
              unconfirmedAutoSaveRef.current = null;
            }
            if (formRevisionRef.current <= saveEntry.revision) dirtyRef.current = false;
            setFormDataRaw((previous: any) => ({
              ...previous,
              id: response.productId,
              updated_at: response.updatedAt,
              updatedAt: response.updatedAt,
              isDraft: true,
              active: false,
              status: 'draft',
            }));
            return true;
          },
          (errors) => presentValidationErrors(errors, true, false)
        );

        return result !== false;
      };

      try {
        const unresolved = unconfirmedAutoSaveRef.current;
        if (unresolved) {
          const recovered = await persistEntry(unresolved.entry, unresolved.payload);
          if (!recovered) {
            setAutoSaveStatus('error');
            return false;
          }
          if (entry.revision <= unresolved.entry.revision) {
            setAutoSaveStatus('saved');
            return true;
          }
        }

        if (!(await persistEntry(entry))) {
          setAutoSaveStatus('error');
          return false;
        }
        setAutoSaveStatus('saved');
        return true;
      } catch (error: any) {
        setAutoSaveStatus('error');
        setAutoSaveError(
          error?.message || 'Não foi possível confirmar o salvamento automático do rascunho.'
        );
        return false;
      }
    },
    [
      clientProductIdRef,
      dirtyRef,
      draftFormEnqueueAndRun,
      formRevisionRef,
      onAutoSave,
      persistedRevisionRef,
      prepareSavePayload,
      presentValidationErrors,
      saveOperationIdRef,
      saveRequestedAtRef,
      serverProductIdRef,
      serverProductVersionRef,
      setAutoSaveError,
      setAutoSaveStatus,
      setFormDataRaw,
      unconfirmedAutoSaveRef,
    ]
  );

  autoSaveRunnerRef.current = runDraftAutoSave;
  if (!autoSaveQueueRef.current) {
    autoSaveQueueRef.current = createMobileProductDraftSaveQueue((entry) =>
      autoSaveRunnerRef.current(entry)
    );
  }

  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = null;
    if (
      !visible ||
      saving ||
      autoSavePausedRef.current ||
      formRevisionRef.current <= persistedRevisionRef.current ||
      !canAutoSaveDraft(formData)
    ) {
      return;
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      const snapshot = formDataRef.current;
      const revision = formRevisionRef.current;
      if (revision > persistedRevisionRef.current && canAutoSaveDraft(snapshot)) {
        void autoSaveQueueRef.current
          ?.enqueue({ snapshot, revision })
          .catch((error: any) => {
            setAutoSaveStatus('error');
            setAutoSaveError(
              error?.message || 'Não foi possível salvar o rascunho automaticamente.'
            );
          });
      }
    }, 500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    };
  }, [
    autoSavePausedRef,
    autoSaveQueueRef,
    autoSaveTimerRef,
    canAutoSaveDraft,
    formData,
    formDataRef,
    formRevisionRef,
    persistedRevisionRef,
    saving,
    setAutoSaveError,
    setAutoSaveStatus,
    visible,
  ]);

  const flushDraftAutoSave = useCallback(async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = null;

    while (formRevisionRef.current > persistedRevisionRef.current) {
      const snapshot = formDataRef.current;
      const revision = formRevisionRef.current;
      if (!canAutoSaveDraft(snapshot) || !autoSaveQueueRef.current) return false;
      const saved = await autoSaveQueueRef.current.enqueue({ snapshot, revision });
      if (!saved) return false;
    }

    return true;
  }, [autoSaveQueueRef, autoSaveTimerRef, canAutoSaveDraft, formDataRef, formRevisionRef, persistedRevisionRef]);

  const closeAfterDraftAutoSave = useCallback(async () => {
    const saved = await flushDraftAutoSave();
    if (saved && formRevisionRef.current <= persistedRevisionRef.current) {
      dirtyRef.current = false;
      onClose();
      return;
    }

    Alert.alert(
      'Rascunho não confirmado',
      autoSaveError ||
        'Não foi possível confirmar o salvamento. Tente novamente ou descarte as alterações.',
      [
        { text: 'Continuar editando', style: 'cancel' },
        { text: 'Tentar novamente', onPress: () => void closeAfterDraftAutoSave() },
        { text: 'Descartar', style: 'destructive', onPress: onClose },
      ]
    );
  }, [autoSaveError, dirtyRef, flushDraftAutoSave, formRevisionRef, onClose, persistedRevisionRef]);

  const handleRequestClose = useCallback(() => {
    if (saving) return;
    if (!dirtyRef.current) {
      onClose();
      return;
    }
    const snapshot = formDataRef.current;
    if (
      !product?.id &&
      !serverProductIdRef.current &&
      !unconfirmedAutoSaveRef.current &&
      !hasRequiredProductName(snapshot.name || snapshot.title || snapshot.marketplaceTitle)
    ) {
      dirtyRef.current = false;
      onClose();
      return;
    }
    if (canAutoSaveDraft(snapshot)) {
      void closeAfterDraftAutoSave();
      return;
    }
    Alert.alert('Descartar alterações?', 'Existem alterações não salvas neste produto.', [
      { text: 'Continuar editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: onClose },
    ]);
  }, [
    canAutoSaveDraft,
    closeAfterDraftAutoSave,
    dirtyRef,
    formDataRef,
    onClose,
    product,
    saving,
    serverProductIdRef,
    unconfirmedAutoSaveRef,
  ]);

  return {
    canAutoSaveDraft,
    prepareSavePayload,
    flushDraftAutoSave,
    handleRequestClose,
  };
}
