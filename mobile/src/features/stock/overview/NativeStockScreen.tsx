import React, { useState, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import PagerView from '../../../components/Pager';

import { StockSummaryScreen } from '../overview/StockSummaryScreen';
import { StockMovesScreen } from '../moves';
import { InventoryScreen } from '../inventory';
import { PurchasesScreen } from '../purchases/PurchasesScreen';
import { InvoicesScreen } from '../invoices';
import { ReceiptsScreen } from '../receipts';
import { SuppliersScreen } from '../suppliers/SuppliersScreen';
import { UnavailabilitiesScreen } from '../unavailabilities';
import { TABS } from './native-stock-screen/nativeStockScreen.types';
import { styles } from './native-stock-screen/nativeStockScreen.styles';
import { StockModuleTabBar } from './native-stock-screen/StockModuleTabBar';

interface Props {
  isDarkMode: boolean;
  userProfile?: any;
}

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
    const edges = {
      left: metrics.offset > 1,
      right: maxOffset > 1 && metrics.offset < maxOffset - 1,
    };
    setTabsScrollEdges((current) =>
      current.left === edges.left && current.right === edges.right ? current : edges
    );
  };

  const scrollTabIntoView = (index: number) => {
    const layout = tabLayouts.current[index];
    const { viewport, offset } = tabsScrollMetrics.current;
    if (!layout || !viewport) return;

    if (layout.x < offset) {
      scrollViewRef.current?.scrollTo({ x: Math.max(0, layout.x - 8), animated: true });
    } else if (layout.x + layout.width > offset + viewport) {
      scrollViewRef.current?.scrollTo({
        x: layout.x + layout.width - viewport + 8,
        animated: true,
      });
    }
  };

  const scrollTabs = (direction: -1 | 1) => {
    const { viewport, content, offset } = tabsScrollMetrics.current;
    const maxOffset = Math.max(0, content - viewport);
    const nextOffset =
      direction > 0
        ? Math.min(maxOffset, offset + Math.max(120, viewport * 0.75))
        : Math.max(0, offset - Math.max(120, viewport * 0.75));
    scrollViewRef.current?.scrollTo({ x: nextOffset, animated: true });
  };

  const handleTabPress = (index: number) => {
    setTabIndex(index);
    pagerRef.current?.setPage(index);
    if (!loadedTabs.includes(index)) {
      setLoadedTabs((prev) => [...prev, index]);
    }
    scrollTabIntoView(index);
  };

  const renderModuleHeader = () => (
    <StockModuleTabBar
      isDarkMode={isDarkMode}
      tabIndex={tabIndex}
      tabWidth={tabWidth}
      setTabWidth={setTabWidth}
      onTabPress={handleTabPress}
      scrollViewRef={scrollViewRef}
      tabLayouts={tabLayouts}
      scrollTabIntoView={scrollTabIntoView}
      updateTabsScrollMetrics={updateTabsScrollMetrics}
      tabsScrollEdges={tabsScrollEdges}
      scrollTabs={scrollTabs}
    />
  );

  const renderContent = (index: number) => {
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
      case 0:
        return (
          <StockSummaryScreen
            isDarkMode={isDarkMode}
            renderHeader={renderModuleHeader}
            onNavigate={handleTabPress}
          />
        );
      case 1:
        return (
          <StockMovesScreen
            isDarkMode={isDarkMode}
            renderHeader={renderModuleHeader}
            onBack={() => handleTabPress(0)}
          />
        );
      case 2:
        return (
          <InventoryScreen
            isDarkMode={isDarkMode}
            userProfile={userProfile}
            renderHeader={renderModuleHeader}
            onBack={() => handleTabPress(0)}
          />
        );
      case 3:
        return (
          <PurchasesScreen
            isDarkMode={isDarkMode}
            renderHeader={renderModuleHeader}
            onBack={() => handleTabPress(0)}
          />
        );
      case 4:
        return (
          <InvoicesScreen
            isDarkMode={isDarkMode}
            renderHeader={renderModuleHeader}
            onBack={() => handleTabPress(0)}
          />
        );
      case 5:
        return (
          <ReceiptsScreen
            isDarkMode={isDarkMode}
            renderHeader={renderModuleHeader}
            onBack={() => handleTabPress(0)}
          />
        );
      case 6:
        return (
          <SuppliersScreen
            isDarkMode={isDarkMode}
            renderHeader={renderModuleHeader}
            onBack={() => handleTabPress(0)}
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
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => {
          const pos = e.nativeEvent.position;
          setTabIndex(pos);
          scrollTabIntoView(pos);
          if (!loadedTabs.includes(pos)) {
            setLoadedTabs((prev) => [...prev, pos]);
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
