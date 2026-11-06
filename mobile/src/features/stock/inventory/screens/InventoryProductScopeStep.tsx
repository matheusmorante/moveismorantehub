import React from 'react';
import { Check, Search, X } from 'lucide-react-native';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import type { InventoryScopeProductParent } from '../services/inventoryScopeProductSearch';
import { styles } from './inventoryScopeScreenContent.styles';

interface Colors {
  border: string;
  muted: string;
  surface: string;
  textPrimary: string;
}

interface ContentProps {
  isDarkMode: boolean;
  colors: Colors;
  isLoadingProductCatalog: boolean;
  productCatalogError: string;
  productParentsCount: number;
  selectedProduct: InventoryScopeProductParent | undefined;
  onRetryProductCatalog: () => void;
  onOpenSearch: () => void;
  onClearSelection: () => void;
}

interface FooterProps {
  colors: Colors;
  loadingData: boolean;
  isLoadingProductCatalog: boolean;
  selectedProduct: InventoryScopeProductParent | undefined;
  onBack: () => void;
  onContinue: () => void;
}

export const InventoryProductScopeStepContent: React.FC<ContentProps> = ({
  isDarkMode,
  colors,
  isLoadingProductCatalog,
  productCatalogError,
  productParentsCount,
  selectedProduct,
  onRetryProductCatalog,
  onOpenSearch,
  onClearSelection,
}) => {
  const { border, muted, surface, textPrimary } = colors;

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '800' }}>
          Etapa 1 · Escolha o produto pai
        </Text>
        <Text style={{ color: muted, fontSize: 13, lineHeight: 19, marginTop: 5 }}>
          Pesquise nos produtos ativos do ERP. A próxima etapa mostrará as variações para contar.
        </Text>
      </View>
      {!selectedProduct && (
        <TouchableOpacity
          testID="scope-product-parent-search"
          accessibilityRole="button"
          accessibilityLabel="Buscar produto pai ativo"
          onPress={onOpenSearch}
          style={[styles.productSearchBox, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: border }]}
        >
          <Search size={19} color={muted} />
          <Text style={[styles.productSearchInput, { color: muted }]}>Nome ou código do produto...</Text>
        </TouchableOpacity>
      )}
      {selectedProduct && (
        <View style={[styles.selectedProductCard, { backgroundColor: isDarkMode ? '#2e1065' : '#f5f3ff', borderColor: isDarkMode ? '#6d28d9' : '#c4b5fd' }]}>
          <View style={styles.selectedProductIcon}><Check size={18} color="#ffffff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '800' }} numberOfLines={2}>
              {selectedProduct.name}
            </Text>
            <Text style={{ color: muted, fontSize: 12, marginTop: 3 }}>
              {selectedProduct.variationCount} variações ativas
            </Text>
          </View>
          <TouchableOpacity
            testID="scope-product-parent-clear"
            accessibilityRole="button"
            accessibilityLabel={`Desselecionar ${selectedProduct.name}`}
            onPress={onClearSelection}
            style={styles.clearSelectedProductButton}
          >
            <X size={20} color={isDarkMode ? '#ddd6fe' : '#6d28d9'} />
          </TouchableOpacity>
        </View>
      )}
      {!selectedProduct && (isLoadingProductCatalog ? (
        <View style={styles.productCatalogLoading}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: muted, marginTop: 10 }}>Carregando produtos ativos...</Text>
        </View>
      ) : productCatalogError ? (
        <View style={[styles.errorBox, { backgroundColor: surface, borderColor: border }]}>
          <Text style={{ color: textPrimary, textAlign: 'center' }}>{productCatalogError}</Text>
          <TouchableOpacity onPress={onRetryProductCatalog} style={styles.retryButton}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : null)}
      {!isLoadingProductCatalog && !productCatalogError && productParentsCount === 0 && (
        <Text style={{ color: '#b45309', fontSize: 13, fontWeight: '700', textAlign: 'center', padding: 16 }}>
          Não há produtos ativos com variações disponíveis para contar.
        </Text>
      )}
    </View>
  );
};

export const InventoryProductScopeStepFooter: React.FC<FooterProps> = ({
  colors,
  loadingData,
  isLoadingProductCatalog,
  selectedProduct,
  onBack,
  onContinue,
}) => {
  const { border, surface, textPrimary } = colors;

  return (
    <View style={[styles.productStepFooter, { backgroundColor: surface, borderTopColor: border }]}>
      <TouchableOpacity
        accessibilityRole="button"
        disabled={isLoadingProductCatalog || loadingData}
        onPress={onBack}
        style={[styles.productBackButton, { borderColor: border }]}
      >
        <Text style={{ color: textPrimary, fontWeight: '700' }}>Voltar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="scope-product-next-btn"
        accessibilityRole="button"
        disabled={!selectedProduct || isLoadingProductCatalog || loadingData}
        onPress={onContinue}
        style={[styles.productNextButton, (!selectedProduct || isLoadingProductCatalog || loadingData) && { opacity: 0.5 }]}
      >
        <Text style={styles.productNextButtonText}>Próxima etapa</Text>
      </TouchableOpacity>
    </View>
  );
};
