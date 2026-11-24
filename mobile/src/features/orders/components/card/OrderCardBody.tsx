import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, CalendarCheck, CheckCircle2, Clock, Link2, Truck, XCircle } from 'lucide-react-native';
import { formatOrderDate, formatOrderTotal, toTitleCase } from '../../../../utils/orderUtils';
import { OrderCardDeliveryFooter } from '../../../../components/cards/OrderCardDeliveryFooter';
import PickupIcon from '../../../../components/shared/PickupIcon';
import { OrderFiscalCancellationState } from '../../domain/types';
import { OrderCancellationFailureNotice } from './OrderCancellationFailureNotice';
import { getOrderStatusLabel } from '../../domain/orderStatusPresentation';
import { getStatusConfig } from './orderCardTheme';

export interface OrderCardBodyProps {
  order: any;
  dark: boolean;
  isReturn: boolean;
  pickup: boolean;
  pendingScheduling: boolean;
  scheduleDate?: string;
  scheduleEndDate?: string;
  scheduleDateType?: string;
  scheduleNotInformed?: boolean;
  appointments?: Array<{
    id?: string;
    deliveryMethod?: 'delivery' | 'pickup';
    scheduling?: {
      date?: string;
      endDate?: string;
      dateType?: string;
      time?: string;
      startTime?: string;
      endTime?: string;
      pendingScheduling?: boolean;
      notInformed?: boolean;
    };
  }>;
  deliveryMethod?: string;
  startTime?: string;
  endTime?: string;
  linkedOrderId?: string | null;
  linkedOrderCode?: string | null;
  fiscalCancellationState?: OrderFiscalCancellationState;
  onFilterByLinkedOrder?: (orderIdOrCode: string) => void;
  onDetails: () => void;
}

export const OrderCardBody: React.FC<OrderCardBodyProps> = ({
  order,
  dark,
  isReturn,
  pickup,
  pendingScheduling,
  scheduleDate,
  scheduleEndDate,
  scheduleDateType,
  scheduleNotInformed,
  appointments = [],
  deliveryMethod,
  startTime,
  endTime,
  linkedOrderId,
  linkedOrderCode,
  fiscalCancellationState,
  onFilterByLinkedOrder,
  onDetails,
}) => {
  const data = order?.order_data || {};
  const rawCustomer = data.customerData?.fullName || order?.customer_name || 'Cliente';
  const customerName = toTitleCase(rawCustomer);

  const isScheduledReturn =
    isReturn &&
    String(order?.status || data.status || '')
      .toLowerCase()
      .includes('sched');

  const formattedDeliveryDate = pendingScheduling
    ? 'AGENDAMENTO PENDENTE'
    : scheduleDateType === 'range' && scheduleEndDate
      ? `${formatOrderDate(scheduleDate)} até ${formatOrderDate(scheduleEndDate)}`
      : scheduleDate
        ? formatOrderDate(scheduleDate)
        : 'Não informada';
  const isSale = String(order?.order_type || order?.orderType || data.orderType || 'sale') === 'sale';
  const orderStatus = String(order?.status || data.status || 'scheduled').toLowerCase();
  const statusKey = ({
    completed: 'scheduled',
    agendado: 'scheduled',
    rascunho: 'draft',
    atendido: 'fulfilled',
    canceled: 'cancelled',
    cancelado: 'cancelled',
  } as Record<string, string>)[orderStatus] || orderStatus;
  const appointmentStatusConfig = getStatusConfig(statusKey);
  const statusFallback = statusKey === 'fulfilled'
    ? 'Atendido'
    : statusKey === 'scheduled'
      ? 'Agendado'
      : statusKey === 'draft'
        ? 'Rascunho'
        : statusKey === 'cancelled'
          ? 'Cancelado'
          : statusKey;
  const appointmentEntries = appointments.length
    ? appointments.map((appointment, index) => {
        const hasSingleOperationMethodMismatch = appointments.length === 1 && deliveryMethod &&
          appointment.deliveryMethod !== deliveryMethod;
        return {
          id: appointment.id || `appointment-${index + 1}`,
          deliveryMethod: hasSingleOperationMethodMismatch
            ? deliveryMethod
            : appointment.deliveryMethod || deliveryMethod || (pickup ? 'pickup' : 'delivery'),
          schedule: hasSingleOperationMethodMismatch ? {
            date: scheduleDate,
            endDate: scheduleEndDate,
            dateType: scheduleDateType,
            time: undefined,
            startTime,
            endTime,
            pendingScheduling,
            notInformed: scheduleNotInformed,
          } : appointment.scheduling || {
            date: scheduleDate,
            endDate: scheduleEndDate,
            dateType: scheduleDateType,
            time: undefined,
            startTime,
            endTime,
            pendingScheduling,
            notInformed: scheduleNotInformed,
          },
        };
      })
    : [{
        id: 'primary',
        deliveryMethod: deliveryMethod || (pickup ? 'pickup' : 'delivery'),
        schedule: {
          date: scheduleDate,
          endDate: scheduleEndDate,
          dateType: scheduleDateType,
          time: undefined,
          startTime,
          endTime,
          pendingScheduling,
          notInformed: scheduleNotInformed,
        },
      }];
  const hasScheduleInfo =
    appointments.length > 0 || Boolean(scheduleDate || pendingScheduling || scheduleNotInformed);

  return (
    <View style={styles.body}>
      {/* Nome do Cliente com Title Case (idêntico ao ERP) */}
      <Text style={[styles.customer, dark && styles.light]}>{customerName}</Text>

      {/* Alerta de Falha/Pendência de Cancelamento Fiscal (FISCAL-023) */}
      {Boolean(fiscalCancellationState) && (
        <OrderCancellationFailureNotice state={fiscalCancellationState} dark={dark} />
      )}

      {/* Aviso de Coleta Agendada para Devoluções (idêntico ao ERP) */}
      {isScheduledReturn && (
        <View
          style={[styles.returnCollectionNotice, dark && styles.returnCollectionNoticeDark]}
          accessibilityLabel="Status: Coleta agendada"
        >
          <CalendarCheck size={11} color="#b45309" />
          <Text style={styles.returnCollectionText}>COLETA AGENDADA</Text>
        </View>
      )}

      {/* Pedido vinculado interativo (replicado do ERP) */}
      {Boolean(linkedOrderId) && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={
            onFilterByLinkedOrder
              ? () => onFilterByLinkedOrder(linkedOrderCode || linkedOrderId!)
              : undefined
          }
          style={[styles.linkedOrderBadge, dark && styles.linkedOrderBadgeDark]}
        >
          <Link2 size={10} color="#2563eb" />
          <Text style={styles.linkedOrderText}>
            Pedido #{linkedOrderCode || linkedOrderId}
          </Text>
        </TouchableOpacity>
      )}

      {/* Datas: Pedido e Entrega/Retirada/Coleta (suporta ranges) */}
      <View style={styles.dates}>
        <View style={styles.column}>
          <Text style={styles.label}>PEDIDO</Text>
          <View style={styles.inline}>
            <Calendar size={13} color="#64748b" />
            <Text style={[styles.date, dark && styles.light]}>
              {formatOrderDate(order?.created_at)}
            </Text>
          </View>
        </View>
        <View style={[styles.column, isSale && styles.appointmentsColumn]}>
          {isSale ? (
            hasScheduleInfo && (
              <>
                <Text style={styles.label}>
                  {appointmentEntries.length > 1 ? 'AGENDAMENTOS' : 'AGENDAMENTO'}
                </Text>
                {appointmentEntries.map((entry) => {
                  const schedule = entry.schedule;
                  const isPending = Boolean(schedule.pendingScheduling);
                  const dateText = schedule.date
                    ? schedule.dateType === 'range' && schedule.endDate
                      ? `${formatOrderDate(schedule.date)} até ${formatOrderDate(schedule.endDate)}`
                      : formatOrderDate(schedule.date)
                    : '';
                  const timeText = schedule.startTime && schedule.endTime
                    ? `${schedule.startTime} às ${schedule.endTime}`
                    : schedule.startTime || schedule.time || '';
                  const entryPickup = entry.deliveryMethod === 'pickup';
                  const appointmentStatusLabel = getOrderStatusLabel(
                    {
                      ...order,
                      ...data,
                      status: statusKey,
                      shipping: { ...shipping, deliveryMethod: entry.deliveryMethod },
                    },
                    statusFallback
                  );
                  const appointmentStatusIcon = appointmentStatusConfig.icon === 'fulfilled'
                    ? <CheckCircle2 size={10} color="#ffffff" />
                    : appointmentStatusConfig.icon === 'scheduled'
                      ? <Calendar size={10} color="#ffffff" />
                      : appointmentStatusConfig.icon === 'cancelled'
                        ? <XCircle size={10} color="#ffffff" />
                        : <Clock size={10} color="#ffffff" />;

                  return (
                    <View key={entry.id} style={styles.appointmentRow}>
                      <View
                        style={[
                          styles.appointmentStatusBadge,
                          {
                            backgroundColor: appointmentStatusConfig.bg,
                            borderColor: appointmentStatusConfig.border,
                          },
                        ]}
                        accessibilityLabel={`Status: ${appointmentStatusLabel}`}
                      >
                        {appointmentStatusIcon}
                        <Text style={styles.appointmentStatusText}>{appointmentStatusLabel}</Text>
                      </View>
                      <View
                        style={[
                          styles.appointmentMethodBadge,
                          entryPickup ? styles.appointmentPickupBadge : styles.appointmentDeliveryBadge,
                          dark &&
                            (entryPickup
                              ? styles.appointmentPickupBadgeDark
                              : styles.appointmentDeliveryBadgeDark),
                        ]}
                      >
                        {entryPickup ? <PickupIcon size={12} color="#7c3aed" /> : <Truck size={12} color="#059669" />}
                        <Text
                          style={[
                            styles.appointmentMethod,
                            entryPickup
                              ? dark
                                ? styles.appointmentPickupTextDark
                                : styles.appointmentPickupText
                              : dark
                                ? styles.appointmentDeliveryTextDark
                                : styles.appointmentDeliveryText,
                          ]}
                        >
                          {entryPickup ? 'Retirada' : 'Entrega'}
                        </Text>
                      </View>
                      {isPending ? (
                        <Text style={[styles.appointmentPending, dark && styles.appointmentPendingDark]}>Falta definir</Text>
                      ) : dateText ? (
                        <View
                          style={[
                            styles.appointmentDateDetails,
                            dark && styles.appointmentDateDetailsDark,
                          ]}
                        >
                          <Calendar size={12} color={dark ? '#94a3b8' : '#64748b'} />
                          <Text style={[styles.appointmentDate, dark && styles.light]}>
                            {dateText}
                          </Text>
                        </View>
                      ) : appointments.length > 0 || schedule.notInformed ? (
                        <Text style={[styles.appointmentPending, dark && styles.appointmentPendingDark]}>Falta definir</Text>
                      ) : null}
                      {Boolean(timeText) && !isPending && (
                        <View style={[styles.appointmentTime, dark && styles.appointmentTimeDark]}>
                          <Clock size={12} color={dark ? '#94a3b8' : '#64748b'} />
                          <Text
                            style={[
                              styles.appointmentTimeText,
                              dark && styles.appointmentTimeTextDark,
                            ]}
                          >
                            {timeText}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )
          ) : (
            <>
              <Text style={styles.label}>
                {isReturn ? 'COLETA' : pickup ? 'RETIRADA' : 'ENTREGA'}
              </Text>
              <Text
                style={[
                  styles.date,
                  dark && styles.light,
                  pendingScheduling && styles.pendingSchedulingText,
                ]}
              >
                {formattedDeliveryDate}
              </Text>
              {Boolean(startTime) && (
                <View style={styles.time}>
                  <Clock size={12} color="#2563eb" />
                  <Text style={styles.timeText}>
                    {startTime}
                    {endTime ? ` ÀS ${endTime}` : ''}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {/* Total Financeiro */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.label}>{isReturn ? 'TOTAL DEVOLVIDO' : 'TOTAL'}</Text>
          <Text style={styles.total}>{formatOrderTotal(order)}</Text>
        </View>
      </View>

      {/* Rodapé Operacional de Entrega */}
      <OrderCardDeliveryFooter order={order} dark={dark} onPress={onDetails} />
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    padding: 15,
    gap: 11,
  },
  customer: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  light: {
    color: '#f8fafc',
  },
  returnCollectionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  returnCollectionNoticeDark: {
    backgroundColor: 'rgba(180, 83, 9, 0.15)',
    borderColor: '#78350f',
  },
  returnCollectionText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#b45309',
    letterSpacing: 0.5,
  },
  dates: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    gap: 4,
  },
  appointmentsColumn: {
    alignItems: 'flex-start',
  },
  appointmentRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  appointmentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 12,
  },
  appointmentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 12,
  },
  appointmentStatusText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  appointmentDeliveryBadge: {
    backgroundColor: '#ecfdf5',
    borderColor: '#d1fae5',
  },
  appointmentDeliveryBadgeDark: {
    backgroundColor: 'rgba(6, 78, 59, 0.3)',
    borderColor: '#065f46',
  },
  appointmentPickupBadge: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ede9fe',
  },
  appointmentPickupBadgeDark: {
    backgroundColor: 'rgba(76, 29, 149, 0.3)',
    borderColor: '#5b21b6',
  },
  appointmentMethod: {
    fontSize: 10,
    fontWeight: '700',
  },
  appointmentDeliveryText: {
    color: '#047857',
  },
  appointmentDeliveryTextDark: {
    color: '#6ee7b7',
  },
  appointmentPickupText: {
    color: '#6d28d9',
  },
  appointmentPickupTextDark: {
    color: '#c4b5fd',
  },
  appointmentDateDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  appointmentDateDetailsDark: {
    borderColor: '#475569',
    backgroundColor: '#1e293b',
  },
  appointmentDate: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  appointmentPending: {
    overflow: 'hidden',
    fontSize: 9,
    fontWeight: '800',
    color: '#a16207',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appointmentPendingDark: {
    color: '#fcd34d',
    backgroundColor: 'rgba(120, 53, 15, 0.3)',
    borderColor: '#92400e',
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  appointmentTimeDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  appointmentTimeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  appointmentTimeTextDark: {
    color: '#e2e8f0',
  },
  inline: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
  },
  date: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  time: {
    flexDirection: 'row',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 6,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563eb',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  total: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2563eb',
  },
  linkedOrderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  linkedOrderBadgeDark: {
    backgroundColor: 'rgba(30, 58, 138, 0.25)',
    borderColor: 'rgba(30, 64, 175, 0.4)',
  },
  linkedOrderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pendingSchedulingText: {
    color: '#ea580c',
    fontWeight: '900',
    fontSize: 11,
  },
});
