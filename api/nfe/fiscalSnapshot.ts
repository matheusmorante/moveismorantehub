import { determineWithApprovedRules, type ApprovedFiscalRuleSet } from './fiscalCore';
import { parseItemCsosnOverrides } from './csosnPolicy';
import {
  parseFiscalItemSelections,
  type FiscalItemSelections,
} from '../../shared-utils/fiscalItemSelections';
import type { FiscalModelDecision } from '../../shared-utils/fiscalDocumentModel';
import { isValidRecipientTaxId, normalizeRecipientTaxId } from '../../shared-utils/recipientTaxId';

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
    recipientTaxId?: string;
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
  installments?: number;
  card?: {
    integrationType: '1' | '2';
    acquirerCnpj?: string;
    brand?: string;
    authorization?: string;
  };
  decision: FiscalDecisionTrace;
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
  supersedesDocumentId?: string;
  productionConfirmed?: boolean;
  requestedNumber?: number;
  itemCsosnOverrides?: Record<string, string>;
  itemFiscalSelections?: FiscalItemSelections;
  recipientTaxId?: string;
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
    'supersedesDocumentId',
    'productionConfirmed',
    'requestedNumber',
    'itemCsosnOverrides',
    'itemFiscalSelections',
    'recipientTaxId',
    'finalConsumer',
    'deliveryByIssuer',
    'cardNotIntegrated',
    'transporter',
    'freightMode',
    'hasTransport',
    'transportResponsible',
    'freightContractResponsible',
  ]);
  if (Object.keys(body).some((field) => !allowedFields.has(field)))
    return { error: 'A solicitação contém campos que não pertencem ao comando de emissão.' };

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const environment = Number(body.environment);
  const emissionRequestId =
    typeof body.emissionRequestId === 'string' ? body.emissionRequestId : '';
  const supersedesDocumentId =
    typeof body.supersedesDocumentId === 'string' ? body.supersedesDocumentId : undefined;
  if (
    !orderId ||
    ![1, 2].includes(environment) ||
    !UUID_PATTERN.test(emissionRequestId) ||
    (supersedesDocumentId !== undefined && !UUID_PATTERN.test(supersedesDocumentId)) ||
    (supersedesDocumentId !== undefined && environment !== 2) ||
    (body.productionConfirmed !== undefined && typeof body.productionConfirmed !== 'boolean')
  )
    return { error: 'Pedido, ambiente ou chave de idempotência inválidos.' };

  if (
    body.requestedNumber !== undefined &&
    (typeof body.requestedNumber !== 'number' ||
      !Number.isInteger(body.requestedNumber) ||
      body.requestedNumber < 1 ||
      body.requestedNumber > 999999999)
  )
    return { error: 'Informe um número de nota fiscal inteiro entre 1 e 999999999.' };

  let itemCsosnOverrides: Record<string, string>;
  try {
    itemCsosnOverrides = parseItemCsosnOverrides(body.itemCsosnOverrides);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Escolhas de CSOSN inválidas.' };
  }
  let itemFiscalSelections: FiscalItemSelections;
  try {
    itemFiscalSelections = parseFiscalItemSelections(body.itemFiscalSelections);
    if (Object.keys(itemFiscalSelections).length && environment !== 2)
      throw new Error('Seleções provisórias do modal estão habilitadas somente em homologação.');
    for (const [key, code] of Object.entries(itemCsosnOverrides)) {
      if (itemFiscalSelections[key] && itemFiscalSelections[key].csosn !== code)
        throw new Error(`Escolhas conflitantes de CSOSN no item ${key}.`);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Seleções fiscais inválidas.' };
  }
  const recipientTaxId = body.recipientTaxId;
  if (body.cardNotIntegrated !== undefined && typeof body.cardNotIntegrated !== 'boolean')
    return { error: 'Confirme a integração do cartão.' };
  if (body.deliveryByIssuer !== undefined && typeof body.deliveryByIssuer !== 'boolean')
    return { error: 'Entrega própria deve ser Sim ou Não.' };
  if (body.hasTransport !== undefined && typeof body.hasTransport !== 'boolean')
    return { error: 'O indicador de transporte deve ser Sim ou Não.' };
  if (
    body.transportResponsible !== undefined &&
    !['OWN_COMPANY', 'CUSTOMER', 'THIRD_PARTY'].includes(String(body.transportResponsible))
  )
    return { error: 'Responsável pelo transporte inválido.' };
  if (
    body.freightContractResponsible !== undefined &&
    !['SENDER', 'RECIPIENT', 'THIRD_PARTY'].includes(String(body.freightContractResponsible))
  )
    return { error: 'Responsável pela contratação do frete inválido.' };
  if (body.hasTransport === false) {
    if (body.transportResponsible && body.transportResponsible !== 'NONE')
      return { error: 'Transporte desligado não admite responsável por transporte.' };
    if (body.freightMode && body.freightMode !== '9')
      return { error: 'Transporte desligado exige modalidade 9 (sem frete).' };
    if (body.transporter)
      return { error: 'Transporte desligado não admite dados de transportador.' };
  }
  if (body.finalConsumer !== undefined && typeof body.finalConsumer !== 'boolean')
    return { error: 'Consumidor final deve ser Sim ou Não.' };
  if (
    recipientTaxId !== undefined &&
    (typeof recipientTaxId !== 'string' ||
      (recipientTaxId !== '' && !isValidRecipientTaxId(recipientTaxId)))
  )
    return { error: 'Informe um CPF ou CNPJ válido para esta emissão.' };

  let transporter: FiscalTransporter | undefined;
  if (body.transporter !== undefined) {
    if (typeof body.transporter !== 'object' || body.transporter === null)
      return { error: 'Dados do transportador inválidos.' };
    const t = body.transporter as Record<string, unknown>;
    const name = typeof t.name === 'string' ? t.name.trim() : '';
    const isCnpj = typeof t.cnpj === 'string';
    const doc = normalizeRecipientTaxId(
      isCnpj ? String(t.cnpj) : typeof t.cpf === 'string' ? t.cpf : ''
    );
    if (!name) return { error: 'Razão social ou nome do transportador é obrigatório.' };
    if (!isValidRecipientTaxId(doc) || (isCnpj ? doc.length !== 14 : doc.length !== 11))
      return { error: 'CPF ou CNPJ válido do transportador é obrigatório.' };
    transporter = {
      name,
      ...(isCnpj ? { cnpj: doc } : { cpf: doc }),
      ...(typeof t.ie === 'string' && t.ie.trim() ? { ie: t.ie.trim().replace(/\D/g, '') } : {}),
      ...(typeof t.address === 'string' && t.address.trim() ? { address: t.address.trim() } : {}),
      ...(typeof t.city === 'string' && t.city.trim() ? { city: t.city.trim() } : {}),
      ...(typeof t.uf === 'string' && t.uf.trim() ? { uf: t.uf.trim().toUpperCase() } : {}),
    };
  }

  let freightMode: '0' | '1' | '2' | '3' | '4' | '9' | undefined;
  if (body.freightMode !== undefined) {
    if (typeof body.freightMode !== 'string' || !/^[012349]$/.test(body.freightMode))
      return { error: 'Modalidade do frete inválida.' };
    freightMode = body.freightMode as '0' | '1' | '2' | '3' | '4' | '9';
  }
  return {
    command: {
      orderId,
      environment: environment as 1 | 2,
      emissionRequestId,
      ...(supersedesDocumentId ? { supersedesDocumentId } : {}),
      ...(body.requestedNumber === undefined
        ? {}
        : { requestedNumber: body.requestedNumber as number }),
      ...(Object.keys(itemCsosnOverrides).length ? { itemCsosnOverrides } : {}),
      ...(Object.keys(itemFiscalSelections).length ? { itemFiscalSelections } : {}),
      ...(recipientTaxId === undefined ? {} : { recipientTaxId }),
      ...(body.finalConsumer === undefined ? {} : { finalConsumer: body.finalConsumer }),
      ...(body.deliveryByIssuer === undefined ? {} : { deliveryByIssuer: body.deliveryByIssuer }),
      ...(body.cardNotIntegrated === undefined
        ? {}
        : { cardNotIntegrated: body.cardNotIntegrated }),
      ...(body.hasTransport === undefined ? {} : { hasTransport: body.hasTransport as boolean }),
      ...(body.transportResponsible === undefined
        ? {}
        : { transportResponsible: body.transportResponsible as any }),
      ...(body.freightContractResponsible === undefined
        ? {}
        : { freightContractResponsible: body.freightContractResponsible as any }),
      ...(transporter ? { transporter } : {}),
      ...(freightMode ? { freightMode } : {}),
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
