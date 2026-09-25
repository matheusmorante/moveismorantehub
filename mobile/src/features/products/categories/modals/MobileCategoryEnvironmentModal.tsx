import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X, Tag, Layers, Trash2 } from 'lucide-react-native';
import {
  EnvironmentNode,
  CategoryNode,
  ModalType,
  EditingNode,
} from '../types/mobileCategory.types';
import { canDeleteEnvironment, canDeleteCategory } from '../domain/categoryEnvironmentRules';
import { CategoryAttributesPicker, CategoryLinksPicker } from '../components';

interface Props {
  visible: boolean;
  dark: boolean;
  showModal: ModalType | null;
  editingNode: EditingNode | null;
  nameInput: string;
  onChangeNameInput: (value: string) => void;
  selectedLinks: string[];
  onToggleLink: (id: string) => void;
  selectedAttributes: { id: string; name: string }[];
  setSelectedAttributes: React.Dispatch<React.SetStateAction<{ id: string; name: string }[]>>;
  isLoadingAttributes: boolean;
  categories: CategoryNode[];
  environments: EnvironmentNode[];
  isSubmitting: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete?: (id: string, isEnv: boolean, name: string) => void;
}

export const MobileCategoryEnvironmentModal: React.FC<Props> = ({
  visible,
  dark,
  showModal,
  editingNode,
  nameInput,
  onChangeNameInput,
  selectedLinks,
  onToggleLink,
  selectedAttributes,
  setSelectedAttributes,
  isLoadingAttributes,
  categories,
  environments,
  isSubmitting,
  onClose,
  onSave,
  onDelete,
}) => {
  if (!visible || !showModal) return null;

  const isEnv = showModal === 'ambiente';
  const isEditing = Boolean(editingNode?.id);
  const title = isEditing
    ? `Editar ${isEnv ? 'Ambiente' : 'Categoria'}`
    : isEnv
    ? 'Novo Ambiente'
    : 'Nova Categoria';

  const handleDeletePress = () => {
    if (!editingNode?.id || !onDelete) return;

    if (isEnv) {
      const currentEnv = environments.find(e => e.id === editingNode.id);
      if (currentEnv) {
        const check = canDeleteEnvironment(currentEnv, categories);
        if (!check.canDelete) {
          Alert.alert('Exclusão bloqueada', check.reason || 'Este ambiente possui categorias vinculadas.');
          return;
        }
      }
    } else {
      const currentCat = categories.find(c => c.id === editingNode.id);
      if (currentCat) {
        const check = canDeleteCategory(currentCat);
        if (!check.canDelete) {
          Alert.alert('Exclusão bloqueada', check.reason || 'Esta categoria possui produtos vinculados.');
          return;
        }
      }
    }

    onClose();
    onDelete(editingNode.id, isEnv, nameInput);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, dark && styles.sheetDark]}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              {isEnv ? <Layers size={18} color="#059669" /> : <Tag size={18} color="#2563eb" />}
              <Text style={[styles.headerTitle, dark && styles.textLight]}>{title}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, dark && styles.closeBtnDark]}
            >
              <X size={18} color={dark ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          {/* Conteúdo Rolável */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Campo Nome */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome d{isEnv ? 'o Ambiente' : 'a Categoria'} *</Text>
              <TextInput
                value={nameInput}
                onChangeText={text => onChangeNameInput(text.toUpperCase())}
                placeholder={isEnv ? 'EX: SALA DE ESTAR' : 'EX: SOFÁ RETRÁTIL'}
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                style={[styles.input, dark && styles.inputDark, dark && styles.textLight]}
              />
            </View>

            {/* Vínculos (Ambiente <-> Categorias) */}
            <CategoryLinksPicker
              isEnv={isEnv}
              dark={dark}
              categories={categories}
              environments={environments}
              selectedLinks={selectedLinks}
              onToggleLink={onToggleLink}
            />

            {/* Características da Categoria (apenas categoria) */}
            {!isEnv && (
              <CategoryAttributesPicker
                dark={dark}
                selectedAttributes={selectedAttributes}
                setSelectedAttributes={setSelectedAttributes}
                isLoadingAttributes={isLoadingAttributes}
              />
            )}
          </ScrollView>

          {/* Rodapé com Botões de Ação */}
          <View style={[styles.footer, dark && styles.footerDark]}>
            {isEditing && Boolean(onDelete) && (
              <TouchableOpacity
                onPress={handleDeletePress}
                disabled={isSubmitting}
                style={[styles.deleteBtn, dark && styles.deleteBtnDark]}
                accessibilityRole="button"
                accessibilityLabel="Excluir"
              >
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={[styles.cancelBtn, dark && styles.cancelBtnDark]}
            >
              <Text style={[styles.cancelBtnText, dark && styles.textLight]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSave}
              disabled={isSubmitting}
              style={[styles.saveBtn, isEnv ? styles.saveBtnEnv : styles.saveBtnCat]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {isEditing ? 'Salvar Alterações' : 'Criar ' + (isEnv ? 'Ambiente' : 'Categoria')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  sheetDark: { backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  textLight: { color: '#f8fafc' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnDark: { backgroundColor: '#1e293b' },
  scrollArea: { maxHeight: 460 },
  scrollContent: { padding: 16, gap: 16 },
  formGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  inputDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerDark: { borderTopColor: '#334155' },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelBtnDark: { backgroundColor: '#1e293b' },
  cancelBtnText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  saveBtn: {
    flex: 2,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnCat: { backgroundColor: '#2563eb' },
  saveBtnEnv: { backgroundColor: '#059669' },
  saveBtnText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  deleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteBtnDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
});
