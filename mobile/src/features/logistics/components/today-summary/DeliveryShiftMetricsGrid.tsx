import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CloudSun, MapPin, Sun } from 'lucide-react-native';

interface DeliveryShiftMetricsGridProps {
  morningCount: number;
  afternoonCount: number;
  totalCount: number;
  isDarkMode?: boolean;
}

export const DeliveryShiftMetricsGrid: React.FC<DeliveryShiftMetricsGridProps> = ({
  morningCount,
  afternoonCount,
  totalCount,
  isDarkMode = false,
}) => {
  return (
    <View style={styles.metricsGrid}>
      <View
        style={[
          styles.metricCard,
          styles.metricCardMorning,
          isDarkMode && styles.metricCardMorningDark,
        ]}
      >
        <View style={styles.metricIconRow}>
          <Sun size={17} color={isDarkMode ? '#fdba74' : '#D97706'} />
          <Text style={[styles.metricNumber, { color: isDarkMode ? '#fdba74' : '#D97706' }]}>
            {morningCount}
          </Text>
        </View>
        <Text style={[styles.metricLabel, { color: isDarkMode ? '#fed7aa' : '#9a3412' }]}>Manhã</Text>
      </View>

      <View
        style={[
          styles.metricCard,
          styles.metricCardAfternoon,
          isDarkMode && styles.metricCardAfternoonDark,
        ]}
      >
        <View style={styles.metricIconRow}>
          <CloudSun size={17} color={isDarkMode ? '#facc15' : '#CA8A04'} />
          <Text style={[styles.metricNumber, { color: isDarkMode ? '#facc15' : '#CA8A04' }]}>
            {afternoonCount}
          </Text>
        </View>
        <Text style={[styles.metricLabel, { color: isDarkMode ? '#fde68a' : '#854d0e' }]}>Tarde</Text>
      </View>

      <View
        style={[
          styles.metricCard,
          styles.metricCardTotal,
          isDarkMode && styles.metricCardTotalDark,
        ]}
      >
        <View style={styles.metricIconRow}>
          <MapPin size={17} color={isDarkMode ? '#93c5fd' : '#2563EB'} />
          <Text style={[styles.metricNumber, { color: isDarkMode ? '#93c5fd' : '#2563EB' }]}>
            {totalCount}
          </Text>
        </View>
        <Text style={[styles.metricLabel, { color: isDarkMode ? '#bfdbfe' : '#1d4ed8' }]}>Total</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  metricCardMorning: { backgroundColor: '#FFF4E5' },
  metricCardMorningDark: { backgroundColor: '#3b2a16' },
  metricCardAfternoon: { backgroundColor: '#FFF8D8' },
  metricCardAfternoonDark: { backgroundColor: '#3b3215' },
  metricCardTotal: { backgroundColor: '#EAF2FF' },
  metricCardTotalDark: { backgroundColor: '#172554' },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricNumber: { fontSize: 21, fontWeight: '800' },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
