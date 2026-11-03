import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, UserRound, X } from 'lucide-react-native';
import { z } from 'zod';
import { FormTextInput } from '../../../../../components/shared/FormTextInput';
import { useZodForm } from '../../../../../hooks/useZodForm';
import { matchesSearchText } from '../../../../../../../shared-utils/searchText';
import type { AvailableStaffMember } from '../../../screens/delivery-preparation/deliveryPreparation.types';

const responsibleSearchSchema = z.object({ query: z.string().trim().max(120) });

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  staff: AvailableStaffMember[];
  loadingStaff: boolean;
  onClose: () => void;
  onSelect: (staff: AvailableStaffMember) => void;
}

export const DeliveryResponsibleSearchModal: React.FC<Props> = ({
  visible,
  isDarkMode,
  staff,
  loadingStaff,
  onClose,
  onSelect,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchRevision = useRef(0);
  const searchForm = useZodForm(responsibleSearchSchema, { query: search });
  const validateSearch = searchForm.validateValues;

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';
  const query = search.trim();

  useEffect(() => {
    const nextQuery = search.trim();
    const revision = ++searchRevision.current;
    setDebouncedSearch('');

    if (!visible || nextQuery.length < 3) return;

    const timeoutId = setTimeout(() => {
      void validateSearch({ query: nextQuery }).then((values) => {
        if (values && revision === searchRevision.current) {
          setDebouncedSearch(values.query);
        }
      });
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      if (searchRevision.current === revision) searchRevision.current += 1;
    };
  }, [search, validateSearch, visible]);

  const results = useMemo(() => {
    if (query.length < 3 || query !== debouncedSearch) return [];
    return staff
      .filter((person) =>
        matchesSearchText(`${person.fullName} ${person.role || ''}`, debouncedSearch)
      )
      .slice(0, 5);
  }, [debouncedSearch, query, staff]);

  const isSearching = query.length >= 3 && (query !== debouncedSearch || loadingStaff);

  const resetAndClose = () => {
    setSearch('');
    setDebouncedSearch('');
    onClose();
  };

  const handleSelect = (person: AvailableStaffMember) => {
    onSelect(person);
    resetAndClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose}>
      <View
        style={[
          styles.container,
          { backgroundColor: bg, paddingTop: topInset, paddingBottom: bottomInset },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Buscar responsável</Text>
            <Text style={styles.headerSubtitle}>Pesquise pelo nome do colaborador.</Text>
          </View>
          <TouchableOpacity
            onPress={resetAndClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Fechar busca de responsáveis"
          >
            <X size={23} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { backgroundColor: surface, borderBottomColor: border }]}>
          <View style={styles.searchBox}>
            <Search size={18} color={muted} />
            <FormTextInput
              testID="search-delivery-responsible-input"
              style={[
                styles.searchInput,
                {
                  color: textPrimary,
                  backgroundColor: surface,
                  borderBottomColor: border,
                },
              ]}
              autoFocus={visible}
              value={search}
              onChangeText={setSearch}
              placeholder="Nome do colaborador"
              placeholderTextColor={muted}
              maxLength={120}
              returnKeyType="search"
              accessibilityLabel="Pesquisar responsável pela entrega"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                accessibilityRole="button"
                accessibilityLabel="Limpar busca"
              >
                <X size={17} color={muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isSearching ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(person) => person.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: muted }]}>
                  {query.length < 3
                    ? 'Digite ao menos 3 caracteres para buscar responsáveis.'
                    : 'Nenhum responsável encontrado.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                testID="delivery-responsible-search-result"
                style={[styles.resultRow, { backgroundColor: surface, borderColor: border }]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Adicionar ${item.fullName} como responsável pela entrega`}
              >
                <View style={[styles.avatar, { backgroundColor: isDarkMode ? '#1e3a5f' : '#dbeafe' }]}>
                  <UserRound size={18} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
                </View>
                <View style={styles.resultCopy}>
                  <Text style={[styles.resultName, { color: textPrimary }]} numberOfLines={1}>
                    {item.fullName}
                  </Text>
                  {item.role ? (
                    <Text style={[styles.resultRole, { color: muted }]}>{item.role}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  headerContent: { flex: 1 },
  headerTitle: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 2 },
  closeButton: { padding: 5, marginLeft: 12 },
  searchBar: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, minHeight: 44, paddingHorizontal: 4, fontSize: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, gap: 9, flexGrow: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  resultRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCopy: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '800' },
  resultRole: { fontSize: 11, marginTop: 3, textTransform: 'capitalize' },
});
