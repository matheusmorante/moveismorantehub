import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Truck, MapPin } from 'lucide-react-native';
import { DeliveryFlowIcon } from '../shared/DeliveryFlowIcon';

export interface OrderDeliveryStartFooterOrder {
  status?: string;
  deliveryStatus?: string;
  order_data?: {
    status?: string;
    deliveryStatus?: string;
    deliveryStartedAt?: string | null;
    deliveryArrivedAt?: string | null;
    deliveryMethod?: string;
    shipping?: {
      deliveryMethod?: string;
    };
  };
  shipping?: {
    deliveryMethod?: string;
  };
  deliveryMethod?: string;
  deliveryStartedAt?: string | null;
  deliveryArrivedAt?: string | null;
}

export interface OrderDeliveryStartFooterProps {
  order: OrderDeliveryStartFooterOrder;
  onStart?: () => void;
  onViewDelivery?: () => void;
  allowed?: boolean;
}

interface ActiveDeliveryStatusConfig {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
}

function resolveActiveDeliveryStatusConfig(
  isInService: boolean,
  isInTransit: boolean
): ActiveDeliveryStatusConfig | null {
  if (isInService) {
    return {
      label: 'EM ATENDIMENTO',
      icon: <MapPin size={18} color="#fff" />,
      bgColor: '#15803d',
    };
  }
  if (isInTransit) {
    return {
      label: 'EM ROTA',
      icon: <Truck size={18} color="#fff" />,
      bgColor: '#1d4ed8',
    };
  }
  return null;
}

function AnimatedDeliveryStatusButton({
  label,
  icon,
  bgColor,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  onPress: () => void;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 350],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.baseButton, styles.statusButton, { backgroundColor: bgColor }]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {/* Shimmer sweep */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.shimmerContainer}>
          <Animated.View
            style={[
              styles.shimmerBar,
              {
                transform: [{ translateX }],
              },
            ]}
          />
        </View>
      </View>
      {icon}
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

export function OrderDeliveryStartFooter({
  order,
  onStart,
  onViewDelivery,
  allowed = true,
}: OrderDeliveryStartFooterProps) {
  const data = order.order_data || order;
  const shipping = data.shipping || {};
  const status = String(order.status || data.status || '').toLowerCase();
  const pickup = /pickup|retirada/.test(
    String(shipping.deliveryMethod || data.deliveryMethod || '').toLowerCase()
  );
  const deliveryStatus = data.deliveryStatus;

  const isFulfilled = status === 'fulfilled' || status === 'atendido';
  const isScheduled = /agendad|scheduled/.test(status);

  if (!allowed || pickup || isFulfilled || !isScheduled) return null;

  const isInService = deliveryStatus === 'in_service' || Boolean(data.deliveryArrivedAt);
  const isInTransit =
    (deliveryStatus === 'in_progress' || Boolean(data.deliveryStartedAt)) && !isInService;

  // Botões de status em andamento: Em Atendimento ou Em Rota
  if (onViewDelivery) {
    const statusConfig = resolveActiveDeliveryStatusConfig(isInService, isInTransit);
    if (statusConfig) {
      return (
        <AnimatedDeliveryStatusButton
          label={statusConfig.label}
          icon={statusConfig.icon}
          bgColor={statusConfig.bgColor}
          onPress={onViewDelivery}
        />
      );
    }
  }

  // Não iniciado → Botão 'Iniciar fluxo de entrega'
  if (onStart) {
    return (
      <TouchableOpacity
        onPress={onStart}
        style={[styles.baseButton, styles.startButton]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Iniciar fluxo de entrega"
      >
        <DeliveryFlowIcon size={36} color="#ffffff" />
        <Text style={styles.text}>Iniciar fluxo de entrega</Text>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  baseButton: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
  },
  startButton: {
    backgroundColor: '#16a34a',
  },
  statusButton: {
    overflow: 'hidden',
  },
  shimmerContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 16,
  },
  shimmerBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 200,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
