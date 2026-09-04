import React from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Pencil, EyeOff, Eye, Trash2 } from 'lucide-react-native';

interface MobileProductActionsMenuProps {
  visible: boolean;
  dark: boolean;
  product: any;
  isDraft: boolean;
  isActive: boolean;
  onClose: () => void;
  onEdit: (product: any) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string, isDraft?: boolean) => void;
}

export const MobileProductActionsMenu: React.FC<MobileProductActionsMenuProps> = ({
  visible,
  dark,
  product,
  isDraft,
  isActive,
  onClose,
  onEdit,
  onToggleActive,
  onDelete,
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

  const handleDeleteClick = () => {
    onClose();
    Alert.alert(
      'Excluir Produto',
      'Deseja mover este produto para a lixeira?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => onDelete(product.id, false),
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.menuContainer, dark && styles.darkMenuContainer]}>
              {/* 1. Editar Produto */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleEdit}
              >
                <Pencil size={16} color="#2563eb" />
                <Text style={[styles.menuItemText, dark && styles.lightText]}>
                  Editar Produto
                </Text>
              </TouchableOpacity>

              {/* Se RASCUNHO: Apenas opção de Descartar Rascunho */}
              {isDraft ? (
                <>
                  <View style={[styles.menuDivider, dark && styles.darkDivider]} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleDiscardDraft}
                  >
                    <Trash2 size={16} color="#ef4444" />
                    <Text style={[styles.menuItemText, styles.dangerText]}>
                      Descartar Rascunho
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Desativar / Reativar */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleToggleActiveClick}
                  >
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

                  <View style={[styles.menuDivider, dark && styles.darkDivider]} />

                  {/* Excluir Produto Definitivo */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleDeleteClick}
                  >
                    <Trash2 size={16} color="#ef4444" />
                    <Text style={[styles.menuItemText, styles.dangerText]}>
                      Excluir Produto
                    </Text>
                  </TouchableOpacity>
                </>
              )}
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
    paddingVertical: 12,
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
});
