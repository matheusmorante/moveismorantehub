import { type MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { VariationOption } from '../../../types/variation.type';
import { normalizeSearchTerm } from '../../../utils/textUtils';
import {
  fetchVariationOptionByValue,
  getVariationErrorMessage,
} from '../../../utils/variationService';
import {
  type CharacteristicFormData,
  type CharacteristicSaveStatus,
  normalizeCharacteristicText,
} from '../domain/characteristicFormRules';

const FORM_AUTOSAVE_DEBOUNCE_MS = 500;
const OPTION_SEARCH_DEBOUNCE_MS = 300;
export const CHARACTERISTIC_OPTIONS_PAGE_SIZE = 15;

interface UseCharacteristicOptionsEditorParams {
  readonly isOpen: boolean;
  readonly variationKey?: string;
  readonly formData: CharacteristicFormData;
  readonly formDataRef: MutableRefObject<CharacteristicFormData>;
  readonly setFormData: (next: CharacteristicFormData) => void;
  readonly saveStatus: CharacteristicSaveStatus;
  readonly setSaveStatus: (status: CharacteristicSaveStatus) => void;
  readonly setSaveError: (error: string) => void;
  readonly isClosing: boolean;
  readonly cancelPendingFormSaveTimer: () => void;
  readonly persistImmediateSnapshot: (
    next: CharacteristicFormData
  ) => Promise<{ ok: boolean; id?: string }>;
}

export const useCharacteristicOptionsEditor = ({
  isOpen,
  variationKey,
  formData,
  formDataRef,
  setFormData,
  saveStatus,
  setSaveStatus,
  setSaveError,
  isClosing,
  cancelPendingFormSaveTimer,
  persistImmediateSnapshot,
}: UseCharacteristicOptionsEditorParams) => {
  const [newOptionValue, setNewOptionValue] = useState('');
  const [optionSearch, setOptionSearch] = useState('');
  const [debouncedOptionSearch, setDebouncedOptionSearch] = useState('');
  const [optionPage, setOptionPage] = useState(0);
  const [optionPageSize, setOptionPageSize] = useState(CHARACTERISTIC_OPTIONS_PAGE_SIZE);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingOptionValue, setEditingOptionValue] = useState('');
  const [optionIdsOutOfSync, setOptionIdsOutOfSync] = useState(false);

  const optionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionCommitInFlightRef = useRef(new Set<string>());

  const clearPendingOptionSaveTimer = () => {
    if (optionSaveTimerRef.current) {
      clearTimeout(optionSaveTimerRef.current);
      optionSaveTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (optionSaveTimerRef.current) {
      clearTimeout(optionSaveTimerRef.current);
      optionSaveTimerRef.current = null;
    }
    setNewOptionValue('');
    setOptionSearch('');
    setDebouncedOptionSearch('');
    setOptionPage(0);
    setEditingOptionId(null);
    setEditingOptionValue('');
    setOptionIdsOutOfSync(false);
  }, [isOpen, variationKey]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setDebouncedOptionSearch(optionSearch.trim());
      setOptionPage(0);
    }, OPTION_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isOpen, optionSearch]);

  const activeOptionSearch =
    debouncedOptionSearch.length >= 3 ? normalizeSearchTerm(debouncedOptionSearch) : '';

  const filteredOptions = useMemo(() => {
    if (!activeOptionSearch) return formData.options;
    return formData.options.filter((option) =>
      normalizeSearchTerm(option.value).includes(activeOptionSearch)
    );
  }, [activeOptionSearch, formData.options]);

  const totalOptionPages = Math.max(
    1,
    Math.ceil(filteredOptions.length / optionPageSize)
  );
  const visiblePage = Math.min(optionPage, totalOptionPages - 1);
  const visibleOptions = filteredOptions.slice(
    visiblePage * optionPageSize,
    (visiblePage + 1) * optionPageSize
  );
  const firstVisibleOption =
    filteredOptions.length === 0 ? 0 : visiblePage * optionPageSize + 1;
  const lastVisibleOption = Math.min(
    (visiblePage + 1) * optionPageSize,
    filteredOptions.length
  );

  useEffect(() => {
    if (optionPage > totalOptionPages - 1) setOptionPage(totalOptionPages - 1);
  }, [optionPage, totalOptionPages]);

  const addOption = async () => {
    const value = newOptionValue.trim();
    if (!value || saveStatus === 'saving' || isClosing || optionIdsOutOfSync) return;
    const current = formDataRef.current;
    if (
      current.options.some(
        (option) =>
          normalizeCharacteristicText(option.value) === normalizeCharacteristicText(value)
      )
    ) {
      toast.error('Esta opção já foi adicionada.');
      return;
    }

    cancelPendingFormSaveTimer();
    const next: CharacteristicFormData = {
      ...current,
      options: [...current.options, { id: '', value, sortOrder: current.options.length }],
    };
    const result = await persistImmediateSnapshot(next);
    if (!result.ok || !result.id) return;

    formDataRef.current = next;
    setFormData(next);
    try {
      const savedOption = await fetchVariationOptionByValue(result.id, value);
      const synced = {
        ...next,
        options: next.options.map((option) =>
          !option.id &&
          normalizeCharacteristicText(option.value) === normalizeCharacteristicText(value)
            ? { ...option, ...savedOption }
            : option
        ),
      };
      formDataRef.current = synced;
      setFormData(synced);
      setNewOptionValue('');
      setOptionIdsOutOfSync(false);
      setOptionSearch('');
      setOptionPage(
        Math.floor((synced.options.length - 1) / optionPageSize)
      );
    } catch (error: unknown) {
      setOptionIdsOutOfSync(true);
      setSaveStatus('error');
      setSaveError(
        `${getVariationErrorMessage(error, 'Não foi possível atualizar a opção salva.')} Feche e reabra a característica para carregar os identificadores atualizados.`
      );
    }
  };

  const removeOption = async (option: VariationOption) => {
    if (
      formDataRef.current.options.length <= 1 ||
      saveStatus === 'saving' ||
      isClosing ||
      optionIdsOutOfSync
    ) {
      return;
    }
    if (!window.confirm(`Remover a opção "${option.value}"?`)) return;

    cancelPendingFormSaveTimer();
    const current = formDataRef.current;
    const next = {
      ...current,
      options: current.options.filter((candidate) => candidate.id !== option.id),
    };
    const result = await persistImmediateSnapshot(next);
    if (!result.ok) return;

    formDataRef.current = next;
    setFormData(next);
    setEditingOptionId(null);
    setEditingOptionValue('');
  };

  const commitOptionEdit = async (optionId: string, draftValue: string) => {
    if (
      !optionId ||
      optionIdsOutOfSync ||
      isClosing ||
      optionCommitInFlightRef.current.has(optionId)
    ) {
      return;
    }
    clearPendingOptionSaveTimer();

    const current = formDataRef.current;
    const currentOption = current.options.find((option) => option.id === optionId);
    const value = draftValue.trim();
    if (!currentOption) return;
    if (!value) {
      setSaveStatus('error');
      setSaveError('A opção não pode ficar vazia.');
      return;
    }
    if (
      current.options.some(
        (option) =>
          option.id !== optionId &&
          normalizeCharacteristicText(option.value) === normalizeCharacteristicText(value)
      )
    ) {
      setSaveStatus('error');
      setSaveError('Esta opção já existe na característica.');
      return;
    }
    if (
      normalizeCharacteristicText(currentOption.value) === normalizeCharacteristicText(value)
    ) {
      setEditingOptionId(null);
      setEditingOptionValue('');
      return;
    }

    cancelPendingFormSaveTimer();
    const next = {
      ...current,
      options: current.options.map((option) =>
        option.id === optionId ? { ...option, value } : option
      ),
    };
    optionCommitInFlightRef.current.add(optionId);
    const result = await persistImmediateSnapshot(next);
    optionCommitInFlightRef.current.delete(optionId);
    if (!result.ok) return;

    formDataRef.current = next;
    setFormData(next);
    setEditingOptionId(null);
    setEditingOptionValue('');
  };

  const startOptionEdit = (option: VariationOption) => {
    if (saveStatus === 'saving' || isClosing || optionIdsOutOfSync) return;
    setEditingOptionId(option.id);
    setEditingOptionValue(option.value);
  };

  const cancelOptionEdit = () => {
    clearPendingOptionSaveTimer();
    setEditingOptionId(null);
    setEditingOptionValue('');
  };

  const handleOptionEditChange = (optionId: string, value: string) => {
    setEditingOptionValue(value);
    clearPendingOptionSaveTimer();
    optionSaveTimerRef.current = setTimeout(() => {
      optionSaveTimerRef.current = null;
      void commitOptionEdit(optionId, value);
    }, FORM_AUTOSAVE_DEBOUNCE_MS);
  };

  return {
    newOptionValue,
    setNewOptionValue,
    optionSearch,
    setOptionSearch,
    optionPage,
    setOptionPage,
    optionPageSize,
    setOptionPageSize,
    editingOptionId,
    editingOptionValue,
    optionIdsOutOfSync,
    filteredOptions,
    visibleOptions,
    visiblePage,
    totalOptionPages,
    firstVisibleOption,
    lastVisibleOption,
    clearPendingOptionSaveTimer,
    addOption,
    removeOption,
    commitOptionEdit,
    startOptionEdit,
    cancelOptionEdit,
    handleOptionEditChange,
  };
};
