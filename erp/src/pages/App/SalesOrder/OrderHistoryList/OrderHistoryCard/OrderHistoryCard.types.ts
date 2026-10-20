import Order, { AssistanceItem } from '../../../../types/order.type';
import { Item } from '../../../../types/items.type';
import type {
  OrderFiscalBadgeStatus,
  OrderFiscalCancellationState,
  OrderFiscalOperationBadgeStatus,
  OutboundFiscalBadgeItem,
  ReturnFiscalDocumentSummary,
} from '@/pages/utils/nfe/orderFiscalBadgeRules';

export interface OrderHistoryCardProps {
  readonly order: Order;
  readonly fiscalBadgeStatus?: OrderFiscalBadgeStatus;
  readonly fiscalHmlBadgeStatus?: OrderFiscalBadgeStatus;
  readonly fiscalBadgeLoading?: boolean;
  readonly fiscalDocumentId?: string;
  readonly fiscalHmlDocumentId?: string;
  readonly fiscalCancellationState?: OrderFiscalCancellationState;
  readonly fiscalCancellationDocuments?: Array<{
    documentId: string;
    environment: 1 | 2;
    state: OrderFiscalCancellationState;
  }>;
  readonly fiscalEstornoBadgeStatus?: OrderFiscalOperationBadgeStatus;
  readonly fiscalEstornoDocumentId?: string;
  readonly fiscalEstornoDraftId?: string;
  readonly fiscalEstornoEnvironment?: 1 | 2;
  readonly fiscalDevolucaoBadgeStatus?: OrderFiscalOperationBadgeStatus;
  readonly fiscalDevolucaoDocumentId?: string;
  readonly fiscalDevolucaoEnvironment?: 1 | 2;
  readonly fiscalDevolucaoDocuments?: readonly ReturnFiscalDocumentSummary[];
  readonly fiscalProductionBadges?: readonly OutboundFiscalBadgeItem[];
  readonly fiscalHomologationBadges?: readonly OutboundFiscalBadgeItem[];
  readonly onEdit: (
    order: Order,
    initialStep?: number,
    highlightTemporary?: boolean,
    reconciliationMode?: boolean
  ) => void;
  readonly onDelete: (id: string) => void;
  readonly onRestore: (id: string) => void;
  readonly onPermanentDelete: (id: string) => void;
  readonly onAction: (actionKey: string, order: Order) => void;
  readonly onStatusUpdate: (id: string, newStatus: Order['status']) => void;
  readonly showTrash?: boolean;
  readonly isSelected?: boolean;
  readonly onToggleSelection?: () => void;
  readonly isHighlighted?: boolean;
  readonly id?: string;
  readonly onFilterByOrderId?: (id: string) => void;
  readonly onBlingUpdate?: (id: string, value: boolean) => void;
  readonly onStockCheckUpdate?: (
    id: string,
    value: boolean,
    updatedItems?: readonly Item[],
    updatedAssistanceItems?: readonly AssistanceItem[]
  ) => void;
  readonly onViewDetails?: (order: Order) => void;
  readonly onViewFiscalDocument?: (documentId: string, environment: 1 | 2) => void;
  readonly onShowPostSaleActions?: (order: Order) => void;
  readonly onIssueNfe?: (order: Order, environment: 1 | 2) => void;
}

export type OrderStatusConfigMap = Record<
  string,
  { label: string; bg: string; text: string; dot: string }
>;
