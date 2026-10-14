import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, CalendarCheck, Clock, Link2 } from 'lucide-react-native';
import { formatOrderDate, formatOrderTotal, toTitleCase } from '../../../../utils/orderUtils';
import { OrderCardDeliveryFooter } from '../../../../components/cards/OrderCardDeliveryFooter';
import { OrderFiscalCancellationState } from '../../domain/types';
import { OrderCancellationFailureNotice } from './OrderCancellationFailureNotice';

export interface OrderCardBodyProps {
  order: any;
  dark: boolean;
  isReturn: boolean;
  pickup: boolean;
  pendingScheduling: boolean;
  scheduleDate?: string;
  scheduleEndDate?: string;
  scheduleDateType?: string;
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
        <View style={styles.column}>
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
        </View>
      </View>

      {/* Horário Agendado */}
      {Boolean(startTime) && (
        <View style={styles.time}>
          <Clock size={12} color="#2563eb" />
          <Text style={styles.timeText}>
            {startTime}
            {endTime ? ` ÀS ${endTime}` : ''}
          </Text>
        </View>
      )}

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
