import {
  Check,
  ChevronDown,
  ChevronRight,
  Edit2,
  Plus,
  Sliders,
  Tag,
  Trash2,
  X,
} from 'lucide-react-native';
import type React from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  validateAttribute,
  validateAttributeOption,
} from '../categories/domain/categoryEnvironmentRules';
import {
  addMobileAttributeValue,
  deleteMobileAttribute,
  deleteMobileAttributeValue,
  fetchMobileAttributes,
  type MobileAttribute,
  type MobileAttributeDataType,
  saveMobileAttributeDefinition,
} from '../services/mobileAttributeService';

interface Props {
  visible: boolean;
  dark: boolean;
  onClose: () => void;
}

const ATTRIBUTE_TYPE_OPTIONS: Array<[MobileAttributeDataType, string]> = [
  ['radio', 'Escolha única'],
  ['multi_select', 'Múltiplas escolhas'],
  ['text_short', 'Texto curto'],
  ['text_long', 'Texto longo'],
  ['integer', 'Número inteiro'],
  ['decimal', 'Número decimal'],
  ['weight', 'Peso (kg)'],
  ['percentage', 'Porcentagem'],
  ['measure', 'Medida'],
  ['boolean', 'Sim ou não'],
];

export const AttributesManagerModal: React.FC<Props> = ({ visible, dark, onClose }) => {
  const insets = useSafeAreaInsets();
  const [attributes, setAttributes] = useState<MobileAttribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newDataType, setNewDataType] = useState<MobileAttributeDataType>('text_short');
  const [newUnit, setNewUnit] = useState('cm');
  const [newDecimalPlaces, setNewDecimalPlaces] = useState<1 | 2 | 3>(2);
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newOptionInput, setNewOptionInput] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newValText, setNewValText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDataType, setEditDataType] = useState<MobileAttributeDataType>('text_short');
  const [editUnit, setEditUnit] = useState('cm');
  const [editDecimalPlaces, setEditDecimalPlaces] = useState<1 | 2 | 3>(2);
  const [editActive, setEditActive] = useState(true);
  const [editOptions, setEditOptions] = useState<MobileAttribute['options']>([]);
  const [editOptionInput, setEditOptionInput] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [savingValueId, setSavingValueId] = useState<string | null>(null);

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
    if (isSavingNew) return;
    const validation = validateAttribute(newAttrName, attributes, undefined, newDataType);
    if (!validation.valid) {
      Alert.alert('Atenção', validation.error || 'Nome inválido.');
      return;
    }

    const isChoiceType = newDataType === 'radio' || newDataType === 'multi_select';
    const options = [...newOptions];
    if (isChoiceType && newOptionInput.trim()) {
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

    if (isChoiceType && options.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos uma opção.');
      return;
    }

    setIsSavingNew(true);
    try {
      await saveMobileAttributeDefinition({
        name: validation.formattedName!,
        dataType: newDataType,
        unit: newDataType === 'measure' ? newUnit : '',
        decimalPlaces: newDataType === 'decimal' ? newDecimalPlaces : undefined,
        active: true,
        isCustom: true,
        options: isChoiceType ? options.map((value) => ({ id: '', value })) : [],
      });
      setNewAttrName('');
      setNewUnit('cm');
      setNewDecimalPlaces(2);
      setNewOptionInput('');
      setNewOptions([]);
      void load();
    } catch (error) {
      Alert.alert(
        'Não foi possível criar',
        error instanceof Error ? error.message : 'A característica não foi salva.'
      );
    } finally {
      setIsSavingNew(false);
    }
  };

  const handleDeleteAttr = (id: string, name: string) => {
    Alert.alert(
      'Excluir Atributo',
      `Deseja excluir "${name}"? Se já estiver vinculada a produtos, ela será desativada e os valores existentes serão preservados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteMobileAttribute(id);
              Alert.alert(
                result === 'deactivated' ? 'Característica desativada' : 'Característica excluída',
                result === 'deactivated'
                  ? `"${name}" permanece disponível nos produtos existentes e não será oferecida em novos produtos.`
                  : `"${name}" foi excluída.`
              );
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
    if (savingValueId) return;
    const attr = attributes.find((a) => a.id === attrId);
    const existingOptions = (attr?.options || []).map((o) => ({ id: o.id, value: o.value }));
    const validation = validateAttributeOption(newValText, existingOptions);
    if (!validation.valid) {
      Alert.alert('Atenção', validation.error || 'Valor inválido.');
      return;
    }
    setSavingValueId(attrId);
    try {
      await addMobileAttributeValue(attrId, validation.formattedName!);
      setNewValText('');
      await load();
    } catch (error) {
      Alert.alert(
        'Não foi possível adicionar',
        error instanceof Error ? error.message : 'O valor não foi salvo.'
      );
    } finally {
      setSavingValueId(null);
    }
  };

  const handleDeleteValue = (attributeName: string, valId: string, value: string) => {
    Alert.alert('Remover valor', `Deseja remover "${value}" de "${attributeName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMobileAttributeValue(valId);
            void load();
          } catch (error) {
            Alert.alert(
              'Não foi possível remover',
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
    const validation = validateAttribute(editName, attributes, id, editDataType);
    if (!validation.valid) {
      Alert.alert('Atenção', validation.error || 'Nome inválido.');
      return;
    }
    const current = attributes.find((attribute) => attribute.id === id);
    const isChoiceType = editDataType === 'radio' || editDataType === 'multi_select';
    if (isChoiceType && editOptions.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos uma opção para este tipo de preenchimento.');
      return;
    }
    if (editDataType === 'measure' && !['cm', 'mm', 'm'].includes(editUnit)) {
      Alert.alert('Atenção', 'Selecione uma unidade de medida válida.');
      return;
    }

    setIsSavingEdit(true);
    try {
      await saveMobileAttributeDefinition({
        id,
        name: validation.formattedName!,
        dataType: editDataType,
        unit: editDataType === 'measure' ? editUnit : '',
        decimalPlaces: editDataType === 'decimal' ? editDecimalPlaces : undefined,
        active: editActive,
        isGloballyRequired: current?.isGloballyRequired ?? false,
        isCustom: current?.isCustom ?? true,
        options: isChoiceType
          ? editOptions.map((option, index) => ({
              id: option.id,
              value: option.value,
              sortOrder: index,
            }))
          : [],
      });
      setEditingId(null);
      setEditName('');
      setEditOptionInput('');
      await load();
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar',
        error instanceof Error ? error.message : 'A característica não foi atualizada.'
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const startEditing = (attribute: MobileAttribute) => {
    setExpandedId(attribute.id);
    setEditingId(attribute.id);
    setEditName(attribute.name);
    setEditDataType(attribute.dataType || 'text_short');
    setEditUnit(attribute.unit || 'cm');
    setEditDecimalPlaces(attribute.decimalPlaces ?? 2);
    setEditActive(attribute.active !== false);
    setEditOptions(attribute.options.map((option) => ({ ...option })));
    setEditOptionInput('');
  };

  const addEditedOption = (attributeId: string) => {
    const validation = validateAttributeOption(editOptionInput, editOptions);
    if (!validation.valid) {
      Alert.alert('Atenção', validation.error || 'Valor inválido.');
      return;
    }
    setEditOptions((previous) => [
      ...previous,
      {
        id: '',
        value: validation.formattedName!,
        attribute_id: attributeId,
        sortOrder: previous.length,
      },
    ]);
    setEditOptionInput('');
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

          <ScrollView
            style={styles.managerBody}
            contentContainerStyle={styles.managerBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.addBar}>
              <TextInput
                value={newAttrName}
                onChangeText={setNewAttrName}
                placeholder="Novo atributo (ex: Cor, Tamanho)..."
                placeholderTextColor="#94a3b8"
                style={[styles.input, dark && styles.darkInput, dark && styles.light]}
              />
              <TouchableOpacity
                onPress={handleAddAttr}
                disabled={isSavingNew}
                style={[styles.addBtn, isSavingNew && styles.disabledControl]}
                accessibilityRole="button"
                accessibilityLabel="Criar característica"
              >
                {isSavingNew ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Plus size={18} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>

            {newDataType === 'measure' && (
              <View style={styles.measureInputRow}>
                {(['cm', 'mm', 'm'] as const).map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    onPress={() => setNewUnit(unit)}
                    style={[styles.typeBtn, newUnit === unit && styles.typeBtnActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: newUnit === unit }}
                  >
                    <Text style={[styles.typeText, newUnit === unit && styles.typeTextActive]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {newDataType === 'decimal' && (
              <View style={styles.precisionRow}>
                <Text style={[styles.newValuesLabel, dark && styles.light]}>Casas decimais</Text>
                {([1, 2, 3] as const).map((places) => (
                  <TouchableOpacity
                    key={places}
                    onPress={() => setNewDecimalPlaces(places)}
                    style={[styles.typeBtn, newDecimalPlaces === places && styles.typeBtnActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: newDecimalPlaces === places }}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        newDecimalPlaces === places && styles.typeTextActive,
                      ]}
                    >
                      {places} {places === 1 ? 'casa' : 'casas'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.typeRow}>
              {ATTRIBUTE_TYPE_OPTIONS.map(([value, label]) => (
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
            {(newDataType === 'radio' || newDataType === 'multi_select') && (
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
              <View style={styles.list}>
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
                      const isEditing = editingId === attr.id;
                      const isEditingChoiceType =
                        editDataType === 'radio' || editDataType === 'multi_select';
                      return (
                        <View key={attr.id} style={[styles.attrCard, dark && styles.darkItem]}>
                          <TouchableOpacity
                            onPress={() => {
                              if (!isEditing) setExpandedId(isExp ? null : attr.id);
                            }}
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
                                ({attr.options.length} opções · {attr.dataType || 'text_short'}
                                {attr.active === false ? ' · inativa' : ''})
                              </Text>
                            </View>
                            <View style={styles.attrActions}>
                              {editingId === attr.id ? (
                                <>
                                  <TouchableOpacity
                                    disabled={isSavingEdit}
                                    onPress={() => void handleSaveEdit(attr.id)}
                                    style={styles.trashBtn}
                                    accessibilityLabel="Salvar característica"
                                  >
                                    <Check size={15} color={isSavingEdit ? '#94a3b8' : '#059669'} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    disabled={isSavingEdit}
                                    onPress={() => setEditingId(null)}
                                    style={styles.trashBtn}
                                    accessibilityLabel="Cancelar edição"
                                  >
                                    <X size={15} color="#64748b" />
                                  </TouchableOpacity>
                                </>
                              ) : (
                                <TouchableOpacity
                                  onPress={() => startEditing(attr)}
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

                          {isExp && isEditing && (
                            <View style={[styles.valuesArea, styles.editorArea]}>
                              <Text style={[styles.newValuesLabel, dark && styles.light]}>
                                Tipo de preenchimento
                              </Text>
                              <View style={styles.typeRow}>
                                {ATTRIBUTE_TYPE_OPTIONS.map(([value, label]) => (
                                  <TouchableOpacity
                                    key={value}
                                    onPress={() => setEditDataType(value)}
                                    style={[
                                      styles.typeBtn,
                                      editDataType === value && styles.typeBtnActive,
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: editDataType === value }}
                                  >
                                    <Text
                                      style={[
                                        styles.typeText,
                                        editDataType === value && styles.typeTextActive,
                                      ]}
                                    >
                                      {label}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>

                              {editDataType === 'measure' && (
                                <View style={styles.measureInputRow}>
                                  {(['cm', 'mm', 'm'] as const).map((unit) => (
                                    <TouchableOpacity
                                      key={unit}
                                      onPress={() => setEditUnit(unit)}
                                      style={[
                                        styles.typeBtn,
                                        editUnit === unit && styles.typeBtnActive,
                                      ]}
                                      accessibilityRole="button"
                                      accessibilityState={{ selected: editUnit === unit }}
                                    >
                                      <Text
                                        style={[
                                          styles.typeText,
                                          editUnit === unit && styles.typeTextActive,
                                        ]}
                                      >
                                        {unit}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}

                              {editDataType === 'decimal' && (
                                <View style={styles.precisionRow}>
                                  <Text style={[styles.newValuesLabel, dark && styles.light]}>
                                    Casas decimais
                                  </Text>
                                  {([1, 2, 3] as const).map((places) => (
                                    <TouchableOpacity
                                      key={places}
                                      onPress={() => setEditDecimalPlaces(places)}
                                      style={[
                                        styles.typeBtn,
                                        editDecimalPlaces === places && styles.typeBtnActive,
                                      ]}
                                      accessibilityRole="button"
                                      accessibilityState={{
                                        selected: editDecimalPlaces === places,
                                      }}
                                    >
                                      <Text
                                        style={[
                                          styles.typeText,
                                          editDecimalPlaces === places && styles.typeTextActive,
                                        ]}
                                      >
                                        {places} {places === 1 ? 'casa' : 'casas'}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}

                              <View style={styles.activeRow}>
                                <Text style={[styles.newValuesLabel, dark && styles.light]}>
                                  Característica ativa para novos produtos
                                </Text>
                                <Switch
                                  value={editActive}
                                  onValueChange={setEditActive}
                                  trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                                  accessibilityLabel="Característica ativa para novos produtos"
                                />
                              </View>

                              {isEditingChoiceType && (
                                <View style={styles.editorOptions}>
                                  <Text style={[styles.newValuesLabel, dark && styles.light]}>
                                    Opções disponíveis
                                  </Text>
                                  {editOptions.map((option, index) => (
                                    <View
                                      key={option.id || `new-${index}`}
                                      style={styles.editOptionRow}
                                    >
                                      <TextInput
                                        value={option.value}
                                        onChangeText={(value) =>
                                          setEditOptions((previous) =>
                                            previous.map((item, itemIndex) =>
                                              itemIndex === index ? { ...item, value } : item
                                            )
                                          )
                                        }
                                        placeholder={`Opção ${index + 1}`}
                                        placeholderTextColor="#94a3b8"
                                        style={[
                                          styles.valInput,
                                          styles.editOptionInput,
                                          dark && styles.darkInput,
                                          dark && styles.light,
                                        ]}
                                        accessibilityLabel={`Opção ${index + 1}`}
                                      />
                                      <TouchableOpacity
                                        disabled={index === 0}
                                        onPress={() =>
                                          setEditOptions((previous) => {
                                            const next = [...previous];
                                            [next[index - 1], next[index]] = [
                                              next[index],
                                              next[index - 1],
                                            ];
                                            return next;
                                          })
                                        }
                                        style={styles.reorderBtn}
                                        accessibilityLabel={`Mover opção ${option.value} para cima`}
                                      >
                                        <Text style={styles.reorderText}>↑</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        disabled={index === editOptions.length - 1}
                                        onPress={() =>
                                          setEditOptions((previous) => {
                                            const next = [...previous];
                                            [next[index], next[index + 1]] = [
                                              next[index + 1],
                                              next[index],
                                            ];
                                            return next;
                                          })
                                        }
                                        style={styles.reorderBtn}
                                        accessibilityLabel={`Mover opção ${option.value} para baixo`}
                                      >
                                        <Text style={styles.reorderText}>↓</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={() =>
                                          setEditOptions((previous) =>
                                            previous.filter((_, itemIndex) => itemIndex !== index)
                                          )
                                        }
                                        style={styles.removeOptionBtn}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Remover opção ${option.value}`}
                                      >
                                        <X size={14} color="#ef4444" />
                                      </TouchableOpacity>
                                    </View>
                                  ))}
                                  <View style={styles.addValRow}>
                                    <TextInput
                                      value={editOptionInput}
                                      onChangeText={setEditOptionInput}
                                      onSubmitEditing={() => addEditedOption(attr.id)}
                                      placeholder="Adicionar opção..."
                                      placeholderTextColor="#94a3b8"
                                      style={[
                                        styles.valInput,
                                        dark && styles.darkInput,
                                        dark && styles.light,
                                      ]}
                                      returnKeyType="done"
                                    />
                                    <TouchableOpacity
                                      onPress={() => addEditedOption(attr.id)}
                                      style={styles.addValBtn}
                                      accessibilityLabel="Adicionar opção"
                                    >
                                      <Plus size={14} color="#ffffff" />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              )}
                            </View>
                          )}

                          {isExp && !isEditing && (
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
                                      onPress={() =>
                                        handleDeleteValue(attr.name, opt.id, opt.value)
                                      }
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
                                  disabled={savingValueId === attr.id}
                                  style={[
                                    styles.addValBtn,
                                    savingValueId === attr.id && styles.disabledControl,
                                  ]}
                                  accessibilityLabel={`Adicionar valor para ${attr.name}`}
                                >
                                  {savingValueId === attr.id ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                  ) : (
                                    <Plus size={14} color="#ffffff" />
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })
                )}
              </View>
            )}
          </ScrollView>
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
    height: '94%',
    maxHeight: '96%',
    minHeight: '70%',
    flexShrink: 1,
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
  managerBody: { flexShrink: 1, minHeight: 0 },
  managerBodyContent: { gap: 14, paddingBottom: 12 },
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
  list: { gap: 8 },
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
  disabledControl: { opacity: 0.55 },
  editorArea: { paddingTop: 12 },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  precisionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  editorOptions: { gap: 8 },
  editOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editOptionInput: { minWidth: 0 },
  reorderBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  reorderText: { color: '#475569', fontSize: 17, fontWeight: '900' },
  removeOptionBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
