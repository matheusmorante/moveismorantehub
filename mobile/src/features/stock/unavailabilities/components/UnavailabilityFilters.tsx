import type React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { UnavailabilityStatusFilter } from '../types';

interface Props {
  isDarkMode: boolean;
  statusFilter: UnavailabilityStatusFilter;
  totalCount: number;
  onStatusChange: (status: UnavailabilityStatusFilter) => void;
}

const STATUS_OPTIONS: { key: UnavailabilityStatusFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Ativas' },
  { key: 'cancelled', label: 'Desfeitas' },
];

export const UnavailabilityFilters: React.FC<Props> = ({
  isDarkMode,
  statusFilter,
  totalCount,
  onStatusChange,
}) => {
  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.row}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusScroll}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.group}>
            {STATUS_OPTIONS.map((opt) => {
              const active = statusFilter === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => onStatusChange(opt.key)}
                  style={[
                    styles.chip,
                    isDarkMode && styles.chipDark,
                    active && styles.chipActive,
                    active && isDarkMode && styles.chipActiveDark,
                  ]}
                  hitSlop={4}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isDarkMode && styles.chipTextDark,
                      active && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <Text style={[styles.countText, isDarkMode && styles.countTextDark]}>
          {totalCount} {totalCount === 1 ? 'registro' : 'registros'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  containerDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusScroll: {
    flex: 1,
    minWidth: 0,
  },
  scroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countText: {
    flexShrink: 0,
    fontSize: 11,
    color: '#64748b',
  },
  countTextDark: {
    color: '#94a3b8',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  chipDark: {
    backgroundColor: '#1e293b',
  },
  chipActive: {
    backgroundColor: '#dc2626',
  },
  chipActiveDark: {
    backgroundColor: '#dc2626',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  chipTextDark: {
    color: '#94a3b8',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
