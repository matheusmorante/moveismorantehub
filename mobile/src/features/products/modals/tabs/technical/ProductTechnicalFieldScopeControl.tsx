import type React from 'react';
import { Switch, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './productFormTechnicalTab.styles';

type ProductTechnicalFieldScope = 'not_inform' | 'global' | 'variation';

interface Props {
  hasParentData: boolean;
  isSimpleProduct: boolean;
  alwaysApplicable: boolean;
  isDependencyVariable: boolean;
  requiredForCatalog: boolean;
  currentScope: ProductTechnicalFieldScope;
  fieldName: string;
  dark: boolean;
  onSetScope: (scope: ProductTechnicalFieldScope) => void;
}

export const ProductTechnicalFieldScopeControl: React.FC<Props> = ({
  hasParentData,
  isSimpleProduct,
  alwaysApplicable,
  isDependencyVariable,
  requiredForCatalog,
  currentScope,
  fieldName,
  dark,
  onSetScope,
}) => {
  const scopeOptions = [
    ...(!requiredForCatalog ? [['not_inform', 'Não informar'] as const] : []),
    ['global', 'Global'] as const,
    ['variation', 'Por variação'] as const,
  ] as const;

  return (
    <>
      {!hasParentData &&
        isSimpleProduct &&
        !alwaysApplicable &&
        !isDependencyVariable && (
          <Switch
            value={currentScope === 'global'}
            onValueChange={(enabled) =>
              onSetScope(enabled ? 'global' : 'not_inform')
            }
            accessibilityRole="switch"
            accessibilityLabel={`Exibir característica ${fieldName}`}
            trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
            thumbColor={currentScope === 'global' ? '#fff' : '#f8fafc'}
          />
        )}
      {!hasParentData &&
        !isSimpleProduct &&
        !alwaysApplicable &&
        !isDependencyVariable && (
          <View style={styles.scopeRow}>
            {scopeOptions.map(([scope, label]) => {
              const selected = currentScope === scope;
              return (
                <TouchableOpacity
                  key={scope}
                  onPress={() => onSetScope(scope)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.scopeButton,
                    dark && styles.darkScopeButton,
                    selected && styles.scopeButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.scopeButtonText,
                      dark && styles.dimText,
                      selected && styles.scopeButtonTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
    </>
  );
};
