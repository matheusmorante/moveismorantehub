import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
import {
  getCachedFiscalNumberPreview,
} from '@/pages/utils/nfe/nfeService';
import { resolveNfeSequenceSettings } from '@/pages/utils/nfe/nfeSequenceSettings';
import { getSettings } from '@/pages/utils/settingsService';
import type {
  NfeSequencePreviewState,
  NfeSequenceSettingsState,
} from '../types/nfeEmission.types';

export function resolveInitialPreviewState(
  currentModel: '55' | '65'
): NfeSequencePreviewState | null {
  try {
    const sequence = resolveNfeSequenceSettings(getSettings(), currentModel, DEFAULT_NFE_ENVIRONMENT);
    const cached = getCachedFiscalNumberPreview(
      currentModel,
      DEFAULT_NFE_ENVIRONMENT,
      sequence.series
    );
    if (cached !== null) {
      return {
        number: String(cached),
        model: currentModel,
        series: sequence.series,
        environment: DEFAULT_NFE_ENVIRONMENT,
      };
    }
  } catch (err) {
    console.warn(
      '[useNfeSequencePreview] Falha ao recuperar prévia em cache da sequência fiscal:',
      err
    );
    return null;
  }
  return null;
}

export function resolveInitialSequenceSettings(
  currentModel: '55' | '65'
): NfeSequenceSettingsState {
  try {
    return {
      model: currentModel,
      series: resolveNfeSequenceSettings(getSettings(), currentModel, DEFAULT_NFE_ENVIRONMENT).series,
      environment: DEFAULT_NFE_ENVIRONMENT,
    };
  } catch (err) {
    console.warn(
      '[useNfeSequencePreview] Falha ao resolver configuração de série da sequência fiscal:',
      err
    );
    return { model: currentModel, series: null, environment: DEFAULT_NFE_ENVIRONMENT };
  }
}

export function computeDerivedSequencePreview(params: {
  currentModel: '55' | '65';
  environment: 1 | 2;
  numberPreviewState: NfeSequencePreviewState | null;
  nfeNumberSequenceSettings: NfeSequenceSettingsState;
  manualNumberInput: string | null;
  isResolvingNfeNumber: boolean;
  nfeNumberLookupError: string | null;
  hasOrderId: boolean;
}) {
  const {
    currentModel,
    environment,
    numberPreviewState,
    nfeNumberSequenceSettings,
    manualNumberInput,
    isResolvingNfeNumber,
    nfeNumberLookupError,
    hasOrderId,
  } = params;

  const sequenceScopeMatches =
    nfeNumberSequenceSettings.model === currentModel &&
    nfeNumberSequenceSettings.environment === environment;

  const nfeNumberSequence: NfeSequenceSettingsState = sequenceScopeMatches
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
    hasOrderId &&
    (!sequenceScopeMatches ||
      isResolvingNfeNumber ||
      (!numberPreviewState && !nfeNumberLookupError));

  const nfeNumberError = sequenceScopeMatches ? nfeNumberLookupError : null;

  return {
    nfeNumberSequence,
    numberPreview,
    isLoadingNfeNumber,
    nfeNumberError,
  };
}
