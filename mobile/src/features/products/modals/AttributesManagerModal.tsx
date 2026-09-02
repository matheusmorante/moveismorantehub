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
import { X, Plus, Trash2, Sliders, ChevronDown, ChevronRight, Tag } from 'lucide-react-native';
import {
  fetchMobileAttributes,
  saveMobileAttribute,
  deleteMobileAttribute,
  addMobileAttributeValue,
  deleteMobileAttributeValue,
  MobileAttribute,
} from '../services/mobileAttributeService';

interface Props {
  visible: boolean;
  dark: boolean;
  onClose: () => void;
}

export const AttributesManagerModal: React.FC<Props> = ({ visible, dark, onClose }) => {
  const [attributes, setAttributes] = useState<MobileAttribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newValText, setNewValText] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await fetchMobileAttributes();
    setAttributes(data);
    setLoading(false);
  };

  useEffect(() => {
    if (visible) load();
  }, [visible]);

  const handleAddAttr = async () => {
    if (!newAttrName.trim()) return;
    await saveMobileAttribute(newAttrName);
    setNewAttrName('');
    load();
  };

  const handleDeleteAttr = (id: string, name: string) => {
    Alert.alert('Excluir Atributo', `Deseja excluir o atributo "${name}" e todos os seus valores?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteMobileAttribute(id);
          load();
        },
      },
    ]);
  };

  const handleAddValue = async (attrId: string) => {
    if (!newValText.trim()) return;
    await addMobileAttributeValue(attrId, newValText);
    setNewValText('');
    load();
  };

  const handleDeleteValue = async (valId: string) => {
    await deleteMobileAttributeValue(valId);
    load();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.content, dark && styles.darkContent]}>
          <View style={styles.header}>
            <View style={styles.titleArea}>
              <Sliders size={20} color="#7c3aed" />
              <Text style={[styles.title, dark && styles.light]}>Atributos e Variações</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, dark && styles.darkBtn]}>
              <X size={18} color={dark ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <View style={styles.addBar}>
            <TextInput
              value={newAttrName}
              onChangeText={setNewAttrName}
              placeholder="Novo atributo (ex: Cor, Tamanho)..."
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.light]}
            />
            <TouchableOpacity onPress={handleAddAttr} style={styles.addBtn}>
              <Plus size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#7c3aed" style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={{ gap: 8 }}>
              {attributes.length === 0 ? (
                <Text style={styles.emptyText}>Nenhum atributo cadastrado</Text>
              ) : (
                attributes.map(attr => {
                  const isExp = expandedId === attr.id;
                  return (
                    <View key={attr.id} style={[styles.attrCard, dark && styles.darkItem]}>
                      <TouchableOpacity
                        onPress={() => setExpandedId(isExp ? null : attr.id)}
                        style={styles.attrHeader}
                      >
                        <View style={styles.attrTitleRow}>
                          {isExp ? <ChevronDown size={16} color="#7c3aed" /> : <ChevronRight size={16} color="#94a3b8" />}
                          <Text style={[styles.attrName, dark && styles.light]}>{attr.name}</Text>
                          <Text style={styles.valCount}>({attr.options.length} opções)</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteAttr(attr.id, attr.name)} style={styles.trashBtn}>
                          <Trash2 size={15} color="#ef4444" />
                        </TouchableOpacity>
                      </TouchableOpacity>

                      {isExp && (
                        <View style={styles.valuesArea}>
                          <View style={styles.valuesList}>
                            {attr.options.map(opt => (
                              <View key={opt.id} style={[styles.valBadge, dark && styles.darkBadge]}>
                                <Tag size={10} color="#7c3aed" />
                                <Text style={[styles.valText, dark && styles.light]}>{opt.value}</Text>
                                <TouchableOpacity onPress={() => handleDeleteValue(opt.id)}>
                                  <X size={12} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                          <View style={styles.addValRow}>
                            <TextInput
                              value={newValText}
                              onChangeText={setNewValText}
                              placeholder={`Adicionar valor para ${attr.name}...`}
                              placeholderTextColor="#94a3b8"
                              style={[styles.valInput, dark && styles.darkInput, dark && styles.light]}
                            />
                            <TouchableOpacity onPress={() => handleAddValue(attr.id)} style={styles.addValBtn}>
                              <Plus size={14} color="#ffffff" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
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
  content: { backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%', gap: 14 },
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
  addBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  list: { maxHeight: 380 },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginVertical: 20 },
  attrCard: { borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  darkItem: { backgroundColor: '#1e293b', borderColor: '#334155' },
  attrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  attrTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attrName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  valCount: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  trashBtn: { padding: 4 },
  valuesArea: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4, gap: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  valuesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  valBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3e8ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  darkBadge: { backgroundColor: '#3b0764' },
  valText: { fontSize: 12, fontWeight: '700', color: '#6b21a8' },
  addValRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  valInput: { flex: 1, height: 34, backgroundColor: '#ffffff', borderRadius: 8, paddingHorizontal: 8, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 12 },
  addValBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
});
