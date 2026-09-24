import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import PagerView from '../../../components/Pager';

import { StockSummaryScreen } from '../overview/StockSummaryScreen';
import { StockMovesScreen } from '../moves';
import { InventoryScreen } from '../inventory';
import { PurchasesScreen } from '../purchases/PurchasesScreen';
import { InvoicesScreen } from '../invoices';
import { ReceiptsScreen } from '../receipts/ReceiptsScreen';
import { SuppliersScreen } from '../suppliers/SuppliersScreen';

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
  const tabsScrollMetrics = useRef({ viewport: 0, content: 0, offset: 0 });
  const tabLayouts = useRef<Partial<Record<number, { x: number; width: number }>>>({});
  const [tabsScrollEdges, setTabsScrollEdges] = useState({ left: false, right: false });
  const [tabWidth, setTabWidth] = useState(78);
  const [loadedTabs, setLoadedTabs] = useState<number[]>([0]);

  const updateTabsScrollMetrics = (update: Partial<typeof tabsScrollMetrics.current>) => {
    const metrics = { ...tabsScrollMetrics.current, ...update };
    tabsScrollMetrics.current = metrics;
    const maxOffset = Math.max(0, metrics.content - metrics.viewport);
    const edges = { left: metrics.offset > 1, right: maxOffset > 1 && metrics.offset < maxOffset - 1 };
    setTabsScrollEdges(current => current.left === edges.left && current.right === edges.right ? current : edges);
  };

  const scrollTabIntoView = (index: number) => {
    const layout = tabLayouts.current[index];
    const { viewport, offset } = tabsScrollMetrics.current;
    if (!layout || !viewport) return;

    if (layout.x < offset) {
      scrollViewRef.current?.scrollTo({ x: Math.max(0, layout.x - 8), animated: true });
    } else if (layout.x + layout.width > offset + viewport) {
      scrollViewRef.current?.scrollTo({ x: layout.x + layout.width - viewport + 8, animated: true });
    }
  };

  const scrollTabs = (direction: -1 | 1) => {
    const { viewport, content, offset } = tabsScrollMetrics.current;
    const maxOffset = Math.max(0, content - viewport);
    const nextOffset = direction > 0
      ? Math.min(maxOffset, offset + Math.max(120, viewport * 0.75))
      : Math.max(0, offset - Math.max(120, viewport * 0.75));
    scrollViewRef.current?.scrollTo({ x: nextOffset, animated: true });
  };

  const handleTabPress = (index: number) => {
    setTabIndex(index);
    pagerRef.current?.setPage(index);
    if (!loadedTabs.includes(index)) {
      setLoadedTabs(prev => [...prev, index]);
    }
    scrollTabIntoView(index);
  };

  const renderModuleHeader = () => (
    <View style={[styles.header, isDarkMode && styles.headerDark]}>
      <View>
        <View style={styles.tabsRow}>
        <View style={styles.tabArrowSlot}>
          {tabsScrollEdges.left && <TouchableOpacity
              style={[styles.tabArrow, isDarkMode && styles.tabArrowDark]}
              onPress={() => scrollTabs(-1)}
              accessibilityRole="button"
              accessibilityLabel="Rolar abas para a esquerda"
              hitSlop={6}
            >
              <ChevronLeft size={18} color={isDarkMode ? '#e2e8f0' : '#2563eb'} />
            </TouchableOpacity>}
        </View>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.tabsScrollView}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          onLayout={({ nativeEvent }) => {
            const width = nativeEvent.layout.width;
            setTabWidth(width / 3);
            updateTabsScrollMetrics({ viewport: width });
          }}
          onContentSizeChange={(content) => updateTabsScrollMetrics({ content })}
          onScroll={({ nativeEvent }) => updateTabsScrollMetrics({ offset: nativeEvent.contentOffset.x })}
          scrollEventThrottle={32}
        >
          {TABS.map((tab, idx) => {
            const isActive = idx === tabIndex;
            return (
              <TouchableOpacity 
                key={tab.key} 
                style={[styles.tabBtn, { width: tabWidth }, isActive && styles.tabBtnActive, isActive && isDarkMode && styles.tabBtnActiveDark]}
                onLayout={({ nativeEvent }) => {
                  tabLayouts.current[idx] = { x: nativeEvent.layout.x, width: nativeEvent.layout.width };
                  if (idx === tabIndex) requestAnimationFrame(() => scrollTabIntoView(idx));
                }}
                onPress={() => handleTabPress(idx)}
                testID={`tab-${tab.key}`}
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
        <View style={styles.tabArrowSlot}>
          {tabsScrollEdges.right && <TouchableOpacity
              style={[styles.tabArrow, styles.tabArrowActive, isDarkMode && styles.tabArrowActiveDark]}
              onPress={() => scrollTabs(1)}
              accessibilityRole="button"
              accessibilityLabel="Rolar abas para a direita"
              hitSlop={6}
            >
              <ChevronRight size={18} color={isDarkMode ? '#ffffff' : '#2563eb'} />
            </TouchableOpacity>}
        </View>
        </View>
      </View>
    </View>
  );

  const renderContent = (index: number) => {
    if (!loadedTabs.includes(index) && index !== tabIndex) {
      return (
        <View style={styles.center}>
          <Text style={isDarkMode ? styles.textMutedDark : { color: '#64748b' }}>Carregando...</Text>
        </View>
      );
    }

    switch (index) {
      case 0: return <StockSummaryScreen isDarkMode={isDarkMode} renderHeader={renderModuleHeader} onNavigate={handleTabPress} />;
      case 1: return <StockMovesScreen isDarkMode={isDarkMode} renderHeader={renderModuleHeader} onBack={() => handleTabPress(0)} />;
      case 2: return <InventoryScreen isDarkMode={isDarkMode} userProfile={userProfile} renderHeader={renderModuleHeader} onBack={() => handleTabPress(0)} />;
      case 3: return <PurchasesScreen isDarkMode={isDarkMode} renderHeader={renderModuleHeader} onBack={() => handleTabPress(0)} />;
      case 4: return <InvoicesScreen isDarkMode={isDarkMode} renderHeader={renderModuleHeader} onBack={() => handleTabPress(0)} />;
      case 5: return <ReceiptsScreen isDarkMode={isDarkMode} renderHeader={renderModuleHeader} onBack={() => handleTabPress(0)} />;
      case 6: return <SuppliersScreen isDarkMode={isDarkMode} renderHeader={renderModuleHeader} onBack={() => handleTabPress(0)} />;
      default: return null;
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => {
            const pos = e.nativeEvent.position;
            setTabIndex(pos);
            scrollTabIntoView(pos);
            if (!loadedTabs.includes(pos)) {
                setLoadedTabs(prev => [...prev, pos]);
            }
        }}
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
    paddingTop: 0,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  textMutedDark: { color: '#94a3b8' },
  tabsRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  tabsContainer: {
    paddingHorizontal: 2,
    alignItems: 'stretch',
  },
  tabsScrollView: { flex: 1, alignSelf: 'stretch' },
  tabArrowSlot: { width: 40, alignItems: 'center', justifyContent: 'center' },
  tabArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 0,
    backgroundColor: '#eff6ff',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  tabArrowDark: { backgroundColor: '#1e293b' },
  tabArrowActive: { backgroundColor: '#dbeafe' },
  tabArrowActiveDark: { backgroundColor: '#1d4ed8' },
  tabBtn: {
    width: 78,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingHorizontal: 2,
    paddingVertical: 0,
    position: 'relative',
    borderRadius: 12,
  },
  tabBtnActive: { backgroundColor: '#eff6ff' },
  tabBtnActiveDark: { backgroundColor: '#172554' },
  tabText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  tabTextDark: { color: '#94a3b8' },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  tabTextActiveDark: { color: '#60a5fa' },
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
  activeIndicatorDark: { backgroundColor: '#60a5fa' },
  pager: { flex: 1 },
  page: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
