import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './inventoryScreen.styles';

interface InventoryScreenPageHeaderProps {
  isDarkMode: boolean;
  periodDays: number;
  isOnline: boolean;
  usesCachedResults: boolean;
  onCyclePeriod: () => void;
}

export const InventoryScreenPageHeader: React.FC<InventoryScreenPageHeaderProps> = ({
  isDarkMode,
  periodDays,
  isOnline,
  usesCachedResults,
  onCyclePeriod,
}) => {
  const showOfflineDataNotice = !isOnline || usesCachedResults;

  return (
    <View
      style={[
        styles.pageHeader,
        showOfflineDataNotice && styles.pageHeaderOffline,
        isDarkMode && styles.pageHeaderDark,
      ]}
    >
      <View
        style={[
          styles.periodControls,
          showOfflineDataNotice && styles.periodControlsOffline,
        ]}
      >
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
      {showOfflineDataNotice && (
        <View style={[styles.offlineDataNotice, isDarkMode && styles.offlineDataNoticeDark]}>
          <Text style={[styles.offlineDataNoticeText, isDarkMode && styles.offlineDataNoticeTextDark]}>
            {!isOnline
              ? 'Sem conexão: os dados salvos no aparelho podem estar desatualizados.'
              : 'Exibindo dados salvos no aparelho; a lista pode estar desatualizada.'}
          </Text>
        </View>
      )}
    </View>
  );
};
