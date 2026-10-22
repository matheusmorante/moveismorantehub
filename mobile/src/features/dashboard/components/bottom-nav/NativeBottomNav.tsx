import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import { NavItemConfig, NativeBottomNavProps } from './bottomNav.types';
import { useNativeBottomNav } from './useNativeBottomNav';
import { BottomNavTabItem } from './BottomNavTabItem';
import { BottomNavMoreSheet } from './BottomNavMoreSheet';
import { styles } from './bottomNav.styles';

export type { NavItemConfig };

/**
 * Barra de Navegação Inferior Nativa do Aplicativo Mobile.
 * Refatorada sob os princípios de Clean Architecture, Single Responsibility (SRP) e High Cohesion.
 * - Gerenciamento de abas e overflow: useNativeBottomNav
 * - Item de aba primária: BottomNavTabItem (com suporte ao Agente Lizandro e badge BETA)
 * - Menu excedente: BottomNavMoreSheet (bottom sheet nativo)
 * - Estilos centralizados: bottomNav.styles
 */
export const NativeBottomNav: React.FC<NativeBottomNavProps> = ({
  isDarkMode,
  currentTab,
  canSeeReports,
  canSeeProducts,
  canSeeFinance = true,
  isAdmin = false,
  handleTabChange,
  WEB_URL,
  customTabs,
}) => {
  const {
    primaryTabs,
    overflowTabs,
    hasOverflow,
    showMoreSheet,
    setShowMoreSheet,
    isTabActive,
    isOverflowTabActive,
    bottomInset,
    totalNavHeight,
  } = useNativeBottomNav({
    currentTab,
    canSeeReports,
    canSeeProducts,
    canSeeFinance,
    isAdmin,
    WEB_URL,
    customTabs,
  });

  return (
    <>
      <View
        style={[
          styles.bottomNav,
          { height: totalNavHeight, paddingBottom: bottomInset },
          isDarkMode && styles.bottomNavDark,
        ]}
      >
        {primaryTabs.map((tab) => (
          <BottomNavTabItem
            key={tab.key}
            tab={tab}
            active={isTabActive(tab.key)}
            onPress={() => handleTabChange(tab.key, tab.url)}
          />
        ))}

        {/* Botão de 3 Pontinhos na 5ª posição quando há mais de 5 abas */}
        {hasOverflow && (
          <TouchableOpacity
            testID="bottom-tab-more"
            style={[styles.navItem, isOverflowTabActive && styles.navItemActive]}
            onPress={() => setShowMoreSheet(true)}
            accessibilityRole="button"
            accessibilityLabel="Mais opções de navegação"
          >
            <MoreHorizontal
              size={22}
              color={isOverflowTabActive ? '#2563eb' : '#94a3b8'}
              strokeWidth={isOverflowTabActive ? 2.5 : 2}
            />
            <Text style={[styles.navText, isOverflowTabActive && styles.navTextActive]}>
              Mais
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Sheet com as opções adicionais */}
      <BottomNavMoreSheet
        visible={showMoreSheet}
        isDarkMode={isDarkMode}
        bottomInset={bottomInset}
        overflowTabs={overflowTabs}
        isTabActive={isTabActive}
        onClose={() => setShowMoreSheet(false)}
        onSelectTab={handleTabChange}
      />
    </>
  );
};

export default NativeBottomNav;
