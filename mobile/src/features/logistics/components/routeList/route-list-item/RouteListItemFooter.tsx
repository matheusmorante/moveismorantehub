import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Navigation, Eye } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../../hooks/useDeliveryRoute';
import { styles } from './routeListItem.styles';

interface Props {
  item: DeliveryRouteItem;
  onOpenNav: () => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
}

export const RouteListItemFooter: React.FC<Props> = ({
  item,
  onOpenNav,
  onViewOrder,
  isDarkMode = false,
}) => {
  return (
    <View style={styles.footerRow}>
      <View style={styles.metricsGroup}>
        {item.periodLabel ? (
          <Text
            style={[
              styles.metricText,
              item.isFixedTime ? { color: '#d97706' } : { color: '#2563eb' },
            ]}
          >
            {item.periodLabel}
          </Text>
        ) : null}
        {item.distanceKm ? (
          <Text style={[styles.metricText, { color: '#64748b' }]}>• {item.distanceKm} km</Text>
        ) : null}
        {item.durationMin ? (
          <Text style={[styles.metricText, { color: '#64748b' }]}>• ~{item.durationMin} min</Text>
        ) : null}
        <Text style={[styles.metricText, { color: '#94a3b8' }]}>• {item.itemsCount} vol</Text>
      </View>

      <View style={styles.actionsGroup}>
        <TouchableOpacity
          style={[styles.smallActionBtn, isDarkMode && styles.smallActionBtnDark]}
          onPress={onOpenNav}
          activeOpacity={0.7}
          accessibilityLabel="Abrir navegação externa"
        >
          <Navigation size={14} color="#2563eb" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallActionBtn, isDarkMode && styles.smallActionBtnDark]}
          onPress={() => onViewOrder(item)}
          activeOpacity={0.7}
          accessibilityLabel="Ver detalhes do pedido"
        >
          <Eye size={14} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
