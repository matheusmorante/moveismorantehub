import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ClipboardList } from 'lucide-react-native';
import { styles } from './inventoryScreen.styles';

interface InventoryScreenPageHeaderProps {
  isDarkMode: boolean;
  periodDays: number;
  onCyclePeriod: () => void;
  onStartNewInventory: () => void;
}

export const InventoryScreenPageHeader: React.FC<InventoryScreenPageHeaderProps> = ({
  isDarkMode,
  periodDays,
  onCyclePeriod,
  onStartNewInventory,
}) => {
  return (
    <View style={[styles.pageHeader, isDarkMode && styles.pageHeaderDark]}>
      <View style={styles.periodControls}>
        <Text style={[styles.periodLabel, isDarkMode && styles.periodLabelDark]}>Período</Text>
        <TouchableOpacity
          style={[styles.periodButton, isDarkMode && styles.periodButtonDark]}
          onPress={onCyclePeriod}
        >
          <Text style={[styles.periodButtonText, isDarkMode && styles.periodButtonTextDark]}>
            {periodDays === 30
              ? 'Últimos 30 dias'
              : periodDays === 90
                ? 'Últimos 90 dias'
                : periodDays === 365
                  ? 'Último ano'
                  : 'Todos os períodos'}
          </Text>
          <Text style={[styles.periodButtonText, isDarkMode && styles.periodButtonTextDark]}>
            ⌄
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        testID="new-inventory-btn"
        style={styles.startBtn}
        onPress={onStartNewInventory}
      >
        <ClipboardList size={18} color="#ffffff" />
        <Text style={styles.startBtnText}>Novo Inventário</Text>
      </TouchableOpacity>
    </View>
  );
};
