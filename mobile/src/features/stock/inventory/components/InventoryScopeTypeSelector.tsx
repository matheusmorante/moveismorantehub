import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Package, Users, Filter, X } from 'lucide-react-native';
import type { InventoryScopeType, ScopeSupplier } from '../hooks/useInventoryScopeBuilder';
import type { SearchableProduct } from '../modals/InventoryProductSearchModal';

interface Props {
  isDarkMode: boolean;
  suppliers: ScopeSupplier[];
  expandedType: InventoryScopeType | null;
  onToggleExpand: (type: InventoryScopeType) => void;
  selectedSupplierId: string | null;
  onSelectSupplier: (supplierId: string | null) => void;
  customProducts: SearchableProduct[];
  onOpenSearch: () => void;
  onRemoveCustomProduct: (product: SearchableProduct) => void;
  onConfirmType: (type: InventoryScopeType, supplierId?: string) => void;
}

export const InventoryScopeTypeSelector: React.FC<Props> = ({
  isDarkMode,
  suppliers,
  expandedType,
  onToggleExpand,
  selectedSupplierId,
  onSelectSupplier,
  customProducts,
  onOpenSearch,
  onRemoveCustomProduct,
  onConfirmType,
}) => {
  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  return (
    <View style={styles.optionsContainer}>
      {/* 1. Estoque Completo */}
      <TouchableOpacity
        style={[styles.typeOption, { backgroundColor: surface, borderColor: border }]}
        onPress={() => onConfirmType('full')}
      >
        <View style={styles.cardHeaderRow}>
          <View style={[styles.typeIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Package size={24} color="#10b981" />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.typeTitle, { color: textPrimary }]}>Estoque Completo</Text>
            <Text style={[styles.typeDesc, { color: muted }]}>Todas as variações ativas cadastradas no sistema.</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* 2. Por Fornecedor */}
      <View style={{ marginBottom: expandedType === 'supplier' ? 12 : 0 }}>
        <TouchableOpacity
          style={[
            styles.typeOption,
            { backgroundColor: surface, borderColor: border },
            expandedType === 'supplier' ? styles.expandedOptionBorder : {},
          ]}
          onPress={() => onToggleExpand('supplier')}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.typeIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Users size={24} color="#3b82f6" />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.typeTitle, { color: textPrimary }]}>Por Fornecedor</Text>
              <Text style={[styles.typeDesc, { color: muted }]}>Selecione um fornecedor e conte as variações relacionadas.</Text>
            </View>
          </View>
        </TouchableOpacity>

        {expandedType === 'supplier' && (
          <View style={[styles.expandableBox, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Selecione o fornecedor para iniciar:</Text>
            <View style={styles.chipsRow}>
              {suppliers.map(s => {
                const isSelected = selectedSupplierId === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    testID="supplier-chip"
                    style={[
                      styles.chip,
                      {
                        borderColor: isSelected ? '#3b82f6' : border,
                        backgroundColor: isSelected
                          ? isDarkMode
                            ? 'rgba(59, 130, 246, 0.25)'
                            : 'rgba(59, 130, 246, 0.12)'
                          : bg,
                      },
                    ]}
                    onPress={() => onSelectSupplier(isSelected ? null : s.id)}
                  >
                    <Text style={{ color: isSelected ? '#2563eb' : textPrimary, fontWeight: isSelected ? '700' : '500' }}>
                      {s.full_name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedSupplierId && (
              <TouchableOpacity
                testID="continue-supplier-btn"
                style={[styles.actionButton, { backgroundColor: '#2563eb' }]}
                onPress={() => onConfirmType('supplier', selectedSupplierId)}
              >
                <Text style={styles.actionButtonText}>
                  Continuar com {suppliers.find(s => s.id === selectedSupplierId)?.full_name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* 3. Seleção Personalizada */}
      <View style={{ marginBottom: expandedType === 'custom' ? 12 : 0 }}>
        <TouchableOpacity
          style={[
            styles.typeOption,
            { backgroundColor: surface, borderColor: border },
            expandedType === 'custom' ? styles.expandedOptionBorder : {},
          ]}
          onPress={() => onToggleExpand('custom')}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.typeIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Filter size={24} color="#a855f7" />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.typeTitle, { color: textPrimary }]}>Seleção Personalizada</Text>
              <Text style={[styles.typeDesc, { color: muted }]}>Pesquise e adicione manualmente produtos ou variações específicas ao escopo.</Text>
            </View>
          </View>
        </TouchableOpacity>

        {expandedType === 'custom' && (
          <View style={[styles.expandableBox, { backgroundColor: surface, borderColor: border }]}>
            <Text style={{ color: muted, fontSize: 13, marginBottom: 12 }}>Selecione produtos ou variações antes de iniciar a contagem.</Text>
            <TouchableOpacity style={styles.customAddButton} onPress={onOpenSearch}>
              <Text style={styles.actionButtonText}>+ Adicionar produto ou variação</Text>
            </TouchableOpacity>
            {customProducts.map(product => (
              <View key={`${product.id}-${product.variation_id || 'main'}`} style={[styles.customProductRow, { borderBottomColor: border }]}>
                <Text numberOfLines={2} style={[{ color: textPrimary }, styles.flex1]}>{product.name}</Text>
                <TouchableOpacity onPress={() => onRemoveCustomProduct(product)} accessibilityLabel={`Remover ${product.name}`}>
                  <X size={18} color={muted} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              testID="continue-custom-btn"
              style={[styles.actionButton, { backgroundColor: '#7c3aed', opacity: customProducts.length ? 1 : 0.5 }]}
              disabled={!customProducts.length}
              onPress={() => onConfirmType('custom')}
            >
              <Text style={styles.actionButtonText}>Continuar com {customProducts.length} item(ns)</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  optionsContainer: { gap: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  typeOption: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  expandedOptionBorder: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  typeTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  typeDesc: { fontSize: 13, lineHeight: 18 },
  expandableBox: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: { fontSize: 13, marginBottom: 12, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
  },
  actionButton: { alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 14 },
  actionButtonText: { color: '#fff', fontWeight: '800' },
  customAddButton: { alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#7c3aed', marginBottom: 8 },
  customProductRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1 },
});
