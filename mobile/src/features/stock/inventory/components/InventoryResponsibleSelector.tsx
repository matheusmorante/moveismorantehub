import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';
import type { ScopeEmployee } from '../hooks/useInventoryScopeBuilder';
import {
  filterInventoryResponsibleCandidates,
  getInventoryResponsibleDisplayName,
} from '../../../../../../shared-utils/inventoryResponsible';

interface Props {
  isDarkMode: boolean;
  employees: ScopeEmployee[];
  selectedId: string;
  isSynced: boolean;
  hasError?: boolean;
  onRetrySync?: () => void;
  onSelect: (employee: ScopeEmployee | null) => void;
}

export const InventoryResponsibleSelector: React.FC<Props> = ({
  isDarkMode,
  employees,
  selectedId,
  isSynced,
  hasError = false,
  onRetrySync,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const border = hasError ? '#f43f5e' : isDarkMode ? '#475569' : '#cbd5e1';
  const text = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';
  const eligibleEmployees = useMemo(
    () => filterInventoryResponsibleCandidates(employees),
    [employees]
  );
  const selected = eligibleEmployees.find((employee) => String(employee.id) === selectedId);
  const selectedName = selected ? getInventoryResponsibleDisplayName(selected) : '';
  const selectionGreen = isDarkMode ? '#4ade80' : '#16a34a';
  const inputColor = hasError ? '#f43f5e' : selected ? selectionGreen : text;
  const filteredEmployees = eligibleEmployees.filter((employee) =>
    getInventoryResponsibleDisplayName(employee).toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { color: text }]}>Responsável pelo Inventário</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="Buscar responsável pelo inventário"
          testID="inventory-responsible-search"
          value={isOpen ? query || selectedName : selectedName || query}
          selectTextOnFocus={Boolean(selected)}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onChangeText={(value) => {
            setIsOpen(true);
            setQuery(value);
            if (selected && value !== selectedName) onSelect(null);
          }}
          placeholder="Buscar responsável (digite 2+ letras)"
          placeholderTextColor={muted}
          autoCapitalize="none"
          style={[styles.input, { color: inputColor, borderBottomColor: inputColor === text ? border : inputColor }]}
        />
        {selected && !hasError ? (
          <View
            accessibilityRole="image"
            accessibilityLabel="Responsável selecionado"
            style={styles.selectionIcon}
          >
            <Check size={18} color={selectionGreen} strokeWidth={3} />
          </View>
        ) : null}
      </View>
      {hasError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Selecione um responsável pelo inventário.
        </Text>
      ) : null}
      {!eligibleEmployees.length ? (
        <>
          <Text style={[styles.status, { color: muted }]}>
            {isSynced
              ? 'Nenhum responsável elegível encontrado. Verifique o cadastro de colaboradores no ERP.'
              : 'A lista de responsáveis ainda não foi sincronizada. Conecte-se e tente novamente.'}
          </Text>
          {!isSynced && onRetrySync ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Tentar sincronizar lista de responsáveis"
              testID="inventory-responsible-retry-sync"
              style={[styles.retryButton, { borderColor: border }]}
              onPress={onRetrySync}
            >
              <Text style={[styles.retryText, { color: text }]}>Tentar sincronizar lista</Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : isOpen ? (
        query.trim().length < 2 ? (
          <Text style={[styles.status, { color: muted }]}>Digite pelo menos 2 letras para buscar.</Text>
        ) : filteredEmployees.length ? (
          <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
            {filteredEmployees.map((employee) => (
              <TouchableOpacity
                key={employee.id}
                accessibilityRole="button"
                accessibilityLabel={`Selecionar ${getInventoryResponsibleDisplayName(employee)}`}
                testID={`inventory-responsible-option-${employee.id}`}
                style={[styles.option, { borderBottomColor: border }]}
                onPress={() => {
                  onSelect(employee);
                  setQuery('');
                  setIsOpen(false);
                }}
              >
                <Text style={[styles.optionName, { color: text }]}>
                  {getInventoryResponsibleDisplayName(employee)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={[styles.status, { color: muted }]}>Nenhum responsável encontrado.</Text>
        )
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldContainer: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, minHeight: 46, borderBottomWidth: 2, paddingVertical: 8, fontSize: 14 },
  selectionIcon: { minWidth: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  status: { fontSize: 12, marginTop: 8 },
  retryButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginTop: 10 },
  retryText: { fontSize: 13, fontWeight: '700' },
  error: { color: '#e11d48', fontSize: 12, marginTop: 8 },
  options: { maxHeight: 220, marginTop: 8, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 10 },
  option: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  optionName: { fontSize: 14, fontWeight: '600' },
});
