import { useEffect, useState } from 'react';
import { getSettings } from '@/pages/utils/settingsService';
import { resolveNfeSequenceSettings } from '@/pages/utils/nfe/nfeSequenceSettings';
import {
  getCachedFiscalNumberPreview,
  getNextNfeNumberPreview,
} from '@/pages/utils/nfe/nfeService';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
import type {
  NfeSequencePreviewState,
  NfeSequenceSettingsState,
} from '../types/nfeEmission.types';
import { withNfeEmissionStage } from '../../../../../../../../src/telemetry/nfeEmissionPerformance';

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
    useState<NfeSequencePreviewState | null>(() => {
      const model = currentModel;
      try {
        const sequence = resolveNfeSequenceSettings(getSettings(), model, DEFAULT_NFE_ENVIRONMENT);
        const cached = getCachedFiscalNumberPreview(model, DEFAULT_NFE_ENVIRONMENT, sequence.series);
        if (cached !== null) {
          return {
            number: String(cached),
            model,
            series: sequence.series,
            environment: DEFAULT_NFE_ENVIRONMENT,
          };
        }
      } catch (err) {
        console.warn('[useNfeSequencePreview] Falha ao recuperar prévia em cache da sequência fiscal:', err);
        return null;
      }
      return null;
    });

  const [nfeNumberSequenceSettings, setNfeNumberSequenceSettings] =
    useState<NfeSequenceSettingsState>(() => {
      const model = currentModel;
      try {
        return {
          model,
          series: resolveNfeSequenceSettings(getSettings(), model, DEFAULT_NFE_ENVIRONMENT).series,
          environment: DEFAULT_NFE_ENVIRONMENT,
        };
      } catch (err) {
        console.warn(
          '[useNfeSequencePreview] Falha ao resolver configuração de série da sequência fiscal:',
          err
        );
        return { model, series: null, environment: DEFAULT_NFE_ENVIRONMENT };
      }
    });

  const [isResolvingNfeNumber, setIsResolvingNfeNumber] = useState(Boolean(orderId));
  const [nfeNumberLookupError, setNfeNumberLookupError] = useState<string | null>(null);
  const [manualNumberInput, setManualNumberInput] = useState<string | null>(null);

  const sequenceScopeMatches =
    nfeNumberSequenceSettings.model === currentModel &&
    nfeNumberSequenceSettings.environment === environment;

  const nfeNumberSequence = sequenceScopeMatches
    ? nfeNumberSequenceSettings
    : { model: currentModel, series: null, environment };

  const autoPreview =
    sequenceScopeMatches &&
    nfeNumberSequence.series &&
    numberPreviewState?.model === currentModel &&
    numberPreviewState.environment === environment &&
    numberPreviewState.series === nfeNumberSequence.series
      ? numberPreviewState.number
      : '';

  const numberPreview = manualNumberInput !== null ? manualNumberInput : autoPreview;

  const isLoadingNfeNumber =
    Boolean(orderId) &&
    (!sequenceScopeMatches ||
      isResolvingNfeNumber ||
      (!numberPreviewState && !nfeNumberLookupError));

  const nfeNumberError = sequenceScopeMatches ? nfeNumberLookupError : null;

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
          setNfeNumberLookupError('Não foi possível consultar o próximo número fiscal.');
        }
      })
      .finally(() => {
        if (active) setIsResolvingNfeNumber(false);
      });

    return () => {
      active = false;
    };
  }, [orderId, currentModel, environment]);

  return {
    numberPreview,
    manualNumberInput,
    nfeNumberSequence,
    isLoadingNfeNumber,
    nfeNumberError,
    numberPreviewState,
    setNumberPreviewState,
    setManualNumberInput,
  };
}
