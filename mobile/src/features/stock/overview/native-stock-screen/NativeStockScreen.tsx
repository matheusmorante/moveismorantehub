import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';

import { StockSummaryScreen } from '../StockSummaryScreen';
import { StockMovesScreen } from '../../moves';
import { InventoryScreen } from '../../inventory';
import { PurchasesScreen } from '../../purchases/PurchasesScreen';
import { InvoicesScreen } from '../../invoices';
import { ReceiptsScreen } from '../../receipts';
import { SuppliersScreen } from '../../suppliers/SuppliersScreen';
import { UnavailabilitiesScreen } from '../../unavailabilities';
import { STOCK_MODULES } from './nativeStockScreen.types';
import { styles } from './nativeStockScreen.styles';

interface Props {
  isDarkMode: boolean;
  userProfile?: any;
}

export const NativeStockScreen: React.FC<Props> = ({ isDarkMode, userProfile }) => {
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(null);
  const selectedModule =
    selectedModuleIndex === null ? null : STOCK_MODULES[selectedModuleIndex];
  const returnToMenu = () => setSelectedModuleIndex(null);

  const renderModuleHeader = () => (
    <View style={[styles.moduleHeader, isDarkMode && styles.moduleHeaderDark]}>
      <TouchableOpacity
        style={[styles.backButton, isDarkMode && styles.backButtonDark]}
        onPress={returnToMenu}
        accessibilityRole="button"
        accessibilityLabel="Voltar para o menu de Estoque"
      >
        <ArrowLeft size={18} color={isDarkMode ? '#f8fafc' : '#334155'} />
      </TouchableOpacity>
      <Text style={[styles.moduleTitle, isDarkMode && styles.textLight]} numberOfLines={1}>
        {selectedModule?.title}
      </Text>
    </View>
  );

  const renderSelectedModule = () => {
    switch (selectedModuleIndex) {
      case 0:
        return (
          <StockSummaryScreen
            isDarkMode={isDarkMode}
            renderHeader={renderModuleHeader}
            onNavigate={(index) => setSelectedModuleIndex(index)}
          />
        );
      case 1:
        return (
          <StockMovesScreen
            isDarkMode={isDarkMode}
            renderHeader={renderModuleHeader}
            onBack={returnToMenu}
          />
        );
      case 2:
        return (
          <InventoryScreen
            isDarkMode={isDarkMode}
            userProfile={userProfile}
            renderHeader={renderModuleHeader}
            onBack={returnToMenu}
          />
        );
      case 3:
        return (
          <PurchasesScreen
            isDarkMode={isDarkMode}
            renderHeader={renderModuleHeader}
            onBack={returnToMenu}
          />
        );
      case 4:
        return (
          <InvoicesScreen
            isDarkMode={isDarkMode}
            renderHeader={renderModuleHeader}
            onBack={returnToMenu}
          />
        );
      case 5:
        return (
          <ReceiptsScreen
            isDarkMode={isDarkMode}
            renderHeader={renderModuleHeader}
            onBack={returnToMenu}
          />
        );
      case 6:
        return (
          <SuppliersScreen
            isDarkMode={isDarkMode}
            renderHeader={renderModuleHeader}
            onBack={returnToMenu}
          />
        );
      case 7:
        return (
          <UnavailabilitiesScreen
            isDarkMode={isDarkMode}
            userProfile={userProfile}
            renderHeader={renderModuleHeader}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {selectedModuleIndex === null ? (
        <ScrollView contentContainerStyle={styles.menuContent}>
          <Text style={[styles.menuTitle, isDarkMode && styles.textLight]}>Estoque</Text>
          <Text style={[styles.menuSubtitle, isDarkMode && styles.textMutedDark]}>
            Escolha o módulo que deseja consultar.
          </Text>
          {STOCK_MODULES.map(({ key, title, description, Icon }, index) => (
            <TouchableOpacity
              key={key}
              testID={`stock-module-${key}`}
              onPress={() => setSelectedModuleIndex(index)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${title}`}
              style={[styles.menuCard, isDarkMode && styles.menuCardDark]}
            >
              <View style={[styles.iconBox, isDarkMode && styles.iconBoxDark]}>
                <Icon size={21} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
              </View>
              <View style={styles.menuCardText}>
                <Text style={[styles.menuCardTitle, isDarkMode && styles.textLight]}>
                  {title}
                </Text>
                <Text style={[styles.menuCardDescription, isDarkMode && styles.textMutedDark]}>
                  {description}
                </Text>
              </View>
              <ChevronRight size={19} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        renderSelectedModule()
      )}
    </View>
  );
};
