import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
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
  registrationParent: any | null;
  registrationDefaults?: Record<string, any>;
  parentSearch: string;
  parentSearchLoading: boolean;
  parentSearchError: string;
  parentResults: any[];
  isDarkMode: boolean;
  insets: { top: number; bottom: number };
  onCloseOptions: () => void;
  onParentSearchChange: (text: string) => void;
  onStartNewProduct: () => void;
  onStartVariation: (parent: any) => void;
  onCloseForm: () => void;
  onSaveProduct: (productData: any) => Promise<string | undefined>;
}

export const InboundQuickProductModal: React.FC<InboundQuickProductModalProps> = ({
  registrationItem,
  registrationOptionsVisible,
  registrationFormVisible,
  registrationParent,
  registrationDefaults,
  parentSearch,
  parentSearchLoading,
  parentSearchError,
  parentResults,
  isDarkMode,
  insets,
  onCloseOptions,
  onParentSearchChange,
  onStartNewProduct,
  onStartVariation,
  onCloseForm,
  onSaveProduct,
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
              <TextInput
                value={parentSearch}
                onChangeText={onParentSearchChange}
                placeholder="Buscar produto pai por nome ou SKU"
                placeholderTextColor="#94a3b8"
                style={[styles.input, isDarkMode && styles.textDark]}
              />
            </View>
            {parentSearchLoading ? (
              <ActivityIndicator style={{ margin: 12 }} color="#2563eb" />
            ) : null}
            {parentSearchError ? <Text style={styles.errorText}>{parentSearchError}</Text> : null}
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
        product={registrationParent}
        initialData={registrationDefaults}
        showInboundCostPrice={!registrationParent}
        inboundVariationCostPrice={
          registrationParent && registrationItem ? landedUnitCost(registrationItem) : undefined
        }
        dark={isDarkMode}
        onClose={onCloseForm}
        onSave={onSaveProduct}
      />
    </>
  );
};
