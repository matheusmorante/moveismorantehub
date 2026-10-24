import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Switch } from 'react-native';
import { Sliders, Check, X } from 'lucide-react-native';
import { fetchMobileAttributes, MobileAttribute } from '../../services/mobileAttributeService';
import { toggleCategoryAttribute } from '../domain/categoryEnvironmentRules';
import {
  getDefaultCategoryAttributeIsRequired,
  isCategoryAttributeSelectable,
  isCategoryAttributeRequirementLocked,
  setCategoryAttributeRequirement,
  type CategoryAttributeSelection,
} from '../../../../../../shared-utils/categoryAttributeSelection';

interface Props {
  dark: boolean;
  selectedAttributes: CategoryAttributeSelection[];
  setSelectedAttributes: React.Dispatch<React.SetStateAction<CategoryAttributeSelection[]>>;
  isLoadingAttributes: boolean;
  isSubmitting: boolean;
}

export const CategoryAttributesPicker: React.FC<Props> = ({
  dark,
  selectedAttributes,
  setSelectedAttributes,
  isLoadingAttributes,
  isSubmitting,
}) => {
  const [allAttributes, setAllAttributes] = useState<MobileAttribute[]>([]);
  const [loadingAllAttrs, setLoadingAllAttrs] = useState(false);
  const [attributeCatalogueLoadFailed, setAttributeCatalogueLoadFailed] = useState(false);
  const selectableAttributes = allAttributes.filter((attribute) =>
    isCategoryAttributeSelectable(attribute.name),
  );

  useEffect(() => {
    let isMounted = true;
    setLoadingAllAttrs(true);
    fetchMobileAttributes()
      .then((attrs) => {
        if (isMounted) {
          setAllAttributes(attrs);
          setAttributeCatalogueLoadFailed(false);
        }
      })
      .catch((error) => {
        console.warn('[CategoryAttributesPicker] Erro ao buscar características:', error);
        if (isMounted) {
          setAllAttributes([]);
          setAttributeCatalogueLoadFailed(true);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingAllAttrs(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleAttribute = (attr: { id: string; name: string }) => {
    setSelectedAttributes((prev) =>
      toggleCategoryAttribute(prev, {
        ...attr,
        isRequired: getDefaultCategoryAttributeIsRequired(attr.name),
      }),
    );
  };

  return (
    <View style={styles.formGroup}>
      <View style={styles.attrHeaderRow}>
        <Sliders size={14} color="#7c3aed" />
        <Text style={styles.label}>Características da Categoria</Text>
      </View>
      <Text style={styles.helperText}>
        Defina as características aplicáveis aos produtos cadastrados nesta categoria.
      </Text>

      {isLoadingAttributes || loadingAllAttrs ? (
        <View style={styles.loadingAttrs}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingAttrsText}>Carregando características...</Text>
        </View>
      ) : attributeCatalogueLoadFailed ? (
        <Text style={styles.attributeCatalogueError} accessibilityRole="alert">
          Não foi possível carregar a lista de características. As seleções atuais foram preservadas.
        </Text>
      ) : allAttributes.length === 0 ? (
        <Text style={styles.emptyItemsText}>Nenhuma característica cadastrada no sistema.</Text>
      ) : selectableAttributes.length === 0 ? (
        <Text style={styles.emptyItemsText}>Nenhuma característica disponível para vincular.</Text>
      ) : (
        <View style={[styles.linksBox, dark && styles.linksBoxDark]}>
          {selectableAttributes.map((attr) => {
            const isChecked = selectedAttributes.some((a) => a.id === attr.id);
            return (
              <TouchableOpacity
                key={attr.id}
                onPress={() => toggleAttribute({ id: attr.id, name: attr.name })}
                style={styles.checkRow}
                activeOpacity={0.7}
                disabled={isLoadingAttributes || isSubmitting}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: isChecked,
                  disabled: isLoadingAttributes || isSubmitting,
                }}
                accessibilityLabel={`Característica ${attr.name}`}
              >
                <View style={[styles.checkbox, isChecked && styles.checkboxCheckedPurple]}>
                  {isChecked && <Check size={12} color="#ffffff" />}
                </View>
                <Text style={[styles.checkLabel, dark && styles.textLight]}>{attr.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {selectedAttributes.length > 0 && (
        <View style={styles.selectedAttributes}>
          {selectedAttributes.map((attribute) => {
            const requirementLocked = isCategoryAttributeRequirementLocked(attribute.name);
            return (
              <View
                key={attribute.id}
                style={[styles.selectedAttributeRow, dark && styles.selectedAttributeRowDark]}
              >
                <View style={styles.selectedAttributeName}>
                  <Text style={[styles.selectedAttributeText, dark && styles.textLight]}>{attribute.name}</Text>
                  <Text style={styles.requirementLabel}>
                    {attribute.isRequired ? 'Obrigatória' : 'Opcional'}
                  </Text>
                </View>
                <Switch
                  value={attribute.isRequired}
                  onValueChange={(isRequired) =>
                    setSelectedAttributes((prev) =>
                      setCategoryAttributeRequirement(prev, attribute.id, isRequired),
                    )
                  }
                  disabled={isSubmitting || requirementLocked}
                  accessibilityRole="switch"
                  accessibilityState={{
                    checked: attribute.isRequired,
                    disabled: isSubmitting || requirementLocked,
                  }}
                  accessibilityLabel={`Característica ${attribute.name} obrigatória`}
                  trackColor={{ false: dark ? '#475569' : '#cbd5e1', true: '#2563eb' }}
                  thumbColor={attribute.isRequired ? '#ffffff' : dark ? '#e2e8f0' : '#f8fafc'}
                />
                <TouchableOpacity
                  onPress={() => toggleAttribute(attribute)}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover característica ${attribute.name}`}
                  style={styles.removeAttributeButton}
                >
                  <X size={16} color={dark ? '#cbd5e1' : '#64748b'} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  formGroup: { gap: 6 },
  attrHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helperText: { fontSize: 11, color: '#64748b', marginTop: -2, marginBottom: 4 },
  loadingAttrs: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  loadingAttrsText: { fontSize: 11, color: '#64748b' },
  emptyItemsText: { fontSize: 11, color: '#94a3b8', padding: 8, textAlign: 'center' },
  attributeCatalogueError: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dc2626',
    paddingVertical: 6,
  },
  linksBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    padding: 8,
    gap: 4,
    maxHeight: 180,
  },
  linksBoxDark: { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderColor: '#334155' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  selectedAttributes: { gap: 6 },
  selectedAttributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  selectedAttributeRowDark: { backgroundColor: 'rgba(37, 99, 235, 0.12)' },
  selectedAttributeName: { flex: 1, gap: 2 },
  selectedAttributeText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  requirementLabel: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  removeAttributeButton: { padding: 6 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCheckedPurple: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  checkLabel: { fontSize: 12, fontWeight: '600', color: '#334155', flex: 1 },
  textLight: { color: '#f8fafc' },
});
