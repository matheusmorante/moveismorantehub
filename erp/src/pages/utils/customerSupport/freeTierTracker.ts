import { SupabaseClient } from '@supabase/supabase-js';

export type FreeTierAlertLevel = 'normal' | 'warning' | 'danger' | 'exceeded';
export type ReconciliationStatus = 'estimated' | 'meta_confirmed' | 'unconfirmed';

export interface FreeTierUsageInfo {
  businessPhoneNumberId: string;
  yearMonth: string; // '2026-10'
  displayPeriod: string; // 'Outubro / 2026'
  freeTierLimit: number; // 1000
  serviceMessagesCount: number;
  availableBalance: number;
  percentageUsed: number;
  alertLevel: FreeTierAlertLevel;
  reconciliationStatus: ReconciliationStatus;
  statusLabel: string;
  lastReconciliationAt: string | null;
  lastUpdatedAt: string | null;
  isSendingBlocked: boolean; // Sempre true na v1
  blockReason: string;
}

export const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/**
 * Retorna o período no formato YYYY-MM
 */
export function getCurrentYearMonth(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Formata '2026-10' em 'Outubro / 2026'
 */
export function formatDisplayPeriod(yearMonth: string): string {
  const [y, m] = yearMonth.split('-');
  const monthIdx = Number(m) - 1;
  const name = MONTH_NAMES_PT[monthIdx] || m;
  return `${name} / ${y}`;
}

/**
 * Determina o nível de alerta com base nas faixas da Meta (0-799, 800-899, 900-999, 1000+)
 */
export function computeAlertLevel(count: number, limit = 1000): FreeTierAlertLevel {
  if (count >= limit) return 'exceeded';
  if (count >= 900) return 'danger';
  if (count >= 800) return 'warning';
  return 'normal';
}

/**
 * Consulta ou calcula o consumo mensal do número empresarial
 */
export async function getMonthlyUsage(
  supabase: SupabaseClient,
  businessPhoneNumberId: string = 'default'
): Promise<FreeTierUsageInfo> {
  const yearMonth = getCurrentYearMonth();
  const limit = 1000;

  let serviceMessagesCount = 0;
  let reconciliationStatus: ReconciliationStatus = 'estimated';
  let lastReconciliationAt: string | null = null;
  let lastUpdatedAt: string | null = null;

  try {
    const { data, error } = await supabase
      .from('whatsapp_usage_monthly')
      .select('*')
      .eq('year_month', yearMonth)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      serviceMessagesCount = data.service_messages_count || 0;
      reconciliationStatus = data.reconciliation_status || 'estimated';
      lastReconciliationAt = data.last_reconciliation_at;
      lastUpdatedAt = data.updated_at;
    }
  } catch (err) {
    console.warn('[FreeTierTracker] Erro ao carregar dados de uso mensal:', err);
    reconciliationStatus = 'unconfirmed';
  }

  const availableBalance = Math.max(0, limit - serviceMessagesCount);
  const percentageUsed = Math.min(100, Math.round((serviceMessagesCount / limit) * 100));
  const alertLevel = computeAlertLevel(serviceMessagesCount, limit);

  let statusLabel = 'Estimativa local baseada nos eventos registrados';
  if (reconciliationStatus === 'meta_confirmed') {
    statusLabel = 'Consumo conciliado e confirmado via Meta Graph API';
  } else if (reconciliationStatus === 'unconfirmed') {
    statusLabel = 'Consumo não confirmado — envio bloqueado.';
  }

  return {
    businessPhoneNumberId,
    yearMonth,
    displayPeriod: formatDisplayPeriod(yearMonth),
    freeTierLimit: limit,
    serviceMessagesCount,
    availableBalance,
    percentageUsed,
    alertLevel,
    reconciliationStatus,
    statusLabel,
    lastReconciliationAt,
    lastUpdatedAt,
    isSendingBlocked: true, // v1 opera estritamente em visualização gratuita
    blockReason: 'Envio indisponível. Central em modo de visualização gratuita.',
  };
}
