import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import type VariationType from '../../../types/variation.type';
import {
  getVariationErrorMessage,
  saveVariation,
} from '../../../utils/variationService';
import {
  type CharacteristicFormData,
  type CharacteristicSaveStatus,
  getInitialCharacteristicFormData,
  isChoiceCharacteristicType,
  resolveCharacteristicUnit,
  validateCharacteristicSnapshot,
  createCharacteristicFormSchema,
} from '../domain/characteristicFormRules';
import {
  CHARACTERISTIC_OPTIONS_PAGE_SIZE,
  useCharacteristicOptionsEditor,
} from './useCharacteristicOptionsEditor';

export { CHARACTERISTIC_OPTIONS_PAGE_SIZE };

const FORM_AUTOSAVE_DEBOUNCE_MS = 500;

interface UseCharacteristicFormParams {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess?: () => void | Promise<void>;
  readonly variation?: VariationType | null;
  readonly allVariations?: readonly VariationType[];
}

export const useCharacteristicForm = ({
  isOpen,
  onClose,
  onSuccess,
  variation,
  allVariations = [],
}: UseCharacteristicFormParams) => {
  const [formData, setFormData] = useState<CharacteristicFormData>(() =>
    getInitialCharacteristicFormData(variation)
  );
  const [saveStatus, setSaveStatus] = useState<CharacteristicSaveStatus>('saved');
  const [saveError, setSaveError] = useState('');
  const [savedCharacteristicId, setSavedCharacteristicId] = useState<string | undefined>(
    variation?.id
  );
  const [isClosing, setIsClosing] = useState(false);

  const formDataRef = useRef(formData);
  const currentIdRef = useRef<string | undefined>(variation?.id);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const requestedRevisionRef = useRef(0);
  const closingRef = useRef(false);
  const schema = useMemo(
    () => createCharacteristicFormSchema(allVariations, () => currentIdRef.current),
    [allVariations],
  );
  const { validateAndRun } = useZodForm(schema, { ...formData });

  const cancelPendingFormSaveTimer = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  const getFormError = useCallback(
    (snapshot: CharacteristicFormData): string | null =>
      validateCharacteristicSnapshot(snapshot, allVariations, currentIdRef.current),
    [allVariations]
  );

  const persistSnapshot = useCallback(
    async (
      snapshot: CharacteristicFormData,
      revision: number,
      force = false
    ): Promise<{ ok: boolean; id?: string }> => {
      if (!force && revision <= requestedRevisionRef.current) return { ok: false };
      requestedRevisionRef.current = Math.max(requestedRevisionRef.current, revision);
      if (revision === revisionRef.current) {
        setSaveStatus('saving');
        setSaveError('');
      }

      const request = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const id = await validateAndRun(snapshot, (values) => saveVariation(
            {
              id: currentIdRef.current,
              name: values.name,
              options: isChoiceCharacteristicType(values.dataType)
                ? values.options.map((option, index) => ({ ...option, sortOrder: index }))
                : [],
              active: values.active,
              dataType: values.dataType,
              decimalPlaces:
                values.dataType === 'decimal' ? values.decimalPlaces : undefined,
              isCustom: variation?.isCustom ?? true,
              unit: resolveCharacteristicUnit(values.dataType, values.unit),
            },
            { invalidate: false }
          ), (errors) => { throw new Error(Object.values(flattenFormErrors(errors))[0] || 'Confira a característica.'); });
          if (id === false) throw new Error('Confira a característica.');
          currentIdRef.current = id;
          setSavedCharacteristicId(id);
          return id;
        });
      saveQueueRef.current = request.then(
        () => undefined,
        () => undefined
      );

      try {
        const id = await request;
        savedRevisionRef.current = Math.max(savedRevisionRef.current, revision);
        if (revision === revisionRef.current) {
          if (!isChoiceCharacteristicType(snapshot.dataType)) {
            const savedSnapshot = { ...snapshot, options: [] };
            formDataRef.current = savedSnapshot;
            setFormData(savedSnapshot);
          }
          setSaveStatus('saved');
          setSaveError('');
        }
        return { ok: true, id };
      } catch (error: unknown) {
        if (revision === revisionRef.current) {
          setSaveStatus('error');
          setSaveError(
            getVariationErrorMessage(error, 'Não foi possível salvar a característica.')
          );
        }
        return { ok: false };
      }
    },
    [validateAndRun, variation?.isCustom]
  );

  const persistImmediateSnapshot = useCallback(
    async (next: CharacteristicFormData) => {
      const revision = ++revisionRef.current;
      return persistSnapshot(next, revision, true);
    },
    [persistSnapshot]
  );

  const optionsEditor = useCharacteristicOptionsEditor({
    isOpen,
    variationKey: variation?.id ?? variation?.name,
    formData,
    formDataRef,
    setFormData,
    saveStatus,
    setSaveStatus,
    setSaveError,
    isClosing,
    cancelPendingFormSaveTimer,
    persistImmediateSnapshot,
  });

  const scheduleFormSave = (update: (current: CharacteristicFormData) => CharacteristicFormData) => {
    if (closingRef.current || optionsEditor.optionIdsOutOfSync) return;
    const next = update(formDataRef.current);
    formDataRef.current = next;
    setFormData(next);
    const revision = ++revisionRef.current;
    setSaveStatus('pending');
    setSaveError('');
    cancelPendingFormSaveTimer();
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persistSnapshot(next, revision);
    }, FORM_AUTOSAVE_DEBOUNCE_MS);
  };

  const flushFormSave = () => {
    cancelPendingFormSaveTimer();
    const revision = revisionRef.current;
    if (revision > requestedRevisionRef.current) {
      void persistSnapshot(formDataRef.current, revision);
    }
  };

  const closeModal = useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    cancelPendingFormSaveTimer();
    optionsEditor.clearPendingOptionSaveTimer();

    await saveQueueRef.current;
    const revision = revisionRef.current;
    if (revision > savedRevisionRef.current) {
      const snapshot = formDataRef.current;
      if (snapshot.name.trim() && getFormError(snapshot)) {
        revisionRef.current = savedRevisionRef.current;
      } else if (snapshot.name.trim()) {
        const result = await persistSnapshot(snapshot, revision, true);
        if (!result.ok) {
          closingRef.current = false;
          setIsClosing(false);
          return;
        }
      }
    }

    await saveQueueRef.current;
    if (savedRevisionRef.current > 0) {
      try {
        await onSuccess?.();
      } catch (error) {
        console.error('Falha ao atualizar a lista de características após salvar:', error);
      }
    }
    onClose();
  }, [
    cancelPendingFormSaveTimer,
    getFormError,
    onClose,
    onSuccess,
    optionsEditor.clearPendingOptionSaveTimer,
    persistSnapshot,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    cancelPendingFormSaveTimer();
    const initialData = getInitialCharacteristicFormData(variation);
    formDataRef.current = initialData;
    currentIdRef.current = variation?.id;
    revisionRef.current = 0;
    savedRevisionRef.current = 0;
    requestedRevisionRef.current = 0;
    closingRef.current = false;
    setFormData(initialData);
    setSavedCharacteristicId(variation?.id);
    setSaveStatus('saved');
    setSaveError('');
    setIsClosing(false);
  }, [cancelPendingFormSaveTimer, variation, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void closeModal();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeModal, isOpen]);

  const hasOptions = isChoiceCharacteristicType(formData.dataType);
  const isMeasure = formData.dataType === 'measure';

  const handleTypeChange = (dataType: NonNullable<VariationType['dataType']>) => {
    scheduleFormSave((current) => ({
      ...current,
      dataType,
      unit: resolveCharacteristicUnit(dataType, current.unit),
    }));
  };

  return {
    formData,
    saveStatus,
    saveError,
    savedCharacteristicId,
    isClosing,
    hasOptions,
    isMeasure,
    changeFormData: scheduleFormSave,
    flushFormSave,
    closeModal,
    handleTypeChange,
    ...optionsEditor,
  };
};
