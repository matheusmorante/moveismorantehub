import {
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
import {
  ProductsHeaderModeSelector,
  ProductListMode,
} from './header/ProductsHeaderModeSelector';
import { ProductsHeaderMenuDropdown } from './header/ProductsHeaderMenuDropdown';
import { ProductsHeaderFiltersSheet } from './header/ProductsHeaderFiltersSheet';

interface Props {
  mode?: ProductListMode;
  availableModes?: ProductListMode[];
  onModeChange?: (mode: ProductListMode) => void;
  dark: boolean;
  search: string;
  totalCount: number;
  onSearch: (value: string) => void;
  onNewProduct: () => void;
  canCreateProduct?: boolean;
  onNewComposition?: () => void;
  canCreateComposition?: boolean;
  onOpenConfigs: () => void;
  canOpenConfigs?: boolean;
  onOpenReconciliation?: () => void;
  canViewReconciliation?: boolean;
  showDeactivated: boolean;
  onToggleDeactivated: () => void;
  showMergedProducts?: boolean;
  onToggleMergedProducts?: () => void;
  categories: any[];
  statusFilter: 'all' | 'active' | 'disabled' | 'draft';
  categoryFilter: string;
  catalogStatusFilter: 'all' | 'published' | 'hidden';
  generalTypeFilter?: 'all' | 'product' | 'service';
  onStatusFilterChange: (value: 'all' | 'active' | 'disabled' | 'draft') => void;
  onCategoryFilterChange: (value: string) => void;
  onCatalogStatusFilterChange: (value: 'all' | 'published' | 'hidden') => void;
  onGeneralTypeFilterChange?: (value: 'all' | 'product' | 'service') => void;
}

/**
 * Cabeçalho principal da listagem de produtos no app mobile.
 * Coordena barra de busca, seletor de modo, menu de contexto e modal de filtros.
 */
export function ProductsHeader({
  mode = 'standard',
  availableModes = ['standard', 'composition', 'categories'],
  onModeChange,
  dark,
  search,
  totalCount,
  onSearch,
  onNewProduct,
  canCreateProduct = false,
  onNewComposition,
  canCreateComposition = false,
  onOpenConfigs,
  canOpenConfigs = false,
  onOpenReconciliation,
  canViewReconciliation = false,
  showDeactivated,
  onToggleDeactivated,
  showMergedProducts = false,
  onToggleMergedProducts,
  categories,
  statusFilter,
  categoryFilter,
  catalogStatusFilter,
  generalTypeFilter = 'all',
  onStatusFilterChange,
  onCategoryFilterChange,
  onCatalogStatusFilterChange,
  onGeneralTypeFilterChange,
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
          <Text style={[styles.title, dark && styles.light]}>
            {mode === 'composition'
              ? 'Composições'
              : mode === 'categories'
                ? 'Ambientes e Categorias'
                : 'Produtos'}
          </Text>
          <View style={[styles.counterBadge, mode === 'categories' && { display: 'none' }]}>
            {mode !== 'categories' && <Text style={styles.counterText}>{totalCount}</Text>}
          </View>
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

      {/* Seletor de Modo (Produtos, Composições, Ambientes/Categorias) */}
      {onModeChange && (
        <ProductsHeaderModeSelector
          mode={mode}
          availableModes={availableModes}
          onModeChange={onModeChange}
        />
      )}

      {/* Barra de Pesquisa */}
      {mode !== 'categories' && (
        <View style={[styles.searchBox, dark && styles.darkSearch]}>
          <Search size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={onSearch}
            placeholder={
              mode === 'composition'
                ? 'Buscar composições (mín. 3 caracteres)...'
                : 'Buscar produtos por nome (mín. 3 caracteres)...'
            }
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
        canViewReconciliation={canViewReconciliation}
        showDeactivated={showDeactivated}
        showMergedProducts={showMergedProducts}
        onNewProduct={onNewProduct}
        onNewComposition={onNewComposition}
        onModeChange={onModeChange}
        onOpenConfigs={onOpenConfigs}
        onOpenReconciliation={onOpenReconciliation}
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
        onToggleMergedProducts={onToggleMergedProducts}
        catalogStatusFilter={catalogStatusFilter}
        onCatalogStatusFilterChange={onCatalogStatusFilterChange}
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={onCategoryFilterChange}
      />
    </View>
  );
}
