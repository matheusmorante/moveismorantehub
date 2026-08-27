import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Play, Truck, MapPin } from 'lucide-react-native';

interface Props {
  order: any;
  onStart?: () => void;
  onViewDelivery?: () => void;
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
    outputRange: [-200, 400],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.statusButton, { backgroundColor: bgColor }]}
      activeOpacity={0.85}
    >
      {/* Shimmer sweep */}
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, overflow: 'hidden', borderRadius: 16 }}>
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 200,
              backgroundColor: 'rgba(255,255,255,0.18)',
              transform: [{ translateX }],
            }}
          />
        </View>
      </View>
      {icon}
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

export function OrderDeliveryStartFooter({ order, onStart, onViewDelivery }: Props) {
  const data = order.order_data || order;
  const shipping = data.shipping || {};
  const status = String(order.status || data.status || '').toLowerCase();
  const pickup = /pickup|retirada/.test(String(shipping.deliveryMethod || data.deliveryMethod || '').toLowerCase());
  const deliveryStatus = data.deliveryStatus;
  const isFulfilled = status === 'fulfilled' || status === 'atendido';
  const isScheduled = /agendad|scheduled/.test(status);

  if (pickup || isFulfilled || !isScheduled) return null;

  const isInService = deliveryStatus === 'in_service' || Boolean(data.deliveryArrivedAt);
  const isInTransit = (deliveryStatus === 'in_progress' || Boolean(data.deliveryStartedAt)) && !isInService;

  // Em Atendimento → Botão 'EM ATENDIMENTO'
  if (isInService && onViewDelivery) {
    return (
      <AnimatedDeliveryStatusButton
        label="EM ATENDIMENTO"
        icon={<MapPin size={18} color="#fff" />}
        bgColor="#15803d"
        onPress={onViewDelivery}
      />
    );
  }

  // Em Rota → Botão 'EM ROTA'
  if (isInTransit && onViewDelivery) {
    return (
      <AnimatedDeliveryStatusButton
        label="EM ROTA"
        icon={<Truck size={18} color="#fff" />}
        bgColor="#1d4ed8"
        onPress={onViewDelivery}
      />
    );
  }

  // Não iniciado → Botão 'INICIAR ENTREGA'
  if (onStart) {
    return (
      <TouchableOpacity onPress={onStart} style={styles.startButton} activeOpacity={0.85}>
        <Play size={18} color="#fff" fill="#fff" />
        <Text style={styles.text}>INICIAR ENTREGA</Text>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  startButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
  },
  statusButton: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
