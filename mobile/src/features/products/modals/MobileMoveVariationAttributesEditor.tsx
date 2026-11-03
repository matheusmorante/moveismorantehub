import type React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FormTextInput } from '../../../components/shared/FormTextInput';
import type { MobileVariationAttribute } from '../services/mobileProductVariationActionsService';
import { styles } from './mobileMoveVariationModal.styles';

interface Props {
  dark: boolean;
  disabled: boolean;
  attributes: readonly (MobileVariationAttribute & { rowId: string })[];
  canAddAttribute: boolean;
  onAddAttribute: () => void;
  onUpdateAttribute: (index: number, field: 'name' | 'value', value: string) => void;
}

export const MobileMoveVariationAttributesEditor: React.FC<Props> = ({
  dark,
  disabled,
  attributes,
  canAddAttribute,
  onAddAttribute,
  onUpdateAttribute,
}) => (
  <View>
    <View style={styles.attributeHeader}>
      <Text style={[styles.label, dark && styles.textDark]}>Características da variação</Text>
      {canAddAttribute ? (
        <TouchableOpacity
          onPress={onAddAttribute}
          disabled={disabled}
          style={styles.addAttributeButton}
          accessibilityRole="button"
          accessibilityLabel="Adicionar característica"
        >
          <Text style={styles.addAttributeText}>＋ Adicionar característica</Text>
        </TouchableOpacity>
      ) : null}
    </View>
    {attributes.length === 0 ? (
      <Text style={[styles.hint, dark && styles.subtitleDark]}>
        Informe ao menos uma característica e seu valor antes de mover.
      </Text>
    ) : (
      attributes.map((attribute, index) => (
        <View style={styles.attributeRow} key={attribute.rowId}>
          <FormTextInput
            value={attribute.name}
            onChangeText={(value) => onUpdateAttribute(index, 'name', value)}
            editable={!disabled}
            placeholder="Característica (ex.: Cor)"
            placeholderTextColor="#94a3b8"
            style={[styles.attributeInput, dark && styles.inputDark]}
            accessibilityLabel={`Nome da característica ${index + 1}`}
          />
          <FormTextInput
            value={attribute.value}
            onChangeText={(value) => onUpdateAttribute(index, 'value', value)}
            editable={!disabled}
            placeholder="Valor (ex.: Azul)"
            placeholderTextColor="#94a3b8"
            style={[styles.attributeInput, dark && styles.inputDark]}
            accessibilityLabel={`Valor da característica ${index + 1}`}
          />
        </View>
      ))
    )}
  </View>
);
