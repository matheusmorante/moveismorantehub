import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type NativeProductReconciliationBatchOperation = 'supplier' | 'category' | 'ncm' | 'attribute';

interface Props {
  selectedCount: number;
  isAllFilteredSelected: boolean;
  dark: boolean;
  attributeDisabled: boolean;
  onOpen: (operation: NativeProductReconciliationBatchOperation) => void;
  onClear: () => void;
}

const ACTIONS: Array<{ operation: NativeProductReconciliationBatchOperation; label: string }> = [
  { operation: 'supplier', label: 'Fornecedor' },
  { operation: 'category', label: 'Categoria' },
  { operation: 'ncm', label: 'NCM' },
  { operation: 'attribute', label: 'Atributo' },
];

export const NativeProductReconciliationBatchBar: React.FC<Props> = ({
  selectedCount,
  isAllFilteredSelected,
  dark,
  attributeDisabled,
  onOpen,
  onClear,
}) => {
  if (selectedCount === 0) return null;

  return (
    <View style={[styles.container, dark && styles.containerDark]}>
      <View style={styles.selectionSummary}>
        <Text style={styles.count}>{selectedCount}</Text>
        <Text style={styles.summaryText}>
          {selectedCount === 1 ? 'produto selecionado' : 'produtos selecionados'}
        </Text>
        {isAllFilteredSelected ? <Text style={styles.allFilteredTag}>Todos do filtro</Text> : null}
        <Pressable onPress={onClear} accessibilityRole="button" style={styles.clearButton}>
          <Text style={styles.clearText}>Desmarcar</Text>
        </Pressable>
      </View>
      <View style={styles.actions}>
        {ACTIONS.map(({ operation, label }) => {
          const disabled = operation === 'attribute' && attributeDisabled;
          return (
            <Pressable
              key={operation}
              onPress={() => onOpen(operation)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`Aplicar ${label.toLowerCase()} em lote`}
              accessibilityState={{ disabled }}
              style={[styles.actionButton, disabled && styles.actionDisabled]}
            >
              <Text style={[styles.actionText, disabled && styles.actionTextDisabled]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {attributeDisabled ? (
        <Text style={styles.hint}>
          Atributos em lote exigem produtos selecionados da mesma categoria.
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 12, gap: 10, borderRadius: 18, backgroundColor: '#0f172a' },
  containerDark: { backgroundColor: '#111c2f', borderWidth: 1, borderColor: '#334155' },
  selectionSummary: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { minWidth: 30, textAlign: 'center', color: '#ddd6fe', fontSize: 13, fontWeight: '900' },
  summaryText: { flex: 1, color: '#f8fafc', fontSize: 12, fontWeight: '800' },
  clearButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 },
  clearText: { color: '#cbd5e1', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  allFilteredTag: { color: '#c4b5fd', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { minHeight: 44, flexGrow: 1, flexBasis: '46%', justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#7c3aed', paddingHorizontal: 10 },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  actionDisabled: { backgroundColor: '#334155' },
  actionTextDisabled: { color: '#94a3b8' },
  hint: { color: '#cbd5e1', fontSize: 10, fontWeight: '600' },
});
