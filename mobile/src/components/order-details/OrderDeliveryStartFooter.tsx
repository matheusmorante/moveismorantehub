import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Play, Route } from 'lucide-react-native';

export interface OrderDeliveryStartFooterOrder {
  status?: string;
  deliveryStatus?: string;
  delivery_status?: string;
  order_data?: {
    status?: string;
    deliveryStatus?: string;
    deliveryPreparationStartedAt?: string | null;
    deliveryStartedAt?: string | null;
    deliveryArrivedAt?: string | null;
    deliveryServiceStartedAt?: string | null;
    deliveryMethod?: string;
    shipping?: {
      deliveryMethod?: string;
    };
  };
  shipping?: {
    deliveryMethod?: string;
  };
  deliveryMethod?: string;
  deliveryPreparationStartedAt?: string | null;
  deliveryStartedAt?: string | null;
  deliveryArrivedAt?: string | null;
  deliveryServiceStartedAt?: string | null;
}

export interface OrderDeliveryStartFooterProps {
  order: OrderDeliveryStartFooterOrder;
  onStart?: () => void;
  onViewDelivery?: () => void;
  allowed?: boolean;
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
  const deliveryStatus = data.deliveryStatus || order.deliveryStatus || order.delivery_status;

  const isFulfilled = status === 'fulfilled' || status === 'atendido';
  const isScheduled = /agendad|scheduled/.test(status);

  if (!allowed || pickup || isFulfilled || !isScheduled) return null;

  const isInService =
    deliveryStatus === 'in_service' ||
    Boolean(data.deliveryServiceStartedAt || order.deliveryServiceStartedAt);
  const isInArrival =
    (deliveryStatus === 'arrived' ||
      Boolean(data.deliveryArrivedAt || order.deliveryArrivedAt)) &&
    !isInService;
  const isInTransit =
    (deliveryStatus === 'in_progress' ||
      Boolean(data.deliveryStartedAt || order.deliveryStartedAt)) &&
    !isInArrival &&
    !isInService;
  const isPreparationStarted =
    deliveryStatus === 'preparing' ||
    Boolean(data.deliveryPreparationStartedAt || order.deliveryPreparationStartedAt);

  // Qualquer etapa iniciada reabre a operação no ponto em que foi interrompida.
  const hasStartedOperation =
    isPreparationStarted || isInTransit || isInArrival || isInService;
  if (hasStartedOperation) {
    if (!onViewDelivery) return null;

    return (
      <AnimatedDeliveryStatusButton
        label="Retomar Operação"
        icon={<Play size={18} color="#fff" fill="#fff" strokeWidth={1.5} />}
        bgColor="#2563eb"
        onPress={onViewDelivery}
      />
    );
  }

  // Não iniciado → Botão 'Iniciar fluxo operacional'
  if (onStart) {
    return (
      <TouchableOpacity
        onPress={onStart}
        style={[styles.baseButton, styles.startButton]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Iniciar fluxo operacional"
      >
        <Route size={36} color="#ffffff" strokeWidth={2} />
        <Text style={styles.text}>Iniciar fluxo operacional</Text>
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
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
