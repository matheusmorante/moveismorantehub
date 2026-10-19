import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ChevronDown, Plus, Search, X } from 'lucide-react-native';
import { styles } from './purchasesScreen.styles';

interface PurchasesScreenHeaderProps {
  colors: { bg: string; surface: string; border: string; text: string; muted: string };
  search: string;
  onSearchChange: (text: string) => void;
  supplierId?: string;
  supplierName: string;
  onOpenSupplierModal: () => void;
  onClearSupplier: () => void;
  onNewPurchase: () => void;
}

export const PurchasesScreenHeader: React.FC<PurchasesScreenHeaderProps> = ({
  colors,
  search,
  onSearchChange,
  supplierId,
  supplierName,
  onOpenSupplierModal,
  onClearSupplier,
  onNewPurchase,
}) => {
  return (
    <View>
      <View style={[styles.pageHeader, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Pedidos de compra</Text>
          <Text style={[styles.pageSubtitle, { color: colors.muted }]}>Produtos e variações</Text>
        </View>
        <TouchableOpacity style={styles.newButton} onPress={onNewPurchase}>
          <Plus size={17} color="#fff" />
          <Text style={styles.newButtonText}>Novo pedido</Text>
        </TouchableOpacity>
      </View>
      <View
        style={[styles.filters, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View
          style={[styles.searchBox, { backgroundColor: colors.bg, borderColor: colors.border }]}
        >
          <Search size={17} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Fornecedor ou número do pedido"
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
