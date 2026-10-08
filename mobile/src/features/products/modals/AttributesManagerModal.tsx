import React, { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import {
  X,
  Plus,
  Trash2,
  Sliders,
  ChevronDown,
  ChevronRight,
  Tag,
  Edit2,
  Check,
} from 'lucide-react-native';
import {
  fetchMobileAttributes,
  createMobileAttributeWithOptions,
  saveMobileAttribute,
  deleteMobileAttribute,
  addMobileAttributeValue,
  deleteMobileAttributeValue,
  checkMobileAttributeUsage,
  MobileAttributeDataType,
  MobileAttribute,
} from '../services/mobileAttributeService';
import {
  validateAttribute,
  validateAttributeOption,
} from '../categories/domain/categoryEnvironmentRules';

interface Props {
  visible: boolean;
  dark: boolean;
  onClose: () => void;
}

export const AttributesManagerModal: React.FC<Props> = ({ visible, dark, onClose }) => {
  const insets = useSafeAreaInsets();
  const [attributes, setAttributes] = useState<MobileAttribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newDataType, setNewDataType] = useState<MobileAttributeDataType>('list');
  const [newUnit, setNewUnit] = useState('');
  const [newAttrName, setNewAttrName] = useState('');
  const [newOptionInput, setNewOptionInput] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newValText, setNewValText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchMobileAttributes();
      setAttributes(data);
    } catch (_) {
      setLoadError('Não foi possível carregar as características. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) load();
  }, [visible]);

  const handleAddAttr = async () => {
    const validation = validateAttribute(newAttrName, attributes, undefined, newDataType);
    if (!validation.valid) {
      Alert.alert('Atenção', validation.error || 'Nome inválido.');
      return;
    }

    const options = [...newOptions];
    if (newDataType === 'list' && newOptionInput.trim()) {
      const optionValidation = validateAttributeOption(
        newOptionInput,
        options.map((value, index) => ({ id: String(index), value }))
      );
      if (!optionValidation.valid) {
        Alert.alert('Atenção', optionValidation.error || 'Valor inválido.');
        return;
      }
      options.push(optionValidation.formattedName!);
    }

    if (newDataType === 'list' && options.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos um valor/rótulo.');
      return;
    }

    try {
      await createMobileAttributeWithOptions(
        validation.formattedName!,
        newDataType,
        newDataType === 'measure' ? newUnit : '',
        newDataType === 'list' ? options : []
      );
      setNewAttrName('');
      setNewUnit('');
      setNewOptionInput('');
      setNewOptions([]);
      void load();
    } catch (error) {
      Alert.alert(
        'Não foi possível criar',
        error instanceof Error ? error.message : 'A característica não foi salva.'
      );
    }
  };

  const handleDeleteAttr = (id: string, name: string) => {
    Alert.alert(
      'Excluir Atributo',
      `Deseja excluir o atributo "${name}" e todos os seus valores?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              if (await checkMobileAttributeUsage(name)) {
                Alert.alert(
                  'Exclusão bloqueada',
                  `Não é possível excluir "${name}" pois está vinculada a um ou mais produtos.`
                );
                return;
              }
              await deleteMobileAttribute(id);
              void load();
            } catch (error) {
              Alert.alert(
                'Não foi possível verificar',
                error instanceof Error ? error.message : 'A característica não foi excluída.'
              );
            }
          },
        },
      ]
    );
  };

  const handleAddValue = async (attrId: string) => {
    const attr = attributes.find((a) => a.id === attrId);
    const existingOptions = (attr?.options || []).map((o) => ({ id: o.id, value: o.value }));
    const validation = validateAttributeOption(newValText, existingOptions);
    if (!validation.valid) {
      Alert.alert('Atenção', validation.error || 'Valor inválido.');
      return;
    }
    await addMobileAttributeValue(attrId, validation.formattedName!);
    setNewValText('');
    load();
  };

  const handleDeleteValue = (attributeName: string, valId: string, value: string) => {
    Alert.alert('Remover valor', `Deseja remover "${value}" de "${attributeName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            if (await checkMobileAttributeUsage(attributeName, value)) {
              Alert.alert(
                'Remoção bloqueada',
                `O valor "${value}" não pode ser removido porque está vinculado a produtos.`
              );
              return;
            }
            await deleteMobileAttributeValue(valId);
            void load();
          } catch (error) {
            Alert.alert(
              'Não foi possível verificar',
              error instanceof Error ? error.message : 'O valor não foi removido.'
            );
          }
        },
      },
    ]);
  };

  const handleAddNewOption = () => {
    const validation = validateAttributeOption(
      newOptionInput,
      newOptions.map((value, index) => ({ id: String(index), value }))
    );
    if (!validation.valid) {
      Alert.alert('Atenção', validation.error || 'Valor inválido.');
      return;
    }
    setNewOptions((previous) => [...previous, validation.formattedName!]);
    setNewOptionInput('');
  };

  const handleSaveEdit = async (id: string) => {
    const validation = validateAttribute(editName, attributes, id);
    if (!validation.valid) {
      Alert.alert('Atenção', validation.error || 'Nome inválido.');
      return;
    }
    const current = attributes.find((attribute) => attribute.id === id);
    await saveMobileAttribute(validation.formattedName!, id, {
      dataType: current?.dataType,
      unit: current?.unit,
      isGloballyRequired: current?.isGloballyRequired,
    });
    setEditingId(null);
    setEditName('');
    load();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
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

          {newDataType === 'measure' && (
            <View style={styles.measureInputRow}>
              <TextInput
                value={newUnit}
                onChangeText={setNewUnit}
                placeholder="Unidade (ex.: cm, kg, L)"
                placeholderTextColor="#94a3b8"
                style={[styles.metaInput, dark && styles.darkInput, dark && styles.light]}
              />
            </View>
          )}
          <View style={styles.typeRow}>
            {[
              ['list', 'Lista de valores'],
              ['text', 'Texto livre'],
              ['integer', 'Inteiro'],
              ['decimal', 'Decimal'],
              ['boolean', 'Sim/Não'],
              ['measure', 'Medida'],
            ].map(([value, label]) => (
              <TouchableOpacity
                key={value}
                onPress={() => setNewDataType(value as MobileAttributeDataType)}
                style={[styles.typeBtn, newDataType === value && styles.typeBtnActive]}
              >
                <Text style={[styles.typeText, newDataType === value && styles.typeTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {newDataType === 'list' && (
            <View style={styles.newValuesArea}>
              <Text style={[styles.newValuesLabel, dark && styles.light]}>
                Valores (Enter ou adicionar)
              </Text>
              <View style={styles.addValRow}>
                <TextInput
                  value={newOptionInput}
                  onChangeText={setNewOptionInput}
                  onSubmitEditing={handleAddNewOption}
                  placeholder="Ex.: Azul, Preto..."
                  placeholderTextColor="#94a3b8"
                  style={[styles.valInput, dark && styles.darkInput, dark && styles.light]}
                  returnKeyType="done"
                  accessibilityLabel="Novo valor da lista"
                />
                <TouchableOpacity
                  onPress={handleAddNewOption}
                  style={styles.addValBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar valor à nova lista"
                >
                  <Plus size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <View style={styles.valuesList}>
                {newOptions.map((value) => (
                  <View
                    key={value.toLocaleLowerCase('pt-BR')}
                    style={[styles.valBadge, dark && styles.darkBadge]}
                  >
                    <Tag size={10} color="#7c3aed" />
                    <Text style={[styles.valText, dark && styles.light]}>{value}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        setNewOptions((previous) => previous.filter((item) => item !== value))
                      }
                      style={styles.valueRemoveButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Remover valor ${value}`}
                    >
                      <X size={12} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
          <View style={[styles.searchBox, dark && styles.darkInput]}>
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Buscar características..."
              placeholderTextColor="#94a3b8"
              style={[styles.searchInput, dark && styles.light]}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#7c3aed" style={{ marginVertical: 20 }} />
          ) : loadError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{loadError}</Text>
              <TouchableOpacity onPress={() => void load()}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={{ gap: 8 }}>
              {attributes.filter((attr) =>
                attr.name.toLocaleLowerCase().includes(searchTerm.trim().toLocaleLowerCase())
              ).length === 0 ? (
                <Text style={styles.emptyText}>Nenhum atributo cadastrado</Text>
              ) : (
                attributes
                  .filter((attr) =>
                    attr.name.toLocaleLowerCase().includes(searchTerm.trim().toLocaleLowerCase())
                  )
                  .map((attr) => {
                    const isExp = expandedId === attr.id;
                    return (
                      <View key={attr.id} style={[styles.attrCard, dark && styles.darkItem]}>
                        <TouchableOpacity
                          onPress={() => setExpandedId(isExp ? null : attr.id)}
                          style={styles.attrHeader}
                        >
                          <View style={styles.attrTitleRow}>
                            {isExp ? (
                              <ChevronDown size={16} color="#7c3aed" />
                            ) : (
                              <ChevronRight size={16} color="#94a3b8" />
                            )}
                            {editingId === attr.id ? (
                              <TextInput
                                value={editName}
                                onChangeText={setEditName}
                                autoFocus
                                style={[
                                  styles.editInput,
                                  dark && styles.darkInput,
                                  dark && styles.light,
                                ]}
                              />
                            ) : (
                              <Text style={[styles.attrName, dark && styles.light]}>
                                {attr.name}
                              </Text>
                            )}
                            <Text style={styles.valCount}>
                              ({attr.options.length} opções · {attr.dataType || 'text_short'})
                            </Text>
                          </View>
                          <View style={styles.attrActions}>
                            {editingId === attr.id ? (
                              <TouchableOpacity
                                onPress={() => void handleSaveEdit(attr.id)}
                                style={styles.trashBtn}
                              >
                                <Check size={15} color="#059669" />
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                onPress={() => {
                                  setEditingId(attr.id);
                                  setEditName(attr.name);
                                }}
                                style={styles.trashBtn}
                              >
                                <Edit2 size={15} color="#2563eb" />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              onPress={() => handleDeleteAttr(attr.id, attr.name)}
                              style={styles.trashBtn}
                            >
                              <Trash2 size={15} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>

                        {isExp && (
                          <View style={styles.valuesArea}>
                            <View style={styles.valuesList}>
                              {attr.options.map((opt) => (
                                <View
                                  key={opt.id}
                                  style={[styles.valBadge, dark && styles.darkBadge]}
                                >
                                  <Tag size={10} color="#7c3aed" />
                                  <Text style={[styles.valText, dark && styles.light]}>
                                    {opt.value}
                                  </Text>
                                  <TouchableOpacity
                                    onPress={() => handleDeleteValue(attr.name, opt.id, opt.value)}
                                    style={styles.valueRemoveButton}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Remover valor ${opt.value}`}
                                  >
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
                                style={[
                                  styles.valInput,
                                  dark && styles.darkInput,
                                  dark && styles.light,
                                ]}
                              />
                              <TouchableOpacity
                                onPress={() => handleAddValue(attr.id)}
                                style={styles.addValBtn}
                              >
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
  content: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
    gap: 14,
  },
  darkContent: { backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleArea: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  light: { color: '#f8fafc' },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBtn: { backgroundColor: '#1e293b' },
  addBar: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 13,
  },
  darkInput: { backgroundColor: '#1e293b', borderColor: '#334155' },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flexShrink: 1, maxHeight: 380 },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginVertical: 20 },
  attrCard: {
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  darkItem: { backgroundColor: '#1e293b', borderColor: '#334155' },
  attrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
    padding: 12,
  },
  attrTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  attrName: { flexShrink: 1, fontSize: 14, fontWeight: '800', color: '#0f172a' },
  valCount: { flexShrink: 1, fontSize: 11, color: '#64748b', fontWeight: '600' },
  trashBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attrActions: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  editInput: {
    minWidth: 120,
    height: 32,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 13,
  },
  valuesArea: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  valuesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  valBadge: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 0,
    borderRadius: 8,
  },
  valueRemoveButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  darkBadge: { backgroundColor: '#3b0764' },
  valText: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: '#6b21a8' },
  addValRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  valInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 12,
  },
  addValBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  measureInputRow: { flexDirection: 'row', gap: 8 },
  newValuesArea: { gap: 8 },
  newValuesLabel: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  metaInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 12,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeBtn: {
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#f1f5f9',
  },
  typeBtnActive: { backgroundColor: '#7c3aed' },
  typeText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  typeTextActive: { color: '#ffffff' },
  searchBox: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, fontSize: 12, color: '#0f172a' },
  errorBox: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  errorText: { color: '#dc2626', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  retryText: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
});
