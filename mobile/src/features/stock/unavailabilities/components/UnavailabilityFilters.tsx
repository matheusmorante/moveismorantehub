import type React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { UnavailabilityProductKindFilter, UnavailabilityStatusFilter } from '../types';

interface Props {
  isDarkMode: boolean;
  statusFilter: UnavailabilityStatusFilter;
  productKindFilter: UnavailabilityProductKindFilter;
  onStatusChange: (status: UnavailabilityStatusFilter) => void;
  onProductKindChange: (kind: UnavailabilityProductKindFilter) => void;
}

const STATUS_OPTIONS: { key: UnavailabilityStatusFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Ativas' },
  { key: 'cancelled', label: 'Desfeitas' },
];

const KIND_OPTIONS: { key: UnavailabilityProductKindFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'normal', label: 'Normal' },
  { key: 'salvado', label: 'Salvados' },
  { key: 'usado', label: 'Usados' },
];

export const UnavailabilityFilters: React.FC<Props> = ({
  isDarkMode,
  statusFilter,
  productKindFilter,
  onStatusChange,
  onProductKindChange,
}) => {
  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
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

        <View style={styles.divider} />

        <View style={styles.group}>
          {KIND_OPTIONS.map((opt) => {
            const active = productKindFilter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => onProductKindChange(opt.key)}
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
  scroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 4,
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
