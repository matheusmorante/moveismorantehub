import { Plus, Sliders, Tag, X } from 'lucide-react-native';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FormTextInput } from '../../../components/shared/FormTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useZodForm, flattenFormErrors } from '../../../hooks/useZodForm';
import { createCharacteristicFormSchema } from '../../../../../shared-utils/characteristicFormRules';
import {
  addMobileAttributeValue,
  deleteMobileAttribute,
  deleteMobileAttributeValue,
  fetchMobileAttributeOptions,
  fetchMobileAttributeSummaries,
  type MobileAttribute,
  saveMobileAttributeDefinition,
} from '../services/mobileAttributeService';
import { ManagedAttributesList } from './ManagedAttributesList';
import { AttributeTypeSelector } from './AttributeTypeSelector';
import {
  attributeOptionFormSchema,
  parseOptionalNumber,
  toCharacteristicOptionInput,
  type CharacteristicOptionInput,
} from './attributesManagerFormModel';
import { styles } from './attributesManagerModal.styles';
import { useNewAttributeDefinitionDraft } from './useNewAttributeDefinitionDraft';

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
  const [showTypeOptions, setShowTypeOptions] = useState(false);
  const {
    newDataType,
    setNewDataType,
    newUnit,
    setNewUnit,
    newDecimalPlaces,
    setNewDecimalPlaces,
    isSavingNew,
    setIsSavingNew,
    newAttrName,
    setNewAttrName,
    newOptionInput,
    setNewOptionInput,
    newOptions,
    setNewOptions,
    newConfigurationInputs,
    setNewConfigurationInputs,
    newFillType,
    newDefinition,
  } = useNewAttributeDefinitionDraft();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [optionsLoadingId, setOptionsLoadingId] = useState<string | null>(null);
  const [optionsLoadErrorId, setOptionsLoadErrorId] = useState<string | null>(null);
  const [newValText, setNewValText] = useState('');
  const [savingValueId, setSavingValueId] = useState<string | null>(null);
  const optionsUpdateAttributeId = useRef<string | undefined>(undefined);
  const optionLoadRequest = useRef(0);
  const expandedIdRef = useRef<string | null>(null);
  const allCharacteristics = attributes.map((attribute) => ({ ...attribute, active: attribute.active !== false }));
  const { validateAndRun: validateNewDefinition } = useZodForm(createCharacteristicFormSchema(allCharacteristics), newDefinition);
  const { validateAndRun: validateOptionsUpdate } = useZodForm(
    createCharacteristicFormSchema(allCharacteristics, () => optionsUpdateAttributeId.current),
    newDefinition
  );
  const { validateAndRun: validateOption } = useZodForm(attributeOptionFormSchema, { value: newOptionInput, existingOptions: [] });
  const showValidationError = (errors: Parameters<typeof flattenFormErrors>[0]) => {
    Alert.alert('Atenção', Object.values(flattenFormErrors(errors))[0] || 'Revise os campos informados.');
  };

  const loadOptionsForAttribute = async (attributeId: string) => {
    const requestId = ++optionLoadRequest.current;
    setOptionsLoadingId(attributeId);
    setOptionsLoadErrorId(null);
    try {
      const options = await fetchMobileAttributeOptions(attributeId);
      if (requestId === optionLoadRequest.current) {
        setAttributes((current) => current.map((attribute) =>
          attribute.id === attributeId
            ? {
                ...attribute,
                options,
                optionCount: options.length,
                activeOptionCount: options.filter((option) => option.active !== false).length,
                optionsLoaded: true,
              }
            : attribute
        ));
      }
    } catch (_) {
      if (requestId === optionLoadRequest.current) setOptionsLoadErrorId(attributeId);
    } finally {
      if (requestId === optionLoadRequest.current) setOptionsLoadingId(null);
    }
  };

  const load = async (optionsAttributeId?: string) => {
    if (optionsAttributeId) {
      optionLoadRequest.current += 1;
      setOptionsLoadingId(null);
      setOptionsLoadErrorId(null);
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchMobileAttributeSummaries();
      if (optionsAttributeId) {
        const options = await fetchMobileAttributeOptions(optionsAttributeId);
        setAttributes(data.map((attribute) => attribute.id === optionsAttributeId
          ? {
              ...attribute,
              options,
              optionCount: options.length,
              activeOptionCount: options.filter((option) => option.active !== false).length,
              optionsLoaded: true,
            }
          : attribute));
      } else {
        setAttributes(data);
      }
    } catch (_) {
      setLoadError('Não foi possível carregar as características. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) void load(expandedIdRef.current ?? undefined);
    else {
      optionLoadRequest.current += 1;
      setOptionsLoadingId(null);
      setShowTypeOptions(false);
    }
  }, [visible]);

  const toggleExpandedAttribute = (attributeId: string) => {
    if (expandedId === attributeId) {
      optionLoadRequest.current += 1;
      expandedIdRef.current = null;
      setExpandedId(null);
      setOptionsLoadingId(null);
      return;
    }
    expandedIdRef.current = attributeId;
    setExpandedId(attributeId);
    const attribute = attributes.find((item) => item.id === attributeId);
    if (!attribute?.optionsLoaded) void loadOptionsForAttribute(attributeId);
  };

  const handleAddAttr = async () => {
    if (isSavingNew) return;
    await validateNewDefinition(newDefinition, async (values) => {
    const isChoiceType = values.dataType === 'radio' || values.dataType === 'multi_select';
    setIsSavingNew(true);
    try {
      await saveMobileAttributeDefinition({
        name: values.name,
        dataType: values.dataType,
        unit: values.unit,
        decimalPlaces: values.dataType === 'decimal' ? values.decimalPlaces : undefined,
        configuration: values.configuration,
        active: true,
        isCustom: true,
        options: isChoiceType ? values.options : [],
      });
      setNewAttrName('');
      setNewDataType('radio');
      setShowTypeOptions(false);
      setNewUnit('cm');
      setNewDecimalPlaces(2);
      setNewConfigurationInputs({ minValue: '', maxValue: '', minSelections: '', maxSelections: '' });
      setNewOptionInput('');
      setNewOptions([]);
      await load();
    } catch (error) {
      Alert.alert(
        'Não foi possível criar',
        error instanceof Error ? error.message : 'A característica não foi salva.'
      );
    } finally {
      setIsSavingNew(false);
    }
    }, showValidationError);
  };

  const handleDeleteAttr = (id: string, name: string) => {
    Alert.alert(
      'Excluir característica',
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
    if (!attr) return;
    const existingOptions = (attr?.options || []).map((o) => ({ id: o.id, value: o.value }));
    await validateOption({ value: newValText, attributeId: attrId, existingOptions }, async (values) => {
      optionsUpdateAttributeId.current = attrId;
      await validateOptionsUpdate({
        ...attr,
        dataType: attr.dataType ?? 'text_short',
        unit: attr.unit ?? '',
        decimalPlaces: attr.decimalPlaces ?? 2,
        active: attr.active !== false,
        options: [
          ...attr.options.map(toCharacteristicOptionInput),
          { id: '', value: values.value } as CharacteristicOptionInput,
        ],
      }, async () => {
        setSavingValueId(attrId);
        try {
          await addMobileAttributeValue(values.attributeId!, values.value);
          setNewValText('');
          await load(attrId);
        } catch (error) {
          Alert.alert(
            'Não foi possível adicionar',
            error instanceof Error ? error.message : 'O valor não foi salvo.'
          );
        } finally {
          setSavingValueId(null);
        }
      }, showValidationError);
    }, showValidationError);
  };

  const handleDeleteValue = (attribute: MobileAttribute, valId: string, value: string) => {
    Alert.alert('Remover valor', `Deseja remover "${value}" de "${attribute.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          optionsUpdateAttributeId.current = attribute.id;
          await validateOptionsUpdate({
            ...attribute,
            dataType: attribute.dataType ?? 'text_short',
            unit: attribute.unit ?? '',
            decimalPlaces: attribute.decimalPlaces ?? 2,
            active: attribute.active !== false,
            options: attribute.options
              .filter((option) => option.id !== valId)
              .map(toCharacteristicOptionInput),
          }, async () => {
            try {
              await deleteMobileAttributeValue(valId);
              await load(attribute.id);
              return true;
            } catch (error) {
              Alert.alert(
                'Não foi possível remover',
                error instanceof Error ? error.message : 'O valor não foi removido.'
              );
              return false;
            }
          }, showValidationError);
        },
      },
    ]);
  };

  const handleAddNewOption = async () => {
    await validateOption({ value: newOptionInput, existingOptions: newOptions.map((value, index) => ({ id: String(index), value })) }, (values) => {
      setNewOptions((previous) => [...previous, values.value]);
      setNewOptionInput('');
    }, showValidationError);
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
              <Text style={[styles.title, dark && styles.light]}>Características e Variações</Text>
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
              <FormTextInput
                value={newAttrName}
                onChangeText={setNewAttrName}
                placeholder="Nova característica (ex: Cor, Tamanho)..."
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

            <AttributeTypeSelector
              dark={dark}
              dataType={newDataType}
              expanded={showTypeOptions}
              onToggle={() => setShowTypeOptions((open) => !open)}
              onSelect={(dataType) => {
                setNewDataType(dataType);
                setNewConfigurationInputs({ minValue: '', maxValue: '', minSelections: '', maxSelections: '' });
                setShowTypeOptions(false);
              }}
            />

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
            {(newFillType === 'integer' || newFillType === 'decimal') && (
              <View style={styles.configurationArea}>
                <Text style={[styles.newValuesLabel, dark && styles.light]}>Configurações do tipo</Text>
                <View style={styles.configurationRow}>
                  <View style={styles.configurationField}>
                    <Text style={[styles.configurationLabel, dark && styles.light]}>Mínimo</Text>
                    <FormTextInput
                      value={newConfigurationInputs.minValue}
                      onChangeText={(value) => setNewConfigurationInputs((previous) => ({ ...previous, minValue: value }))}
                      keyboardType={newFillType === 'integer' ? 'numeric' : 'decimal-pad'}
                      placeholder="Sem mínimo"
                      placeholderTextColor="#94a3b8"
                      style={[styles.input, dark && styles.darkInput, dark && styles.light]}
                      accessibilityLabel="Valor mínimo da característica"
                    />
                  </View>
                  <View style={styles.configurationField}>
                    <Text style={[styles.configurationLabel, dark && styles.light]}>Máximo</Text>
                    <FormTextInput
                      value={newConfigurationInputs.maxValue}
                      onChangeText={(value) => setNewConfigurationInputs((previous) => ({ ...previous, maxValue: value }))}
                      keyboardType={newFillType === 'integer' ? 'numeric' : 'decimal-pad'}
                      placeholder="Sem máximo"
                      placeholderTextColor="#94a3b8"
                      style={[styles.input, dark && styles.darkInput, dark && styles.light]}
                      accessibilityLabel="Valor máximo da característica"
                    />
                  </View>
                </View>
              </View>
            )}
            {newFillType === 'multi_select' && (
              <View style={styles.configurationArea}>
                <Text style={[styles.newValuesLabel, dark && styles.light]}>Configurações do tipo</Text>
                <View style={styles.configurationRow}>
                  <View style={styles.configurationField}>
                    <Text style={[styles.configurationLabel, dark && styles.light]}>Mínimo de seleções</Text>
                    <FormTextInput
                      value={newConfigurationInputs.minSelections}
                      onChangeText={(value) => setNewConfigurationInputs((previous) => ({ ...previous, minSelections: value }))}
                      keyboardType="numeric"
                      placeholder="Sem mínimo"
                      placeholderTextColor="#94a3b8"
                      style={[styles.input, dark && styles.darkInput, dark && styles.light]}
                      accessibilityLabel="Mínimo de seleções da característica"
                    />
                  </View>
                  <View style={styles.configurationField}>
                    <Text style={[styles.configurationLabel, dark && styles.light]}>Máximo de seleções</Text>
                    <FormTextInput
                      value={newConfigurationInputs.maxSelections}
                      onChangeText={(value) => setNewConfigurationInputs((previous) => ({ ...previous, maxSelections: value }))}
                      keyboardType="numeric"
                      placeholder="Sem máximo"
                      placeholderTextColor="#94a3b8"
                      style={[styles.input, dark && styles.darkInput, dark && styles.light]}
                      accessibilityLabel="Máximo de seleções da característica"
                    />
                  </View>
                </View>
              </View>
            )}
            {(newDataType === 'radio' || newDataType === 'multi_select') && (
              <View style={styles.newValuesArea}>
                <Text style={[styles.newValuesLabel, dark && styles.light]}>
                  Valores (Enter ou adicionar)
                </Text>
                <View style={styles.addValRow}>
                  <FormTextInput
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
              <FormTextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Buscar características..."
                placeholderTextColor="#94a3b8"
                style={[styles.searchInput, dark && styles.light]}
              />
            </View>

            <ManagedAttributesList
              attributes={attributes}
              dark={dark}
              expandedId={expandedId}
              onToggleExpanded={toggleExpandedAttribute}
              handleAddValue={handleAddValue}
              handleDeleteAttr={handleDeleteAttr}
              handleDeleteValue={handleDeleteValue}
              load={load}
              loadError={loadError}
              loading={loading}
              optionsLoadingId={optionsLoadingId}
              optionsLoadErrorId={optionsLoadErrorId}
              loadOptions={loadOptionsForAttribute}
              newValText={newValText}
              savingValueId={savingValueId}
              searchTerm={searchTerm}
              setNewValText={setNewValText}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
