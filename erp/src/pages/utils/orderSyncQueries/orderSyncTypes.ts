import Order from '../../types/order.type';

export type OrdersSubscriber = (orders: Order[]) => void;
export type OrdersChangeSubscriber = () => void;

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
