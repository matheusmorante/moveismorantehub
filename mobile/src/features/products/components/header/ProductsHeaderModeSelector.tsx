import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './ProductsHeader.styles';

export type ProductListMode = 'standard' | 'composition' | 'categories';

interface ProductsHeaderModeSelectorProps {
  mode: ProductListMode;
  availableModes: ProductListMode[];
  onModeChange: (mode: ProductListMode) => void;
}

/**
 * Seletor de abas/modos da listagem: Produtos padrão, Composições e Ambientes/Categorias.
 */
export const ProductsHeaderModeSelector: React.FC<ProductsHeaderModeSelectorProps> = ({
  mode,
  availableModes,
  onModeChange,
}) => {
  const modes = [
    { key: 'standard' as const, label: 'Produtos' },
    { key: 'composition' as const, label: 'Composições' },
    { key: 'categories' as const, label: 'Ambientes e Categorias' },
  ].filter(({ key }) => availableModes.includes(key));

  return (
    <View style={styles.modeRow}>
      {modes.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          onPress={() => onModeChange(key)}
          style={[styles.modeButton, mode === key && styles.modeButtonActive]}
        >
          <Text style={[styles.modeText, mode === key && styles.modeTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
