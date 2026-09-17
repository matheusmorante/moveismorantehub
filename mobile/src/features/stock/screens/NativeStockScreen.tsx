import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import PagerView from '../../../components/Pager';

import { StockSummaryScreen } from './StockSummaryScreen';
import { InventoryScreen } from './InventoryScreen';
import { StockMovesScreen } from './StockMovesScreen';
import { ReceiptsScreen } from './ReceiptsScreen';
import { PurchasesScreen } from './PurchasesScreen';
import { InvoicesScreen } from './InvoicesScreen';
import { SuppliersScreen } from './SuppliersScreen';

interface Props {
  isDarkMode: boolean;
  userProfile?: any;
}

const TABS = [
  { key: 'summary', title: 'Resumo' },
  { key: 'moves', title: 'Movimentações' },
  { key: 'inventory', title: 'Inventário' },
  { key: 'purchases', title: 'Pedidos' },
  { key: 'invoices', title: 'NF Entrada' },
  { key: 'receipts', title: 'Recebimentos' },
  { key: 'suppliers', title: 'Fornecedores' }
];

export const NativeStockScreen: React.FC<Props> = ({ isDarkMode, userProfile }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [loadedTabs, setLoadedTabs] = useState<number[]>([0]);

  useEffect(() => {
    if (!loadedTabs.includes(tabIndex)) {
      setLoadedTabs(prev => [...prev, tabIndex]);
    }
    // Scroll the tab bar so the selected tab is visible
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: tabIndex * 100 - 50, animated: true }); // approximate offset
    }
  }, [tabIndex]);

  const handleTabPress = (index: number) => {
    setTabIndex(index);
    pagerRef.current?.setPage(index);
  };

  const renderContent = (index: number) => {
    // Lazy loading
    if (!loadedTabs.includes(index) && index !== tabIndex) {
      return (
        <View style={styles.center}>
          <Text style={isDarkMode ? styles.textMutedDark : { color: '#64748b' }}>
            Carregando...
          </Text>
        </View>
      );
    }

    switch (index) {
      case 0: return <StockSummaryScreen isDarkMode={isDarkMode} onNavigate={handleTabPress} />;
      case 1: return <StockMovesScreen isDarkMode={isDarkMode} onBack={() => handleTabPress(0)} />;
      case 2: return <InventoryScreen isDarkMode={isDarkMode} userProfile={userProfile} onBack={() => handleTabPress(0)} />;
      case 3: return <PurchasesScreen isDarkMode={isDarkMode} onBack={() => handleTabPress(0)} />;
      case 4: return <InvoicesScreen isDarkMode={isDarkMode} onBack={() => handleTabPress(0)} />;
      case 5: return <ReceiptsScreen isDarkMode={isDarkMode} onBack={() => handleTabPress(0)} />;
      case 6: return <SuppliersScreen isDarkMode={isDarkMode} onBack={() => handleTabPress(0)} />;
      default: return null;
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Global Header */}
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text style={[styles.mainTitle, isDarkMode && styles.textDark]}>Estoque</Text>
        
        <View style={styles.tabsWrapper}>
          <ScrollView 
            ref={scrollViewRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {TABS.map((tab, idx) => {
              const isActive = idx === tabIndex;
              return (
                <TouchableOpacity 
                  key={tab.key} 
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => handleTabPress(idx)}
                >
                  <Text style={[
                    styles.tabText, 
                    isDarkMode && styles.tabTextDark,
                    isActive && styles.tabTextActive,
                    isActive && isDarkMode && styles.tabTextActiveDark
                  ]}>
                    {tab.title}
                  </Text>
                  {isActive && <View style={[styles.activeIndicator, isDarkMode && styles.activeIndicatorDark]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setTabIndex(e.nativeEvent.position)}
      >
        {TABS.map((tab, idx) => (
          <View key={tab.key} style={styles.page}>
            {renderContent(idx)}
          </View>
        ))}
      </PagerView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  textDark: {
    color: '#f8fafc',
  },
  textMutedDark: {
    color: '#94a3b8',
  },
  tabsWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tabsContainer: {
    paddingHorizontal: 8,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  tabBtnActive: {
    // 
  },
  tabText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  tabTextDark: {
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  tabTextActiveDark: {
    color: '#60a5fa',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: '#2563eb',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  activeIndicatorDark: {
    backgroundColor: '#60a5fa',
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
