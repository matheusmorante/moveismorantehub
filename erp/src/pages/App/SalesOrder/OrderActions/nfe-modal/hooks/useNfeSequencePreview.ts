import { useEffect, useState } from 'react';
import { getSettings } from '@/pages/utils/settingsService';
import { resolveNfeSequenceSettings } from '@/pages/utils/nfe/nfeSequenceSettings';
import {
  getCachedFiscalNumberPreview,
  getNextNfeNumberPreview,
} from '@/pages/utils/nfe/nfeService';
import type {
  NfeSequencePreviewState,
  NfeSequenceSettingsState,
} from '../types/nfeEmission.types';
import { withNfeEmissionStage } from '../../../../../../../../src/telemetry/nfeEmissionPerformance';
import {
  computeDerivedSequencePreview,
  resolveInitialPreviewState,
  resolveInitialSequenceSettings,
} from './nfeSequencePreviewHelpers';

export interface UseNfeSequencePreviewProps {
  orderId: string | number | undefined;
  currentModel: '55' | '65';
  environment: 1 | 2;
}

export function useNfeSequencePreview({
  orderId,
  currentModel,
  environment,
}: UseNfeSequencePreviewProps) {
  const [numberPreviewState, setNumberPreviewState] =
    useState<NfeSequencePreviewState | null>(() => resolveInitialPreviewState(currentModel));

  const [nfeNumberSequenceSettings, setNfeNumberSequenceSettings] =
    useState<NfeSequenceSettingsState>(() => resolveInitialSequenceSettings(currentModel));

  const [isResolvingNfeNumber, setIsResolvingNfeNumber] = useState(Boolean(orderId));
  const [nfeNumberLookupError, setNfeNumberLookupError] = useState<string | null>(null);
  const [manualNumberInput, setManualNumberInput] = useState<string | null>(null);
  const [sequencePreviewRetry, setSequencePreviewRetry] = useState(0);

  const { nfeNumberSequence, numberPreview, isLoadingNfeNumber, nfeNumberError } =
    computeDerivedSequencePreview({
      currentModel,
      environment,
      numberPreviewState,
      nfeNumberSequenceSettings,
      manualNumberInput,
      isResolvingNfeNumber,
      nfeNumberLookupError,
      hasOrderId: Boolean(orderId),
    });

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    const model = currentModel;
    setNfeNumberLookupError(null);

    let sequence: ReturnType<typeof resolveNfeSequenceSettings>;
    try {
      sequence = resolveNfeSequenceSettings(getSettings(), model, environment);
    } catch (error) {
      setNfeNumberSequenceSettings({ model, series: null, environment });
      setNfeNumberLookupError(
        error instanceof Error ? error.message : 'A sequência fiscal está inválida.'
      );
      setIsResolvingNfeNumber(false);
      return () => {
        active = false;
      };
    }

    setNfeNumberSequenceSettings({ model, series: sequence.series, environment });

    const cached = getCachedFiscalNumberPreview(model, environment, sequence.series);
    if (cached !== null) {
      setNumberPreviewState({
        number: String(cached),
        model,
        series: sequence.series,
        environment,
      });
      setIsResolvingNfeNumber(false);
    } else {
      setNumberPreviewState(null);
      setIsResolvingNfeNumber(true);
    }

    withNfeEmissionStage(
      'sequence_preview',
      () => getNextNfeNumberPreview(model, environment, sequence.series, sequence.minimumNumber),
      { model, environment }
    )
      .then((number) => {
        if (active) {
          setNumberPreviewState({
            number: String(number),
            model,
            series: sequence.series,
            environment,
          });
        }
      })
      .catch((error) => {
        if (active) {
          console.error('Falha ao consultar sequência NF-e:', error);
          setNfeNumberLookupError(
            error instanceof Error && error.message
              ? error.message
              : 'Não foi possível consultar o próximo número fiscal.'
          );
        }
      })
      .finally(() => {
        if (active) setIsResolvingNfeNumber(false);
      });

    return () => {
      active = false;
    };
  }, [orderId, currentModel, environment, sequencePreviewRetry]);

  const retryNfeNumberPreview = () => {
    setNumberPreviewState(null);
    setNfeNumberLookupError(null);
    setIsResolvingNfeNumber(Boolean(orderId));
    setSequencePreviewRetry((retry) => retry + 1);
  };

  return {
    numberPreview,
    manualNumberInput,
    nfeNumberSequence,
    isLoadingNfeNumber,
    nfeNumberError,
    retryNfeNumberPreview,
    numberPreviewState,
    setNumberPreviewState,
    setManualNumberInput,
  };
}
