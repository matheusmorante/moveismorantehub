import { getLocalDateString, isCancelledOrder, isDateInPeriod } from '../utils/orderUtils';
import { getOperationalScheduleDate } from '../utils/operationalSchedule';

export const SUMMARY_GENERATOR_VERSION = 'v1';
export const TTS_VERSION = 'v1';

export interface CanonicalOrderItem {
  name: string;
  quantity: number;
  handlingType: string;
  isAssemblyOutside: boolean;
}

export interface CanonicalOrder {
  id: string;
  orderIndex?: string | null;
  customerName: string;
  city: string;
  neighborhood: string;
  addressText: string;
  handlingType: string;
  scheduledDate: string;
  scheduledTime: string;
  period: string;
  distanceKm: number | null;
  observations: string;
  items: CanonicalOrderItem[];
  notices: string[];
}

export interface CanonicalSummaryPayload {
  scope: 'today' | 'tomorrow' | 'next_days' | 'next5days';
  targetDates: string[];
  generatorVersion: string;
  ttsVersion: string;
  orders: CanonicalOrder[];
}

// Helper simples para digest SHA-256 / Hash estável sem dependências nativas instáveis
export function computeStableHash(text: string): string {
  let hash1 = 5381;
  let hash2 = 52711;

  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }

  const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const h2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `fp_${h1}${h2}`;
}

export function buildCanonicalSummaryPayload(
  rawOrders: any[],
  mode: 'today' | 'tomorrow' | 'next_days' | 'next5days',
  handlingOptions: any[] = []
): CanonicalSummaryPayload {
  const now = new Date();
  const todayStr = getLocalDateString(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  let targetDates = [todayStr];
  if (mode === 'tomorrow') targetDates = [tomorrowStr];

  const isAssemblyOutsideType = (handlingTypeStr: string) => {
    if (!handlingTypeStr) return false;
    const hLower = handlingTypeStr.toLowerCase().trim();
    if (Array.isArray(handlingOptions) && handlingOptions.length > 0) {
      const matched = handlingOptions.find((opt: any) => opt.label && opt.label.toLowerCase().trim() === hLower);
      if (matched && typeof matched.isAssemblyOutside === 'boolean') return matched.isAssemblyOutside;
    }
    if (
      hLower.includes('depósito') ||
      hLower.includes('deposito') ||
      hLower.includes('retirada') ||
      hLower.includes('cliente') ||
      hLower.includes('entregue montado')
    ) {
      return false;
    }
    return (
      hLower.includes('montagem no local') ||
      hLower.includes('montagem fora') ||
      hLower.includes('montagem na entrega')
    );
  };

  const activeOrders = (rawOrders || []).filter((o: any) => !isCancelledOrder(o));

  const deliveryOrders = activeOrders.filter((o: any) => {
    const oData = o.order_data || {};
    const orderStatus = (o.status || oData.status || '').toLowerCase();
    if (o.deleted || o.is_deleted || o.status === 'deleted' || oData.deleted || orderStatus === 'draft' || orderStatus === 'rascunho') {
      return false;
    }

    const shipping = oData.shipping || o.shipping || {};
    const isDelivery = shipping.deliveryMethod === 'delivery' || !shipping.deliveryMethod;
    const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};
    const isPendingScheduling = Boolean(
      sched.pendingScheduling || oData.pendingScheduling || o.pending_scheduling ||
      orderStatus === 'pending_scheduling' || orderStatus === 'agendar_depois'
    );
    const schedDate = getOperationalScheduleDate(o);

    if (!isDelivery || isPendingScheduling || !schedDate || schedDate === 'sem_data') return false;

    const cleanSchedDate = parseOrderDateStr(schedDate);
    if (!cleanSchedDate || cleanSchedDate === 'sem_data') return false;

    if (mode === 'today') {
      return cleanSchedDate === todayStr;
    } else if (mode === 'tomorrow') {
      return cleanSchedDate === tomorrowStr;
    } else if (mode === 'next_days') {
      return cleanSchedDate > todayStr;
    } else if (mode === 'next5days') {
      return targetDates.includes(cleanSchedDate);
    }
    return false;
  });

  const canonicalOrders: CanonicalOrder[] = deliveryOrders.map((o: any) => {
    const oData = o.order_data || {};
    const shipping = oData.shipping || o.shipping || {};
    const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};
    const deliveryAddr = shipping.deliveryAddress || shipping.address || {};
    const custData = oData.customerData || oData.customer || {};
    const custAddr = custData.address || custData.fullAddress || {};

    const obsText = (
      oData.observations || oData.notes || oData.observation ||
      shipping.observations || shipping.notes || shipping.observation ||
      o.observations || o.notes || o.observation || ''
    ).toString().trim();

    const customerNameRaw = String(
      custData.name || custData.fullName || custData.customerName ||
      oData.customerName || o.customer_name || o.customerName || ''
    ).trim();
    const customerName = customerNameRaw.split(/\s+/).slice(0, 2).join(' ');

    const city = (deliveryAddr.city || shipping.city || custAddr.city || custData.city || o.city || '').trim();
    const neighborhood = (deliveryAddr.neighborhood || shipping.neighborhood || custAddr.neighborhood || custData.neighborhood || '').trim();
    const street = (deliveryAddr.street || deliveryAddr.address || shipping.address || custAddr.address || '').trim();
    const number = (deliveryAddr.number || '').trim();
    const addressText = `${street} ${number}`.trim();

    const distRaw = shipping.distance ?? shipping.distanceKm ?? o.distance ?? o.distanceKm;
    const distanceKm = typeof distRaw === 'number' ? distRaw : (parseFloat(distRaw) || null);

    const rawItems = oData.items || o.items || [];
    const items: CanonicalOrderItem[] = rawItems.map((it: any) => ({
      name: (it.description || it.name || it.title || 'móvel').trim().toLowerCase(),
      quantity: Number(it.quantity || it.qty || 1),
      handlingType: String(it.handlingType || it.handling || '').trim().toLowerCase(),
      isAssemblyOutside: isAssemblyOutsideType(String(it.handlingType || it.handling || '')),
    })).sort((a: CanonicalOrderItem, b: CanonicalOrderItem) => a.name.localeCompare(b.name));

    const notices: string[] = [];
    const obsLower = obsText.toLowerCase();
    if (obsLower.includes('maquina') || obsLower.includes('máquina') || obsLower.includes('cartao') || obsLower.includes('cartão')) notices.push('máquina de cartão');
    if (obsLower.includes('cooktop')) notices.push('cooktop');
    if (obsLower.includes('serra copo') || obsLower.includes('cerra copo')) notices.push('serra copo');
    if (obsLower.includes('ligar antes') || obsLower.includes('avisar antes')) notices.push('ligar antes');
    if (obsLower.includes('nota fiscal') || /\bnf\b/.test(obsLower)) notices.push('nota fiscal');

    const cleanDate = parseOrderDateStr(getOperationalScheduleDate(o)) || '';

    return {
      id: String(o.id || o.order_id || '').trim(),
      orderIndex: o.orderIndex || o.order_number || null,
      customerName,
      city: city.toLowerCase(),
      neighborhood: neighborhood.toLowerCase(),
      addressText: addressText.toLowerCase(),
      handlingType: String(oData.handlingType || shipping.handlingType || '').trim().toLowerCase(),
      scheduledDate: cleanDate,
      scheduledTime: String(sched.startTime || sched.time || '').trim(),
      period: String(sched.period || sched.shift || '').trim().toLowerCase(),
      distanceKm,
      observations: obsText,
      items,
      notices: notices.sort(),
    };
  }).sort((a: CanonicalOrder, b: CanonicalOrder) => {
    if (a.scheduledDate !== b.scheduledDate) {
      return a.scheduledDate.localeCompare(b.scheduledDate);
    }
    return a.id.localeCompare(b.id);
  });

  if (mode === 'next_days') {
    targetDates = Array.from(new Set(canonicalOrders.map(o => o.scheduledDate))).sort();
  }

  return {
    scope: mode,
    targetDates,
    generatorVersion: SUMMARY_GENERATOR_VERSION,
    ttsVersion: TTS_VERSION,
    orders: canonicalOrders,
  };
}

export function generateCanonicalFingerprint(payload: CanonicalSummaryPayload): string {
  const jsonString = JSON.stringify(payload);
  return computeStableHash(jsonString);
}
