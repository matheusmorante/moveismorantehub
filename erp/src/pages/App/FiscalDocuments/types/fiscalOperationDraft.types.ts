import type { FiscalReturnMethod } from '../../../../../../shared-utils/fiscalOperationContext';

export interface SourceDocument {
  id: string;
  order_id: string | null;
  modelo: '55' | '65';
  ambiente: 1 | 2;
  numero_nfe: number;
  serie: string;
  chave_acesso: string;
}

export interface ReturnOrderOption {
  id: string;
  order_index: number | null;
  linked_order_id: string | null;
  order_data: Record<string, unknown> | null;
}

export interface ReturnFiscalSourceEligibility {
  source: SourceDocument | null;
  state: 'ready' | 'draft' | 'rejected' | 'pending' | 'authorized' | 'cancelled' | 'blocked';
  blockReason: string | null;
  draftId: string | null;
  returnDocumentId: string | null;
  allocatedItems: Array<{
    returnItemIndex: number;
    originalItemNumber: number;
    quantity: number;
    productCode: string;
  }>;
}

export interface ReturnFiscalEligibility {
  eligible: boolean;
  returnOrderId: string;
  returnOrderIndex?: number | null;
  linkedSaleOrderId?: string;
  hasAuthorizedOriginal: boolean;
  reason: string | null;
  sources: ReturnFiscalSourceEligibility[];
}

export interface DraftLine {
  id: string;
  fiscal_item_number: number;
  originalItemNumber?: number;
  quantity: number;
  gross_value: number;
  discount_value: number;
  originalDescription: string;
  originalProductCode: string;
  originalQuantity: number;
  originalGrossValue: number;
  originalDiscountValue: number;
  originalProductXml: string;
  originalTaxesXml: string;
  originalCfop?: string | null;
  suggestedCfop: string | null;
  allowedCfops?: Array<{ value: string; label: string }>;
  reviewed_cfop?: string | null;
  reviewed_product_xml?: string | null;
  reviewed_taxes_xml?: string | null;
}

export interface ReviewedLine {
  draft_line_id: string;
  cfop: string;
  product_xml: string;
  taxes_xml: string;
}

export interface ReviewData {
  nature_of_operation: string;
  reason: string;
  recipient_xml: string;
  totals_xml: string;
  transport_xml: string;
  payment_xml: string;
  item_taxes_confirmed: boolean;
  totals_confirmed: boolean;
}

export interface DraftPayload {
  draft: {
    id: string;
    operation_kind: 'estorno' | 'return';
    status: string;
    environment: number;
    original_access_key: string;
    reason?: string | null;
    nature_of_operation?: string | null;
    review_data?: Partial<ReviewData> | null;
  };
  lastSefazResult?: { cStat: string; xMotivo: string } | null;
  source: SourceDocument;
  returnOrder?: {
    id: string;
    orderIndex: number | null;
    returnMethod: FiscalReturnMethod | null;
    operationContext?: {
      issuerUf: string;
      recipientUf: string;
      scope: 'internal' | 'interstate' | 'foreign';
      returnMethod: FiscalReturnMethod;
      recipientFiscalStatus: 'taxpayer' | 'non_taxpayer';
      isFinalConsumer: boolean;
      taxRegime: string;
    } | null;
  } | null;
  lines: DraftLine[];
  reviewTemplate: Pick<
    ReviewData,
    'recipient_xml' | 'totals_xml' | 'transport_xml' | 'payment_xml'
  >;
}

export interface NfeOperationDraftModalProps {
  sourceDocument: SourceDocument | null;
  initialDraftId?: string | null;
  mode?: 'estorno' | 'return';
  returnOrderId?: string | null;
  returnOrderIndex?: number | null;
  onClose: () => void;
  onAuthorized: () => void;
}

export interface OperationDraftTransmissionResult {
  retryAllowed?: boolean;
  pending?: boolean;
  success?: boolean;
  error?: string;
  reconciliationRequired?: boolean;
  protocolNumber?: string;
  xMotivo?: string;
}
