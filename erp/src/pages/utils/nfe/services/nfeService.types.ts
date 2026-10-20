import type { FiscalNumberConflict } from '../../../../../../shared-utils/fiscalNumbering';
import type { NfeValidationResult } from '../nfeValidator';

export interface NfeEmissionResult {
  success: boolean;
  preview?: boolean;
  previewProof?: NfeXmlPreviewProof;
  emissionRequestId?: string;
  documentId?: string;
  orderId?: string;
  accessKey?: string;
  nfeNumber?: number;
  series?: string;
  model?: '55' | '65';
  environment?: 1 | 2;
  protocolNumber?: string;
  protocolDate?: string;
  xml?: string;
  danfeData?: import('../danfeGenerator').DanfeData;
  danfeUnavailableReason?: string;
  error?: string;
  pending?: boolean;
  hmlConfirmedNotFound?: boolean;
  hmlNewEmissionRequired?: boolean;
  hmlCanAbandonTlsFailure?: boolean;
  preparationReconciled?: boolean;
  fiscalMismatchFields?: Array<{
    field: string;
    snapshotValue?: string;
    currentValue?: string;
  }>;
  supersedesDocumentId?: string;
  cStat?: string;
  diagnosticId?: string;
  diagnosticStage?: string;
  databaseCode?: string;
  databaseReason?: string;
  transportDiagnostic?: { code: string; httpStatus?: number; tlsReason?: string };
  reservationRecoveryRequired?: boolean;
  diagnosticCategory?: string;
  diagnosticHint?: string;
  retryDocumentId?: string;
  numberReserved?: boolean;
  sefazContacted?: boolean;
  sefazMessage?: string;
  validation?: NfeValidationResult;
  numberConflict?: FiscalNumberConflict;
  technicalDetails?: {
    apiCode?: string;
    httpStatus?: number;
    transportCode?: string;
    diagnosticStage?: string;
    diagnosticId?: string;
    databaseCode?: string;
    sefazCode?: string;
  };
}

export type NfeXmlPreviewProof = {
  fingerprint: string;
  capturedAt: string;
  issuedAt: string;
  model: '55' | '65';
  series: string;
  number: number;
  accessKey: string;
};
