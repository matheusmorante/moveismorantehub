import { FormTextInput } from '../../../../../components/shared/FormTextInput';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Plus, Search, X } from 'lucide-react-native';
import { ProductFormScreen } from '../../../../products/screens/ProductFormScreen';
import type { MappingItem } from './types';
import { landedUnitCost } from './inboundCostUtils';
import { styles } from './inboundMappings.styles';

interface InboundQuickProductModalProps {
  registrationItem: MappingItem | null;
  registrationOptionsVisible: boolean;
  registrationFormVisible: boolean;
  editingProduct?: any | null;
  registrationParent: any | null;
  registrationDefaults?: Record<string, any>;
  parentSearch: string;
  parentSearchLoading: boolean;
  parentSearchError: string;
  parentResults: any[];
  onRetryParentSearch: () => void;
  isDarkMode: boolean;
  insets: { top: number; bottom: number };
  onCloseOptions: () => void;
  onParentSearchChange: (text: string) => void;
  onStartNewProduct: () => void;
  onStartVariation: (parent: any) => void;
  onCloseForm: () => void;
  onSaveProduct: (productData: any) => Promise<string | undefined>;
  onSaveEditedProduct: (productData: any) => Promise<string>;
}

export const InboundQuickProductModal: React.FC<InboundQuickProductModalProps> = ({
  registrationItem,
  registrationOptionsVisible,
  registrationFormVisible,
  editingProduct = null,
  registrationParent,
  registrationDefaults,
  parentSearch,
  parentSearchLoading,
  parentSearchError,
  parentResults,
  onRetryParentSearch,
  isDarkMode,
  insets,
  onCloseOptions,
  onParentSearchChange,
  onStartNewProduct,
  onStartVariation,
  onCloseForm,
  onSaveProduct,
  onSaveEditedProduct,
}) => {
  return (
    <>
      <Modal
        visible={registrationOptionsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onCloseOptions}
      >
        <View
          style={[
            styles.container,
            isDarkMode && styles.containerDark,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <View style={[styles.header, isDarkMode && styles.headerDark]}>
            <Text style={[styles.title, isDarkMode && styles.textDark]}>
              Cadastrar produto vinculado à NF-e
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onCloseOptions}
              accessibilityLabel="Fechar opções de cadastro"
            >
              <X size={22} color={isDarkMode ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.muted, isDarkMode && styles.textDark]}>
              Item {registrationItem?.itemNumber}: {registrationItem?.productDescription}
            </Text>
            <TouchableOpacity
              style={styles.registrationChoice}
              onPress={onStartNewProduct}
            >
              <Plus size={18} color="#2563eb" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, isDarkMode && styles.textDark]}>
                  Cadastrar produto novo
                </Text>
                <Text style={styles.muted}>
                  Abre o cadastro completo do app já com fornecedor e custo preenchidos.
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark, { marginTop: 16 }]}>
              Adicionar variação a um produto existente
            </Text>
            <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
              <Search size={17} color="#94a3b8" />
              <FormTextInput
                value={parentSearch}
                onChangeText={onParentSearchChange}
                accessibilityLabel="Buscar produto existente para adicionar uma variação"
                accessibilityHint="Digite pelo menos três caracteres. São exibidos até cinco produtos."
                placeholder="Buscar produto por nome ou SKU"
                placeholderTextColor="#94a3b8"
                style={[styles.input, isDarkMode && styles.textDark]}
              />
            </View>
            {parentSearch.trim().length > 0 && parentSearch.trim().length < 3 ? (
              <Text style={[styles.muted, { marginTop: 8 }]}>Digite pelo menos 3 caracteres para buscar.</Text>
            ) : null}
            {parentSearchLoading ? (
              <ActivityIndicator style={{ margin: 12 }} color="#2563eb" />
            ) : null}
            {parentSearchError ? (
              <View style={styles.searchErrorRow}>
                <Text style={[styles.errorText, { flex: 1 }]}>{parentSearchError}</Text>
                <TouchableOpacity
                  disabled={parentSearchLoading}
                  onPress={onRetryParentSearch}
                  accessibilityRole="button"
                  accessibilityLabel="Tentar buscar produtos novamente"
                >
                  <Text style={styles.changeText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {parentSearch.trim().length >= 3 && !parentSearchLoading && !parentSearchError && parentResults.length === 0 ? (
              <Text style={[styles.muted, { marginTop: 8 }]}>Nenhum produto encontrado.</Text>
            ) : null}
            {parentResults.map((parent) => (
              <TouchableOpacity
                key={parent.id}
                style={styles.resultRow}
                onPress={() => onStartVariation(parent)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, isDarkMode && styles.textDark]}>
                    {parent.name}
                  </Text>
                  <Text style={styles.muted}>
                    SKU: {parent.code || '—'} · {(parent.product_variations || []).length} variações
                  </Text>
                </View>
                <Plus size={18} color="#2563eb" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
      <ProductFormScreen
        visible={registrationFormVisible}
        product={editingProduct || registrationParent}
        initialData={editingProduct ? undefined : registrationDefaults}
        showInboundCostPrice={!editingProduct && !registrationParent}
        inboundVariationCostPrice={
          registrationParent && registrationItem ? landedUnitCost(registrationItem) : undefined
        }
        enableDraftAutoSave={false}
        dark={isDarkMode}
        onClose={onCloseForm}
        onSave={editingProduct ? onSaveEditedProduct : onSaveProduct}
      />
    </>
  );
};
