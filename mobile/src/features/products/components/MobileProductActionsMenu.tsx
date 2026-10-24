import { Copy, Eye, EyeOff, Link2, Pencil, Tag, Trash2 } from 'lucide-react-native';
import type React from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface MobileProductActionsMenuProps {
  visible: boolean;
  dark: boolean;
  product: any;
  isDraft: boolean;
  isActive: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canToggleActive?: boolean;
  onClose: () => void;
  onEdit: (product: any) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string, isDraft?: boolean) => void;
  onMoveToTrash?: (id: string) => void;
  onDuplicate?: (product: any) => void;
  onShowOrders?: (product: any) => void;
  onPrintPriceLabel?: (product: any) => void;
}

export const MobileProductActionsMenu: React.FC<MobileProductActionsMenuProps> = ({
  visible,
  dark,
  product,
  isDraft,
  isActive,
  canEdit = false,
  canDelete = false,
  canToggleActive = false,
  onClose,
  onEdit,
  onToggleActive,
  onDelete,
  onMoveToTrash,
  onDuplicate,
  onShowOrders,
  onPrintPriceLabel,
}) => {
  const handleEdit = () => {
    onClose();
    onEdit(product);
  };

  const handleToggleActiveClick = () => {
    onClose();
    onToggleActive(product.id, isActive);
  };

  const handleDiscardDraft = () => {
    onClose();
    Alert.alert(
      'Descartar Rascunho',
      'Deseja realmente descartar este rascunho permanentemente?\n\nEsta ação não poderá ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => onDelete(product.id, true),
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.menuContainer, dark && styles.darkMenuContainer]}>
              {/* 1. Editar Produto */}
              {canEdit && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleEdit}
                  accessibilityRole="button"
                  accessibilityLabel="Editar Produto"
                >
                  <Pencil size={16} color="#2563eb" />
                  <Text style={[styles.menuItemText, dark && styles.lightText]}>
                    Editar Produto
                  </Text>
                </TouchableOpacity>
              )}

              {canEdit && onDuplicate && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    onDuplicate(product);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Duplicar produto"
                >
                  <Copy size={16} color="#4f46e5" />
                  <Text style={[styles.menuItemText, dark && styles.lightText]}>
                    Duplicar
                  </Text>
                </TouchableOpacity>
              )}

              {onShowOrders && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    onShowOrders(product);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Pedidos Vinculados"
                >
                  <Link2 size={16} color="#2563eb" />
                  <Text style={[styles.menuItemText, dark && styles.lightText]}>
                    Pedidos Vinculados
                  </Text>
                </TouchableOpacity>
              )}

              {onPrintPriceLabel && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    onPrintPriceLabel(product);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Imprimir etiqueta de preço"
                >
                  <Tag size={16} color="#059669" />
                  <Text style={[styles.menuItemText, dark && styles.lightText]}>
                    Etiqueta de Preço
                  </Text>
                </TouchableOpacity>
              )}

              {/* Se RASCUNHO: Apenas opção de Descartar Rascunho */}
              {isDraft ? (
                canDelete ? (
                  <>
                    <View style={[styles.menuDivider, dark && styles.darkDivider]} />
                    <TouchableOpacity style={styles.menuItem} onPress={handleDiscardDraft}>
                      <Trash2 size={16} color="#ef4444" />
                      <Text style={[styles.menuItemText, styles.dangerText]}>
                        Descartar Rascunho
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : null
              ) : canDelete ? (
                <>
                  {/* Desativar / Reativar */}
                  {canToggleActive && (
                    <TouchableOpacity style={styles.menuItem} onPress={handleToggleActiveClick}>
                      {isActive ? (
                        <>
                          <EyeOff size={16} color="#e11d48" />
                          <Text style={[styles.menuItemText, { color: '#e11d48' }]}>
                            Desativar Produto
                          </Text>
                        </>
                      ) : (
                        <>
                          <Eye size={16} color="#059669" />
                          <Text style={[styles.menuItemText, { color: '#059669' }]}>
                            Reativar Produto
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  {onMoveToTrash && (
                    <>
                      <TouchableOpacity
                        style={styles.menuItem}
                        disabled={product.can_trash !== true}
                        accessibilityRole="button"
                        accessibilityLabel="Mover para lixeira"
                        accessibilityState={{ disabled: product.can_trash !== true }}
                        accessibilityHint={product.trash_block_reason || 'Move o produto e suas variações para a lixeira.'}
                        onPress={() =>
                          Alert.alert(
                            'Mover produto para a lixeira?',
                            'O produto e todas as suas variações serão movidos para a lixeira. Você poderá restaurá-los durante 30 dias.',
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Mover para lixeira',
                                style: 'destructive',
                                onPress: () => {
                                  onClose();
                                  onMoveToTrash(product.id);
                                },
                              },
                            ]
                          )
                        }
                      >
                        <Trash2
                          size={16}
                          color={product.can_trash === true ? '#ef4444' : '#94a3b8'}
                        />
                        <Text
                          style={[
                            styles.menuItemText,
                            styles.dangerText,
                            product.can_trash !== true && styles.disabledText,
                          ]}
                        >
                          Mover para lixeira
                        </Text>
                      </TouchableOpacity>
                      {product.can_trash !== true && Boolean(product.trash_block_reason) && (
                        <Text style={[styles.disabledReason, dark && styles.darkDisabledReason]}>
                          {product.trash_block_reason}
                        </Text>
                      )}
                    </>
                  )}
                </>
              ) : null}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuContainer: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkMenuContainer: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  lightText: {
    color: '#f8fafc',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
    marginHorizontal: 8,
  },
  darkDivider: {
    backgroundColor: '#334155',
  },
  dangerText: {
    color: '#ef4444',
  },
  disabledText: { color: '#94a3b8' },
  disabledReason: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 14,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  darkDisabledReason: { color: '#94a3b8' },
});
