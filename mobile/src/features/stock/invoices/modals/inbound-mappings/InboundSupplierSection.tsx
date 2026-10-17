import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Search } from 'lucide-react-native';
import type { Supplier } from './types';
import { styles } from './inboundMappings.styles';

interface InboundSupplierSectionProps {
  supplierId: string;
  currentSupplier?: Supplier;
  details: any;
  hasMatches: boolean;
  isDarkMode: boolean;
  supplierSearch: string;
  supplierSearchLoading: boolean;
  supplierSearchError: string;
  suppliers: Supplier[];
  onSearchChange: (text: string) => void;
  onClearSupplier: () => void;
  onSelectSupplier: (supplier: Supplier) => void;
  onOpenNewSupplier: () => void;
}

export const InboundSupplierSection: React.FC<InboundSupplierSectionProps> = ({
  supplierId,
  currentSupplier,
  details,
  hasMatches,
  isDarkMode,
  supplierSearch,
  supplierSearchLoading,
  supplierSearchError,
  suppliers,
  onSearchChange,
  onClearSupplier,
  onSelectSupplier,
  onOpenNewSupplier,
}) => {
  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Fornecedor</Text>
      {supplierId ? (
        <>
          <View style={styles.supplierRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.itemName, isDarkMode && styles.textDark]}>
                {currentSupplier?.full_name || details?.emitente_nome || 'Fornecedor vinculado'}
              </Text>
              <Text style={[styles.muted, { marginTop: 3 }]}>
                {currentSupplier?.cpf_cnpj || details?.emitente_cnpj || ''}
              </Text>
            </View>
            {hasMatches ? (
              <Text style={styles.lockedText}>Desvincule os itens para alterar</Text>
            ) : (
              <TouchableOpacity onPress={onClearSupplier}>
                <Text style={styles.changeText}>Alterar</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.createAction}
            disabled={hasMatches}
            onPress={onOpenNewSupplier}
          >
            <Text style={[styles.changeText, hasMatches && styles.disabledAction]}>
              + Novo fornecedor
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={[styles.muted, { marginBottom: 10 }]}>
            Selecione o fornecedor para habilitar os vínculos dos produtos.
          </Text>
          <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
            <Search size={17} color="#94a3b8" />
            <TextInput
              value={supplierSearch}
              onChangeText={onSearchChange}
              placeholder="Buscar fornecedor"
              placeholderTextColor="#94a3b8"
              style={[styles.input, isDarkMode && styles.textDark]}
            />
          </View>
          {supplierSearchLoading ? (
            <ActivityIndicator style={{ margin: 12 }} color="#2563eb" />
          ) : null}
          {supplierSearchError ? (
            <Text style={styles.errorText}>{supplierSearchError}</Text>
          ) : null}
          {suppliers.map((supplier) => (
            <TouchableOpacity
              key={supplier.id}
              style={styles.resultRow}
              onPress={() => onSelectSupplier(supplier)}
            >
              <Text style={[styles.itemName, isDarkMode && styles.textDark]}>
                {supplier.full_name}
              </Text>
              <Text style={styles.muted}>{supplier.cpf_cnpj || ''}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.createAction} onPress={onOpenNewSupplier}>
            <Text style={styles.changeText}>+ Novo fornecedor</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};
