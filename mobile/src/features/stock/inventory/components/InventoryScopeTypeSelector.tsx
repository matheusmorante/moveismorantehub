import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Box, Building2, Package, ScanLine } from 'lucide-react-native';
import type { InventoryScopeType } from '../hooks/useInventoryScopeBuilder';
import type { SearchableProduct } from '../modals/InventoryProductSearchModal';

interface Props {
  isDarkMode: boolean;
  customProducts: SearchableProduct[];
  lockedCustomSelection?: boolean;
  onConfirmType: (type: InventoryScopeType, supplierId?: string) => void;
}

export const InventoryScopeTypeSelector: React.FC<Props> = ({
  isDarkMode,
  customProducts,
  lockedCustomSelection = false,
  onConfirmType,
}) => {
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  return (
    <View style={styles.optionsContainer}>
      {/* 1. Inventário Geral */}
      {!lockedCustomSelection && (
        <>
          <TouchableOpacity
            testID="scope-general-inventory-btn"
            style={[styles.typeOption, { backgroundColor: surface, borderColor: border }]}
            onPress={() => onConfirmType('general')}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.typeIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <ScanLine size={24} color="#3b82f6" />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.typeTitle, { color: textPrimary }]}>Inventário Geral</Text>
                <Text style={[styles.typeDesc, { color: muted }]}>
                  Conte todos os itens do escopo pelo scanner geral. Os cartões mostram itens contados por fornecedor.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            testID="scope-full-stock-btn"
            style={[styles.typeOption, { backgroundColor: surface, borderColor: border }]}
            onPress={() => onConfirmType('full')}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.typeIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Package size={24} color="#10b981" />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.typeTitle, { color: textPrimary }]}>
                  Livre: Etapas por Fornecedor
                </Text>
                <Text style={[styles.typeDesc, { color: muted }]}>
                  Produtos convencionais ativos organizados em etapas por fornecedor.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            testID="scope-product-variations-btn"
            style={[styles.typeOption, { backgroundColor: surface, borderColor: border }]}
            onPress={() => onConfirmType('product')}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.typeIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Box size={24} color="#7c3aed" />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.typeTitle, { color: textPrimary }]}>Produto específico e suas variações</Text>
                <Text style={[styles.typeDesc, { color: muted }]}>
                  Escolha um produto pai ativo e conte somente as variações dele.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            testID="scope-specific-supplier-btn"
            style={[styles.typeOption, { backgroundColor: surface, borderColor: border }]}
            onPress={() => onConfirmType('supplier')}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.typeIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Building2 size={24} color="#d97706" />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.typeTitle, { color: textPrimary }]}>Fornecedor específico</Text>
                <Text style={[styles.typeDesc, { color: muted }]}>
                  Escolha um fornecedor nos cartões e conte somente os produtos dele.
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </>
      )}

      {lockedCustomSelection && (
          <View style={[styles.expandableBox, { backgroundColor: surface, borderColor: border }]}>
            <Text style={{ color: muted, fontSize: 13, marginBottom: 12 }}>
              Revise os itens copiados antes de iniciar a contagem.
            </Text>
            {customProducts.map((product) => (
              <View
                key={`${product.id}-${product.variation_id || 'main'}`}
                style={[styles.customProductRow, { borderBottomColor: border }]}
              >
                <Text numberOfLines={2} style={[{ color: textPrimary }, styles.flex1]}>
                  {product.name}
                </Text>
              </View>
            ))}
            <TouchableOpacity
              testID="continue-custom-btn"
              style={[
                styles.actionButton,
                { backgroundColor: '#7c3aed', opacity: customProducts.length ? 1 : 0.5 },
              ]}
              disabled={!customProducts.length}
              onPress={() => onConfirmType('custom')}
            >
              <Text style={styles.actionButtonText}>
                Iniciar cópia com {customProducts.length} item(ns)
              </Text>
            </TouchableOpacity>
          </View>
      )}
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
  actionButton: { alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 14 },
  actionButtonText: { color: '#fff', fontWeight: '800' },
  customProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
});
