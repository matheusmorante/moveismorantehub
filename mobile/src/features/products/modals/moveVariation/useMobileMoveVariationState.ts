import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import {
  canAddVariationFamilyAttribute,
  variationFamilyCommandSchema,
  VariationFamilyUnconfirmedError,
  type VariationFamilyOperationGuard,
} from '../../../../../../shared-utils/variationFamilyFormSchemas';
import { parseVariationImages } from '../../../../../../shared-utils/productVariationImages';
import { normalizeSearchTerm } from '../../../../../../shared-utils/core/searchText';
import {
  useMobileMoveVariationConfirmationCountdown,
  type MobileMoveVariationConflictState,
} from './useMobileMoveVariationConfirmationCountdown';
import {
  getMobileVariationFamilyName,
  getMobileVariationFamilySuggestions,
} from './mobileMoveVariationFamilySuggestions';
import {
  prepareMobileMoveVariationAttributes,
  type MobileMoveVariationAttributeRow,
} from './mobileMoveVariationAttributes';
import {
  toMobileVariationAttributes,
  type MobileVariationFamily,
} from '../../services/variations/mobileProductVariationActionsService';
import { useMobileMoveVariationQueries } from './useMobileMoveVariationQueries';
import { useMobileMoveVariationSubmit } from './useMobileMoveVariationSubmit';

const moveVariationFormSchema = variationFamilyCommandSchema.safeExtend({
  ready: z.boolean().refine(Boolean, 'Aguarde a validação da combinação antes de mover a variação.'),
});

/** Gerencia consulta de origem, busca de família de destino, validação de conflito e confirmação da movimentação. */
export function useMobileMoveVariationState({
  visible,
  variation,
  parentProduct,
  onClose,
  onMoved,
}: {
  visible: boolean;
  variation: any | null;
  parentProduct: any | null;
  onClose: () => void;
  onMoved: () => void | Promise<void>;
}) {
  const variationId = String(variation?.variationId || variation?.id || '');
  const sourceParentId = String(parentProduct?.id || variation?.parentId || '');
  const [families, setFamilies] = useState<MobileVariationFamily[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(false);
  const [queryReady, setQueryReady] = useState(false);
  const [familyQuery, setFamilyQuery] = useState('');
  const [targetFamilyId, setTargetFamilyId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [attributes, setAttributes] = useState<MobileMoveVariationAttributeRow[]>([]);
  const [queryError, setQueryError] = useState('');
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [conflictState, setConflictState] = useState<MobileMoveVariationConflictState>('idle');
  const [conflictError, setConflictError] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [isOnlyVariation, setIsOnlyVariation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [operationError, setOperationError] = useState('');
  const attributeRowId = useRef(0);
  const operationGuards = useRef(new Map<string, VariationFamilyOperationGuard>());
  const sourceGuardKey = variationId.trim().toLowerCase();
  if (!operationGuards.current.has(sourceGuardKey)) {
    operationGuards.current.set(sourceGuardKey, { active: null, error: '' });
  }
  const operationGuard = operationGuards.current.get(sourceGuardKey)!;
  const mutationBlocked = Boolean(operationError || operationGuard.error);
  const operationToken = useRef(Symbol('move-family'));
  const active = useRef(false);
  const lock = useRef(false);
  const completed = useRef(false);

  const { validAttributes, formAttributes } = useMemo(
    () => prepareMobileMoveVariationAttributes(attributes),
    [attributes]
  );
  const targetFamily = families.find((family) => family.id === targetFamilyId);
  const images = useMemo(() => {
    const variationImages = parseVariationImages(variation?.image_url, variation?.images);
    return variationImages.length > 0
      ? variationImages
      : parseVariationImages(undefined, parentProduct?.images);
  }, [variation?.images, variation?.image_url, parentProduct?.images]);
  const variationName = targetFamily
    ? [getMobileVariationFamilyName(targetFamily), ...validAttributes.map((attribute) => attribute.value)]
        .filter(Boolean)
        .join(' ')
    : '';
  const formValues = {
    sourceId: variationId,
    familyId: targetFamilyId,
    sourceParentId,
    attributes: formAttributes,
    name: variationName,
    images,
    ready: conflictState === 'clear' && countdown === 0 && queryReady && !familiesLoading && !queryError,
  };
  const form = useZodForm(moveVariationFormSchema, formValues);
  const suggestions = useMemo(
    () => getMobileVariationFamilySuggestions(families, familyQuery, targetFamilyId),
    [families, familyQuery, targetFamilyId]
  );
  const normalizedFamilyQuery = normalizeSearchTerm(familyQuery);

  useEffect(() => {
    const currentToken = Symbol('move-family');
    operationToken.current = currentToken;
    active.current = Boolean(visible && variation);
    lock.current = false;
    completed.current = false;
    setOperationError(operationGuard.error);
    if (operationGuard.active && operationGuard.active !== currentToken) {
      operationGuard.error ||= new VariationFamilyUnconfirmedError().message;
      setOperationError(operationGuard.error);
    }
    return () => {
      active.current = false;
      if (!completed.current && operationGuard.active === currentToken) {
        operationGuard.error ||= new VariationFamilyUnconfirmedError().message;
      }
    };
  }, [visible, variationId, sourceParentId, operationGuard]);

  useEffect(() => {
    if (!visible || !variation) return;
    setFamilies([]);
    setSuggestionsLoading(false);
    setSuggestionsError('');
    setQueryReady(false);
    setTargetFamilyId('');
    setFamilyQuery('');
    setShowSuggestions(false);
    setAttributes(
      toMobileVariationAttributes(variation.attributes).map((attribute) => ({
        ...attribute,
        rowId: `attribute-${attributeRowId.current++}`,
      }))
    );
    setQueryError('');
    setConflictState('idle');
    setConflictError('');
    setCountdown(5);
    setIsOnlyVariation(false);
  }, [visible, variationId, sourceParentId]);

  const { retryQuery, retrySuggestions, retryConflict } = useMobileMoveVariationQueries({
    visible,
    variation,
    variationId,
    sourceParentId,
    targetFamilyId,
    normalizedFamilyQuery,
    queryReady,
    setQueryReady,
    setFamilies,
    setFamiliesLoading,
    setQueryError,
    setSuggestionsLoading,
    setSuggestionsError,
    setIsOnlyVariation,
    conflictState,
    setConflictState,
    setConflictError,
    validAttributes,
    formAttributes,
  });

  useMobileMoveVariationConfirmationCountdown({
    visible,
    targetFamilyId,
    conflictState,
    saving,
    countdown,
    setCountdown,
  });

  const updateAttribute = (index: number, field: 'name' | 'value', value: string) => {
    if (mutationBlocked || saving) return;
    setAttributes((current) =>
      current.map((attribute, attributeIndex) =>
        attributeIndex === index ? { ...attribute, [field]: value } : attribute
      )
    );
    setCountdown(5);
  };

  const addAttribute = () => {
    if (saving || mutationBlocked) return;
    setAttributes((current) =>
      canAddVariationFamilyAttribute(current)
        ? [...current, { name: '', value: '', rowId: `attribute-${attributeRowId.current++}` }]
        : current
    );
    setCountdown(5);
  };

  const handleQueryChange = (value: string) => {
    setFamilyQuery(value);
    setTargetFamilyId('');
    setFamilies([]);
    setSuggestionsError('');
    setSuggestionsLoading(normalizeSearchTerm(value).length >= 3);
    setShowSuggestions(true);
    setConflictState('idle');
    setCountdown(5);
  };

  const handleSelectFamily = (family: MobileVariationFamily) => {
    setTargetFamilyId(family.id);
    setFamilyQuery(`${getMobileVariationFamilyName(family)}${family.code ? ` — ${family.code}` : ''}`);
    setShowSuggestions(false);
    setSuggestionsLoading(false);
    setSuggestionsError('');
    setCountdown(5);
  };

  const { handleMove } = useMobileMoveVariationSubmit({
    targetFamily,
    variationId,
    sourceParentId,
    saving,
    setSaving,
    setOperationError,
    formValues,
    validateAndRun: form.validateAndRun,
    operationGuard,
    operationToken,
    active,
    lock,
    completed,
    onClose,
    onMoved,
  });

  const closeDisabled = saving || Boolean(operationGuard.active);
  const canConfirm =
    Boolean(targetFamilyId) &&
    validAttributes.length > 0 &&
    conflictState === 'clear' &&
    countdown === 0 &&
    !saving &&
    queryReady &&
    !familiesLoading &&
    !queryError &&
    !mutationBlocked &&
    !operationGuard.active &&
    !operationGuard.error &&
    !completed.current;
  const buttonLabel = !validAttributes.length
    ? 'Característica obrigatória'
    : saving
      ? 'Movendo…'
      : conflictState === 'checking'
        ? 'Validando combinação…'
        : conflictState === 'conflict'
          ? 'Resolva o conflito'
          : conflictState === 'error'
            ? 'Falha na validação'
            : targetFamilyId && countdown > 0
              ? `Confirmar em ${countdown}s`
              : isOnlyVariation
                ? 'Mover e remover produto'
                : 'Confirmar mudança';

  return {
    familiesLoading,
    queryReady,
    familyQuery,
    targetFamilyId,
    showSuggestions,
    setShowSuggestions,
    attributes,
    queryError,
    suggestionsLoading,
    suggestionsError,
    conflictState,
    conflictError,
    isOnlyVariation,
    saving,
    mutationBlocked,
    blockedMessage: operationError || operationGuard.error,
    suggestions,
    closeDisabled,
    canConfirm,
    buttonLabel,
    retryQuery,
    retrySuggestions,
    retryConflict,
    updateAttribute,
    addAttribute,
    handleQueryChange,
    handleSelectFamily,
    handleMove,
  };
}
