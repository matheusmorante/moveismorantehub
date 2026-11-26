import type React from 'react';
import { useEffect, useState } from 'react';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import {
  variationFamilyConflictSchema,
  variationFamilyQuerySchema,
  variationFamilyUuidSchema,
} from '../../../../../../shared-utils/variationFamilyFormSchemas';
import { withTimeout } from '../../../../../../shared-utils/core/withTimeout';
import {
  checkMobileVariationAttributeConflict,
  countMobileParentVariations,
  searchMobileVariationFamilies,
  type MobileVariationAttribute,
  type MobileVariationFamily,
} from '../../services/variations/mobileProductVariationActionsService';
import type { MobileMoveVariationConflictState } from './useMobileMoveVariationConfirmationCountdown';

interface UseMobileMoveVariationQueriesParams {
  visible: boolean;
  variation: any | null;
  variationId: string;
  sourceParentId: string;
  targetFamilyId: string;
  normalizedFamilyQuery: string;
  queryReady: boolean;
  setQueryReady: React.Dispatch<React.SetStateAction<boolean>>;
  setFamilies: React.Dispatch<React.SetStateAction<MobileVariationFamily[]>>;
  setFamiliesLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setQueryError: React.Dispatch<React.SetStateAction<string>>;
  setSuggestionsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSuggestionsError: React.Dispatch<React.SetStateAction<string>>;
  setIsOnlyVariation: React.Dispatch<React.SetStateAction<boolean>>;
  conflictState: MobileMoveVariationConflictState;
  setConflictState: React.Dispatch<React.SetStateAction<MobileMoveVariationConflictState>>;
  setConflictError: React.Dispatch<React.SetStateAction<string>>;
  validAttributes: MobileVariationAttribute[];
  formAttributes: MobileVariationAttribute[];
}

/** Gerencia consultas iniciais, sugestões com debounce e validação de conflito ao mover variação. */
export function useMobileMoveVariationQueries(params: UseMobileMoveVariationQueriesParams) {
  const {
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
    setConflictState,
    setConflictError,
    validAttributes,
    formAttributes,
  } = params;

  const [queryRevision, setQueryRevision] = useState(0);
  const [suggestionRevision, setSuggestionRevision] = useState(0);
  const [conflictRevision, setConflictRevision] = useState(0);

  const familyQueryForm = useZodForm(variationFamilyQuerySchema, { sourceId: variationId });
  const conflictQueryForm = useZodForm(variationFamilyConflictSchema, {
    sourceId: variationId,
    familyId: targetFamilyId,
    attributes: formAttributes,
  });

  useEffect(() => {
    if (!visible || !variation) return;
    setConflictRevision(0);
  }, [visible, variationId, sourceParentId]);

  useEffect(() => {
    if (!visible || !variation) return;
    let current = true;
    let accepting = true;
    setFamiliesLoading(true);
    setQueryReady(false);
    setQueryError('');
    void (async () => {
      try {
        const input = await familyQueryForm.validateValues({ sourceId: variationId }, (errors) => {
          if (current && accepting) {
            setQueryError(
              Object.values(flattenFormErrors(errors))[0] ||
                'A variação de origem não pôde ser validada.'
            );
          }
        });
        if (!current || !accepting) return;
        if (!input) throw new Error('A variação de origem não pôde ser validada. Reabra a operação.');
        const validatedParentId = variationFamilyUuidSchema.parse(sourceParentId);
        const result = await withTimeout(
          countMobileParentVariations(validatedParentId, () => current && accepting),
          32_000,
          null,
          'mover-variacao:consultas'
        );
        if (!current || !accepting) return;
        if (!result) {
          throw new Error('A consulta da mudança de família excedeu o prazo. Consulte novamente.');
        }
        setFamilies([]);
        setIsOnlyVariation(result === 1);
        setQueryReady(true);
      } catch (error: unknown) {
        if (current && accepting) {
          setQueryReady(false);
          setQueryError(
            error instanceof Error
              ? error.message
              : 'Não foi possível consultar a mudança de família. Consulte novamente.'
          );
        }
      } finally {
        accepting = false;
        if (current) setFamiliesLoading(false);
      }
    })();
    return () => {
      current = false;
      accepting = false;
    };
  }, [visible, variationId, sourceParentId, queryRevision, familyQueryForm.validateValues]);

  useEffect(() => {
    let current = true;
    let accepting = true;
    if (
      !visible ||
      !queryReady ||
      !sourceParentId ||
      targetFamilyId ||
      normalizedFamilyQuery.length < 3
    ) {
      if (!targetFamilyId) setFamilies([]);
      setSuggestionsLoading(false);
      setSuggestionsError('');
      return () => {
        current = false;
        accepting = false;
      };
    }

    setFamilies([]);
    setSuggestionsError('');
    setSuggestionsLoading(true);
    const timer = setTimeout(() => {
      void searchMobileVariationFamilies(
        normalizedFamilyQuery,
        sourceParentId,
        () => current && accepting
      )
        .then((results) => {
          if (current && accepting) setFamilies(results);
        })
        .catch((failure) => {
          if (current && accepting) {
            setSuggestionsError(
              failure instanceof Error
                ? failure.message
                : 'Não foi possível buscar os produtos pai.'
            );
          }
        })
        .finally(() => {
          if (current) setSuggestionsLoading(false);
          accepting = false;
        });
    }, 250);

    return () => {
      current = false;
      accepting = false;
      clearTimeout(timer);
    };
  }, [
    normalizedFamilyQuery,
    queryReady,
    sourceParentId,
    suggestionRevision,
    targetFamilyId,
    visible,
  ]);

  useEffect(() => {
    if (!visible || !queryReady || !targetFamilyId || validAttributes.length === 0) {
      setConflictState('idle');
      setConflictError('');
      return;
    }
    let current = true;
    let accepting = true;
    setConflictState('checking');
    setConflictError('');
    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const input = await conflictQueryForm.validateValues(
            { sourceId: variationId, familyId: targetFamilyId, attributes: formAttributes },
            (errors) => {
              if (current && accepting) {
                setConflictError(
                  Object.values(flattenFormErrors(errors))[0] ||
                    'Confira as características antes de validar o destino.'
                );
              }
            }
          );
          if (!current || !accepting) return;
          if (!input) throw new Error('Os dados da combinação não puderam ser validados.');
          const result = await withTimeout(
            checkMobileVariationAttributeConflict(
              input.sourceId,
              input.familyId,
              input.attributes,
              () => current && accepting
            ),
            11_000,
            null,
            'mover-variacao:validar-destino'
          );
          if (!current || !accepting) return;
          if (result === null) {
            throw new Error('A validação do destino excedeu o prazo. Consulte novamente.');
          }
          setConflictState(result ? 'conflict' : 'clear');
        } catch (error: unknown) {
          if (current && accepting) {
            setConflictState('error');
            setConflictError(
              error instanceof Error
                ? error.message
                : 'Não foi possível validar o destino. Consulte novamente.'
            );
          }
        } finally {
          accepting = false;
        }
      })();
    }, 250);
    return () => {
      current = false;
      accepting = false;
      clearTimeout(timeout);
    };
  }, [
    visible,
    queryReady,
    variationId,
    targetFamilyId,
    validAttributes,
    formAttributes,
    conflictRevision,
    conflictQueryForm.validateValues,
  ]);

  return {
    retryQuery: () => setQueryRevision((revision) => revision + 1),
    retrySuggestions: () => {
      setSuggestionsError('');
      setSuggestionsLoading(true);
      setSuggestionRevision((revision) => revision + 1);
    },
    retryConflict: () => setConflictRevision((revision) => revision + 1),
  };
}
