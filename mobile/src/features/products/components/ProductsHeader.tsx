import { FormTextInput } from '../../../components/shared/FormTextInput';
import {
  ArrowLeft,
  MoreVertical,
  Search,
  X,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './header/ProductsHeader.styles';
import type { ProductListMode } from './header/ProductsHeaderModeSelector';
import { ProductsHeaderMenuDropdown } from './header/ProductsHeaderMenuDropdown';

interface Props {
  mode?: ProductListMode;
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
  onOpenWhatsAppMarketplace?: () => void;
  canViewWhatsAppMarketplace?: boolean;
  showDeactivated: boolean;
  onToggleDeactivated: () => void;
  showMergedProducts?: boolean;
  onToggleMergedProducts?: () => void;
  showTrash?: boolean;
  canViewTrash?: boolean;
  showCount?: boolean;
  onToggleTrash?: () => void;
  statusFilter: 'all' | 'active' | 'disabled' | 'draft';
}

/**
 * Cabeçalho principal da listagem de produtos no app mobile.
 * Coordena barra de busca e menu de contexto da listagem de produtos.
 */
export function ProductsHeader({
  mode = 'standard',
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
  onOpenWhatsAppMarketplace,
  canViewWhatsAppMarketplace = false,
  showDeactivated,
  onToggleDeactivated,
  showMergedProducts = false,
  onToggleMergedProducts,
  showTrash = false,
  canViewTrash = false,
  showCount = true,
  onToggleTrash,
  statusFilter,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
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
              ? 'Produto composto'
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
          style={styles.menuBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MoreVertical size={18} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Barra de Pesquisa */}
      {mode !== 'categories' && (
        <View style={[styles.searchBox, dark && styles.darkSearch]}>
          <Search size={16} color="#94a3b8" />
          <FormTextInput
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
        canCreateProduct={canCreateProduct}
        canCreateComposition={canCreateComposition}
        canViewWhatsAppMarketplace={canViewWhatsAppMarketplace}
        showDeactivated={showDeactivated}
        showDeactivatedToggle={search.trim().length === 0 && statusFilter === 'all'}
        showMergedProducts={showMergedProducts}
        showTrash={showTrash}
        canViewTrash={canViewTrash}
        onToggleTrash={onToggleTrash}
        onNewProduct={onNewProduct}
        onNewComposition={onNewComposition}
        onOpenWhatsAppMarketplace={onOpenWhatsAppMarketplace}
        onToggleDeactivated={onToggleDeactivated}
        onToggleMergedProducts={onToggleMergedProducts}
      />
    </View>
  );
}
