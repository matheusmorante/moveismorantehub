import type Order from '@/pages/types/order.type';
import type { FiscalAcquisitionPurpose } from '@/pages/types/order.type';
import type {
  NfeEmissionResult,
  NfeXmlPreviewProof,
} from '@/pages/utils/nfe/nfeService';
import type { resolveOrderFiscalModel } from '../../../../../../../../../shared-utils/fiscalDocumentModel';
import type {
  DeliveryMethod,
  resolveTransport,
} from '../../../../../../../../../shared-utils/fiscalTransportModel';
import type { NfeItemWithFiscal } from '../../NfeItemsSection';
import type { ThirdPartyTransporterForm } from '../../NfeTransportSection';
import type { FiscalFieldError, NfeSequencePreviewState } from '../../types/nfeEmission.types';
import type { SefazConsultOutcome } from '../../services/nfeReconciliationService';

export interface FiscalOperationOwner {
  orderId: string | undefined;
  environment: 1 | 2;
  operatorId: string | undefined;
}

export interface UseNfeEmissionActionsProps {
  fiscalOperationLock?: { current: boolean };
  canUsePreparation?: () => boolean;
  order: Order | null;
  environment: 1 | 2;
  canOperateFiscal: boolean;
  operatorId?: string;
  modelDecision: ReturnType<typeof resolveOrderFiscalModel> | null;
  currentModel: '55' | '65';
  deliveryMethod: DeliveryMethod;
  requiresExplicitAcquisitionPurpose: boolean;
  isSavingAcquisitionPurpose: boolean;
  isSavingPreparation?: boolean;
  preparationSaveError?: string | null;
  acquisitionPurpose: FiscalAcquisitionPurpose | null;
  finalConsumer?: boolean;
  nfeItems: NfeItemWithFiscal[];
  isLoadingFiscalData: boolean;
  fiscalPreparationError: string | null;
  nfeNumberSequence: { model: '55' | '65'; series: string | null; environment: 1 | 2 };
  manualNumberInput: string | null;
  recipientTaxId: string;
  recipientIe?: string;
  recipientIeIndicator?: '1' | '2' | '9';
  resolvedTransport: ReturnType<typeof resolveTransport>;
  thirdPartyTransporter: ThirdPartyTransporterForm;
  onSuccess?: (result: NfeEmissionResult) => void;
  setRecipientTaxIdError: (err: string | null) => void;
  setNumberPreviewState: (state: NfeSequencePreviewState | null) => void;
  setManualNumberInput: (val: string | null) => void;
}

export interface XmlPreviewState {
  xml: string;
  proof: NfeXmlPreviewProof;
  contextKey: string;
  freshHmlEmission: boolean;
}

export interface UseNfeEmissionActionsReturn {
  isSubmitting: boolean;
  isRestoringAttempt: boolean;
  attemptRestorationError: string | undefined;
  isPreparingPreview: boolean;
  isRestartingHml: boolean;
  emissionResult: NfeEmissionResult | null;
  xmlPreview: XmlPreviewState | null;
  isXmlPreviewOpen: boolean;
  hasCurrentXmlPreview: boolean;
  closeXmlPreview: () => void;
  fiscalFieldError: FiscalFieldError | null;
  clearFiscalFieldError: () => void;
  handleEmit: (
    productionConfirmed?: boolean,
    isRetry?: boolean,
    retryNumber?: number,
    freshHmlEmission?: boolean,
    previewOnly?: boolean,
    existingEmissionRequestId?: string
  ) => Promise<void>;
  handlePreviewXml: (productionConfirmed?: boolean) => Promise<void>;
  handleReconcile: () => Promise<SefazConsultOutcome | null | undefined>;
  handleStartFreshHmlEmission: () => Promise<void>;
  handleAbandonHmlTlsAttempt: () => Promise<void>;
  handlePrintDanfe: () => void;
}
