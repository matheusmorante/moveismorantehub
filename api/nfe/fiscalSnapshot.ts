import { determineWithApprovedRules, type ApprovedFiscalRuleSet } from './fiscalCore';
import type { FiscalItemSelections } from '../../shared-utils/fiscalItemSelections';
import type { FiscalModelDecision } from '../../shared-utils/fiscalDocumentModel';

export type FiscalJsonValue =
  | string
  | number
  | boolean
  | null
  | FiscalJsonValue[]
  | { [key: string]: FiscalJsonValue };

export type FiscalIssuerProfileKey =
  | 'companyName'
  | 'companyAddress'
  | 'companyCnpj'
  | 'companyIE'
  | 'companyIM'
  | 'companyCRT'
  | 'companyLogradouro'
  | 'companyNumero'
  | 'companyBairro'
  | 'companyCEP'
  | 'companyCMun'
  | 'companyXMun'
  | 'companyUF'
  | 'companyPhone'
  | 'cscId';

export type FiscalTransporter = {
  cnpj?: string;
  cpf?: string;
  name: string;
  ie?: string;
  address?: string;
  city?: string;
  uf?: string;
};

export const NF_PAYMENT_SETTLEMENT_POLICY = 'NF_HANDED_OVER_AFTER_PAYMENT' as const;
export type FiscalPaymentSettlementPolicy = typeof NF_PAYMENT_SETTLEMENT_POLICY;

/** Commercial facts captured from PostgreSQL; fiscal classifications remain undetermined. */
export type FiscalSnapshot = {
  schemaVersion: 1;
  capturedAt: string;
  /** Absent on historical snapshots; the policy is included in the persisted snapshot hash. */
  paymentSettlementPolicy?: FiscalPaymentSettlementPolicy;
  order: {
    id: string;
    type: string;
    status: string;
    deleted?: boolean;
    version: number;
    updatedAt: string;
    data: Record<string, FiscalJsonValue>;
  };
  issuerProfile: Partial<Record<FiscalIssuerProfileKey, FiscalJsonValue>>;
  /** Raw settings.data.fiscalDefaults, captured as inputs only; no implicit tax decision. */
  fiscalConfiguration?: Record<string, FiscalJsonValue>;
  fiscalInputs?: Record<string, FiscalJsonValue>;
  /** Server-resolved document frozen with the signed XML for transport-boundary auditing. */
  resolvedDocument?: FiscalDocument;
  emissionRequest: {
    id: string;
    requestedModel: '55' | '65';
    environment: 1 | 2;
    series: string;
    number: number;
    itemCsosnOverrides?: Record<string, string>;
    itemFiscalSelections?: FiscalItemSelections;
    recipientTaxId?: string;
    recipientIe?: string;
    recipientIeIndicator?: '1' | '2' | '9';
    finalConsumer?: boolean;
    deliveryByIssuer?: boolean;
    cardNotIntegrated?: boolean;
    modelDecision?: FiscalModelDecision;
    transporter?: FiscalTransporter;
    freightMode?: '0' | '1' | '2' | '3' | '4' | '9';
    hasTransport?: boolean;
    transportResponsible?: 'OWN_COMPANY' | 'CUSTOMER' | 'THIRD_PARTY';
    freightContractResponsible?: 'SENDER' | 'RECIPIENT' | 'THIRD_PARTY';
  };
};

/** In-memory facts read by the server before a model/number is determined. */
export type FiscalSnapshotCandidate = Omit<FiscalSnapshot, 'emissionRequest'> & {
  /** SHA-256 computed by PostgreSQL for the persisted, immutable snapshot. */
  persistedHash?: string;
  emissionRequest: {
    id: string;
    environment: 1 | 2;
    itemCsosnOverrides?: Record<string, string>;
    itemFiscalSelections?: FiscalItemSelections;
    recipientTaxId?: string;
    recipientIe?: string;
    recipientIeIndicator?: '1' | '2' | '9';
    finalConsumer?: boolean;
    deliveryByIssuer?: boolean;
    cardNotIntegrated?: boolean;
    modelDecision?: FiscalModelDecision;
    transporter?: FiscalTransporter;
    freightMode?: '0' | '1' | '2' | '3' | '4' | '9';
    hasTransport?: boolean;
    transportResponsible?: 'OWN_COMPANY' | 'CUSTOMER' | 'THIRD_PARTY';
    freightContractResponsible?: 'SENDER' | 'RECIPIENT' | 'THIRD_PARTY';
  };
};

export type FiscalDecisionTrace = {
  decisionId: string;
  ruleSetVersion: string;
  effectiveAt: string;
  inputFacts: Readonly<Record<string, FiscalJsonValue>>;
  result: Readonly<Record<string, FiscalJsonValue>>;
  reason: string;
  approver: string;
};

type DeterminedTaxValues = Readonly<Record<string, string | number | boolean>>;

export type DeterminedTaxGroup =
  | {
      group: 'ICMS';
      codeSystem: 'CST';
      code: string;
      values: DeterminedTaxValues;
      decisionId: string;
    }
  | {
      group: 'ICMS';
      codeSystem: 'CSOSN';
      code: string;
      values: DeterminedTaxValues;
      decisionId: string;
    }
  | {
      group: 'IPI' | 'PIS' | 'COFINS';
      codeSystem: 'CST';
      code: string;
      values: DeterminedTaxValues;
      decisionId: string;
    }
  | {
      group: 'FCP' | 'DIFAL' | 'IBSCBS';
      codeSystem: 'group-specific';
      code: string;
      values: DeterminedTaxValues;
      decisionId: string;
    };

export type DeterminedFiscalIssuer = {
  cnpj: string;
  name: string;
  ie: string;
  crt: string;
  municipalityCode: string;
  address: FiscalAddress;
};

export type FiscalAddress = {
  street: string;
  number: string;
  district: string;
  municipalityCode: string;
  municipality: string;
  uf: string;
  postalCode: string;
};

export type DeterminedFiscalRecipient = {
  name: string;
  cpfCnpj: string;
  personType?: 'PF' | 'PJ';
  ieIndicator: string;
  ie?: string;
  address?: FiscalAddress;
};

export type DeterminedFiscalOperation = {
  natureOfOperation: string;
  direction: 'inbound' | 'outbound';
  purpose: string;
  destination: string;
  presence: string;
  finalConsumer: '0' | '1';
  freightMode: string;
  transporter?: {
    cnpj?: string;
    cpf?: string;
    name: string;
    ie?: string;
    address?: string;
    city?: string;
    uf?: string;
  };
};

export type ReconciledFiscalTotals = {
  icmsBase: number;
  products: number;
  discount: number;
  freight: number;
  insurance: number;
  otherExpenses: number;
  icms: number;
  icmsExempt: number;
  fcp: number;
  icmsStBase: number;
  icmsSt: number;
  fcpSt: number;
  fcpStRetained: number;
  ii: number;
  ipi: number;
  ipiReturned: number;
  pis: number;
  cofins: number;
  invoice: number;
  payment: number;
  change: number;
};

export type DeterminedFiscalItem = {
  itemNumber: number;
  product: {
    code: string;
    description: string;
    gtin: string;
    quantity: number;
    unitValue: number;
    gross: number;
    discount: number;
    freight: number;
    insurance: number;
    otherExpenses: number;
  };
  classification: {
    ncm: string;
    cest?: string;
    origin: string;
    cfop: string;
    unit: string;
    benefitCode?: string;
  };
  taxes: ReadonlyArray<DeterminedTaxGroup>;
  decisions: ReadonlyArray<FiscalDecisionTrace>;
};

export type DeterminedPayment = {
  methodCode: string;
  amount: number;
  paymentIndicator?: '0' | '1';
  description?: string;
  paymentDate?: string;
  installments?: number;
  card?: {
    integrationType: '1' | '2';
    acquirerCnpj?: string;
    brand?: string;
    authorization?: string;
  };
  decision: FiscalDecisionTrace;
};

export type DeterminedBillingInstallment = {
  number: string;
  dueDate?: string;
  amount: number;
};

/** Complete server-resolved content accepted by the XML serializer. */
export type FiscalDocument = {
  snapshotHash: string;
  ruleSetVersion: string;
  model: '55' | '65';
  modelDecision?: FiscalModelDecision;
  environment: 1 | 2;
  issuer: DeterminedFiscalIssuer;
  recipient: DeterminedFiscalRecipient;
  operation: DeterminedFiscalOperation;
  items: ReadonlyArray<DeterminedFiscalItem>;
  /** Fiscal complementary information derived only from the immutable order snapshot. */
  additionalInformation?: string;
  payments: ReadonlyArray<DeterminedPayment>;
  billingInstallments?: ReadonlyArray<DeterminedBillingInstallment>;
  totals: ReconciledFiscalTotals;
  decisions: ReadonlyArray<FiscalDecisionTrace>;
};

export type FiscalDeterminationBlocker = {
  code:
    | 'APPROVED_FISCAL_RULESET_REQUIRED'
    | 'PRODUCTION_FISCAL_RULESET_REQUIRED'
    | 'FISCAL_RULESET_NOT_APPLICABLE'
    | 'FISCAL_DOCUMENT_INCOMPLETE';
  scope: 'document';
  message: string;
};

export type FiscalDocumentResolution =
  | { status: 'ready'; document: FiscalDocument }
  | { status: 'blocked'; blockers: ReadonlyArray<FiscalDeterminationBlocker> };

export type FiscalEmissionCommand = {
  orderId: string;
  environment: 1 | 2;
  emissionRequestId: string;
  supersedesDocumentId?: string;
  productionConfirmed?: boolean;
  requestedNumber?: number;
  itemCsosnOverrides?: Record<string, string>;
  itemFiscalSelections?: FiscalItemSelections;
  recipientTaxId?: string;
  recipientIe?: string;
  recipientIeIndicator?: '1' | '2' | '9';
  finalConsumer?: boolean;
  deliveryByIssuer?: boolean;
  cardNotIntegrated?: boolean;
  transporter?: {
    cnpj?: string;
    cpf?: string;
    name: string;
    ie?: string;
    address?: string;
    city?: string;
    uf?: string;
  };
  freightMode?: '0' | '1' | '2' | '3' | '4' | '9';
  hasTransport?: boolean;
  transportResponsible?: 'OWN_COMPANY' | 'CUSTOMER' | 'THIRD_PARTY';
  freightContractResponsible?: 'SENDER' | 'RECIPIENT' | 'THIRD_PARTY';
  previewOnly?: boolean;
  previewProof?: FiscalPreviewProof;
};

export type FiscalPreviewProof = {
  fingerprint: string;
  capturedAt: string;
  issuedAt: string;
  model: '55' | '65';
  series: string;
  number: number;
  accessKey: string;
};

export type FiscalSnapshotReservation = {
  snapshotId: string;
  snapshotHash: string;
  number: number;
  issuedAt: string;
  orderVersion: number;
};

export { parseFiscalEmissionCommand } from './fiscalEmissionCommandParser';

/** No tax rules are eligible until an approved, versioned determination matrix is configured. */
export function resolveFiscalDocument(
  snapshot: FiscalSnapshotCandidate,
  ruleSet?: ApprovedFiscalRuleSet
): FiscalDocumentResolution {
  return determineWithApprovedRules(snapshot, ruleSet);
}

export { parseFiscalSnapshotReservation } from './fiscalEmissionCommandParser';
