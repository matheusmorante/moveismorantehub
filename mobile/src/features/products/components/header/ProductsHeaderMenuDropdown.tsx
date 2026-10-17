import React from 'react';
import { Modal, TouchableOpacity, View, Text } from 'react-native';
import {
  PlusCircle,
  Tag,
  Settings,
  ArrowLeftRight,
  Eye,
  EyeOff,
  GitMerge,
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
  canViewReconciliation: boolean;
  showDeactivated: boolean;
  showMergedProducts: boolean;
  onNewProduct: () => void;
  onNewComposition?: () => void;
  onModeChange?: (mode: ProductListMode) => void;
  onOpenConfigs: () => void;
  onOpenReconciliation?: () => void;
  onToggleDeactivated: () => void;
  onToggleMergedProducts?: () => void;
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
  canViewReconciliation,
  showDeactivated,
  showMergedProducts,
  onNewProduct,
  onNewComposition,
  onModeChange,
  onOpenConfigs,
  onOpenReconciliation,
  onToggleDeactivated,
  onToggleMergedProducts,
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
            {((mode === 'composition' && canCreateComposition) ||
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

            {canCreateComposition && onNewComposition && mode === 'standard' && (
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

            <View style={styles.menuDivider} />

            {onModeChange && availableModes.includes('categories') && (
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

            {canOpenConfigs && (
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

            {canViewReconciliation && onOpenReconciliation && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onOpenReconciliation();
                }}
              >
                <ArrowLeftRight size={18} color="#2563eb" />
                <Text style={[styles.menuItemText, dark && styles.light]}>
                  Conciliação de Fornecedores
                </Text>
              </TouchableOpacity>
            )}

            {mode !== 'categories' && (canCreateProduct || canCreateComposition) && (
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

            {mode !== 'categories' && onToggleMergedProducts && (
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
          </View>
        )}
      </TouchableOpacity>
    </Modal>
  );
};
