import React from 'react';
import { Text, View } from 'react-native';
import { PackageCheck } from 'lucide-react-native';
import { styles } from './deliveryServiceStep.styles';

interface DeliveryServiceProductsCardProps {
  items: any[];
  isDarkMode: boolean;
}

/**
 * Cartão de conferência dos produtos a serem descarregados no cliente.
 */
export const DeliveryServiceProductsCard: React.FC<DeliveryServiceProductsCardProps> = ({
  items,
  isDarkMode,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <View style={[styles.itemsCard, isDarkMode && styles.itemsCardDark]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <PackageCheck size={16} color="#16a34a" />
        <Text style={[styles.itemsTitle, isDarkMode && styles.textLight]}>
          Conferência de Produtos:
        </Text>
      </View>
      {items.map((item, idx) => (
        <View key={idx} style={[styles.itemRow, isDarkMode && styles.itemRowDark]}>
          <Text style={styles.itemQty}>{item.quantity || item.qty || 1}x</Text>
          <Text style={[styles.itemName, isDarkMode && styles.textLight]}>
            {item.name || item.title || item.description || 'Produto'}
          </Text>
        </View>
      ))}
    </View>
  );
};
