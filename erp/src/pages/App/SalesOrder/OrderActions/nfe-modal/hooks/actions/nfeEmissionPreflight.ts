import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import type { FiscalAcquisitionPurpose } from '@/pages/types/order.type';
import type { DeliveryMethod } from '../../../../../../../../../shared-utils/fiscalTransportModel';
import {
  HML_INTERSTATE_MATRIX_NOT_APPROVED,
  isHmlInterstateMatrixBlock,
  safeFiscalIssueMessage,
} from '@/pages/utils/nfe/fiscalIssuePresentation';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { validateNfeEmission } from '../../services/nfeValidationService';
import { notifyEmissionIssue } from '../../services/nfePreviewContextService';
import type { FiscalFieldError } from '../../types/nfeEmission.types';

export interface CheckEmissionPreflightParams {
  order: Order | null;
  canOperateFiscal: boolean;
  canUsePreparation: () => boolean;
  isSavingAcquisitionPurpose: boolean;
  isSavingPreparation: boolean;
  preparationSaveError: string | null;
  requiresExplicitAcquisitionPurpose: boolean;
  acquisitionPurpose: FiscalAcquisitionPurpose | null;
  finalConsumer: boolean | undefined;
  modelDecision: any;
  currentModel: '55' | '65';
  environment: 1 | 2;
  fiscalPreparationError: string | null;
  isRestoringAttempt: boolean;
  attemptRestorationError: string | null;
  emissionResult: NfeEmissionResult | null;
  isRetry: boolean;
  deliveryMethod: DeliveryMethod;
  recipientTaxId: string;
  recipientIe: string;
  recipientIeIndicator?: '1' | '2' | '9';
  nfeItems: any[];
  isLoadingFiscalData: boolean;
  manualNumber: number | undefined;
  setRecipientTaxIdError: (err: string | null) => void;
  setFiscalFieldError: (err: FiscalFieldError | null) => void;
  setEmissionResult: (res: NfeEmissionResult | null) => void;
}

export function checkEmissionPreflight(params: CheckEmissionPreflightParams): boolean {
  const {
    order,
    canOperateFiscal,
    canUsePreparation,
    isSavingAcquisitionPurpose,
    isSavingPreparation,
    preparationSaveError,
    requiresExplicitAcquisitionPurpose,
    acquisitionPurpose,
    finalConsumer,
    modelDecision,
    currentModel,
    environment,
    fiscalPreparationError,
    isRestoringAttempt,
    attemptRestorationError,
    emissionResult,
    isRetry,
    deliveryMethod,
    recipientTaxId,
    recipientIe,
    recipientIeIndicator,
    nfeItems,
    isLoadingFiscalData,
    manualNumber,
    setRecipientTaxIdError,
    setFiscalFieldError,
    setEmissionResult,
  } = params;

  if (!canOperateFiscal) {
    toast.error('Seu perfil não pode operar documentos fiscais.');
    return false;
  }
  if (!order) {
    toast.error('O pedido não está disponível para emissão fiscal.');
    return false;
  }

  if (isRestoringAttempt || attemptRestorationError || (emissionResult?.pending && !isRetry)) {
    toast.info(
      attemptRestorationError ||
        (isRestoringAttempt
          ? 'Aguarde a conferência das tentativas fiscais anteriores.'
          : 'Consulte a tentativa fiscal em andamento antes de continuar.')
    );
    return false;
  }

  if (
    !canUsePreparation() ||
    isSavingAcquisitionPurpose ||
    isSavingPreparation ||
    preparationSaveError
  ) {
    toast.info(
      preparationSaveError ||
        'Aguarde a confirmação do salvamento dos dados fiscais antes de emitir.'
    );
    return false;
  }
  if (
    (requiresExplicitAcquisitionPurpose && !acquisitionPurpose) ||
    typeof finalConsumer !== 'boolean'
  ) {
    toast.error('Registre a finalidade da compra no pedido antes de preparar a emissão.');
    return false;
  }

  if (modelDecision?.status !== 'ready') {
    toast.error(modelDecision?.reason || 'Confirme os dados da operação fiscal.');
    return false;
  }

  if (isHmlInterstateMatrixBlock(fiscalPreparationError)) {
    const blockedResult: NfeEmissionResult = {
      success: false,
      model: currentModel,
      environment,
      error: fiscalPreparationError,
      numberReserved: false,
      sefazContacted: false,
      technicalDetails: { apiCode: HML_INTERSTATE_MATRIX_NOT_APPROVED },
    };
    setEmissionResult(blockedResult);
    notifyEmissionIssue(blockedResult);
    return false;
  }

  const validation = validateNfeEmission({
    order,
    currentModel,
    deliveryMethod,
    recipientTaxId,
    recipientIe,
    recipientIeIndicator,
    finalConsumer,
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
    manualNumber,
  });

  if (validation.recipientTaxIdError !== undefined) {
    setRecipientTaxIdError(validation.recipientTaxIdError);
  }
  if (validation.fiscalFieldError) {
    setFiscalFieldError(validation.fiscalFieldError);
  }
  if (validation.toastError) {
    toast.error(
      fiscalPreparationError
        ? safeFiscalIssueMessage(fiscalPreparationError, validation.toastError)
        : validation.toastError
    );
  }

  return validation.valid;
}
