import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CloudSun, MapPin, Sun } from 'lucide-react-native';

interface DeliveryShiftMetricsGridProps {
  morningCount: number;
  afternoonCount: number;
  totalCount: number;
}

export const DeliveryShiftMetricsGrid: React.FC<DeliveryShiftMetricsGridProps> = ({
  morningCount,
  afternoonCount,
  totalCount,
}) => {
  return (
    <View style={styles.metricsGrid}>
      {/* Card Manhã */}
      <View style={styles.metricCard}>
        <View style={styles.metricIconRow}>
          <Sun size={20} color="#facc15" />
          <Text style={styles.metricNumber}>{morningCount}</Text>
        </View>
        <Text style={styles.metricLabel}>pela manhã</Text>
        <Text style={styles.metricTime}>08:00 – 12:00</Text>
      </View>

      {/* Card Tarde */}
      <View style={styles.metricCard}>
        <View style={styles.metricIconRow}>
          <CloudSun size={20} color="#facc15" />
          <Text style={styles.metricNumber}>{afternoonCount}</Text>
        </View>
        <Text style={styles.metricLabel}>à tarde</Text>
        <Text style={styles.metricTime}>13:00 – 18:00</Text>
      </View>

      {/* Card Total */}
      <View style={styles.metricCard}>
        <View style={styles.metricIconRow}>
          <MapPin size={20} color="#ffffff" />
          <Text style={styles.metricNumber}>{totalCount}</Text>
        </View>
        <Text style={styles.metricLabel}>total de</Text>
        <Text style={styles.metricSubLabel}>entregas</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    padding: 10,
    justifyContent: 'center',
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricNumber: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  metricSubLabel: {
    color: '#dbeafe',
    fontSize: 10,
  },
  metricTime: {
    color: '#dbeafe',
    fontSize: 9,
    marginTop: 2,
  },
});
