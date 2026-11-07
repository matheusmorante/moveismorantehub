import { FormTextInput } from '../../../../../components/shared/FormTextInput';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import { fetchMobileSuppliers } from '../../../../products/services/mobileSupplierService';
import { useAuth } from '../../../../../contexts/AuthContext';
import { styles } from './purchasesScreen.styles';
import { matchesSearchText } from '../../../../../../../shared-utils/searchText';

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
  const { userProfile } = useAuth();
  const cacheScope = String(userProfile?.id || userProfile?.user_id || '');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const cacheRef = useRef<{ scope: string; expiresAt: number; data: any[] } | null>(null);
  const requestRef = useRef<{ scope: string; promise: Promise<any[]> } | null>(null);
  const cacheScopeRef = useRef(cacheScope);
  cacheScopeRef.current = cacheScope;

  useEffect(() => {
    cacheRef.current = null;
    requestRef.current = null;
    setSuppliers([]);
  }, [cacheScope]);

  useEffect(() => {
    if (!visible || !cacheScope) return;

    const cached = cacheRef.current;
    if (cached?.scope === cacheScope && cached.expiresAt > Date.now()) {
      setSuppliers(cached.data);
      return;
    }

    let request = requestRef.current;
    if (!request || request.scope !== cacheScope) {
      const promise = fetchMobileSuppliers().then((data) => {
        const result = Array.isArray(data) ? data : [];
        if (result.length && cacheScopeRef.current === cacheScope) {
          cacheRef.current = { scope: cacheScope, expiresAt: Date.now() + 30_000, data: result };
        }
        return result;
      }).finally(() => {
        if (requestRef.current?.promise === promise) requestRef.current = null;
      });
      request = { scope: cacheScope, promise };
      requestRef.current = request;
    }

    let active = true;
    void request.promise.then((data) => {
      if (active && cacheScopeRef.current === cacheScope) setSuppliers(data);
    }, () => {
      if (active && cacheScopeRef.current === cacheScope) setSuppliers([]);
    });
    return () => {
      active = false;
    };
  }, [visible, cacheScope]);

  const filteredSuppliers = useMemo(
    () =>
      suppliers
        .filter((item) => matchesSearchText(item.name, supplierSearch))
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
        <FormTextInput
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
