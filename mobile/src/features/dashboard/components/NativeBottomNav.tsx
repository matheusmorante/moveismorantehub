import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package,
  Calendar, 
  Truck,
  Hammer, 
  BarChart3, 
  MoreHorizontal, 
  X, 
  ChevronRight 
} from 'lucide-react-native';

export interface NavItemConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  url: string;
  visible?: boolean;
}

interface Props {
  isDarkMode: boolean;
  currentTab: string;
  canSeeReports: boolean;
  canSeeProducts?: boolean;
  handleTabChange: (tab: string, url: string) => void;
  WEB_URL: string;
  customTabs?: NavItemConfig[];
}

export const NativeBottomNav: React.FC<Props> = ({
  isDarkMode,
  currentTab,
  canSeeReports,
  canSeeProducts,
  handleTabChange,
  WEB_URL,
  customTabs,
}) => {
  const insets = useSafeAreaInsets();
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 12);
  const totalNavHeight = 58 + bottomInset;

  // Lista base de todas as abas configuradas para o app
  const allTabs: NavItemConfig[] = customTabs || [
    {
      key: 'home',
      label: 'Início',
      icon: LayoutDashboard,
      url: WEB_URL,
      visible: true,
    },
    {
      key: 'pedidos',
      label: 'Pedidos',
      icon: ShoppingBag,
      url: `${WEB_URL}/mobile-orders`,
      visible: true,
    },
    {
      key: 'produtos',
      label: 'Produtos',
      icon: Package,
      url: `${WEB_URL}/products`,
      visible: Boolean(canSeeProducts),
    },
    {
      key: 'entregas',
      label: 'Entregas',
      icon: Truck,
      url: `${WEB_URL}/schedule`,
      visible: true,
    },
    {
      key: 'montagens',
      label: 'Montagens',
      icon: Hammer,
      url: `${WEB_URL}/assembly-schedule`,
      visible: true,
    },
    {
      key: 'relatorios',
      label: 'Relatórios',
      icon: BarChart3,
      url: `${WEB_URL}/mobile-reports`,
      visible: canSeeReports,
    },
  ];

  // Filtra apenas abas visíveis para o perfil do usuário
  const visibleTabs = allTabs.filter(t => t.visible !== false);

  // REGRA: Máximo de 5 abas na barra inferior.
  // Se passar de 5 abas (> 5):
  // As primeiras 4 abas ficam fixas na barra, e a 5ª vaga é ocupada pelo botão de 3 pontinhos ('Mais'),
  // que abre o Bottom Sheet com as opções restantes (a partir da 5ª em diante).
  const hasOverflow = visibleTabs.length > 5;
  const primaryTabs = hasOverflow ? visibleTabs.slice(0, 4) : visibleTabs;
  const overflowTabs = hasOverflow ? visibleTabs.slice(4) : [];

  const isOverflowTabActive = overflowTabs.some(t => {
    if (t.key === 'logistica') return currentTab === 'logistica' || currentTab === 'entregas';
    return currentTab === t.key;
  });

  const isTabActive = (key: string) => {
    if (key === 'logistica') return currentTab === 'logistica' || currentTab === 'entregas';
    return currentTab === key;
  };

  return (
    <>
      <View style={[
        styles.bottomNav,
        { height: totalNavHeight, paddingBottom: bottomInset },
        isDarkMode && styles.bottomNavDark
      ]}>
        {primaryTabs.map((tab) => {
          const IconComponent = tab.icon;
          const active = isTabActive(tab.key);
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => handleTabChange(tab.key, tab.url)}
            >
              <IconComponent 
                size={22} 
                color={active ? '#2563eb' : '#94a3b8'} 
                strokeWidth={active ? 2.5 : 2} 
              />
              <Text style={[styles.navText, active && styles.navTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Botão de 3 Pontinhos na 5ª posição quando há mais de 5 abas */}
        {hasOverflow && (
          <TouchableOpacity
            style={[styles.navItem, isOverflowTabActive && styles.navItemActive]}
            onPress={() => setShowMoreSheet(true)}
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
      <Modal
        visible={showMoreSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoreSheet(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setShowMoreSheet(false)}
        >
          <View 
            style={[
              styles.sheetContent, 
              isDarkMode && styles.sheetContentDark,
              { paddingBottom: bottomInset + 16 }
            ]}
          >
            {/* Linha de pegador (Handle) do Bottom Sheet */}
            <View style={styles.sheetHandleWrapper}>
              <View style={[styles.sheetHandle, isDarkMode && styles.sheetHandleDark]} />
            </View>

            {/* Cabeçalho do Bottom Sheet */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, isDarkMode && styles.sheetTextDark]}>
                  Mais Opções
                </Text>
                <Text style={[styles.sheetSubtitle, isDarkMode && styles.sheetSubtitleDark]}>
                  Navegação do aplicativo
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeButton, isDarkMode && styles.closeButtonDark]}
                onPress={() => setShowMoreSheet(false)}
              >
                <X size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Lista de Itens do Bottom Sheet */}
            <ScrollView style={styles.sheetScroll} bounces={false}>
              <View style={styles.sheetItemsContainer}>
                {overflowTabs.map((tab) => {
                  const IconComponent = tab.icon;
                  const active = isTabActive(tab.key);
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.sheetItem,
                        isDarkMode && styles.sheetItemDark,
                        active && (isDarkMode ? styles.sheetItemActiveDark : styles.sheetItemActive)
                      ]}
                      onPress={() => {
                        setShowMoreSheet(false);
                        handleTabChange(tab.key, tab.url);
                      }}
                    >
                      <View style={[
                        styles.sheetIconWrapper,
                        active ? styles.sheetIconWrapperActive : (isDarkMode ? styles.sheetIconWrapperDark : styles.sheetIconWrapperLight)
                      ]}>
                        <IconComponent 
                          size={20} 
                          color={active ? '#2563eb' : (isDarkMode ? '#cbd5e1' : '#475569')} 
                          strokeWidth={active ? 2.5 : 2} 
                        />
                      </View>
                      <Text style={[
                        styles.sheetItemLabel,
                        isDarkMode && styles.sheetTextDark,
                        active && styles.sheetItemLabelActive
                      ]}>
                        {tab.label}
                      </Text>
                      <ChevronRight 
                        size={18} 
                        color={active ? '#2563eb' : (isDarkMode ? '#64748b' : '#94a3b8')} 
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    paddingTop: 6,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    elevation: 8,
  },
  bottomNavDark: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navItemActive: {},
  navText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  navTextActive: {
    color: '#2563eb',
    fontWeight: '900',
  },

  /* Estilos do Bottom Sheet */
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  sheetContentDark: {
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  sheetHandleWrapper: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  sheetHandleDark: {
    backgroundColor: '#334155',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  sheetSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  sheetSubtitleDark: {
    color: '#94a3b8',
  },
  sheetTextDark: {
    color: '#f8fafc',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonDark: {
    backgroundColor: '#1e293b',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetItemsContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sheetItemDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  sheetItemActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  sheetItemActiveDark: {
    backgroundColor: '#1e3a8a30',
    borderColor: '#1e40af',
  },
  sheetIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetIconWrapperLight: {
    backgroundColor: '#e2e8f0',
  },
  sheetIconWrapperDark: {
    backgroundColor: '#334155',
  },
  sheetIconWrapperActive: {
    backgroundColor: '#dbeafe',
  },
  sheetItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  sheetItemLabelActive: {
    color: '#2563eb',
    fontWeight: '900',
  },
});
