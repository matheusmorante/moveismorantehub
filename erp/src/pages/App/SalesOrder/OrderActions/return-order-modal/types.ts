import type Order from '../../../../types/order.type';
import type Shipping from '../../../../types/Shipping.type';
import type { AvailableInvoiceLine } from '../../../../utils/nfe/invoiceLineSnapshot';

export type ReturnOrderModalProps = {
  readonly order: Order;
  readonly onClose: () => void;
  readonly onSuccess: (id: string) => void;
};

export const EMPTY_SCHEDULING: Shipping['scheduling'] = {
  dateType: 'fixed',
  date: '',
  endDate: '',
  time: '',
  type: 'fixed',
  startTime: '',
  endTime: '',
  notInformed: false,
};

export interface ReturnOrderDataState {
  returnableQuantities: Record<string, number>;
  returnsLoaded: boolean;
  returnDataError: string | null;
  fiscalCapacityLines: AvailableInvoiceLine[];
  fiscalCapacityLoaded: boolean;
  fiscalCapacityError: string | null;
  hasAuthorizedInvoice: boolean;
}
