import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, ChevronRight, Lock, Search, X } from 'lucide-react-native';
import type { Supplier } from './types';
import { styles } from './inboundMappings.styles';

interface InboundSupplierSectionProps {
  supplierId: string;
  currentSupplier?: Supplier;
  details: any;
  hasMatches: boolean;
  supplierLocked?: boolean;
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
  supplierLocked = false,
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
  const selectedSupplierName = currentSupplier?.full_name || supplierSearch;
  const searchValue = supplierSearch || (supplierId ? selectedSupplierName : '');
  const inputLocked = hasMatches || supplierLocked;

  const handleSearchChange = (value: string) => {
    if (inputLocked) return;
    if (supplierId && value.trim() !== selectedSupplierName.trim()) onClearSupplier();
    onSearchChange(value);
  };

  const clearSupplier = () => {
    if (inputLocked) return;
    onClearSupplier();
    onSearchChange('');
  };

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Fornecedor</Text>
      <View style={[styles.supplierIssuer, isDarkMode && styles.supplierIssuerDark]}>
        <Text style={styles.supplierIssuerLabel}>Emitente da NF-e</Text>
        <Text style={[styles.itemName, isDarkMode && styles.textDark]}>
          {details?.emitente_nome || 'Emitente não identificado'}
        </Text>
        <Text style={[styles.muted, { marginTop: 3 }]}>
          {details?.emitente_cnpj || 'CNPJ/CPF não encontrado'}
        </Text>
      </View>

      <Text style={[styles.supplierPickerLabel, isDarkMode && styles.textDark]}>
        Fornecedor cadastrado
      </Text>
      <View
        style={[
          styles.searchBox,
          isDarkMode && styles.searchBoxDark,
          supplierId && styles.supplierSearchSelected,
          supplierId && isDarkMode && styles.supplierSearchSelectedDark,
          inputLocked && styles.supplierSearchDisabled,
        ]}
      >
        <Search size={17} color="#94a3b8" />
        <TextInput
          value={searchValue}
          onChangeText={handleSearchChange}
          placeholder={
            supplierLocked
              ? 'Fornecedor de Salvados fixado em “Não se aplica”.'
              : hasMatches
              ? 'Fornecedor fixado para os itens vinculados'
              : 'Digite 2 ou mais letras para buscar fornecedor'
          }
          placeholderTextColor="#94a3b8"
          accessibilityLabel="Buscar fornecedor para vincular à NF-e"
          accessibilityHint={
            supplierLocked
              ? 'Fornecedor de Salvados: a NF não gera movimentação de estoque.'
              : hasMatches
              ? 'Desvincule os itens da nota antes de trocar o fornecedor.'
              : 'Digite pelo menos duas letras e selecione um resultado.'
          }
          editable={!inputLocked}
          returnKeyType="search"
          style={[styles.input, isDarkMode && styles.textDark]}
        />
        {supplierId ? (
          inputLocked ? (
            <Lock size={16} color="#d97706" />
          ) : (
            <>
              <Check size={16} color="#16a34a" />
              <TouchableOpacity
                onPress={clearSupplier}
                accessibilityRole="button"
                accessibilityLabel="Limpar fornecedor selecionado"
                style={styles.supplierClearButton}
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </>
          )
        ) : null}
      </View>

      {supplierLocked ? (
        <Text style={[styles.supplierSearchStatus, styles.supplierSearchLocked]}>
          Este fornecedor fica fixo e todos os itens permanecem em “Não se aplica”, sem movimentação de estoque.
        </Text>
      ) : hasMatches ? (
        <Text style={[styles.supplierSearchStatus, styles.supplierSearchLocked]}>
          Para trocar o fornecedor, desvincule primeiro todos os produtos da nota.
        </Text>
      ) : supplierId ? (
        <Text style={[styles.supplierSearchStatus, styles.supplierSearchLinked]}>
          Fornecedor vinculado. Os produtos estão liberados.
        </Text>
      ) : (
        <Text style={styles.supplierSearchStatus}>
          Selecione o fornecedor para habilitar os vínculos dos produtos.
        </Text>
      )}

      {supplierSearchLoading ? (
        <View style={styles.supplierSearchProgress}>
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.muted}>Buscando fornecedores...</Text>
        </View>
      ) : null}
      {supplierSearchError ? <Text style={styles.errorText}>{supplierSearchError}</Text> : null}
      {!supplierId &&
      !supplierSearchLoading &&
      !supplierSearchError &&
      supplierSearch.trim().length < 2 ? (
        <Text style={styles.supplierSearchHint}>
          Digite ao menos 2 caracteres para iniciar a busca.
        </Text>
      ) : null}
      {!supplierId &&
      !supplierSearchLoading &&
      !supplierSearchError &&
      supplierSearch.trim().length >= 2 &&
      suppliers.length === 0 ? (
        <Text style={styles.supplierSearchHint}>
          Nenhum fornecedor encontrado. Use “Novo fornecedor” se ele ainda não estiver cadastrado.
        </Text>
      ) : null}
      {!supplierLocked && !supplierId && suppliers.length > 0 ? (
        <Text style={[styles.supplierResultsLabel, isDarkMode && styles.textDark]}>
          Toque em um fornecedor para vinculá-lo
        </Text>
      ) : null}
      {!supplierLocked && !supplierId &&
        suppliers.map((supplier) => (
          <TouchableOpacity
            key={supplier.id}
            style={[styles.supplierOption, isDarkMode && styles.supplierOptionDark]}
            onPress={() => onSelectSupplier(supplier)}
            accessibilityRole="button"
            accessibilityLabel={`Selecionar fornecedor ${supplier.full_name}${supplier.cpf_cnpj ? `, ${supplier.cpf_cnpj}` : ''}`}
            accessibilityHint="Vincula este fornecedor à nota fiscal."
          >
            <View style={styles.supplierOptionText}>
              <Text style={[styles.supplierOptionName, isDarkMode && styles.textDark]}>
                {supplier.full_name}
              </Text>
              {supplier.cpf_cnpj ? (
                <Text style={styles.supplierOptionMeta}>{supplier.cpf_cnpj}</Text>
              ) : null}
            </View>
            <View style={styles.supplierOptionAction}>
              <Text style={styles.supplierOptionActionText}>Selecionar</Text>
              <ChevronRight size={16} color="#2563eb" />
            </View>
          </TouchableOpacity>
        ))}

      {!supplierLocked ? <TouchableOpacity
        style={styles.createAction}
        disabled={inputLocked}
        onPress={onOpenNewSupplier}
        accessibilityRole="button"
        accessibilityState={{ disabled: inputLocked }}
      >
        <Text style={[styles.changeText, inputLocked && styles.disabledAction]}>
          + Novo fornecedor
        </Text>
      </TouchableOpacity> : null}
    </View>
  );
};
