import { OrderDatabaseRow } from './orderMapperTypes';

export function mapOrderShipping(row: OrderDatabaseRow, rawLegacy: any) {
  // Frete e agendamento: as colunas normalizadas são a fonte principal.
  const legacyShipping =
    (row as any).shipping_data || (row as any).shipping || rawLegacy.shipping || {};
  const legacyScheduling = legacyShipping.scheduling || {};
  const normalizedStartTime = row.scheduled_start_time
    ? String(row.scheduled_start_time).trim().slice(0, 5)
    : '';
  const normalizedEndTime = row.scheduled_end_time
    ? String(row.scheduled_end_time).trim().slice(0, 5)
    : '';
  const hasScheduledTime = Boolean(
    normalizedStartTime ||
      normalizedEndTime ||
      legacyScheduling.startTime ||
      legacyScheduling.time ||
      legacyScheduling.endTime
  );
  const resolvedEndDate = legacyScheduling.endDate || '';
  const resolvedEndTime = normalizedEndTime || legacyScheduling.endTime || '';

  return {
    ...legacyShipping,
    deliveryMethod: row.delivery_method || legacyShipping.deliveryMethod || 'delivery',
    value: legacyShipping.value ?? 0,
    orderType: legacyShipping.orderType || 'Standard',
    scheduling: {
      ...legacyScheduling,
      date: row.scheduled_date || legacyScheduling.date || '',
      endDate: resolvedEndDate,
      dateType: legacyScheduling.dateType || (resolvedEndDate ? 'range' : 'fixed'),
      startTime: normalizedStartTime || legacyScheduling.startTime || legacyScheduling.time || '',
      endTime: resolvedEndTime,
      type: legacyScheduling.type || (resolvedEndTime ? 'range' : 'fixed'),
      // Um horário registrado não pode ser exibido como “não informado”.
      notInformed: hasScheduledTime ? false : (legacyScheduling.notInformed ?? false),
    },
  };
}
