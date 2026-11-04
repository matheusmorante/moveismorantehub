import { Lock } from 'lucide-react-native';
import type React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { TabId } from './productFormTabs';
import { styles } from './productFormScreen.styles';

interface ProductFormTab {
  id: TabId;
  label: string;
  Icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

interface Props {
  tabs: ReadonlyArray<ProductFormTab>;
  activeTab: TabId;
  isTabDisabled: (tabId: TabId) => boolean;
  onTabChange: (tabId: TabId) => void;
  dark: boolean;
  variationCount: number;
  photoCount: number;
}

export const ProductFormTabNavigation: React.FC<Props> = ({
  tabs,
  activeTab,
  isTabDisabled,
  onTabChange,
  dark,
  variationCount,
  photoCount,
}) => (
  <>
    {tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      const disabled = isTabDisabled(tab.id);
      const badge =
        tab.id === 'variacoes' && variationCount > 0
          ? variationCount
          : tab.id === 'fotos' && photoCount > 0
            ? photoCount
            : null;
      const TabIcon = tab.Icon;

      return (
        <TouchableOpacity
          key={tab.id}
          onPress={() => onTabChange(tab.id)}
          disabled={disabled}
          accessibilityRole="tab"
          accessibilityState={{ disabled, selected: isActive }}
          accessibilityHint={
            disabled
              ? tab.id === 'technical'
                ? 'Selecione ao menos uma categoria no Cadastro Geral para liberar esta aba.'
                : 'Informe o nome, selecione uma categoria e preencha as características obrigatórias.'
              : undefined
          }
          style={[
            styles.tab,
            isActive && styles.tabActive,
            dark && !isActive && styles.darkTab,
            disabled && styles.tabDisabled,
          ]}
        >
          {TabIcon && (
            <TabIcon size={13} color={isActive ? '#2563eb' : dark ? '#94a3b8' : '#64748b'} />
          )}
          <Text
            style={[
              styles.tabLabel,
              isActive && styles.tabLabelActive,
              dark && !isActive && styles.dimText,
            ]}
          >
            {tab.label.toLocaleUpperCase('pt-BR')}
          </Text>
          {disabled && <Lock size={12} color={dark ? '#64748b' : '#94a3b8'} />}
          {badge !== null && (
            <View style={[styles.badge, isActive && styles.badgeActive]}>
              <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>{badge}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    })}
  </>
);
