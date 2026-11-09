import { Plus, Tag, X } from 'lucide-react-native';
import type React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { FormTextInput } from '../../../components/shared/FormTextInput';
import type { MobileAttributeDataType } from '../services/mobileAttributeService';
import { AttributeTypeSelector } from './AttributeTypeSelector';
import type { useNewAttributeDefinitionDraft } from './useNewAttributeDefinitionDraft';
import { styles } from './attributesManagerModal.styles';

type Draft = ReturnType<typeof useNewAttributeDefinitionDraft>;

interface Props {
  dark: boolean;
  draft: Draft;
  showTypeOptions: boolean;
  onToggleTypeOptions: () => void;
  onSelectType: (dataType: MobileAttributeDataType) => void;
  onAddAttribute: () => void;
  onAddOption: () => Promise<void>;
}

export const NewAttributeDefinitionForm: React.FC<Props> = ({
  dark,
  draft,
  showTypeOptions,
  onToggleTypeOptions,
  onSelectType,
  onAddAttribute,
  onAddOption,
}) => {
  const {
    newAttrName,
    setNewAttrName,
    isSavingNew,
    newDataType,
    newUnit,
    setNewUnit,
    newDecimalPlaces,
    setNewDecimalPlaces,
    newFillType,
    newConfigurationInputs,
    setNewConfigurationInputs,
    newOptionInput,
    setNewOptionInput,
    newOptions,
    setNewOptions,
  } = draft;

  return (
    <>
      <View style={styles.addBar}>
        <FormTextInput
          value={newAttrName}
          onChangeText={setNewAttrName}
          placeholder="Nova característica (ex: Cor, Tamanho)..."
          placeholderTextColor="#94a3b8"
          style={[styles.input, dark && styles.darkInput, dark && styles.light]}
        />
        <TouchableOpacity
          onPress={onAddAttribute}
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
        onToggle={onToggleTypeOptions}
        onSelect={onSelectType}
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
              onSubmitEditing={onAddOption}
              placeholder="Ex.: Azul, Preto..."
              placeholderTextColor="#94a3b8"
              style={[styles.valInput, dark && styles.darkInput, dark && styles.light]}
              returnKeyType="done"
              accessibilityLabel="Novo valor da lista"
            />
            <TouchableOpacity
              onPress={onAddOption}
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
    </>
  );
};
