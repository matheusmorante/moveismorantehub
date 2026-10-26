import {
  ArrowLeft,
  MoreVertical,
  Search,
  X,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './header/ProductsHeader.styles';
import type { ProductListMode } from './header/ProductsHeaderModeSelector';
import { ProductsHeaderMenuDropdown } from './header/ProductsHeaderMenuDropdown';
import { ProductsHeaderFiltersSheet } from './header/ProductsHeaderFiltersSheet';

interface Props {
  mode?: ProductListMode;
  availableModes?: ProductListMode[];
  onModeChange?: (mode: ProductListMode) => void;
  onBack?: () => void;
  dark: boolean;
  search: string;
  totalCount: number;
  onSearch: (value: string) => void;
  onSubmitSearch?: () => void;
  onNewProduct: () => void;
  canCreateProduct?: boolean;
  onNewComposition?: () => void;
  canCreateComposition?: boolean;
  onOpenConfigs: () => void;
  canOpenConfigs?: boolean;
  onOpenMetaCatalog?: () => void;
  onOpenWhatsAppMarketplace?: () => void;
  canViewMetaCatalog?: boolean;
  canViewWhatsAppMarketplace?: boolean;
  showDeactivated: boolean;
  onToggleDeactivated: () => void;
  showMergedProducts?: boolean;
  onToggleMergedProducts?: () => void;
  isAdministrator?: boolean;
  showTestProducts?: boolean;
  onToggleTestProducts?: () => void;
  showTrash?: boolean;
  canViewTrash?: boolean;
  showCount?: boolean;
  onToggleTrash?: () => void;
  canFilterByCategory: boolean;
  categories: any[];
  statusFilter: 'all' | 'active' | 'disabled' | 'draft';
  categoryFilter: string;
  catalogStatusFilter: 'all' | 'published' | 'hidden';
  generalTypeFilter?: 'all' | 'product' | 'service';
  onStatusFilterChange: (value: 'all' | 'active' | 'disabled' | 'draft') => void;
  onCategoryFilterChange: (value: string) => void;
  onCatalogStatusFilterChange: (value: 'all' | 'published' | 'hidden') => void;
  onGeneralTypeFilterChange?: (value: 'all' | 'product' | 'service') => void;
  onResetFilters?: () => void;
}

/**
 * Cabeçalho principal da listagem de produtos no app mobile.
 * Coordena barra de busca, seletor de modo, menu de contexto e modal de filtros.
 */
export function ProductsHeader({
  mode = 'standard',
  availableModes = ['standard', 'composition', 'categories'],
  onModeChange,
  onBack,
  dark,
  search,
  totalCount,
  onSearch,
  onSubmitSearch,
  onNewProduct,
  canCreateProduct = false,
  onNewComposition,
  canCreateComposition = false,
  onOpenConfigs,
  canOpenConfigs = false,
  onOpenMetaCatalog,
  onOpenWhatsAppMarketplace,
  canViewMetaCatalog = false,
  canViewWhatsAppMarketplace = false,
  showDeactivated,
  onToggleDeactivated,
  showMergedProducts = false,
  onToggleMergedProducts,
  isAdministrator = false,
  showTestProducts = false,
  onToggleTestProducts,
  showTrash = false,
  canViewTrash = false,
  showCount = true,
  onToggleTrash,
  canFilterByCategory,
  categories,
  statusFilter,
  categoryFilter,
  catalogStatusFilter,
  generalTypeFilter = 'all',
  onStatusFilterChange,
  onCategoryFilterChange,
  onCatalogStatusFilterChange,
  onGeneralTypeFilterChange,
  onResetFilters,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const menuBtnRef = useRef<View>(null);

  const handleOpenMenu = () => {
    menuBtnRef.current?.measure((_x, _y, _width, height, _pageX, pageY) => {
      setMenuAnchor({ top: pageY + height + 4, right: 16 });
      setShowMenu(true);
    });
  };

  return (
    <View style={styles.container}>
      {/* Topo com Título, Contador e Menu de 3 Pontinhos */}
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Voltar para o menu de Produtos"
              style={[styles.backButton, dark && styles.darkBackButton]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <ArrowLeft size={18} color={dark ? '#f8fafc' : '#334155'} />
            </TouchableOpacity>
          )}
          <Text numberOfLines={1} style={[styles.title, dark && styles.light]}>
            {showTrash
              ? 'Lixeira'
              : mode === 'composition'
              ? 'Composições'
              : mode === 'categories'
                ? 'Ambientes e Categorias'
                : 'Produtos'}
          </Text>
          {showCount && mode !== 'categories' && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{totalCount}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          ref={menuBtnRef as any}
          onPress={handleOpenMenu}
          accessibilityRole="button"
          accessibilityLabel="Opções de produtos"
          style={[styles.menuBtn, dark && styles.darkMenuBtn]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MoreVertical size={18} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Barra de Pesquisa */}
      {mode !== 'categories' && (
        <View style={[styles.searchBox, dark && styles.darkSearch]}>
          <Search size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={onSearch}
            onSubmitEditing={onSubmitSearch}
            returnKeyType="search"
            placeholder="Buscar por nome, código ou SKU (mín. 3 caracteres)..."
            placeholderTextColor="#94a3b8"
            style={[styles.input, dark && styles.light, { outlineStyle: 'none' } as any]}
          />
          {Boolean(search) && (
            <TouchableOpacity
              onPress={() => onSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Dropdown Menu Ancorado */}
      <ProductsHeaderMenuDropdown
        visible={showMenu}
        menuAnchor={menuAnchor}
        onClose={() => setShowMenu(false)}
        dark={dark}
        mode={mode}
        availableModes={availableModes}
        canCreateProduct={canCreateProduct}
        canCreateComposition={canCreateComposition}
        canOpenConfigs={canOpenConfigs}
        canViewMetaCatalog={canViewMetaCatalog}
        canViewWhatsAppMarketplace={canViewWhatsAppMarketplace}
        showDeactivated={showDeactivated}
        showMergedProducts={showMergedProducts}
        showTrash={showTrash}
        canViewTrash={canViewTrash}
        onToggleTrash={onToggleTrash}
        onNewProduct={onNewProduct}
        onNewComposition={onNewComposition}
        onModeChange={onModeChange}
        onOpenConfigs={onOpenConfigs}
        onOpenMetaCatalog={onOpenMetaCatalog}
        onOpenWhatsAppMarketplace={onOpenWhatsAppMarketplace}
        onToggleDeactivated={onToggleDeactivated}
        onToggleMergedProducts={onToggleMergedProducts}
        onOpenFilters={() => setShowFilters(true)}
      />

      {/* Modal de Filtros Avançados */}
      <ProductsHeaderFiltersSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        dark={dark}
        mode={mode}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        generalTypeFilter={generalTypeFilter}
        onGeneralTypeFilterChange={onGeneralTypeFilterChange}
        showMergedProducts={showMergedProducts}
        isAdministrator={isAdministrator}
        showTestProducts={showTestProducts}
        onToggleTestProducts={onToggleTestProducts}
        showTrash={showTrash}
        onToggleMergedProducts={onToggleMergedProducts}
        catalogStatusFilter={catalogStatusFilter}
        onCatalogStatusFilterChange={onCatalogStatusFilterChange}
        canFilterByCategory={canFilterByCategory}
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={onCategoryFilterChange}
        onResetFilters={onResetFilters}
      />
    </View>
  );
}
