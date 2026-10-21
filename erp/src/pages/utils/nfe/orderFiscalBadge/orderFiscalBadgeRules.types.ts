/**
 * Situação fiscal do pedido comercial por ambiente (não apenas da última nota):
 * - `reversed`: pedido encerrado e NF regularizada por estorno autorizado (roxo).
 * - `cancelled`: NF formalmente cancelada na SEFAZ (evento 110111).
 * - `reissue_required`: pedido ativo, NF anterior regularizada por edição, nova NF ainda não
 *   autorizada. É ação fiscal necessária (amarelo), não erro.
 * - `regularization_failed`: cancelamento/estorno da NF anterior falhou (erro).
 * - `regularization_uncertain`: cancelamento/estorno com resultado incerto ou ainda não confirmado;
 *   exige consulta/reconciliação antes de qualquer nova tentativa ou emissão.
 */
export type OrderFiscalBadgeStatus =
  | 'not_issued'
  | 'issued'
  | 'cancelled'
  | 'failed'
  | 'rejected'
  | 'reversed'
  | 'reissue_required'
  | 'regularization_failed'
  | 'regularization_uncertain';

/** Estados específicos da pendência de substituição fiscal decorrente de alteração do pedido. */
export type ReplacementPendingAction =
  | 'awaiting_new_invoice'
  | 'draft'
  | 'rejected'
  | 'transmission_uncertain'
  | 'authorized'
  | 'prior_regularization_failed'
  | 'prior_regularization_uncertain'
  | 'processing';

/** Situação fiscal do pedido no ambiente de uma NF, calculada no backend para o modal de detalhes. */
export interface OrderFiscalSituation {
  status: OrderFiscalBadgeStatus;
  environment: 1 | 2;
  orderCancelled: boolean;
  orderId?: string;
  /** Nota que originou a falha/incerteza de regularização ou nota do ambiente. */
  documentId?: string;
  /** Identificador da nota fiscal anterior (origem do estorno/cancelamento). */
  previousDocumentId?: string | null;
  /** Número da nota fiscal anterior (ex: 124). */
  previousDocumentNumber?: number | string | null;
  /** Como a nota fiscal anterior foi regularizada ('estornada' ou 'cancelada'). */
  previousDocumentClosure?: 'estornada' | 'cancelada' | null;
  /** Motivo registrado (SEFAZ ou documento), quando disponível. */
  reason?: string | null;
  /** Ação contextual necessária na pendência de substituição. */
  actionKind?: ReplacementPendingAction;
  /** ID do rascunho de emissão ou da tentativa, se houver. */
  targetDraftId?: string | null;
}

/** Estados em que a NF anterior ainda não foi comprovadamente regularizada: nova emissão bloqueada. */
export const isFiscalRegularizationBlockingStatus = (
  status: OrderFiscalBadgeStatus | undefined
): boolean => status === 'regularization_failed' || status === 'regularization_uncertain';

export type OrderFiscalOperationBadgeStatus =
  | 'issued'
  | 'failed'
  | 'rejected'
  | 'cancelled'
  | 'prepared'
  | 'pending'
  | 'mixed'
  | 'uncertain';

export type ReturnFiscalBadgeStatus = Extract<
  OrderFiscalOperationBadgeStatus,
  'issued' | 'failed' | 'rejected' | 'cancelled' | 'pending' | 'mixed' | 'uncertain'
>;

export type OrderFiscalCancellationState = 'failed' | 'pending' | 'verify';

export interface FiscalDocumentStatusRow {
  id?: string;
  created_at?: string;
  order_id: string | null;
  status: string;
  document_type?: string | null;
  ambiente?: number | null;
  original_document_id?: string | null;
  cancellationEventStatus?: string | null;
  cancellationEventRequestedAt?: string | null;
}

export interface ReturnFiscalDocumentSummary extends FiscalDocumentStatusRow {
  id: string;
  order_id: string;
  numero_nfe?: string | number | null;
  serie?: string | number | null;
  modelo?: string | null;
  valor_total?: number | string | null;
  issuedAt?: string | null;
  returnOrderCode?: string | number | null;
  itemQuantity?: number | null;
}

export interface FiscalOperationDraftStatusRow {
  id?: string;
  original_document_id: string;
  operation_kind: 'estorno' | 'return';
  environment?: number | null;
  status: string;
  created_at?: string | null;
}

/**
 * Intenção fiscal persistida por uma edição comercial (`nfe_order_edit_replacements`).
 * É a única evidência de que a regularização da NF anterior nasceu de uma edição do pedido.
 */
export interface FiscalOrderEditReplacementRow {
  original_document_id: string;
  environment?: number | null;
  reversal_kind?: 'cancel' | 'estorno' | string | null;
  status: string;
  replacement_document_id?: string | null;
}

export interface OutboundFiscalBadgeItem {
  id?: string;
  status: OrderFiscalBadgeStatus;
  sequenceNumber: number;
  label: string;
}

export interface OrderFiscalBadgeStatuses {
  production: OrderFiscalBadgeStatus;
  homologation?: OrderFiscalBadgeStatus;
  productionDocumentId?: string;
  homologationDocumentId?: string;
  productionBadges?: OutboundFiscalBadgeItem[];
  homologationBadges?: OutboundFiscalBadgeItem[];
  cancellationState?: OrderFiscalCancellationState;
  cancellationDocuments?: Array<{
    documentId: string;
    environment: 1 | 2;
    state: OrderFiscalCancellationState;
  }>;
  estornoStatus?: OrderFiscalOperationBadgeStatus;
  estornoDocumentId?: string;
  estornoDraftId?: string;
  estornoEnvironment?: 1 | 2;
  devolucaoStatus?: OrderFiscalOperationBadgeStatus;
  devolucaoDocumentId?: string;
  devolucaoEnvironment?: 1 | 2;
  devolucaoCount?: number;
  devolucaoDocuments?: ReturnFiscalDocumentSummary[];
  /** True when estorno was confirmed and no replacement HML outbound has been emitted. */
  readyToReissueHml?: boolean;
  /** True when estorno was confirmed and no replacement prod outbound has been emitted. */
  readyToReissueProd?: boolean;
}
