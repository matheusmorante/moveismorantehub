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

export interface DashboardAggregatesResponse {
  kpis: {
    totalSales: number;
    saleCount: number;
    totalOrdersCount: number;
    totalCmv: number;
    totalProfit: number;
    grossMargin: number;
    avgTicket: number;
    itemsWithoutCost: number;
    cmvPartial: boolean;
    paidTrafficSalesValue: number;
    pendingOrders: number;
    activeSchedules: number;
  };
  chart: Array<{ name: string; valor: number; lucro: number; orders: number }>;
  topProducts: {
    topByQuantity: any[];
    topByRevenue: any[];
    topByProfit: any[];
  };
}
