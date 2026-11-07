import { FormTextInput } from '../../../../../components/shared/FormTextInput';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';
import { styles } from './purchasesScreen.styles';

interface PurchasesScreenHeaderProps {
  colors: { bg: string; surface: string; border: string; text: string; muted: string };
  search: string;
  onSearchChange: (text: string) => void;
  supplierId?: string;
  supplierName: string;
  onOpenSupplierModal: () => void;
  onClearSupplier: () => void;
}

export const PurchasesScreenHeader: React.FC<PurchasesScreenHeaderProps> = ({
  colors,
  search,
  onSearchChange,
  supplierId,
  supplierName,
  onOpenSupplierModal,
  onClearSupplier,
}) => {
  return (
    <View>
      <View
        style={[styles.filters, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View
          style={[styles.searchBox, { backgroundColor: colors.bg, borderColor: colors.border }]}
        >
          <Search size={17} color={colors.muted} />
          <FormTextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Buscar por fornecedor"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {search ? (
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <X size={16} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onOpenSupplierModal}
          style={[
            styles.supplierFilter,
            { backgroundColor: colors.bg, borderColor: colors.border },
          ]}
        >
          <Text
            numberOfLines={1}
            style={{ color: supplierId ? colors.text : colors.muted, flex: 1 }}
          >
            {supplierName}
          </Text>
          <ChevronDown size={17} color={colors.muted} />
        </TouchableOpacity>
        {supplierId ? (
          <TouchableOpacity onPress={onClearSupplier}>
            <Text style={styles.clearFilter}>Limpar fornecedor</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};
