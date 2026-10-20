import type {
  FiscalDocumentStatusRow,
  FiscalOperationDraftStatusRow,
  OrderFiscalBadgeStatuses,
  ReturnFiscalDocumentSummary,
} from '../orderFiscalBadgeRules';

export interface BadgeDocumentRow extends FiscalDocumentStatusRow {
  id?: string;
  numero_nfe?: string | number | null;
  serie?: string | number | null;
  modelo?: string | null;
  valor_total?: number | string | null;
  issuedAt?: string | null;
  returnOrderCode?: string | number | null;
  itemQuantity?: number | null;
}

export interface RelatedOrderRow {
  id: string;
  status?: string | null;
  order_type?: string | null;
  linked_order_id?: string | null;
  legacy_parent_id?: string | null;
  order_index?: string | number | null;
}

export interface FiscalBadgeSupplement {
  documents?: BadgeDocumentRow[];
  returnOrders?: RelatedOrderRow[];
  cancellationEvents?: Array<{ document_id: string; status: string; requested_at?: string }>;
  estornoDrafts?: Array<{
    id?: string;
    original_document_id: string;
    operation_kind: 'estorno' | 'return';
    environment: number;
    status: string;
    created_at?: string;
  }>;
  cancelledOrderIds?: string[];
}
