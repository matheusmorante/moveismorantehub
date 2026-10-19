import React from 'react';
import { View, Text } from 'react-native';
import { Navigation, Clock, Package } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../../hooks/useDeliveryRoute';
import { styles } from './nextDeliveryCard.styles';

interface Props {
  activeItem: DeliveryRouteItem;
}

export const NextDeliveryCardMetrics: React.FC<Props> = ({ activeItem }) => {
  return (
    <View style={styles.metricsRow}>
      {activeItem.periodLabel ? (
        <View
          style={[
            styles.metricPill,
            activeItem.isFixedTime ? { backgroundColor: '#fffbeb' } : null,
          ]}
        >
          <Clock size={11} color={activeItem.isFixedTime ? '#d97706' : '#2563eb'} />
          <Text style={[styles.metricText, activeItem.isFixedTime ? { color: '#d97706' } : null]}>
            {activeItem.periodLabel}
          </Text>
        </View>
      ) : null}

      {activeItem.distanceKm ? (
        <View style={styles.metricPill}>
          <Navigation size={11} color="#2563eb" />
          <Text style={styles.metricText}>{activeItem.distanceKm} km</Text>
        </View>
      ) : null}

      {activeItem.durationMin ? (
        <View style={styles.metricPill}>
          <Clock size={11} color="#64748b" />
          <Text style={[styles.metricText, { color: '#64748b' }]}>
            ~{activeItem.durationMin} min
          </Text>
        </View>
      ) : null}

      <View style={styles.metricPill}>
        <Package size={11} color="#64748b" />
        <Text style={[styles.metricText, { color: '#64748b' }]}>
          {activeItem.itemsCount} {activeItem.itemsCount === 1 ? 'item' : 'itens'}
        </Text>
      </View>
    </View>
  );
};
