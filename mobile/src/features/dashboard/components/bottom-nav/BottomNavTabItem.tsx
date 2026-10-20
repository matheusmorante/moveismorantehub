import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { BottomNavTabItemProps } from './bottomNav.types';
import { styles } from './bottomNav.styles';

/**
 * Item individual da barra de navegação inferior primária (SRP).
 * Inclui renderização customizada para a aba especial do Assistente (Agente Lizandro com badge BETA).
 */
export const BottomNavTabItem: React.FC<BottomNavTabItemProps> = ({
  tab,
  active,
  onPress,
}) => {
  const IconComponent = tab.icon;
  const isAgent = tab.key === 'agente';
  const isDisabled = tab.disabled;
  const activeColor = isAgent ? '#eab308' : '#2563eb';
  const inactiveColor = isAgent ? '#eab308' : '#94a3b8';

  return (
    <TouchableOpacity
      testID={`bottom-tab-${tab.key}`}
      style={[
        styles.navItem,
        active && styles.navItemActive,
        isDisabled && { opacity: 0.4 },
      ]}
      disabled={isDisabled}
      onPress={() => {
        if (!isDisabled) {
          onPress();
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={isAgent ? 'Assistente, beta' : tab.label}
    >
      {isAgent ? (
        <View style={styles.agentPrimaryContent}>
          <View style={styles.agentAvatarPrimaryFrame}>
            <Image
              source={require('../../../../../assets/lizandro-small.png')}
              style={styles.agentAvatarPrimary}
            />
          </View>
          <Text style={styles.agentBetaLabel}>BETA</Text>
        </View>
      ) : (
        <IconComponent
          size={22}
          color={active ? activeColor : inactiveColor}
          strokeWidth={active ? 2.5 : 2}
        />
      )}
      {!isAgent && (
        <Text style={[styles.navText, active && styles.navTextActive]}>
          {tab.label}
        </Text>
      )}
    </TouchableOpacity>
  );
};
