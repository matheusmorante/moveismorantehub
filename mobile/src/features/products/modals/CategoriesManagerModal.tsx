import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X, Plus, Trash2, Edit2, Check, Layers } from 'lucide-react-native';
import {
  fetchMobileCategories,
  saveMobileCategory,
  deleteMobileCategory,
  MobileCategory,
} from '../services/mobileCategoryService';

interface Props {
  visible: boolean;
  dark: boolean;
  onClose: () => void;
}

export const CategoriesManagerModal: React.FC<Props> = ({ visible, dark, onClose }) => {
  const [categories, setCategories] = useState<MobileCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await fetchMobileCategories();
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    if (visible) load();
  }, [visible]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await saveMobileCategory(newName);
    setNewName('');
    load();
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await saveMobileCategory(editName, id);
    setEditingId(null);
    setEditName('');
    load();
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Excluir Categoria', `Deseja realmente excluir a categoria "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteMobileCategory(id);
          load();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.content, dark && styles.darkContent]}>
          <View style={styles.header}>
            <View style={styles.titleArea}>
              <Layers size={20} color="#2563eb" />
              <Text style={[styles.title, dark && styles.light]}>Gerenciar Categorias</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, dark && styles.darkBtn]}>
              <X size={18} color={dark ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          {/* Input de Nova Categoria */}
          <View style={styles.addBar}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Nome da nova categoria..."
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.light]}
            />
            <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
              <Plus size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={{ gap: 8 }}>
              {categories.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma categoria cadastrada</Text>
              ) : (
                categories.map(c => (
                  <View key={c.id} style={[styles.itemCard, dark && styles.darkItem]}>
                    {editingId === c.id ? (
                      <View style={styles.editRow}>
                        <TextInput
                          value={editName}
                          onChangeText={setEditName}
                          style={[styles.editInput, dark && styles.darkInput, dark && styles.light]}
                          autoFocus
                        />
                        <TouchableOpacity onPress={() => handleSaveEdit(c.id)} style={styles.saveEditBtn}>
                          <Check size={16} color="#ffffff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingId(null)} style={styles.cancelEditBtn}>
                          <X size={16} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.itemRow}>
                        <Text style={[styles.itemText, dark && styles.light]}>{c.name}</Text>
                        <View style={styles.itemActions}>
                          <TouchableOpacity
                            onPress={() => { setEditingId(c.id); setEditName(c.name); }}
                            style={styles.actionBtn}
                          >
                            <Edit2 size={15} color="#2563eb" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(c.id, c.name)} style={styles.actionBtn}>
                            <Trash2 size={15} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '80%', gap: 14 },
  darkContent: { backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleArea: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  light: { color: '#f8fafc' },
  closeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  darkBtn: { backgroundColor: '#1e293b' },
  addBar: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 42, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 13 },
  darkInput: { backgroundColor: '#1e293b', borderColor: '#334155' },
  addBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  list: { maxHeight: 350 },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginVertical: 20 },
  itemCard: { padding: 12, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  darkItem: { backgroundColor: '#1e293b', borderColor: '#334155' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  itemActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 6 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: { flex: 1, height: 36, backgroundColor: '#ffffff', borderRadius: 8, paddingHorizontal: 8, borderWidth: 1, borderColor: '#bfdbfe', fontSize: 13 },
  saveEditBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  cancelEditBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
});
