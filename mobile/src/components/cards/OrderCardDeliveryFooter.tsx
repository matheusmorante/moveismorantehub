import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Truck, MapPin, AlertTriangle, CheckCircle2, PackageCheck } from 'lucide-react-native';
import { getFulfillmentLabels } from '../../features/orders/domain/orderStatusPresentation';

interface Props {
  order: any;
  dark?: boolean;
  onPress?: () => void;
}

export const OrderCardDeliveryFooter: React.FC<Props> = ({ order, dark, onPress }) => {
  const data = order.order_data || order;
  const shipping = data.shipping || {};
  const status = String(order.status || data.status || '').toLowerCase();
  const pickup = /pickup|retirada/.test(
    String(shipping.deliveryMethod || data.deliveryMethod || '').toLowerCase()
  );

  const deliveryStatus = data.deliveryStatus;
  const isFulfilled =
    status === 'fulfilled' || status === 'atendido' || deliveryStatus === 'completed';
  const isInService = deliveryStatus === 'in_service' || Boolean(data.deliveryArrivedAt);
  const isInTransit =
    (deliveryStatus === 'in_progress' || Boolean(data.deliveryStartedAt)) && !isInService;
  const isUnattended = deliveryStatus === 'unattended';
  const isPreparing = deliveryStatus === 'preparing';
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isInTransit || isInService) {
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
  }, [isInTransit, isInService, shimmer]);

  if (pickup && !isFulfilled) return null;

  // Renderiza o resultado final e as etapas ativas da entrega.
  if (!isFulfilled && !isInService && !isInTransit && !isUnattended && !isPreparing) {
    return null;
  }

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 350],
  });

  let config = {
    label: 'EM ROTA',
    icon: <Truck size={14} color="#fff" />,
    bgColor: '#1d4ed8',
    subtext: 'A caminho do destino',
  };

  if (isInService) {
    config = {
      label: 'EM ATENDIMENTO',
      icon: <MapPin size={14} color="#fff" />,
      bgColor: '#15803d',
      subtext: 'No local do cliente',
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
      {(isInTransit || isInService) && (
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
