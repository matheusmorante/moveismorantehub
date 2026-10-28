import React from 'react';
import { Modal, TouchableOpacity, View, Text } from 'react-native';
import {
  PlusCircle,
  Tag,
  Settings,
  Eye,
  EyeOff,
  GitMerge,
  Trash2,
  Globe2,
  MessageCircle,
} from 'lucide-react-native';
import { styles } from './ProductsHeader.styles';
import type { ProductListMode } from './ProductsHeaderModeSelector';

interface ProductsHeaderMenuDropdownProps {
  visible: boolean;
  menuAnchor: { top: number; right: number } | null;
  onClose: () => void;
  dark: boolean;
  mode: ProductListMode;
  availableModes: ProductListMode[];
  canCreateProduct: boolean;
  canCreateComposition: boolean;
  canOpenConfigs: boolean;
  canViewMetaCatalog: boolean;
  canViewWhatsAppMarketplace: boolean;
  showDeactivated: boolean;
  showDeactivatedToggle: boolean;
  showMergedProducts: boolean;
  showTrash: boolean;
  canViewTrash: boolean;
  onNewProduct: () => void;
  onNewComposition?: () => void;
  onModeChange?: (mode: ProductListMode) => void;
  onOpenConfigs: () => void;
  onOpenMetaCatalog?: () => void;
  onOpenWhatsAppMarketplace?: () => void;
  onToggleDeactivated: () => void;
  onToggleMergedProducts?: () => void;
  onToggleTrash?: () => void;
  onOpenFilters: () => void;
}

/**
 * Menu dropdown ancorado ao botão de 3 pontinhos do cabeçalho da listagem de produtos.
 */
export const ProductsHeaderMenuDropdown: React.FC<ProductsHeaderMenuDropdownProps> = ({
  visible,
  menuAnchor,
  onClose,
  dark,
  mode,
  availableModes,
  canCreateProduct,
  canCreateComposition,
  canOpenConfigs,
  canViewMetaCatalog,
  canViewWhatsAppMarketplace,
  showDeactivated,
  showDeactivatedToggle,
  showMergedProducts,
  showTrash,
  canViewTrash,
  onNewProduct,
  onNewComposition,
  onModeChange,
  onOpenConfigs,
  onOpenMetaCatalog,
  onOpenWhatsAppMarketplace,
  onToggleDeactivated,
  onToggleMergedProducts,
  onToggleTrash,
  onOpenFilters,
}) => {
  return (
    <Modal
      visible={visible && menuAnchor !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        {menuAnchor && (
          <View
            style={[
              styles.menuDropdown,
              dark && styles.darkMenu,
              { position: 'absolute', top: menuAnchor.top, right: menuAnchor.right },
            ]}
          >
            {!showTrash && ((mode === 'composition' && canCreateComposition) ||
              (mode === 'standard' && canCreateProduct)) && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  if (mode === 'composition' && onNewComposition) onNewComposition();
                  else onNewProduct();
                }}
              >
                <PlusCircle size={18} color="#2563eb" />
                <Text style={[styles.menuItemText, dark && styles.light]}>
                  {mode === 'composition' ? 'Nova Composição' : 'Novo Produto'}
                </Text>
              </TouchableOpacity>
            )}

            {!showTrash && canCreateComposition && onNewComposition && mode === 'standard' && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onNewComposition();
                }}
              >
                <PlusCircle size={18} color="#10b981" />
                <Text style={[styles.menuItemText, dark && styles.light]}>Nova Composição</Text>
              </TouchableOpacity>
            )}

            {!showTrash && <View style={styles.menuDivider} />}

            {!showTrash && onModeChange && availableModes.includes('categories') && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onModeChange('categories');
                }}
              >
                <Tag size={18} color="#2563eb" />
                <Text style={[styles.menuItemText, dark && styles.light]}>
                  Ambientes e Categorias
                </Text>
              </TouchableOpacity>
            )}

            {!showTrash && canOpenConfigs && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onOpenConfigs();
                }}
              >
                <Settings size={18} color="#475569" />
                <Text style={[styles.menuItemText, dark && styles.light]}>
                  Configurações de Produto
                </Text>
              </TouchableOpacity>
            )}

            {!showTrash && canViewMetaCatalog && onOpenMetaCatalog && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onOpenMetaCatalog();
                }}
                accessibilityRole="button"
              >
                <Globe2 size={18} color="#2563eb" />
                <Text style={[styles.menuItemText, dark && styles.light]}>Catálogo Meta</Text>
              </TouchableOpacity>
            )}

            {!showTrash && canViewWhatsAppMarketplace && onOpenWhatsAppMarketplace && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onOpenWhatsAppMarketplace();
                }}
                accessibilityRole="button"
              >
                <MessageCircle size={18} color="#16a34a" />
                <Text style={[styles.menuItemText, dark && styles.light]}>
                  Marketplace WhatsApp
                </Text>
              </TouchableOpacity>
            )}

            {showDeactivatedToggle &&
              !showTrash &&
              mode !== 'categories' &&
              (canCreateProduct || canCreateComposition) && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    onToggleDeactivated();
                  }}
                >
                  {showDeactivated ? (
                    <EyeOff size={18} color="#64748b" />
                  ) : (
                    <Eye size={18} color="#64748b" />
                  )}
                  <Text style={[styles.menuItemText, dark && styles.light]}>
                    {showDeactivated ? 'Ocultar Inativos' : 'Mostrar Inativos'}
                  </Text>
                </TouchableOpacity>
              )}

            {!showTrash && mode !== 'categories' && onToggleMergedProducts && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onToggleMergedProducts();
                }}
              >
                <GitMerge size={18} color="#64748b" />
                <Text style={[styles.menuItemText, dark && styles.light]}>
                  {showMergedProducts ? 'Ocultar Mesclados' : 'Mostrar Mesclados'}
                </Text>
              </TouchableOpacity>
            )}

            {canViewTrash && onToggleTrash && mode !== 'categories' && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onToggleTrash();
                }}
                accessibilityRole="button"
                accessibilityLabel={showTrash ? 'Voltar aos produtos' : 'Abrir lixeira'}
              >
                <Trash2 size={18} color={showTrash ? '#2563eb' : '#dc2626'} />
                <Text style={[styles.menuItemText, dark && styles.light]}>
                  {showTrash ? 'Voltar aos produtos' : 'Lixeira'}
                </Text>
              </TouchableOpacity>
            )}

            {mode !== 'categories' && (canCreateProduct || canCreateComposition) && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onOpenFilters();
                }}
              >
                <Settings size={18} color="#2563eb" />
                <Text style={[styles.menuItemText, dark && styles.light]}>Filtros avançados</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Modal>
  );
};
