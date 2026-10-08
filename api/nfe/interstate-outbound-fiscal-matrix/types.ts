/**
 * Interstate Outbound Fiscal Matrix (Matriz de Decisão Fiscal de Saída Interestadual).
 * Modelada em 6 cenários-base para saídas de mercadorias adquiridas de terceiros.
 *
 * Normativas:
 * - Ajuste SINIEF 01/24 (Tabela de CFOP: 6.102 e 6.108)
 * - MOC 7 Anexo I (RVs: E16a-40 / Rejeição 696; E16a-30 / Rejeição 805)
 * - Lei Complementar 123/2006 (Simples Nacional)
 * - STF ADI 5464 / MOC Exceção NA01-20 (Simples Nacional dispensado de DIFAL da EC 87/15)
 * - RICMS/PR e Orientações SEFA/PR
 */

export type InterstateMatrixStatus = 'DRAFT' | 'APPROVED' | 'BLOCKED' | 'DEPRECATED';
export type InterstateRecipientIeStatus = 'taxpayer' | 'exempt' | 'non_taxpayer';
export type InterstateMerchandiseOrigin = 'third_party' | 'own_production';
export type InterstateStRole = 'NONE' | 'SUBSTITUTE' | 'SUBSTITUTED';

export type InterstateOutboundErrorCode =
  | 'HML_INTERSTATE_MATRIX_NOT_APPROVED'
  | 'INTERSTATE_RULE_INVALID_COMBINATION'
  | 'INTERSTATE_EXEMPT_IE_NOT_ALLOWED'
  | 'INTERSTATE_ST_RULE_NOT_CONFIGURED'
  | 'INTERSTATE_TAX_PROFILE_INCOMPLETE'
  | 'HML_INTERSTATE_MATRIX_AMBIGUOUS'
  | 'HML_INTERSTATE_MATRIX_INVALID';

/**
 * UFs que NÃO aceitam destinatário como Contribuinte Isento de Inscrição Estadual (indIEDest=2)
 * em operações interestaduais, conforme MOC 7 Anexo I - Regra de Validação E16a-30 (Rejeição 805).
 */

export type InterstateOutboundFiscalMatrixFacts = {
  environment: 1 | 2;
  model: '55' | '65';
  issuerRegime: string;
  issuerUf: string;
  destinationUf: string;
  destinationScope: 'INTERSTATE';
  operationType: 'sale';
  purpose: '1' | '2' | '3' | '4';
  recipientPersonType?: 'PF' | 'PJ';
  recipientIeStatus: InterstateRecipientIeStatus;
  finalConsumer: boolean;
  merchandiseOrigin: InterstateMerchandiseOrigin;
  productOrigin: string;
  ncm: string;
  cest?: string;
  hasSt?: boolean;
  stRole?: InterstateStRole;
  allowsIcmsCredit?: boolean;
  recipientTaxRegime?: string;
  productId?: string;
  effectiveAt: string;
};

export type InterstateOutboundNormativeScope =
  | 'NATIONAL'
  | 'ORIGIN_STATE'
  | 'DESTINATION_STATE'
  | 'ORIGIN_DESTINATION_PAIR'
  | 'PRODUCT_SPECIFIC';

export type InterstateOutboundNormativeSource = {
  id: string;
  scope: InterstateOutboundNormativeScope;
  url: string;
  issuerUf?: string;
  destinationUf?: string;
  productId?: string;
  ncm?: string;
  cest?: string;
};

export type InterstateOutboundFiscalMatrixCriteria = Omit<
  Partial<InterstateOutboundFiscalMatrixFacts>,
  'destinationUf'
> & {
  /** null/omitted means any Brazilian destination DIFFERENT from the issuer. */
  destinationUf?: string | null;
};

export type InterstateTaxTreatment = {
  cfop: string | null;
  csosn: string | null;
  icms: {
    xmlGroup: string | null;
    framework: string | null;
    ratePercent: number | null;
    baseMethod: string | null;
    reductionPercent: number | null;
  };
  st: {
    responsibility: 'none' | 'substitute' | 'substituted' | null;
    applicable: boolean | null;
    agreementOrProtocol: string | null;
    baseMethod: string | null;
    ratePercent: number | null;
  };
  difal: {
    responsibility: 'none' | 'sender' | 'recipient' | null;
    applicable: boolean | null;
    internalRatePercent: number | null;
    interstateRatePercent: number | null;
    destinationSharePercent: number | null;
  };
  fcp: {
    applicable: boolean | null;
    ratePercent: number | null;
  };
  fcpSt: { applicable: boolean | null; ratePercent: number | null };
};

export type InterstateOutboundFiscalMatrixRule = {
  id: string;
  status: InterstateMatrixStatus;
  criteria: InterstateOutboundFiscalMatrixCriteria;
  normativeScope: InterstateOutboundNormativeScope;
  priority: number;
  treatment: InterstateTaxTreatment;
  candidateCfops: string[];
  pendingReview: string[];
  sourceReferences: string[];
  normativeSources: readonly InterstateOutboundNormativeSource[];
  approvedBy?: string;
  approvedAt?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  reviewedWildcards?: Array<keyof InterstateOutboundFiscalMatrixFacts>;
  xmlEvidence?: string;
  testEvidence?: string;
};
