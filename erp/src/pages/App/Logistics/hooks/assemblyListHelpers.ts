import { AppSettings } from '@/pages/utils/settingsService';
import { formatOrderCode } from '@/pages/utils/orderCode';
import { shouldShowOrderInSchedule } from '@/pages/utils/scheduleOrderVisibility';
import { getOperationalScheduleDate } from '@/pages/utils/operationalSchedule';

export const parseOrderDate = (rawDate: unknown): string => {
  if (!rawDate) return '';
  const value = String(rawDate).trim();
  if (!value || value === 'sem_data' || value === 'null' || value === 'undefined') return '';

  if (value.includes('/')) {
    const parts = value.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  const isoDate = value.split('T')[0];
  const parts = isoDate.split('-');
  return parts.length === 3
    ? `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
    : isoDate;
};

export const normalizeLabel = (value: unknown) =>
  String(value || '')
    .trim()
    .toLocaleLowerCase('pt-BR');

const smallProductNameWords = new Set([
  'a',
  'as',
  'o',
  'os',
  'e',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'para',
  'por',
  'com',
  'sem',
]);

const productNameAcronyms: Record<string, string> = {
  abnt: 'ABNT',
  led: 'LED',
  mdf: 'MDF',
  mdp: 'MDP',
  rgb: 'RGB',
  tv: 'TV',
  usb: 'USB',
  pvc: 'PVC',
};

export const formatAssemblyItemName = (item: any) => {
  const raw =
    item?.description ||
    item?.name ||
    item?.title ||
    item?.productName ||
    item?.product_name ||
    item?.product ||
    '';
  if (!raw) return 'Móvel';
  const exactName =
    String(raw)
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .trim() || String(raw);
  const observation =
    typeof item.observation === 'string'
      ? item.observation.trim()
      : typeof item.observations === 'string'
        ? item.observations.trim()
        : '';
  const fullName = observation ? `${exactName} - ${observation}` : exactName;

  return fullName
    .split(/\s+/)
    .map((word, index) => {
      const lowerWord = word.toLocaleLowerCase('pt-BR');
      if (productNameAcronyms[lowerWord]) return productNameAcronyms[lowerWord];
      if (index > 0 && smallProductNameWords.has(lowerWord)) return lowerWord;
      return lowerWord.replace(
        /(^|[-/])([a-zà-öø-ÿ])/g,
        (_match, separator: string, letter: string) =>
          `${separator}${letter.toLocaleUpperCase('pt-BR')}`
      );
    })
    .join(' ');
};

export const classifyAssemblyHandling = (handling: unknown, options: any[]) => {
  const label = normalizeLabel(handling);
  if (
    !label ||
    label === 'sem montagem' ||
    label.includes('sem montagem') ||
    label.includes('sem_montagem') ||
    label.includes('apenas entrega') ||
    label.includes('não necessita') ||
    label.includes('nao necessita')
  ) {
    return { isOutside: false, isInternal: false };
  }

  const option = options.find((item) => normalizeLabel(item?.label) === label);
  if (option) {
    return {
      isOutside: option.isAssemblyOutside === true,
      isInternal: option.includeInAssemblySchedule === true && !option.isAssemblyOutside,
    };
  }

  const isOutside =
    label.includes('montagem_fora') ||
    label.includes('montagem fora') ||
    label.includes('montador') ||
    label.includes('montagem externa') ||
    label.includes('montagem no cliente') ||
    label.includes('assembly_outside') ||
    (label.includes('fora') && !label.includes('sem'));

  const isInternal =
    !isOutside &&
    (label.includes('loja') ||
      label.includes('deposito') ||
      label.includes('depósito') ||
      label.includes('montagem_loja') ||
      label.includes('montagem na loja') ||
      label.includes('interna') ||
      label.includes('montado'));

  return { isOutside, isInternal };
};

export const mapOrderRow = (row: any) => {
  const data = row.order_data || {};
  const shipping = data.shipping || {};
  const schedule = shipping.scheduling || data.schedule || data.scheduling || row.schedule || {};
  const scheduledDate =
    getOperationalScheduleDate(row) ||
    schedule.date ||
    schedule.startDate ||
    row.scheduled_date ||
    row.date ||
    '';
  const customerData =
    data.customerData ||
    data.customer ||
    ({ fullName: data.customerName || row.customer_name || 'Cliente' } as any);

  return {
    ...data,
    id: String(row.id),
    status: row.status || data.status,
    orderNumber: row.order_number ?? data.orderNumber,
    orderIndex: row.order_index ?? data.orderIndex,
    deleted: row.deleted === true || data.deleted === true,
    date: data.date || row.created_at || '',
    customerData,
    items: Array.isArray(data.items) ? data.items : [],
    shipping: {
      ...shipping,
      deliveryMethod: row.delivery_method || shipping.deliveryMethod,
      scheduling: { ...schedule, date: scheduledDate },
    },
  };
};

export const getOrderAssemblyTasks = (rows: any[], settings: AppSettings) => {
  const allHandlingOptions = [
    ...(settings.deliveryHandlingOptions || []),
    ...(settings.pickupHandlingOptions || []),
  ];

  return rows.flatMap((row) => {
    const data = row.order_data || {};
    const order = mapOrderRow(row);
    const shipping = data.shipping || {};
    const schedule = shipping.scheduling || data.schedule || data.scheduling || row.schedule || {};
    const operationalDate = getOperationalScheduleDate(row);
    const date = parseOrderDate(
      operationalDate || schedule.date || schedule.startDate || row.scheduled_date || row.date
    );
    const status = normalizeLabel(
      row.status || data.status || row.order_status || data.order_status
    );
    if (!shouldShowOrderInSchedule(row) || status === 'draft' || status === 'rascunho') {
      return [];
    }

    const orderHandling =
      data.handlingType ||
      data.handling ||
      data.deliveryType ||
      shipping.handlingType ||
      shipping.handling ||
      order.handling ||
      order.handlingType ||
      '';

    return (Array.isArray(data.items) ? data.items : []).flatMap((item: any, index: number) => {
      const handling = item.handlingType || item.handling || orderHandling;
      const { isOutside, isInternal } = classifyAssemblyHandling(handling, allHandlingOptions);
      if (!isOutside && !isInternal) return [];

      const description = String(item.description || item.name || 'Produto');
      const quantity = Number(item.quantity || item.qty || 1);
      const customerName = String(
        order.customerData?.fullName ||
          order.customerData?.name ||
          data.customerName ||
          row.customer_name ||
          'Cliente'
      ).trim();

      return [
        {
          id: `${order.id}-${index}-${normalizeLabel(handling)}`,
          origin: 'order' as const,
          title: formatAssemblyItemName(item),
          subtitle: `PEDIDO #${formatOrderCode(order)}`,
          customerName,
          orderIndex: order.orderIndex,
          date,
          createdAt: row.created_at || '',
          timeInfo: schedule,
          item: { ...item, description, quantity },
          items: [{ description, quantity }],
          status: order.status,
          deliveryMethod: order.shipping?.deliveryMethod,
          observation: shipping.deliveryAddress?.observation || order.observation || '',
          isOutside,
          pendingScheduling: Boolean(
            schedule.pendingScheduling ||
              schedule.notInformed ||
              data.pendingScheduling ||
              row.pending_scheduling
          ),
          fullData: order,
        },
      ];
    });
  });
};
