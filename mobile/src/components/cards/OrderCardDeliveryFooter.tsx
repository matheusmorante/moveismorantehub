import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Truck, MapPin, AlertTriangle, CheckCircle2, PackageCheck } from 'lucide-react-native';
import { getFulfillmentLabels } from '../../features/orders/domain/orderStatusPresentation';

const FULFILLED_ORDER_STATUSES = new Set([
  'fulfilled',
  'atendido',
  'delivered',
  'entregue',
  'retirado',
  'completed',
  'concluido',
  'concluído',
]);
const FULFILLED_DELIVERY_STATUSES = new Set(['completed', 'delivered', 'entregue', 'retirado']);
const ACTIVE_DELIVERY_STATUSES = new Set([
  'in_service',
  'arrived',
  'preparing',
  'unattended',
  ...FULFILLED_DELIVERY_STATUSES,
  'in_progress',
  'in_transit',
  'in-transit',
  'out_for_delivery',
  'out-for-delivery',
  'em_transito',
  'em_rota',
  'em rota',
  'em_entrega',
  'em entrega',
]);
const TRANSIT_DELIVERY_STATUSES = new Set([
  'in_progress',
  'in_transit',
  'in-transit',
  'out_for_delivery',
  'out-for-delivery',
  'em_transito',
  'em_rota',
  'em rota',
  'em_entrega',
  'em entrega',
]);

interface Props {
  order: any;
  dark?: boolean;
  onPress?: () => void;
  onlyActiveStages?: boolean;
}

export const OrderCardDeliveryFooter: React.FC<Props> = ({
  order,
  dark,
  onPress,
  onlyActiveStages = false,
}) => {
  const data = order.order_data || order;
  const shipping = data.shipping || {};
  const status = String(order.status || data.status || '').trim().toLowerCase();
  const legacyDeliveryStatus = data.deliveryStatus || order.delivery_status;
  const pickup =
    /pickup|retirada/.test(
      String(shipping.deliveryMethod || data.deliveryMethod || '').toLowerCase()
    ) ||
    /pickup|retirada/.test(
      String(order.task_type || data.taskType || order.taskType || '').toLowerCase()
    );

  const deliveryStatus = String(
    data.deliveryStatus || order.deliveryStatus || order.delivery_status || ''
  )
    .trim()
    .toLowerCase();
  const isAgendaFulfilled =
    FULFILLED_ORDER_STATUSES.has(status) ||
    FULFILLED_DELIVERY_STATUSES.has(deliveryStatus) ||
    Boolean(data.deliveryFinishedAt || order.deliveryFinishedAt || order.delivery_finished_at);
  const canUseAgendaTimestamps = !ACTIVE_DELIVERY_STATUSES.has(deliveryStatus);
  const agendaStage = (() => {
    if (isAgendaFulfilled || pickup) return null;
    if (deliveryStatus === 'in_service') return 'service';
    if (deliveryStatus === 'arrived') return 'arrival';
    if (deliveryStatus === 'preparing') return 'preparing';
    if (TRANSIT_DELIVERY_STATUSES.has(deliveryStatus)) return 'transit';
    if (deliveryStatus === 'unattended') return 'unattended';
    if (!canUseAgendaTimestamps) return null;
    if (data.deliveryServiceStartedAt || order.deliveryServiceStartedAt) return 'service';
    if (data.deliveryArrivedAt || order.deliveryArrivedAt) return 'arrival';
    if (data.deliveryStartedAt || order.deliveryStartedAt) return 'transit';
    if (data.deliveryPreparationStartedAt || order.deliveryPreparationStartedAt) return 'preparing';
    return null;
  })();

  // A Agenda mostra somente etapas ativas; as demais telas mantêm o rodapé original.
  const isFulfilled = onlyActiveStages
    ? isAgendaFulfilled
    : ['fulfilled', 'atendido', 'delivered', 'entregue', 'retirado'].includes(status) ||
      legacyDeliveryStatus === 'completed';
  const isInService = onlyActiveStages
    ? agendaStage === 'service'
    : !isFulfilled &&
      (legacyDeliveryStatus === 'in_service' || Boolean(data.deliveryServiceStartedAt));
  const isInArrival = onlyActiveStages
    ? agendaStage === 'arrival'
    : !isFulfilled &&
      (legacyDeliveryStatus === 'arrived' || Boolean(data.deliveryArrivedAt)) &&
      !isInService;
  const isInTransit = onlyActiveStages
    ? agendaStage === 'transit'
    : !isFulfilled &&
      (legacyDeliveryStatus === 'in_progress' || Boolean(data.deliveryStartedAt)) &&
      !isInArrival &&
      !isInService;
  const isUnattended = onlyActiveStages
    ? agendaStage === 'unattended'
    : legacyDeliveryStatus === 'unattended';
  const isPreparing = onlyActiveStages
    ? agendaStage === 'preparing'
    : legacyDeliveryStatus === 'preparing';
  const shouldShowActiveStage = !pickup && (isInTransit || isInService || isPreparing);
  const shouldAnimate = isInTransit || isInService || (onlyActiveStages && isPreparing);
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shouldAnimate) {
      const loop = Animated.loop(
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: false,
        })
      );
      loop.start();
      return () => loop.stop();
    }
  }, [shouldAnimate, shimmer]);

  if (onlyActiveStages && !shouldShowActiveStage) return null;

  if (pickup && !isFulfilled) return null;

  // Renderiza o resultado final e as etapas ativas da entrega.
  if (
    !isFulfilled &&
    !isInService &&
    !isInArrival &&
    !isInTransit &&
    !isUnattended &&
    !isPreparing
  ) {
    return null;
  }

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 350],
  });

  let config = {
    label: 'DESLOCAMENTO',
    icon: <Truck size={14} color="#fff" />,
    bgColor: '#f97316',
    subtext: 'A caminho do destino',
  };

  if (isInService) {
    config = {
      label: 'EM ATENDIMENTO',
      icon: <MapPin size={14} color="#fff" />,
      bgColor: '#2563eb',
      subtext: 'No local do cliente',
    };
  } else if (isInArrival) {
    config = {
      label: 'CHEGADA NO LOCAL',
      icon: <MapPin size={14} color="#fff" />,
      bgColor: '#0284c7',
      subtext: 'Equipe no endereço do cliente',
    };
  } else if (isUnattended) {
    config = {
      label: 'NÃO ATENDIDO',
      icon: <AlertTriangle size={14} color="#fff" />,
      bgColor: '#dc2626',
      subtext: data.unattendedReason
        ? `Motivo: ${data.unattendedReason}`
        : 'Cliente ausente / Pendência',
    };
  } else if (isFulfilled) {
    const fulfillmentStatus = getFulfillmentLabels(order).status;
    const fulfillmentSuccessMessage = getFulfillmentLabels(order).successMessage;
    config = {
      label: fulfillmentStatus.toLocaleUpperCase('pt-BR'),
      icon: <CheckCircle2 size={14} color="#fff" />,
      bgColor: '#059669',
      subtext: fulfillmentSuccessMessage,
    };
  } else if (isPreparing) {
    config = {
      label: 'EM PREPARAÇÃO',
      icon: <PackageCheck size={14} color="#fff" />,
      bgColor: '#d97706',
      subtext: 'Conferindo mercadorias para saída',
    };
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={[styles.container, { backgroundColor: config.bgColor }]}
    >
      {shouldAnimate && (
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, overflow: 'hidden', borderRadius: 12 }}>
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 120,
                backgroundColor: 'rgba(255,255,255,0.22)',
                transform: [{ translateX }],
              }}
            />
          </View>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.left}>
          {config.icon}
          <Text style={styles.label}>{config.label}</Text>
        </View>
        <Text style={styles.subtext}>{config.subtext}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'right',
  },
});
