import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { styles } from './productFormVariationsTab.styles';
import type { getMobileProductVariationTabs, VariationTabId } from './productVariationTabs';

type VariationTab = ReturnType<typeof getMobileProductVariationTabs>[number];

interface ProductVariationTabNavigationProps {
  tabs: readonly VariationTab[];
  activeTab: VariationTabId;
  dark: boolean;
  isInheritedDataTab: (id: VariationTabId) => boolean;
  onTabChange: (id: VariationTabId) => void;
}

export const ProductVariationTabNavigation: React.FC<ProductVariationTabNavigationProps> = ({
  tabs,
  activeTab,
  dark,
  isInheritedDataTab,
  onTabChange,
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.variationTabs}
    accessibilityRole="tablist"
  >
    {tabs.map(({ id, label, Icon }) => {
      const selected = activeTab === id;
      return (
        <TouchableOpacity
          key={id}
          onPress={() => onTabChange(id)}
          accessibilityRole="tab"
          accessibilityState={{ selected }}
          style={[
            styles.variationTab,
            selected && styles.activeVariationTab,
            isInheritedDataTab(id) && styles.inheritedDataTab,
          ]}
        >
          <Icon size={14} color={selected ? '#2563eb' : dark ? '#94a3b8' : '#64748b'} />
          <Text
            style={[
              styles.variationTabText,
              dark && styles.dimText,
              selected && styles.activeVariationTabText,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);
