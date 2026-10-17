import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Play, Eye } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { styles } from './nextDeliveryCard.styles';

interface Props {
  isInProgress: boolean;
  activeItem: DeliveryRouteItem;
  onStartAndNavigate: () => void;
  onOpenNavigation: () => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
}

export const NextDeliveryCardActions: React.FC<Props> = ({
  isInProgress,
  activeItem,
  onStartAndNavigate,
  onOpenNavigation,
  onViewOrder,
  isDarkMode = false,
}) => {
  return (
    <View style={styles.actionsContainer}>
      <TouchableOpacity
        style={[styles.primaryActionBtnFull, { backgroundColor: '#2563eb' }]}
        onPress={isInProgress ? onOpenNavigation : onStartAndNavigate}
        activeOpacity={0.85}
      >
        <Play size={18} color="#ffffff" fill="#ffffff" />
        <Text style={styles.primaryActionText}>
          {isInProgress ? 'CONTINUAR ETAPAS DA ENTREGA' : 'INICIAR ETAPAS DA ENTREGA'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.compactSecondaryBtn, isDarkMode && styles.compactSecondaryBtnDark]}
        onPress={() => onViewOrder(activeItem)}
        activeOpacity={0.85}
      >
        <Eye size={13} color={isDarkMode ? '#94a3b8' : '#64748b'} />
        <Text style={[styles.compactSecondaryText, isDarkMode && styles.textMuted]}>
          Detalhes do pedido
        </Text>
      </TouchableOpacity>
    </View>
  );
};
