import type React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Plus, Search, Truck, X } from 'lucide-react-native';
import { getProductSupplierDisplayName } from '../../../../../../shared-utils/productSupplierDisplayName';
import type { MobileProductSupplier } from '../../services/mobileSupplierService';
import { styles } from './productFormPricesTab.styles';
import { FormTextInput } from '../../../../components/shared/FormTextInput';

export const MIN_SUPPLIER_SEARCH_LENGTH = 3;
export const MAX_VISIBLE_SUPPLIER_SUGGESTIONS = 5;

interface Props {
  dark: boolean;
  isOwnProduction: boolean;
  supplierError?: boolean;
  supplierSearch: string;
  setSupplierSearch: React.Dispatch<React.SetStateAction<string>>;
  selectedSupplierIds: string[];
  setShowSupplierForm: React.Dispatch<React.SetStateAction<boolean>>;
  supplierLoadState: 'loading' | 'loaded' | 'error';
  supplierLoadErrorMessage: string;
  setSupplierLoadAttempt: React.Dispatch<React.SetStateAction<number>>;
  suppliers: MobileProductSupplier[];
  visibleSuppliers: MobileProductSupplier[];
  addSupplier: (supplier: MobileProductSupplier) => void;
  removeSupplier: (supplierId: string) => void;
}

export const ProductFormSupplierSection: React.FC<Props> = ({
  dark,
  isOwnProduction,
  supplierError,
  supplierSearch,
  setSupplierSearch,
  selectedSupplierIds,
  setShowSupplierForm,
  supplierLoadState,
  supplierLoadErrorMessage,
  setSupplierLoadAttempt,
  suppliers,
  visibleSuppliers,
  addSupplier,
  removeSupplier,
}) => (
  <>
    {/* ─── Fornecedores ─── */}
    {!isOwnProduction && <View style={[styles.card, dark && styles.darkCard]}>
      <View style={styles.supplierHeading}>
        <View style={styles.cardHeader}>
          <Truck size={16} color="#2563eb" />
          <Text style={[styles.cardTitle, dark && styles.lightText]}>
            <Text style={supplierError && styles.invalidLabel}>Fornecedores</Text>{' '}
            <Text style={{ color: '#ef4444' }}>*</Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowSupplierForm(true)}
          style={styles.newSupplierButton}
        >
          <Plus size={13} color="#2563eb" />
          <Text style={styles.newSupplierText}>Novo</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, dark && styles.dimText]}>
        Buscar fornecedor · {selectedSupplierIds.length}/3
      </Text>
      <View
        style={[
          styles.searchInputWrapper,
          dark && styles.darkSearchInputWrapper,
          supplierError && styles.invalidSearchInput,
        ]}
      >
        <Search size={14} color={supplierError ? '#ef4444' : dark ? '#94a3b8' : '#64748b'} />
        <FormTextInput
          style={[styles.searchInput, dark && styles.darkSearchInput, dark && styles.lightText]}
          accessibilityLabel="Buscar fornecedor por nome ou razão social"
          accessibilityHint={
            supplierError ? 'Adicione ao menos um fornecedor.' : 'Digite 3 ou mais letras para buscar.'
          }
          placeholder="Digite 3 ou mais letras para buscar..."
          placeholderTextColor={dark ? '#64748b' : '#94a3b8'}
          value={supplierSearch}
          onChangeText={setSupplierSearch}
          autoCapitalize="none"
        />
        {supplierSearch.length > 0 && (
          <TouchableOpacity
            onPress={() => setSupplierSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} color={dark ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        )}
      </View>

      {supplierError && (
        <Text style={styles.supplierErrorText} accessibilityRole="alert">
          Adicione ao menos um fornecedor.
        </Text>
      )}

      {supplierSearch.trim().length > 0 && supplierSearch.trim().length < MIN_SUPPLIER_SEARCH_LENGTH && (
        <Text style={[styles.helperText, dark && styles.dimText]}>
          Digite pelo menos 3 caracteres para exibir as sugestões.
        </Text>
      )}

      <View style={styles.supplierGrid}>
        {supplierLoadState === 'loading' ? (
          <View style={styles.supplierStateRow}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={[styles.emptySupplierText, dark && styles.dimText]}>
              Carregando fornecedores...
            </Text>
          </View>
        ) : supplierLoadState === 'error' ? (
          <View style={styles.supplierLoadError}>
            <Text style={styles.supplierLoadErrorText} accessibilityRole="alert">
              {supplierLoadErrorMessage || 'Não foi possível carregar os fornecedores.'}
            </Text>
            <TouchableOpacity
              onPress={() => setSupplierLoadAttempt((attempt) => attempt + 1)}
              accessibilityRole="button"
              style={styles.supplierRetryButton}
            >
              <Text style={styles.supplierRetryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : suppliers.length === 0 ? (
          <Text style={[styles.emptySupplierText, dark && styles.dimText]}>
            Nenhum fornecedor cadastrado
          </Text>
        ) : supplierSearch.trim().length < MIN_SUPPLIER_SEARCH_LENGTH ? (
          <Text style={[styles.emptySupplierText, dark && styles.dimText]}>
            Digite 3 ou mais caracteres para buscar fornecedores.
          </Text>
        ) : visibleSuppliers.length === 0 ? (
          <Text style={[styles.emptySupplierText, dark && styles.dimText]}>
            Nenhum fornecedor encontrado com este termo.
          </Text>
        ) : (
          visibleSuppliers.map((sup) => {
            return (
              <TouchableOpacity
                key={sup.id}
                activeOpacity={0.8}
                onPress={() => addSupplier(sup)}
                disabled={selectedSupplierIds.length >= 3}
                style={[
                  styles.supplierChip,
                  dark && styles.darkSupplierChip,
                  selectedSupplierIds.length >= 3 && styles.disabledButton,
                ]}
              >
                <Text
                  style={[styles.supplierChipText, dark && styles.lightText]}
                  numberOfLines={1}
                >
                  {sup.nickname || sup.full_name}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
      {selectedSupplierIds.length > 0 && (
        <View style={styles.selectedSuppliers}>
          {selectedSupplierIds.map((id) => {
            const supplier = suppliers.find((item) => item.id === id);
            const name = getProductSupplierDisplayName(supplier) || 'Fornecedor';
            return (
              <TouchableOpacity
                key={id}
                onPress={() => removeSupplier(id)}
                style={styles.selectedSupplierChip}
                accessibilityLabel={`Remover fornecedor ${name}`}
              >
                <Text style={styles.selectedSupplierName} numberOfLines={1}>
                  {name}
                </Text>
                <X size={12} color="#1d4ed8" />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>}

  </>
);
