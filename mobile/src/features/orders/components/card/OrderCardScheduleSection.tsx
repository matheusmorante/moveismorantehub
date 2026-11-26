import React from 'react';
import { Text, View } from 'react-native';
import { Calendar, CheckCircle2, Clock, Truck, XCircle } from 'lucide-react-native';
import { formatOrderDate } from '../../../../utils/orderUtils';
import PickupIcon from '../../../../components/shared/PickupIcon';
import { getOrderStatusLabel } from '../../domain/orderStatusPresentation';
import { getStatusConfig } from './orderCardTheme';
import { orderCardBodyStyles as styles } from './orderCardBody.styles';

export interface OrderCardAppointment {
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
}

interface OrderCardScheduleSectionProps {
  order: any;
  dark: boolean;
  isReturn: boolean;
  pickup: boolean;
  pendingScheduling: boolean;
  scheduleDate?: string;
  scheduleEndDate?: string;
  scheduleDateType?: string;
  scheduleNotInformed?: boolean;
  appointments?: OrderCardAppointment[];
  deliveryMethod?: string;
  startTime?: string;
  endTime?: string;
}

const STATUS_KEY_MAP: Record<string, string> = {
  completed: 'scheduled',
  agendado: 'scheduled',
  rascunho: 'draft',
  atendido: 'fulfilled',
  canceled: 'cancelled',
  cancelado: 'cancelled',
};

const STATUS_FALLBACK_LABELS: Record<string, string> = {
  fulfilled: 'Atendido',
  scheduled: 'Agendado',
  draft: 'Rascunho',
  cancelled: 'Cancelado',
};

const renderAppointmentStatusIcon = (icon: string) => {
  if (icon === 'fulfilled') return <CheckCircle2 size={10} color="#ffffff" />;
  if (icon === 'scheduled') return <Calendar size={10} color="#ffffff" />;
  if (icon === 'cancelled') return <XCircle size={10} color="#ffffff" />;
  return <Clock size={10} color="#ffffff" />;
};

const formatDateOrRange = (date?: string, dateType?: string, endDate?: string) => {
  if (!date) return '';
  if (dateType === 'range' && endDate) {
    return `${formatOrderDate(date)} até ${formatOrderDate(endDate)}`;
  }
  return formatOrderDate(date);
};

export const OrderCardScheduleSection: React.FC<OrderCardScheduleSectionProps> = ({
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
}) => {
  const data = order?.order_data || {};
  const shipping = data.shipping || {};
  const orderType = String(order?.order_type || order?.orderType || data.orderType || 'sale').toLowerCase();
  const isAssistance = ['assistance', 'assistência', 'assistencia'].includes(orderType);
  const isSale = orderType === 'sale';
  const orderStatus = String(order?.status || data.status || 'scheduled').toLowerCase();
  const statusKey = STATUS_KEY_MAP[orderStatus] || orderStatus;
  const appointmentStatusConfig = getStatusConfig(statusKey);
  const statusFallback = STATUS_FALLBACK_LABELS[statusKey] || statusKey;

  const fallbackSchedule = {
    date: scheduleDate,
    endDate: scheduleEndDate,
    dateType: scheduleDateType,
    time: undefined,
    startTime,
    endTime,
    pendingScheduling,
    notInformed: scheduleNotInformed,
  };

  const appointmentEntries = appointments.length
    ? appointments.map((appointment, index) => {
        const hasSingleOperationMethodMismatch =
          appointments.length === 1 && deliveryMethod && appointment.deliveryMethod !== deliveryMethod;
        return {
          id: appointment.id || `appointment-${index + 1}`,
          deliveryMethod: hasSingleOperationMethodMismatch
            ? deliveryMethod
            : appointment.deliveryMethod || deliveryMethod || (pickup ? 'pickup' : 'delivery'),
          schedule: hasSingleOperationMethodMismatch
            ? fallbackSchedule
            : appointment.scheduling || fallbackSchedule,
        };
      })
    : [
        {
          id: 'primary',
          deliveryMethod: deliveryMethod || (pickup ? 'pickup' : 'delivery'),
          schedule: fallbackSchedule,
        },
      ];

  const hasScheduleInfo =
    appointments.length > 0 || Boolean(scheduleDate || pendingScheduling || scheduleNotInformed);

  const formattedDeliveryDate = pendingScheduling
    ? 'AGENDAMENTO PENDENTE'
    : formatDateOrRange(scheduleDate, scheduleDateType, scheduleEndDate) || 'Não informada';

  return (
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
                const dateText = formatDateOrRange(schedule.date, schedule.dateType, schedule.endDate);
                const timeText =
                  schedule.startTime && schedule.endTime
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
                      {renderAppointmentStatusIcon(appointmentStatusConfig.icon)}
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
                      {entryPickup ? (
                        <PickupIcon size={12} color="#7c3aed" />
                      ) : (
                        <Truck size={12} color="#059669" />
                      )}
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
                      <Text style={[styles.appointmentPending, dark && styles.appointmentPendingDark]}>
                        Falta definir
                      </Text>
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
                      <Text style={[styles.appointmentPending, dark && styles.appointmentPendingDark]}>
                        Falta definir
                      </Text>
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
              {isReturn ? 'COLETA' : isAssistance ? 'ASSISTÊNCIA' : pickup ? 'RETIRADA' : 'ENTREGA'}
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
  );
};
