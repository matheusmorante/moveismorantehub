import React from 'react';
import { Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { styles } from './deliveryRouteStep.styles';

interface DeliveryRouteBannerProps {
  startedAt: string;
  isDarkMode: boolean;
}

/**
 * Banner informativo que exibe o estado "Em Rota" e o horário de saída registrada.
 */
export const DeliveryRouteBanner: React.FC<DeliveryRouteBannerProps> = ({
  startedAt,
  isDarkMode,
}) => {
  const formattedStartedTime = startedAt
    ? new Date(startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <View style={[styles.routeBanner, isDarkMode && styles.routeBannerDark]}>
      <View style={styles.iconCircle}>
        <Text style={{ fontSize: 24 }}>🚚</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, isDarkMode && styles.textLight]}>Em Rota</Text>
        <View style={styles.timeRow}>
          <Clock size={12} color="#64748b" />
          <Text style={styles.bannerSubtitle}>Saída registrada às {formattedStartedTime}</Text>
        </View>
      </View>
    </View>
  );
};
