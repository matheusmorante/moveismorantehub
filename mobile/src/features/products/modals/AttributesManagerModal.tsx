import {
  Plus,
  Sliders,
  Tag,
  X,
} from 'lucide-react-native';
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
import { z } from 'zod';
import { useZodForm, flattenFormErrors } from '../../../hooks/useZodForm';
import {
  createCharacteristicFormSchema,
  normalizeManagedCharacteristicType,
  type CharacteristicFillConfigurationPayload,
} from '../../../../../shared-utils/characteristicFormRules';
import { getCharacteristicTextLimits } from '../../../../../shared-utils/characteristicTextLimits';
import { normalizeProductAttributeOptionValue } from '../../../../../shared-utils/productAttributeOptionRules';
import { validateAttributeOption } from '../categories/domain/categoryEnvironmentRules';
import {
  addMobileAttributeValue,
  deleteMobileAttribute,
  deleteMobileAttributeValue,
  fetchMobileAttributes,
  type MobileAttribute,
  type MobileAttributeDataType,
  saveMobileAttributeDefinition,
} from '../services/mobileAttributeService';
import { ManagedAttributesList } from './ManagedAttributesList';
import { styles } from './attributesManagerModal.styles';

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

type FillLimitInputKey = 'minValue' | 'maxValue' | 'minSelections' | 'maxSelections';
type FillLimitInputValues = Record<FillLimitInputKey, string>;

const parseOptionalNumber = (value: string): number | undefined =>
  value.trim() === '' ? undefined : Number(value);

const attributeOptionFormSchema = z.object({
  value: z.string()
    .transform(normalizeProductAttributeOptionValue)
    .refine((value) => value.length > 0, 'O valor da opção não pode estar vazio.'),
  attributeId: z.string().min(1, 'Característica não encontrada.').optional(),
  existingOptions: z.array(z.object({ id: z.string(), value: z.string() })),
}).superRefine((values, ctx) => {
  const result = validateAttributeOption(values.value, values.existingOptions);
  if (!result.valid) ctx.addIssue({ code: 'custom', path: ['value'], message: result.error || 'Valor inválido.' });
});

type CharacteristicOptionInput = {
  id: string;
  value: string;
  sortOrder?: number;
  [key: string]: unknown;
};

const toCharacteristicOptionInput = (option: MobileAttribute['options'][number]): CharacteristicOptionInput =>
  ({ ...option }) as CharacteristicOptionInput;

export const AttributesManagerModal: React.FC<Props> = ({ visible, dark, onClose }) => {
  const insets = useSafeAreaInsets();
  const [attributes, setAttributes] = useState<MobileAttribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newDataType, setNewDataType] = useState<MobileAttributeDataType>('radio');
  const [newUnit, setNewUnit] = useState('cm');
  const [newDecimalPlaces, setNewDecimalPlaces] = useState<1 | 2 | 3>(2);
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newOptionInput, setNewOptionInput] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [newConfigurationInputs, setNewConfigurationInputs] = useState<FillLimitInputValues>({
    minValue: '',
    maxValue: '',
    minSelections: '',
    maxSelections: '',
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newValText, setNewValText] = useState('');
  const [savingValueId, setSavingValueId] = useState<string | null>(null);
  const optionsUpdateAttributeId = useRef<string | undefined>(undefined);
  const allCharacteristics = attributes.map((attribute) => ({ ...attribute, active: attribute.active !== false }));
  const newFillType = normalizeManagedCharacteristicType(newDataType);
  const newConfiguration: CharacteristicFillConfigurationPayload =
    getCharacteristicTextLimits(newFillType) ??
    (newFillType === 'integer' || newFillType === 'decimal'
      ? {
          minValue: parseOptionalNumber(newConfigurationInputs.minValue),
          maxValue: parseOptionalNumber(newConfigurationInputs.maxValue),
        }
      : newFillType === 'multi_select'
        ? {
            minSelections: parseOptionalNumber(newConfigurationInputs.minSelections),
            maxSelections: parseOptionalNumber(newConfigurationInputs.maxSelections),
          }
        : {});
  const newDefinition = {
    name: newAttrName, dataType: newDataType, unit: newDataType === 'measure' ? newUnit : '',
    decimalPlaces: newDecimalPlaces, active: true,
    configuration: newConfiguration,
    options: [...newOptions, ...((newDataType === 'radio' || newDataType === 'multi_select') && newOptionInput.trim() ? [newOptionInput.trim()] : [])]
      .map((value) => ({ id: '', value: normalizeProductAttributeOptionValue(value) })),
  };
  const { validateAndRun: validateNewDefinition } = useZodForm(createCharacteristicFormSchema(allCharacteristics), newDefinition);
  const { validateAndRun: validateOptionsUpdate } = useZodForm(
    createCharacteristicFormSchema(allCharacteristics, () => optionsUpdateAttributeId.current),
    newDefinition
  );
  const { validateAndRun: validateOption } = useZodForm(attributeOptionFormSchema, { value: newOptionInput, existingOptions: [] });
  const showValidationError = (errors: Parameters<typeof flattenFormErrors>[0]) => {
    Alert.alert('Atenção', Object.values(flattenFormErrors(errors))[0] || 'Revise os campos informados.');
  };

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
          await load();
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
              await load();
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
                  onPress={() => {
                    setNewDataType(value as MobileAttributeDataType);
                    setNewConfigurationInputs({ minValue: '', maxValue: '', minSelections: '', maxSelections: '' });
                  }}
                  style={[styles.typeBtn, newDataType === value && styles.typeBtnActive]}
                >
                  <Text style={[styles.typeText, newDataType === value && styles.typeTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
              handleAddValue={handleAddValue}
              handleDeleteAttr={handleDeleteAttr}
              handleDeleteValue={handleDeleteValue}
              load={load}
              loadError={loadError}
              loading={loading}
              newValText={newValText}
              savingValueId={savingValueId}
              searchTerm={searchTerm}
              setExpandedId={setExpandedId}
              setNewValText={setNewValText}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
