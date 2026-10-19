import React from 'react';
import { View, Text } from 'react-native';
import { Check, AlertTriangle } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../../hooks/useDeliveryRoute';
import { styles } from './routeListItem.styles';

interface Props {
  item: DeliveryRouteItem;
  isCompleted: boolean;
  isUnattended: boolean;
  isInProgress: boolean;
  isDarkMode?: boolean;
}

export const RouteListItemHeader: React.FC<Props> = ({
  item,
  isCompleted,
  isUnattended,
  isInProgress,
  isDarkMode = false,
}) => {
  return (
    <View style={styles.topRow}>
      <View style={styles.sequenceBadge}>
        {isCompleted ? (
          <Check size={13} color="#16a34a" strokeWidth={3} />
        ) : isUnattended ? (
          <AlertTriangle size={13} color="#dc2626" strokeWidth={3} />
        ) : (
          <Text style={styles.sequenceText}>{item.sequence}</Text>
        )}
      </View>

      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={[styles.customerName, isDarkMode && styles.textLight]} numberOfLines={1}>
          {item.customerName}
        </Text>
        {item.orderIndex ? (
          <Text style={[styles.orderIndex, isDarkMode && styles.textMuted]}>
            Pedido #{item.orderIndex}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.statusBadge,
          isCompleted && styles.statusCompleted,
          isUnattended && styles.statusUnattended,
          isInProgress && styles.statusProgress,
          !isCompleted && !isUnattended && !isInProgress && styles.statusPending,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            isCompleted && { color: '#16a34a' },
            isUnattended && { color: '#dc2626' },
            isInProgress && { color: '#2563eb' },
            !isCompleted && !isUnattended && !isInProgress && { color: '#64748b' },
          ]}
        >
          {isCompleted
            ? 'ENTREGUE'
            : isUnattended
              ? 'NÃO ATENDIDO'
              : isInProgress
                ? 'EM ROTA'
                : 'PENDENTE'}
        </Text>
      </View>
    </View>
  );
};
