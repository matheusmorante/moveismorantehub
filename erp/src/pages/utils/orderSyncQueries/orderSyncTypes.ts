import Order from '../../types/order.type';

export type OrdersSubscriber = (orders: Order[]) => void;
export type OrdersChangeEvent = { reason: 'change' | 'reconnected' };
export type OrdersChangeSubscriber = (event?: OrdersChangeEvent) => void;

export interface FetchFulfilledOrdersOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  sortBy?: 'id' | 'date' | 'customer';
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardOrdersDateRange {
  start: Date;
  end: Date;
}
