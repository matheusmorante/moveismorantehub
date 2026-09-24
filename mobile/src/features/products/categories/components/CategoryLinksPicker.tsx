import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { EnvironmentNode, CategoryNode } from '../types/mobileCategory.types';

interface Props {
  isEnv: boolean;
  dark: boolean;
  categories: CategoryNode[];
  environments: EnvironmentNode[];
  selectedLinks: string[];
  onToggleLink: (id: string) => void;
}

export const CategoryLinksPicker: React.FC<Props> = ({
  isEnv,
  dark,
  categories,
  environments,
  selectedLinks,
  onToggleLink,
}) => {
  const items = isEnv
    ? categories.map(c => ({ id: c.id, name: c.name }))
    : environments.map(e => ({ id: e.id, name: e.name }));

  const helper = isEnv
    ? 'Selecione quais categorias aparecem neste ambiente.'
    : 'Selecione os ambientes onde esta categoria é utilizada.';

  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>
        {isEnv ? 'Vincular Categorias ao Ambiente' : 'Vincular a Ambientes'}
      </Text>
      <Text style={styles.helperText}>{helper}</Text>

      <View style={[styles.linksBox, dark && styles.linksBoxDark]}>
        {items.length === 0 ? (
          <Text style={styles.emptyItemsText}>
            {isEnv ? 'Nenhuma categoria disponível.' : 'Nenhum ambiente cadastrado ainda.'}
          </Text>
        ) : (
          items.map(item => {
            const isChecked = selectedLinks.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => onToggleLink(item.id)}
                style={styles.checkRow}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                  {isChecked && <Check size={12} color="#ffffff" />}
                </View>
                <Text style={[styles.checkLabel, dark && styles.textLight]}>{item.name}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  formGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  helperText: { fontSize: 11, color: '#64748b', marginTop: -2, marginBottom: 4 },
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
  checkboxChecked: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkLabel: { fontSize: 12, fontWeight: '600', color: '#334155', flex: 1 },
  emptyItemsText: { fontSize: 11, color: '#94a3b8', padding: 8, textAlign: 'center' },
  textLight: { color: '#f8fafc' },
});
