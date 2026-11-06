export type FiscalIssueTechnicalDetails = {
  apiCode?: string;
  httpStatus?: number;
  transportCode?: string;
  diagnosticStage?: string;
  diagnosticId?: string;
  diagnosticCategory?: string;
  databaseCode?: string;
  sefazCode?: string;
  sefazMessage?: string;
  documentNumber?: number;
  documentId?: string;
  emissionRequestId?: string;
  environment?: number;
  model?: string;
};

export interface FiscalIssueResult {
  success?: boolean;
  status?: string;
  pending?: boolean;
  error?: string;
  code?: string;
  apiCode?: string;
  cStat?: string;
  xMotivo?: string;
  sefazMessage?: string;
  protocolNumber?: string;
  sefazConsulted?: boolean;
  databaseCode?: string;
  databaseReason?: string;
  diagnosticCategory?: string;
  diagnosticStage?: string;
  diagnosticId?: string;
  transportDiagnostic?: { code?: string; httpStatus?: number; tlsReason?: string };
  technicalDetails?: Partial<FiscalIssueTechnicalDetails>;
  documentId?: string;
  emissionRequestId?: string;
  nfeNumber?: number;
  model?: string;
  environment?: number;
  hmlConfirmedNotFound?: boolean;
  hmlNewEmissionRequired?: boolean;
  hmlCanAbandonTlsFailure?: boolean;
  safeNewEmission?: boolean;
  numberReserved?: boolean;
  sefazContacted?: boolean;
  preparationReconciled?: boolean;
  reservationRecoveryRequired?: boolean;
  fiscalMismatchFields?: Array<{
    field: string;
    snapshotValue?: string;
    currentValue?: string;
  }>;
  numberConflict?: unknown;
  state?: string;
}

export function getFiscalIssueTechnicalDetails(
  result: FiscalIssueResult
): FiscalIssueTechnicalDetails | undefined {
  const details = result.technicalDetails || {};
  const transportCode = details.transportCode || result.transportDiagnostic?.code;
  const diagnosticStage = details.diagnosticStage || result.diagnosticStage;
  const diagnosticId = details.diagnosticId || result.diagnosticId;
  const apiCode = details.apiCode || result.apiCode || result.code;
  const sefazCode = details.sefazCode || result.cStat;
  const sefazMessage = result.sefazMessage || result.xMotivo;
  const values: FiscalIssueTechnicalDetails = {
    ...(apiCode ? { apiCode } : {}),
    ...(details.httpStatus || result.transportDiagnostic?.httpStatus
      ? { httpStatus: details.httpStatus || result.transportDiagnostic?.httpStatus }
      : {}),
    ...(transportCode ? { transportCode } : {}),
    ...(diagnosticStage ? { diagnosticStage } : {}),
    ...(diagnosticId ? { diagnosticId } : {}),
    ...(details.diagnosticCategory || result.diagnosticCategory
      ? { diagnosticCategory: details.diagnosticCategory || result.diagnosticCategory }
      : {}),
    ...(details.databaseCode || result.databaseCode
      ? { databaseCode: details.databaseCode || result.databaseCode }
      : {}),
    ...(sefazCode ? { sefazCode } : {}),
    ...(sefazMessage ? { sefazMessage } : {}),
    ...(details.documentNumber || result.nfeNumber
      ? { documentNumber: details.documentNumber || result.nfeNumber }
      : {}),
    ...(details.documentId || result.documentId
      ? { documentId: details.documentId || result.documentId }
      : {}),
    ...(details.emissionRequestId || result.emissionRequestId
      ? { emissionRequestId: details.emissionRequestId || result.emissionRequestId }
      : {}),
    ...(details.environment || result.environment
      ? { environment: details.environment || result.environment }
      : {}),
    ...(details.model || result.model ? { model: details.model || result.model } : {}),
  };
  return Object.keys(values).length ? values : undefined;
}
