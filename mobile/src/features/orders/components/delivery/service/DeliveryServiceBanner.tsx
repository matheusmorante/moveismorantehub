import React from 'react';
import { Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { styles } from './deliveryServiceStep.styles';

interface DeliveryServiceBannerProps {
  arrivedAt: string;
  isDarkMode: boolean;
}

/**
 * Banner informativo que exibe o estado "No Local • Em Atendimento" e horário de chegada.
 */
export const DeliveryServiceBanner: React.FC<DeliveryServiceBannerProps> = ({
  arrivedAt,
  isDarkMode,
}) => {
  const formattedArrivalTime = arrivedAt
    ? new Date(arrivedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <View style={[styles.serviceBanner, isDarkMode && styles.serviceBannerDark]}>
      <View style={styles.iconCircle}>
        <Text style={{ fontSize: 24 }}>📍</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, isDarkMode && styles.textLight]}>
          No Local • Em Atendimento
        </Text>
        <View style={styles.timeRow}>
          <Clock size={12} color="#64748b" />
          <Text style={styles.bannerSubtitle}>Chegada registrada às {formattedArrivalTime}</Text>
        </View>
      </View>
    </View>
  );
};
