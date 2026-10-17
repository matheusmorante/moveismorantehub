import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { styles } from './nextDeliveryCard.styles';

interface Props {
  isInProgress: boolean;
  orderIndex?: string;
  onCloseCard?: () => void;
  isDarkMode?: boolean;
}

export const NextDeliveryCardHeader: React.FC<Props> = ({
  isInProgress,
  orderIndex,
  onCloseCard,
  isDarkMode = false,
}) => {
  return (
    <View style={styles.headerRow}>
      {isInProgress ? (
        <View style={[styles.badge, styles.badgeProgress]}>
          <Text style={[styles.badgeText, styles.badgeTextProgress]}>EM ANDAMENTO</Text>
        </View>
      ) : (
        <View />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {orderIndex ? (
          <Text style={[styles.orderIndexText, isDarkMode && styles.textMuted]}>
            Pedido #{orderIndex}
          </Text>
        ) : null}

        {onCloseCard && (
          <TouchableOpacity
            onPress={onCloseCard}
            style={[styles.closeCardBtn, isDarkMode && styles.closeCardBtnDark]}
            activeOpacity={0.7}
            accessibilityLabel="Fechar card da parada"
          >
            <X size={15} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
