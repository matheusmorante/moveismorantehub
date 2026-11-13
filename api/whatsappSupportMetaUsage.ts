import { getSaoPauloDateParts } from '../shared-utils/commercialScheduling/timezoneUtils.js';
import type { CustomerSupportMetaMonthlyUsage } from '../shared-utils/customerSupportWhatsAppSendQuota.js';

const GRAPH_VERSION = 'v26.0';

export function saoPauloMonthStart(now: Date): Date {
  const { year, month } = getSaoPauloDateParts(now);
  const target = Date.UTC(year, month - 1, 1);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  let instant = target;
  for (let i = 0; i < 3; i += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    const localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second));
    instant += target - localAsUtc;
  }
  return new Date(instant);
}

export async function fetchWhatsAppMetaMonthlyUsage({
  wabaId, accessToken, fetchMeta = fetch, now = new Date(),
}: {
  wabaId: string;
  accessToken: string;
  fetchMeta?: typeof fetch;
  now?: Date;
}): Promise<CustomerSupportMetaMonthlyUsage> {
  const start = saoPauloMonthStart(now);
  const base = {
    amount: null,
    currency: null,
    delivered: null,
    service_free: null,
    billable_delivered: null,
    free_entry_point: null,
    period_start: start.toISOString(),
    as_of: now.toISOString(),
  };
  if (!/^\d{1,32}$/.test(wabaId) || !accessToken) {
    return { ...base, status: 'not_configured', message: 'Conta WhatsApp ou acesso à Meta não configurado.' };
  }

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}`);
  url.searchParams.set('fields', `currency,pricing_analytics.start(${Math.floor(start.getTime() / 1000)}).end(${Math.floor(now.getTime() / 1000)}).granularity(DAILY).dimensions(["PRICING_CATEGORY","PRICING_TYPE"])`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const points: Record<string, unknown>[] = [];
  let currency: string | null = null;
  let next: URL | null = url;

  try {
    for (let page = 0; next && page < 10; page += 1) {
      const response = await fetchMeta(next.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal,
      });
      const payload = await response.json().catch(() => null) as Record<string, any> | null;
      if (!response.ok || !payload || payload.error) throw new Error('meta_analytics_unavailable');
      if (typeof payload.currency === 'string' && /^[A-Z]{3}$/.test(payload.currency)) currency = payload.currency;
      const analytics = payload.pricing_analytics ?? payload;
      if (!Array.isArray(analytics.data)) throw new Error('meta_analytics_missing');
      for (const group of analytics.data) {
        if (!group || typeof group !== 'object') throw new Error('meta_analytics_invalid');
        if (Array.isArray(group.data_points)) points.push(...group.data_points);
        else if ('cost' in group || 'volume' in group) points.push(group);
        else throw new Error('meta_analytics_invalid');
      }
      const nextLink = analytics.paging?.next;
      if (nextLink) {
        const nextUrl = new URL(String(nextLink));
        if (nextUrl.protocol !== 'https:' || nextUrl.hostname !== 'graph.facebook.com'
          || ![ `/${GRAPH_VERSION}/${wabaId}`, `/${GRAPH_VERSION}/${wabaId}/pricing_analytics` ].includes(nextUrl.pathname)) {
          throw new Error('meta_analytics_invalid_page');
        }
        nextUrl.searchParams.delete('access_token');
        next = nextUrl;
      } else next = null;
    }
    if (next) throw new Error('meta_analytics_incomplete');

    const numeric = (value: unknown): number | null => {
      if ((typeof value !== 'number' && typeof value !== 'string') || value === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };
    const dimension = (point: Record<string, unknown>, key: 'pricing_category' | 'pricing_type'): string => {
      const value = point[key] ?? point[key.toUpperCase()];
      return typeof value === 'string' ? value.trim().toLowerCase() : '';
    };
    const volumes = points.map((point) => numeric(point.volume));
    const costs = points.map((point) => numeric(point.cost));
    const delivered = points.length && volumes.every((value) => value !== null)
      ? volumes.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;
    const hasPricingDimensions = points.length > 0 && points.every((point) =>
      Boolean(dimension(point, 'pricing_category')) && Boolean(dimension(point, 'pricing_type')));
    const sumVolume = (predicate: (point: Record<string, unknown>) => boolean): number | null => {
      if (!hasPricingDimensions || !volumes.every((value) => value !== null)) return null;
      return points.reduce<number>((sum, point, index) => sum + (predicate(point) ? (volumes[index] ?? 0) : 0), 0);
    };
    const serviceFree = sumVolume((point) => dimension(point, 'pricing_category') === 'service'
      && dimension(point, 'pricing_type') === 'free_customer_service');
    const billableDelivered = sumVolume((point) => dimension(point, 'pricing_type') === 'regular');
    const freeEntryPoint = sumVolume((point) => dimension(point, 'pricing_type') === 'free_entry_point');
    const pricingBreakdown = {
      service_free: serviceFree,
      billable_delivered: billableDelivered,
      free_entry_point: freeEntryPoint,
    };
    const amount = points.length && currency && costs.every((value) => value !== null)
      ? costs.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;
    if (amount === null) {
      return { ...base, currency, delivered, ...pricingBreakdown, status: 'partial',
        message: 'A Meta não informou o custo completo para este período. Consulte a fatura da conta.' };
    }
    return { ...base, status: 'available', amount, currency, delivered, ...pricingBreakdown };
  } catch {
    return { ...base, status: 'unavailable',
      message: 'Não foi possível consultar os dados de cobrança na Meta. Confira a conexão e as permissões da conta.' };
  } finally {
    clearTimeout(timeout);
  }
}
