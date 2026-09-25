import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Sliders, Check } from 'lucide-react-native';
import { fetchMobileAttributes, MobileAttribute } from '../../services/mobileAttributeService';
import { toggleCategoryAttribute } from '../domain/categoryEnvironmentRules';

interface Props {
  dark: boolean;
  selectedAttributes: { id: string; name: string }[];
  setSelectedAttributes: React.Dispatch<React.SetStateAction<{ id: string; name: string }[]>>;
  isLoadingAttributes: boolean;
}

export const CategoryAttributesPicker: React.FC<Props> = ({
  dark,
  selectedAttributes,
  setSelectedAttributes,
  isLoadingAttributes,
}) => {
  const [allAttributes, setAllAttributes] = useState<MobileAttribute[]>([]);
  const [loadingAllAttrs, setLoadingAllAttrs] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingAllAttrs(true);
    fetchMobileAttributes()
      .then(attrs => {
        if (isMounted) setAllAttributes(attrs);
      })
      .finally(() => {
        if (isMounted) setLoadingAllAttrs(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleAttribute = (attr: { id: string; name: string }) => {
    setSelectedAttributes(prev => toggleCategoryAttribute(prev, attr));
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
      ) : allAttributes.length === 0 ? (
        <Text style={styles.emptyItemsText}>Nenhuma característica cadastrada no sistema.</Text>
      ) : (
        <View style={[styles.linksBox, dark && styles.linksBoxDark]}>
          {allAttributes.map(attr => {
            const isChecked = selectedAttributes.some(a => a.id === attr.id);
            return (
              <TouchableOpacity
                key={attr.id}
                onPress={() => toggleAttribute({ id: attr.id, name: attr.name })}
                style={styles.checkRow}
                activeOpacity={0.7}
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
    </View>
  );
};

const styles = StyleSheet.create({
  formGroup: { gap: 6 },
  attrHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  helperText: { fontSize: 11, color: '#64748b', marginTop: -2, marginBottom: 4 },
  loadingAttrs: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  loadingAttrsText: { fontSize: 11, color: '#64748b' },
  emptyItemsText: { fontSize: 11, color: '#94a3b8', padding: 8, textAlign: 'center' },
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
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 6 },
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
