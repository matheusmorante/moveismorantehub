import React from 'react';
import { View, Text } from 'react-native';
import { Hammer } from 'lucide-react-native';

interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  danger: string;
}

interface CompositionConstructionTabProps {
  name: string;
  themeColors: ThemeColors;
}

export const CompositionConstructionTab: React.FC<CompositionConstructionTabProps> = ({
  name,
  themeColors,
}) => {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Hammer size={48} color={themeColors.textMuted} />
      <Text style={{ color: themeColors.text, fontWeight: 'bold', marginTop: 16 }}>
        Aba {name} em Construção
      </Text>
    </View>
  );
};
