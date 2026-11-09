import { ArrowLeftRight, Check, Info } from 'lucide-react-native';
import { Switch, Text, TouchableOpacity, View } from 'react-native';
import { normalizeName } from './productTechnicalTabFieldVisibility';
import { styles } from './productFormTechnicalTab.styles';

interface ProductTechnicalFieldActionModel {
  fieldName: string;
  dependencyDisabled: boolean;
  dependencyDisabledReason?: string;
  dependencyReasonVisible: boolean;
  isSingleVariation: boolean;
  showsApplicabilitySwitch: boolean;
  hasParentData: boolean;
  applicable: boolean;
  isColorField: boolean;
  canUseInVariationName: boolean;
  isIncludedInVariationName: boolean;
}

interface ProductTechnicalFieldActionsProps {
  model: ProductTechnicalFieldActionModel;
  onToggleDependencyReason: () => void;
  onToggleDepthLength: () => void;
  onApplicabilityChange: (value: boolean) => void;
  onUseColorInVariationName: () => void;
}

export const ProductTechnicalFieldActions = ({
  model,
  onToggleDependencyReason,
  onToggleDepthLength,
  onApplicabilityChange,
  onUseColorInVariationName,
}: ProductTechnicalFieldActionsProps) => (
  <View style={styles.attributeActions}>
    {model.dependencyDisabled && model.dependencyDisabledReason && (
      <TouchableOpacity
        onPress={onToggleDependencyReason}
        style={styles.inheritanceButton}
        accessibilityRole="button"
        accessibilityLabel={model.dependencyDisabledReason}
        accessibilityHint="Mostrar ou ocultar o motivo do bloqueio."
        accessibilityState={{ expanded: model.dependencyReasonVisible }}
      >
        <Info size={15} color="#d97706" />
      </TouchableOpacity>
    )}
    {['profundidade', 'comprimento'].includes(normalizeName(model.fieldName)) && (
      <TouchableOpacity
        disabled={model.isSingleVariation}
        onPress={onToggleDepthLength}
        style={styles.inheritanceButton}
        accessibilityRole="button"
        accessibilityState={{ disabled: model.isSingleVariation }}
        accessibilityLabel={`Alternar para ${normalizeName(model.fieldName) === 'profundidade' ? 'Comprimento' : 'Profundidade'}`}
      >
        <ArrowLeftRight size={15} color="#64748b" />
      </TouchableOpacity>
    )}
    {model.showsApplicabilitySwitch && (
      <Switch
        value={model.hasParentData ? true : model.applicable}
        onValueChange={onApplicabilityChange}
        accessibilityLabel={
          model.hasParentData
            ? `Exibir característica ${model.fieldName}`
            : `Se aplica: ${model.fieldName}`
        }
        trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
      />
    )}
    {!model.hasParentData && model.isColorField && (
      <TouchableOpacity
        disabled={!model.canUseInVariationName}
        onPress={onUseColorInVariationName}
        style={[
          styles.nameAction,
          !model.canUseInVariationName && styles.disabledNameAction,
          model.isIncludedInVariationName && styles.nameActionSelected,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Usar cor no nome da variação"
        accessibilityState={{ disabled: !model.canUseInVariationName }}
        accessibilityHint="Inclui a cor no nome e nas características das variações que têm um valor disponível."
      >
        {model.isIncludedInVariationName && <Check size={12} color="#15803d" />}
        <Text
          style={[
            styles.nameActionText,
            model.isIncludedInVariationName && styles.nameActionTextSelected,
          ]}
        >
          Usar no nome
        </Text>
      </TouchableOpacity>
    )}
  </View>
);
