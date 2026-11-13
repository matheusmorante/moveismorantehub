export const CUSTOMER_SUPPORT_WHATSAPP_SEND_QUOTA = {
  perMinute: 10,
  perHour: 50,
  updatedEvent: 'customer-support:whatsapp-send-quota-updated',
} as const;

export interface CustomerSupportWhatsAppSendQuota {
  allowed: boolean;
  reservation_id: string | null;
  minute_limit: number;
  minute_used: number;
  minute_remaining: number;
  hour_limit: number;
  hour_used: number;
  hour_remaining: number;
  day_attempts: number;
  day_sent: number;
  day_failed: number;
  day_uncertain: number;
  day_start: string;
  remaining_percent: number;
  retry_after_seconds: number;
}

export interface CustomerSupportMetaMonthlyUsage {
  status: 'available' | 'partial' | 'unavailable' | 'restricted' | 'not_configured';
  amount: number | null;
  currency: string | null;
  delivered: number | null;
  service_free?: number | null;
  billable_delivered?: number | null;
  free_entry_point?: number | null;
  period_start: string;
  as_of: string;
  message?: string;
}
