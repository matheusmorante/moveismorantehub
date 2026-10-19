import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import { fetchMobileSuppliers } from '../../../../products/services/mobileSupplierService';
import { styles } from './purchasesScreen.styles';

interface PurchaseSupplierFilterModalProps {
  visible: boolean;
  colors: { bg: string; surface: string; border: string; text: string; muted: string };
  onClose: () => void;
  onSelectSupplier: (supplier: { id: string; name: string }) => void;
}

export const PurchaseSupplierFilterModal: React.FC<PurchaseSupplierFilterModalProps> = ({
  visible,
  colors,
  onClose,
  onSelectSupplier,
}) => {
  const [supplierSearch, setSupplierSearch] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    if (visible) void fetchMobileSuppliers().then(setSuppliers);
  }, [visible]);

  const filteredSuppliers = useMemo(
    () =>
      suppliers
        .filter((item) => item.name.toLowerCase().includes(supplierSearch.toLowerCase()))
        .slice(0, 40),
    [supplierSearch, suppliers]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.supplierModal, { backgroundColor: colors.bg }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filtrar fornecedor</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <TextInput
          autoFocus
          value={supplierSearch}
          onChangeText={setSupplierSearch}
          placeholder="Buscar fornecedor"
          placeholderTextColor={colors.muted}
          style={[
            styles.modalSearch,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        />
        <FlatList
          data={filteredSuppliers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onSelectSupplier({ id: item.id, name: item.name })}
              style={[
                styles.supplierOption,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.muted, textAlign: 'center', padding: 30 }}>
              Nenhum fornecedor encontrado.
            </Text>
          }
        />
      </View>
    </Modal>
  );
};
