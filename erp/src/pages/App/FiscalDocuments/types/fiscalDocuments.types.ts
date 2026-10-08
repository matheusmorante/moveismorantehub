import type {
  FiscalIssuePresentation,
  FiscalIssueTechnicalDetails,
} from '@/pages/utils/nfe/fiscalIssuePresentation';

export const FISCAL_DOCUMENTS_PAGE_SIZE = 15;

export interface NfeDocumentRecord {
  id: string;
  order_id: string | null;
  numero_nfe: number;
  serie: string;
  chave_acesso: string;
  modelo: '55' | '65';
  ambiente: 1 | 2;
  status:
    | 'autorizada'
    | 'homologada'
    | 'cancelada'
    | 'rejeitada'
    | 'pendente'
    | 'erro'
    | 'abandoned';
  motivo_status?: string;
  xml_nfe?: string | null;
  xml_protocolo?: string | null;
  numero_protocolo?: string | null;
  valor_total?: number;
  destinatario_nome?: string;
  destinatario_documento?: string;
  created_at: string;
  updated_at: string;
  document_type?: 'outbound' | 'return' | 'estorno' | string;
  fiscal_ruleset_version?: string;
  supersedes_document_id?: string | null;
  orderNumber?: number;
}

export type FiscalIssueFeedback = {
  presentation: FiscalIssuePresentation;
  technicalDetails?: FiscalIssueTechnicalDetails;
  document: NfeDocumentRecord;
};

export type CancellationEligibility = {
  canProceed: boolean;
  action: string;
  reason?: string | null;
  orderId?: string | null;
  orderStatus?: string | null;
  authorizedAt?: string | null;
  deadline?: string | null;
};

export interface ParsedFiscalTransport {
  modFrete?: string;
  freightValue?: string;
  carrierName?: string;
  carrierTaxId?: string;
  carrierStateRegistration?: string;
  carrierAddress?: string;
  carrierCity?: string;
  carrierState?: string;
  vehiclePlate?: string;
  vehicleState?: string;
  vehicleRntc?: string;
  volumeQuantity?: string;
  volumeSpecies?: string;
  volumeBrand?: string;
  volumeNumber?: string;
  netWeight?: string;
  grossWeight?: string;
}

export interface ParsedFiscalDeliveryAddress {
  street: string;
  number: string;
  complement?: string;
  district: string;
  municipality: string;
  state: string;
  postalCode?: string;
}

export interface ParsedFiscalInstallment {
  number: string;
  dueDate: string;
  value: string;
}

export interface ParsedFiscalCardInfo {
  brand?: string;
  integration?: string;
  authorization?: string;
}

export interface ParsedFiscalPayment {
  method: string;
  value: string;
  indicator?: string;
  card?: ParsedFiscalCardInfo;
}

export interface ParsedFiscalIssuer {
  name: string;
  taxId: string;
  stateRegistration: string;
  stateRegistrationSubstitute: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  municipality: string;
  state: string;
  postalCode: string;
  phone: string;
}

export interface ParsedFiscalSummary {
  products: string;
  freight: string;
  insurance: string;
  discount: string;
  otherExpenses: string;
  importTax: string;
  icmsBase: string;
  icmsValue: string;
  icmsSubstitutionBase: string;
  icmsSubstitutionValue: string;
  ipiValue: string;
  invoiceTotal: string;
}

export interface ParsedFiscalBilling {
  number: string;
  originalValue: string;
  discount: string;
  netValue: string;
}

export interface ParsedFiscalItem {
  code: string;
  description: string;
  additionalInfo?: string;
  quantity: string;
  unit: string;
  unitValue: string;
  discount: string;
  total: string;
  ncm: string;
  cfop: string;
  cst: string;
  origin: string;
  cest?: string;
  ean?: string;
  icmsBase?: string;
  icmsRate?: string;
  icmsValue?: string;
  ipiRate?: string;
  ipiValue?: string;
  pisRate?: string;
  pisValue?: string;
  cofinsRate?: string;
  cofinsValue?: string;
}

export interface ParsedFiscalGeneral {
  natureOperation: string;
  issueDate: string;
  exitDate?: string;
  environment?: string;
  model: string;
  series: string;
  number: string;
  operationType: string;
  destination: string;
  finalConsumer: string;
  presence: string;
  purpose?: string;
  referencedKey?: string;
  total: string;
  additionalInfo: string;
  qrCode?: string;
  taxAuthorityInfo?: string;
}

export type ParsedFiscalDetails = {
  issuer: ParsedFiscalIssuer;
  general: ParsedFiscalGeneral;
  recipient: {
    name: string;
    taxId: string;
    stateRegistration: string;
    stateRegistrationIndicator: string;
    email: string;
    phone: string;
    street: string;
    number: string;
    complement: string;
    district: string;
    municipality: string;
    municipalityCode: string;
    state: string;
    postalCode: string;
    country: string;
    deliveryAddress?: ParsedFiscalDeliveryAddress | null;
  };
  items: ParsedFiscalItem[];
  summary: ParsedFiscalSummary;
  totals: Array<{ label: string; value: string; isTaxDetail?: boolean }>;
  transport: ParsedFiscalTransport | string[] | null;
  billing?: ParsedFiscalBilling;
  payments: ParsedFiscalPayment[];
  installments?: ParsedFiscalInstallment[];
  changeValue?: string;
};

export interface FiscalDocumentEventSummary {
  id: string;
  event_type: string;
  status: string;
  requested_at: string;
  attempt_number: number | null;
  cstat: string | null;
  xmotivo: string | null;
  requested_by: string | null;
  protocol_number: string | null;
  justification: string | null;
}

export interface FiscalDocumentDetails {
  document: NfeDocumentRecord & {
    xml_nfe: string | null;
    xml_protocolo: string | null;
  };
  parsedXml: ParsedFiscalDetails | null;
  events: FiscalDocumentEventSummary[];
}

export type FiscalDocumentFilters = {
  search: string;
  status: string;
  model: string;
  environment: string;
  dateFrom: string;
  dateTo: string;
};

export type FiscalDocumentPeriod =
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'this_year'
  | 'custom';
