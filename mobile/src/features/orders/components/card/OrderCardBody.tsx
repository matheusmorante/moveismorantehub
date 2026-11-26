import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { CalendarCheck, Link2 } from 'lucide-react-native';
import { formatOrderTotal, toTitleCase } from '../../../../utils/orderUtils';
import { OrderCardDeliveryFooter } from '../../../../components/cards/OrderCardDeliveryFooter';
import { OrderFiscalCancellationState } from '../../domain/types';
import { OrderCancellationFailureNotice } from './OrderCancellationFailureNotice';
import { orderCardBodyStyles as styles } from './orderCardBody.styles';
import {
  OrderCardScheduleSection,
  type OrderCardAppointment,
} from './OrderCardScheduleSection';

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
  appointments?: OrderCardAppointment[];
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
      <OrderCardScheduleSection
        order={order}
        dark={dark}
        isReturn={isReturn}
        pickup={pickup}
        pendingScheduling={pendingScheduling}
        scheduleDate={scheduleDate}
        scheduleEndDate={scheduleEndDate}
        scheduleDateType={scheduleDateType}
        scheduleNotInformed={scheduleNotInformed}
        appointments={appointments}
        deliveryMethod={deliveryMethod}
        startTime={startTime}
        endTime={endTime}
      />

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
