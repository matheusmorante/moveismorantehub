import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { TABS } from './nativeStockScreen.types';
import { styles } from './nativeStockScreen.styles';

interface StockModuleTabBarProps {
  isDarkMode: boolean;
  tabIndex: number;
  tabWidth: number;
  setTabWidth: (width: number) => void;
  onTabPress: (index: number) => void;
  scrollViewRef: React.RefObject<ScrollView>;
  tabLayouts: React.MutableRefObject<Partial<Record<number, { x: number; width: number }>>>;
  scrollTabIntoView: (index: number) => void;
  updateTabsScrollMetrics: (update: Partial<{ viewport: number; content: number; offset: number }>) => void;
  tabsScrollEdges: { left: boolean; right: boolean };
  scrollTabs: (direction: -1 | 1) => void;
}

export const StockModuleTabBar: React.FC<StockModuleTabBarProps> = ({
  isDarkMode,
  tabIndex,
  tabWidth,
  setTabWidth,
  onTabPress,
  scrollViewRef,
  tabLayouts,
  scrollTabIntoView,
  updateTabsScrollMetrics,
  tabsScrollEdges,
  scrollTabs,
}) => {
  return (
    <View style={[styles.header, isDarkMode && styles.headerDark]}>
      <View>
        <View style={styles.tabsRow}>
          <View style={styles.tabArrowSlot}>
            {tabsScrollEdges.left && (
              <TouchableOpacity
                style={[styles.tabArrow, isDarkMode && styles.tabArrowDark]}
                onPress={() => scrollTabs(-1)}
                accessibilityRole="button"
                accessibilityLabel="Rolar abas para a esquerda"
                hitSlop={6}
              >
                <ChevronLeft size={18} color={isDarkMode ? '#e2e8f0' : '#2563eb'} />
              </TouchableOpacity>
            )}
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
            onScroll={({ nativeEvent }) =>
              updateTabsScrollMetrics({ offset: nativeEvent.contentOffset.x })
            }
            scrollEventThrottle={32}
          >
            {TABS.map((tab, idx) => {
              const isActive = idx === tabIndex;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabBtn,
                    { width: tabWidth },
                    isActive && styles.tabBtnActive,
                    isActive && isDarkMode && styles.tabBtnActiveDark,
                  ]}
                  onLayout={({ nativeEvent }) => {
                    tabLayouts.current[idx] = {
                      x: nativeEvent.layout.x,
                      width: nativeEvent.layout.width,
                    };
                    if (idx === tabIndex) requestAnimationFrame(() => scrollTabIntoView(idx));
                  }}
                  onPress={() => onTabPress(idx)}
                  testID={`tab-${tab.key}`}
                >
                  <Text
                    style={[
                      styles.tabText,
                      isDarkMode && styles.tabTextDark,
                      isActive && styles.tabTextActive,
                      isActive && isDarkMode && styles.tabTextActiveDark,
                    ]}
                  >
                    {tab.title}
                  </Text>
                  {isActive && (
                    <View
                      style={[styles.activeIndicator, isDarkMode && styles.activeIndicatorDark]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.tabArrowSlot}>
            {tabsScrollEdges.right && (
              <TouchableOpacity
                style={[
                  styles.tabArrow,
                  styles.tabArrowActive,
                  isDarkMode && styles.tabArrowActiveDark,
                ]}
                onPress={() => scrollTabs(1)}
                accessibilityRole="button"
                accessibilityLabel="Rolar abas para a direita"
                hitSlop={6}
              >
                <ChevronRight size={18} color={isDarkMode ? '#ffffff' : '#2563eb'} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};
