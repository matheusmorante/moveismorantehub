import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { styles } from './nextDeliveryCard.styles';

interface Props {
  isDarkMode?: boolean;
}

export const NextDeliveryCompletedCard: React.FC<Props> = ({ isDarkMode = false }) => {
  return (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      <View style={styles.completedHeader}>
        <CheckCircle2 size={24} color="#10b981" />
        <Text style={[styles.completedTitle, isDarkMode && styles.textLight]}>
          Roteiro de Hoje Concluído!
        </Text>
      </View>
      <Text style={[styles.completedSubtitle, isDarkMode && styles.textMuted]}>
        Todas as entregas programadas para hoje foram finalizadas com sucesso.
      </Text>
    </View>
  );
};
