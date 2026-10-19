import type Order from '@/pages/types/order.type';
import type CustomerData from '@/pages/types/customerData.type';
import type Item from '@/pages/types/items.type';
import type { AssistanceItem } from '@/pages/types/order.type';
type Scheduling = NonNullable<Order['shipping']>['scheduling'];

export interface AssistanceOrderModalProps {
  order?: Order;
  sourceOrder?: Order;
  initialData?: {
    matchedProductId?: string;
  };
  onClose: () => void;
  onSaveSuccess: (orderId: string, orderData: Order) => void | boolean | Promise<void | boolean>;
}

export interface AssistanceFormState {
  customerData: CustomerData;
  description: string;
  observation: string;
  scheduling: Scheduling;
  isLinked: boolean;
  linkedOrderId: string;
  selectedLinkedOrder: Order | null;
  seller: string;
  selectedAssistanceItems: AssistanceItem[];
  extraItems: Item[];
  assistanceCost: number;
  assistanceServiceValue: number;
  status: Order['status'];
  currentOrderId?: string;
  loading: boolean;
  validationErrors: Record<string, string>;
}
