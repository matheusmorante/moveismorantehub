import type { Order } from '@/pages/types/order.type';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import type { ReplacementPendingAction } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import type { NfeDocumentRecord } from '../../types/fiscalDocuments.types';

export interface IssuedFiscalDocumentDetailsModalProps {
  emissionResult?: NfeEmissionResult;
  document?: NfeDocumentRecord;
  documentId?: string;
  initialEnvironment?: 1 | 2;
  fullScreen?: boolean;
  order?: Order;
  orderNumber?: number;
  onClose: () => void;
  /** Inicia ou retoma a emissão no ERP para o pedido e ambiente da nota */
  onIssueNfe?: (
    order: Order,
    environment: 1 | 2,
    actionKind: ReplacementPendingAction,
    originalDocumentId?: string | null
  ) => void;
  /** Consulta e reconcilia a situação da nota fiscal na SEFAZ */
  onConsultSefaz?: (documentId: string, environment: 1 | 2) => void;
}

export function downloadBlob(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
