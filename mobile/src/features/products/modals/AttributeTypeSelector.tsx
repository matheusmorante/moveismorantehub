import { ChevronDown } from 'lucide-react-native';
import type React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { MobileAttributeDataType } from '../services/mobileAttributeService';
import { ATTRIBUTE_TYPE_OPTIONS } from './attributesManagerFormModel';
import { styles } from './attributesManagerModal.styles';

interface Props {
  dark: boolean;
  dataType: MobileAttributeDataType;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (dataType: MobileAttributeDataType) => void;
}

export const AttributeTypeSelector: React.FC<Props> = ({
  dark,
  dataType,
  expanded,
  onToggle,
  onSelect,
}) => {
  const selectedLabel =
    ATTRIBUTE_TYPE_OPTIONS.find(([value]) => value === dataType)?.[1] ?? 'Escolha única';

  return (
    <>
      <TouchableOpacity
        onPress={onToggle}
        style={[styles.typeSelector, dark && styles.darkInput]}
        accessibilityRole="button"
        accessibilityLabel={`Tipo de preenchimento: ${selectedLabel}`}
        accessibilityState={{ expanded }}
      >
        <View>
          <Text style={[styles.typeSelectorLabel, dark && styles.light]}>
            Tipo de preenchimento
          </Text>
          <Text style={[styles.typeSelectorValue, dark && styles.light]}>
            {selectedLabel}
          </Text>
        </View>
        <ChevronDown size={18} color={dark ? '#cbd5e1' : '#64748b'} />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.typeRow}>
          {ATTRIBUTE_TYPE_OPTIONS.map(([value, label]) => (
            <TouchableOpacity
              key={value}
              onPress={() => onSelect(value)}
              style={[styles.typeBtn, dataType === value && styles.typeBtnActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: dataType === value }}
            >
              <Text style={[styles.typeText, dataType === value && styles.typeTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
};
