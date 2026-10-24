import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
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
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = hasError ? '#f43f5e' : isDarkMode ? '#475569' : '#cbd5e1';
  const text = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';
  const selected = employees.find((employee) => String(employee.id) === selectedId);
  const eligibleEmployees = useMemo(
    () => filterInventoryResponsibleCandidates(employees),
    [employees]
  );
  const filteredEmployees = eligibleEmployees.filter((employee) =>
    getInventoryResponsibleDisplayName(employee).toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      <Text style={[styles.label, { color: text }]}>Responsável pelo Inventário</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="Buscar responsável pelo inventário"
          testID="inventory-responsible-search"
          value={isOpen ? query : selected ? getInventoryResponsibleDisplayName(selected) : ''}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onChangeText={(value) => {
            setIsOpen(true);
            setQuery(value);
          }}
          placeholder="Buscar responsável (digite 2+ letras)"
          placeholderTextColor={muted}
          autoCapitalize="none"
          style={[styles.input, { color: text, borderBottomColor: border }]}
        />
        {selectedId ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Limpar responsável selecionado"
            testID="inventory-responsible-clear"
            style={styles.clearButton}
            onPress={() => {
              onSelect(null);
              setQuery('');
              setIsOpen(true);
            }}
          >
            <X size={18} color={muted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {selected ? (
        <Text style={[styles.selected, { color: muted }]}>
          Selecionado: {getInventoryResponsibleDisplayName(selected)}
          {selected.position ? ` · ${selected.position}` : ''}
        </Text>
      ) : null}
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
                {employee.position ? (
                  <Text style={[styles.optionMeta, { color: muted }]}>{employee.position}</Text>
                ) : null}
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
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, minHeight: 46, borderBottomWidth: 2, paddingVertical: 8, fontSize: 14 },
  clearButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  selected: { fontSize: 12, marginTop: 8 },
  status: { fontSize: 12, marginTop: 8 },
  retryButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginTop: 10 },
  retryText: { fontSize: 13, fontWeight: '700' },
  error: { color: '#e11d48', fontSize: 12, marginTop: 8 },
  options: { maxHeight: 220, marginTop: 8, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 10 },
  option: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  optionName: { fontSize: 14, fontWeight: '600' },
  optionMeta: { fontSize: 12, marginTop: 2 },
});
