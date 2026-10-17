import React from 'react';
import { View, Text } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { classifyDeliveryService } from '../../domain/deliveryServiceClassification';
import { NextDeliveryCardProps } from './next-delivery-card/nextDeliveryCard.types';
import { styles } from './next-delivery-card/nextDeliveryCard.styles';
import { NextDeliveryCompletedCard } from './next-delivery-card/NextDeliveryCompletedCard';
import { NextDeliveryCardHeader } from './next-delivery-card/NextDeliveryCardHeader';
import { NextDeliveryCardBadges } from './next-delivery-card/NextDeliveryCardBadges';
import { NextDeliveryCardMetrics } from './next-delivery-card/NextDeliveryCardMetrics';
import { NextDeliveryCardActions } from './next-delivery-card/NextDeliveryCardActions';

export type { NextDeliveryCardProps };

/**
 * Card de entrega atual / próxima parada no mapa operacional de rotas.
 * Composição modular que segue os princípios de SRP e DRY.
 */
export const NextDeliveryCard: React.FC<NextDeliveryCardProps> = ({
  currentDelivery,
  nextDelivery,
  selectedDelivery,
  allCompleted,
  onCloseCard,
  onStartDelivery,
  onViewOrder,
  isDarkMode = false,
}) => {
  if (allCompleted) {
    return <NextDeliveryCompletedCard isDarkMode={isDarkMode} />;
  }

  const activeItem = selectedDelivery || currentDelivery || nextDelivery;
  if (!activeItem) return null;

  const isInProgress = activeItem.isCurrent;
  const classification = classifyDeliveryService(activeItem.order);

  return (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      {/* 1. Header com Badge Superior e Botão de Fechar */}
      <NextDeliveryCardHeader
        isInProgress={isInProgress}
        orderIndex={activeItem.orderIndex}
        onCloseCard={onCloseCard}
        isDarkMode={isDarkMode}
      />

      {/* 2. Badges de Tipo de Serviço & Montagem */}
      <NextDeliveryCardBadges classification={classification} />

      {/* 3. Cliente & Endereço */}
      <Text style={[styles.customerName, isDarkMode && styles.textLight]} numberOfLines={2}>
        {activeItem.customerName}
      </Text>

      <View style={styles.addressRow}>
        <MapPin size={13} color="#ef4444" style={{ marginTop: 2 }} />
        <Text style={[styles.addressText, isDarkMode && styles.textMuted]} numberOfLines={2}>
          {activeItem.fullAddress}
        </Text>
      </View>

      {/* 4. Métricas de Janela, Distância, Duração e Volumes */}
      <NextDeliveryCardMetrics activeItem={activeItem} />

      {/* 5. Ações Operacionais */}
      <NextDeliveryCardActions
        isInProgress={isInProgress}
        activeItem={activeItem}
        onStartAndNavigate={() => onStartDelivery(activeItem)}
        onOpenNavigation={() => onViewOrder(activeItem)}
        onViewOrder={onViewOrder}
        isDarkMode={isDarkMode}
      />
    </View>
  );
};
