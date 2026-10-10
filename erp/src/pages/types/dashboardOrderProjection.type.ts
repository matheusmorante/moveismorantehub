import type Order from './order.type';
import type FullAddress from './fullAddress.type';

/** Campos selecionados pelo card de pedidos recentes do dashboard. */
export type RecentOrderProjection = Pick<
  Order,
  'id' | 'orderNumber' | 'orderIndex' | 'status' | 'orderType' | 'date' | 'deleted'
> & {
  id: string;
  totalAmount: number;
  customerData: Pick<Order['customerData'], 'fullName'>;
  seller?: string;
  paymentsSummary?: { totalOrderValue?: number };
};

/** Campos selecionados pelo mapa geográfico do dashboard. */
export type GeoMapOrderProjection = Pick<
  Order,
  'id' | 'status' | 'orderType' | 'deleted'
> & {
  id: string;
  totalAmount: number;
  customerData: Pick<Order['customerData'], 'fullName'> & { fullAddress?: FullAddress };
  shipping?: Pick<Partial<Order['shipping']>, 'destinationCoords'>;
  itemsSummary?: Pick<Partial<Order['itemsSummary']>, 'itemsTotalValue'>;
};
