import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface Props {
  vehicles: string[];
  selectedVehicleId: string;
  onSelectVehicle: (vehicle: string) => void;
  isDarkMode?: boolean;
}

export const TransactionVehicleSelector: React.FC<Props> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  isDarkMode,
}) => {
  return (
    <View>
      <Text style={[styles.label, isDarkMode && styles.labelDark]}>Veículo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {vehicles.map(v => (
          <TouchableOpacity
            key={v}
            style={[styles.chip, selectedVehicleId === v && styles.chipActive]}
            onPress={() => onSelectVehicle(selectedVehicleId === v ? '' : v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selectedVehicleId === v && styles.chipTextActive]}>
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 10,
    marginBottom: 6,
  },
  labelDark: {
    color: '#cbd5e1',
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#3b82f6',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
  },
});
