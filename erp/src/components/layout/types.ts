import type { AggregatedMetric } from '@/services/monitoring/types';

export type MenuKey =
  | 'products'
  | 'stock'
  | 'salesOrder'
  | 'logistics'
  | 'registrations'
  | 'finance'
  | 'marketing'
  | 'assembly'
  | null;

export interface SupabaseAnomalyNotification {
  level?: 'CRITICAL' | 'WARNING' | string;
  title: string;
  message: string;
  metric?: AggregatedMetric;
}

export interface AssistanceModalEventDetail {
  [key: string]: unknown;
}

export interface CustomerDesireEventDetail {
  product_name: string;
  [key: string]: unknown;
}
