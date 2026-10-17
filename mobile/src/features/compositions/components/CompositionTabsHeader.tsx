import React from 'react';
import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { FileText, Package, Grid2X2, Images } from 'lucide-react-native';
import type { CompositionTab } from '../hooks/useCompositionForm';

interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  danger: string;
}

interface CompositionTabsHeaderProps {
  activeTab: CompositionTab;
  onSelectTab: (tab: CompositionTab) => void;
  themeColors: ThemeColors;
}

export const CompositionTabsHeader: React.FC<CompositionTabsHeaderProps> = ({
  activeTab,
  onSelectTab,
  themeColors,
}) => {
  const tabs = [
    { id: 'info' as const, label: 'Cadastro Geral', icon: FileText },
    { id: 'items' as const, label: 'Produtos', icon: Package },
    { id: 'variations' as const, label: 'Variações', icon: Grid2X2 },
    { id: 'images' as const, label: 'Fotos', icon: Images },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{
        borderBottomWidth: 1,
        borderBottomColor: themeColors.border,
        backgroundColor: themeColors.bg,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.icon;

        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onSelectTab(tab.id)}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderBottomWidth: 2,
              borderBottomColor: isActive ? themeColors.primary : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <IconComponent
              size={16}
              color={isActive ? themeColors.primary : themeColors.textMuted}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: isActive ? themeColors.primary : themeColors.textMuted,
                fontWeight: isActive ? 'bold' : 'normal',
                textTransform: 'uppercase',
                fontSize: 12,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};
