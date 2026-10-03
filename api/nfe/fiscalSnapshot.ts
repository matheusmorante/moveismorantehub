import { determineWithApprovedRules, type ApprovedFiscalRuleSet } from './fiscalCore';
import { parseItemCsosnOverrides } from './csosnPolicy';
import { parseFiscalItemSelections, type FiscalItemSelections } from '../../shared-utils/fiscalItemSelections';

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

/** Commercial facts captured from PostgreSQL; fiscal classifications remain undetermined. */
export type FiscalSnapshot = {
  schemaVersion: 1;
  capturedAt: string;
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
  emissionRequest: {
    id: string;
    requestedModel: '55' | '65';
    environment: 1 | 2;
    series: string;
    number: number;
    itemCsosnOverrides?: Record<string, string>;
    itemFiscalSelections?: FiscalItemSelections;
    recipientCpf?: string;
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
    recipientCpf?: string;
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
  ieIndicator: string;
  ie?: string;
  address: FiscalAddress;
};

export type DeterminedFiscalOperation = {
  natureOfOperation: string;
  direction: 'inbound' | 'outbound';
  purpose: string;
  destination: string;
  presence: string;
  finalConsumer: '0' | '1';
  freightMode: string;
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
  installments?: number;
  decision: FiscalDecisionTrace;
};

/** Complete server-resolved content accepted by the XML serializer. */
export type FiscalDocument = {
  snapshotHash: string;
  ruleSetVersion: string;
  model: '55' | '65';
  environment: 1 | 2;
  issuer: DeterminedFiscalIssuer;
  recipient: DeterminedFiscalRecipient;
  operation: DeterminedFiscalOperation;
  items: ReadonlyArray<DeterminedFiscalItem>;
  payments: ReadonlyArray<DeterminedPayment>;
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
  productionConfirmed?: boolean;
  requestedNumber?: number;
  itemCsosnOverrides?: Record<string, string>;
  itemFiscalSelections?: FiscalItemSelections;
  recipientCpf?: string;
};

export type FiscalSnapshotReservation = {
  snapshotId: string;
  snapshotHash: string;
  number: number;
  issuedAt: string;
  orderVersion: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CLIENT_AUTHORITY_FIELDS = [
  'xml',
  'model',
  'series',
  'nfeNumber',
  'accessKey',
  'fiscalSnapshotId',
  'fiscalSnapshotHash',
] as const;

export function parseFiscalEmissionCommand(
  value: unknown
): { command: FiscalEmissionCommand } | { error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { error: 'Dados da solicitação fiscal inválidos.' };

  const body = value as Record<string, unknown>;
  if (CLIENT_AUTHORITY_FIELDS.some((field) => field in body))
    return { error: 'Modelo, série, número, chave e XML devem ser determinados no servidor.' };

  const allowedFields = new Set([
    'orderId',
    'environment',
    'emissionRequestId',
    'productionConfirmed',
    'requestedNumber',
    'itemCsosnOverrides',
    'itemFiscalSelections',
    'recipientCpf',
  ]);
  if (Object.keys(body).some((field) => !allowedFields.has(field)))
    return { error: 'A solicitação contém campos que não pertencem ao comando de emissão.' };

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const environment = Number(body.environment);
  const emissionRequestId =
    typeof body.emissionRequestId === 'string' ? body.emissionRequestId : '';
  if (
    !orderId ||
    ![1, 2].includes(environment) ||
    !UUID_PATTERN.test(emissionRequestId) ||
    (body.productionConfirmed !== undefined && typeof body.productionConfirmed !== 'boolean')
  )
    return { error: 'Pedido, ambiente ou chave de idempotência inválidos.' };

  if (body.requestedNumber !== undefined &&
      (typeof body.requestedNumber !== 'number' || !Number.isInteger(body.requestedNumber) ||
       body.requestedNumber < 1 || body.requestedNumber > 999999999))
    return { error: 'Informe um número de nota fiscal inteiro entre 1 e 999999999.' };

  let itemCsosnOverrides: Record<string, string>;
  try { itemCsosnOverrides = parseItemCsosnOverrides(body.itemCsosnOverrides); }
  catch (error) { return { error: error instanceof Error ? error.message : 'Escolhas de CSOSN inválidas.' }; }
  let itemFiscalSelections: FiscalItemSelections;
  try {
    itemFiscalSelections = parseFiscalItemSelections(body.itemFiscalSelections);
    if (Object.keys(itemFiscalSelections).length && environment !== 2)
      throw new Error('Seleções provisórias do modal estão habilitadas somente em homologação.');
    for (const [key, code] of Object.entries(itemCsosnOverrides)) {
      if (itemFiscalSelections[key] && itemFiscalSelections[key].csosn !== code)
        throw new Error(`Escolhas conflitantes de CSOSN no item ${key}.`);
    }
  } catch (error) { return { error: error instanceof Error ? error.message : 'Seleções fiscais inválidas.' }; }
  const recipientCpf = body.recipientCpf;
  if (recipientCpf !== undefined &&
      (typeof recipientCpf !== 'string' || (recipientCpf !== '' && !/^\d{11}$/.test(recipientCpf))))
    return { error: 'O CPF para esta emissão deve conter 11 dígitos.' };
  return {
    command: {
      orderId,
      environment: environment as 1 | 2,
      emissionRequestId,
      ...(body.requestedNumber === undefined ? {} : { requestedNumber: body.requestedNumber as number }),
      ...(Object.keys(itemCsosnOverrides).length ? { itemCsosnOverrides } : {}),
      ...(Object.keys(itemFiscalSelections).length ? { itemFiscalSelections } : {}),
      ...(recipientCpf === undefined ? {} : { recipientCpf }),
      ...(body.productionConfirmed === undefined
        ? {}
        : { productionConfirmed: body.productionConfirmed }),
    },
  };
}

/** No tax rules are eligible until an approved, versioned determination matrix is configured. */
export function resolveFiscalDocument(
  snapshot: FiscalSnapshotCandidate,
  ruleSet?: ApprovedFiscalRuleSet
): FiscalDocumentResolution {
  return determineWithApprovedRules(snapshot, ruleSet);
}

export function parseFiscalSnapshotReservation(value: unknown): FiscalSnapshotReservation | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.snapshotId !== 'string' ||
    !UUID_PATTERN.test(candidate.snapshotId) ||
    typeof candidate.snapshotHash !== 'string' ||
    !SHA256_PATTERN.test(candidate.snapshotHash) ||
    !Number.isInteger(candidate.number) ||
    Number(candidate.number) < 1 ||
    Number(candidate.number) > 999999999 ||
    typeof candidate.issuedAt !== 'string' ||
    Number.isNaN(Date.parse(candidate.issuedAt)) ||
    !Number.isInteger(candidate.orderVersion) ||
    Number(candidate.orderVersion) < 0
  ) {
    return null;
  }

  return {
    snapshotId: candidate.snapshotId,
    snapshotHash: candidate.snapshotHash,
    number: Number(candidate.number),
    issuedAt: candidate.issuedAt,
    orderVersion: Number(candidate.orderVersion),
  };
}
