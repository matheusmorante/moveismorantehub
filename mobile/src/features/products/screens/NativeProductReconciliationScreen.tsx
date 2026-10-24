import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  reconciliationQueryFormSchema,
  type ReconciliationBatchInput,
  type ReconciliationResult,
} from '../../../../../shared-utils/reconciliationFormSchemas';
import {
  areAllProductReconciliationPageItemsSelected,
  updateProductReconciliationPageSelection,
  updateProductReconciliationSelection,
} from '../../../../../shared-utils/productReconciliationSelection';
import { getFixedPageSlots, normalizePageNumber } from '../../../../../shared-utils/fixedPagination';
import {
  type ReconciliationBatchSelectionItem,
  type PendencyType,
  type ReconciliationFilterState,
  type ReconciliationProductItem,
  type ReconciliationSummary,
} from '../../../../../shared-utils/productReconciliationTypes';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { useZodForm, flattenFormErrors } from '../../../hooks/useZodForm';
import { fetchMobileCategories } from '../services/mobileCategoryService';
import type { MobileCategory } from '../services/mobileCategoryService';
import {
  applyMobileProductReconciliationBatch,
  fetchMobileProductReconciliation,
  fetchMobileProductReconciliationSelection,
} from '../services/mobileProductReconciliationService';
import { NativeProductReconciliationCard } from './NativeProductReconciliationCard';
import { NativeProductReconciliationBatchBar, type NativeProductReconciliationBatchOperation } from './NativeProductReconciliationBatchBar';
import { NativeProductReconciliationBatchModal } from './NativeProductReconciliationBatchModal';

interface Props {
  dark: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 15;
const EMPTY_SUMMARY: ReconciliationSummary = {
  totalPendingProducts: 0,
  totalPendencies: 0,
  totalCritical: 0,
  chipCounts: { all: 0, supplier: 0, category: 0, ncm: 0, attributes: 0, price: 0 },
};

const FILTER_CHIPS: Array<{ id: PendencyType | 'all' | 'attributes'; label: string; countKey: keyof ReconciliationSummary['chipCounts'] }> = [
  { id: 'all', label: 'Todas', countKey: 'all' },
  { id: 'supplier', label: 'Fornecedor', countKey: 'supplier' },
  { id: 'category', label: 'Categoria', countKey: 'category' },
  { id: 'ncm', label: 'NCM', countKey: 'ncm' },
  { id: 'attributes', label: 'Atributos', countKey: 'attributes' },
  { id: 'price', label: 'Preço', countKey: 'price' },
];

export const NativeProductReconciliationScreen: React.FC<Props> = ({ dark, onClose }) => {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<ReconciliationProductItem[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary>(EMPTY_SUMMARY);
  const [categories, setCategories] = useState<MobileCategory[]>([]);
  const [filters, setFilters] = useState<ReconciliationFilterState>({ pendencyType: 'all' });
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedProductsById, setSelectedProductsById] = useState<Map<string, ReconciliationBatchSelectionItem>>(new Map());
  const [batchOperation, setBatchOperation] = useState<NativeProductReconciliationBatchOperation | null>(null);
  const [batchProductIds, setBatchProductIds] = useState<string[]>([]);
  const [isAllFilteredSelected, setIsAllFilteredSelected] = useState(false);
  const [isSelectingFiltered, setIsSelectingFiltered] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const [batchSuccessMessage, setBatchSuccessMessage] = useState('');
  const selectionRevision = useRef(0);
  const revision = useRef(0);
  const mounted = useRef(true);
  const { validateValues } = useZodForm(reconciliationQueryFormSchema, {
    page,
    pageSize: PAGE_SIZE,
    filters,
  });

  useEffect(() => {
    mounted.current = true;
    void withTimeout(fetchMobileCategories(), 10_000, [], 'reconciliacao:categorias').then((rows) => {
      if (mounted.current) setCategories(rows);
    });
    return () => {
      mounted.current = false;
      revision.current += 1;
    };
  }, []);

  const loadData = useCallback(async () => {
    const requestRevision = ++revision.current;
    const isCurrent = () => mounted.current && requestRevision === revision.current;
    setLoading(true);
    setError('');
    try {
      const values = await validateValues(
        { page, pageSize: PAGE_SIZE, filters },
        (errors) => {
          if (isCurrent()) {
            setError(Object.values(flattenFormErrors(errors))[0] || 'Confira os filtros.');
          }
        }
      );
      if (!values || !isCurrent()) return;
      const result = await withTimeout(
        fetchMobileProductReconciliation(values.page, values.pageSize, values.filters),
        15_000,
        null,
        'reconciliacao:consultar-produtos'
      );
      if (!isCurrent()) return;
      if (!result) throw new Error('A consulta demorou demais. Tente atualizar os produtos.');
      setProducts(result.data);
      setTotalCount(result.count);
      setSummary(result.summary);
    } catch (cause) {
      if (isCurrent()) {
        setError(cause instanceof Error ? cause.message : 'Erro ao carregar conciliação de produtos.');
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [filters, page, validateValues]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setSelectedProductsById((current) => {
      const next = new Map(Array.from(current).filter(([id]) => selectedIds.has(id)));
      products.forEach((product) => {
        if (selectedIds.has(product.id)) next.set(product.id, {
          id: product.id,
          categoryId: product.categoryId,
          pendencies: product.pendencies,
        });
      });
      return next;
    });
  }, [products, selectedIds]);

  useEffect(() => {
    selectionRevision.current += 1;
    setIsSelectingFiltered(false);
    setIsAllFilteredSelected(false);
    setSelectionError('');
  }, [filters]);

  useEffect(() => {
    if (!batchSuccessMessage) return;
    const timer = setTimeout(() => setBatchSuccessMessage(''), 5_000);
    return () => clearTimeout(timer);
  }, [batchSuccessMessage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDraft !== (filters.search || '')) {
        setPage(1);
        setFilters((current) => ({ ...current, search: searchDraft || undefined }));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search, searchDraft]);

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = normalizePageNumber(page, pageCount);
  const pageSlots = getFixedPageSlots(safePage, pageCount);
  const activeFilter = filters.pendencyType || 'all';
  const surface = dark ? styles.surfaceDark : styles.surface;
  const textColor = dark ? styles.textLight : styles.text;
  const mutedColor = dark ? styles.mutedDark : styles.muted;

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const updateFilters = (next: ReconciliationFilterState) => {
    setPage(1);
    setFilters(next);
  };

  const selectedProductIds = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const selectedProducts = useMemo(() => {
    const result: ReconciliationBatchSelectionItem[] = [];
    selectedIds.forEach((id) => {
      const product = selectedProductsById.get(id) || products.find((candidate) => candidate.id === id);
      if (product) result.push(product);
    });
    return result;
  }, [products, selectedIds, selectedProductsById]);
  const firstSelectedCategoryId = selectedProducts[0]?.categoryId;
  const isAttributeBatchCompatible = Boolean(firstSelectedCategoryId) && selectedProducts.every((product) => product.categoryId === firstSelectedCategoryId);
  const availableBatchAttributes = useMemo(() => {
    const attributes = new Map<string, ReconciliationProductItem['pendencies'][number]>();
    selectedProducts.forEach((product) => {
      product.pendencies.forEach((pendency) => {
        if (pendency.attributeId && pendency.attributeName) attributes.set(pendency.attributeId, pendency);
      });
    });
    return Array.from(attributes.values())
      .map((pendency) => ({
        id: pendency.attributeId!,
        name: pendency.attributeName!,
        dataType: pendency.attributeDataType,
        unit: pendency.attributeUnit,
      }))
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  }, [selectedProducts]);
  const allOnPageSelected = areAllProductReconciliationPageItemsSelected(selectedIds, products);

  const toggleProductSelection = (product: ReconciliationProductItem, isSelected: boolean) => {
    setSelectedIds((current) => updateProductReconciliationSelection(current, product.id, isSelected));
    setSelectedProductsById((current) => {
      const next = new Map(current);
      if (isSelected) next.set(product.id, { id: product.id, categoryId: product.categoryId, pendencies: product.pendencies });
      else next.delete(product.id);
      return next;
    });
    if (!isSelected) setIsAllFilteredSelected(false);
  };

  const togglePageSelection = (isSelected: boolean) => {
    setSelectedIds((current) => updateProductReconciliationPageSelection(current, products, isSelected));
    setSelectedProductsById((current) => {
      const next = new Map(current);
      products.forEach((product) => {
        if (isSelected) next.set(product.id, { id: product.id, categoryId: product.categoryId, pendencies: product.pendencies });
        else next.delete(product.id);
      });
      return next;
    });
    if (!isSelected) setIsAllFilteredSelected(false);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectedProductsById(new Map());
    setIsAllFilteredSelected(false);
    setSelectionError('');
  };

  const selectAllFiltered = async () => {
    const requestRevision = ++selectionRevision.current;
    setIsSelectingFiltered(true);
    setSelectionError('');
    try {
      const result = await withTimeout(
        fetchMobileProductReconciliationSelection(filters),
        30_000,
        null,
        'reconciliacao:selecionar-filtro'
      );
      if (requestRevision !== selectionRevision.current) return;
      if (!result) throw new Error('A seleção do filtro demorou demais. Tente novamente.');
      setSelectedIds(new Set(result.map((product) => product.id)));
      setSelectedProductsById(new Map(result.map((product) => [product.id, product])));
      setIsAllFilteredSelected(result.length > 0);
      if (result.length === 0) setSelectionError('Nenhum produto pendente corresponde aos filtros atuais.');
    } catch (cause) {
      if (requestRevision === selectionRevision.current) {
        setSelectionError(cause instanceof Error ? cause.message : 'Não foi possível selecionar os produtos do filtro.');
      }
    } finally {
      if (requestRevision === selectionRevision.current) setIsSelectingFiltered(false);
    }
  };

  const openBatch = (operation: NativeProductReconciliationBatchOperation) => {
    if (selectedProductIds.length === 0 || (operation === 'attribute' && !isAttributeBatchCompatible)) return;
    setBatchSuccessMessage('');
    setBatchProductIds(selectedProductIds);
    setBatchOperation(operation);
  };

  const closeBatch = () => {
    setBatchOperation(null);
    setBatchProductIds([]);
  };

  const applyBatch = async (values: ReconciliationBatchInput): Promise<ReconciliationResult> => {
    const currentSelection = new Set(batchProductIds);
    if (values.productIds.length !== currentSelection.size || values.productIds.some((id) => !currentSelection.has(id))) {
      return { success: false, error: 'A seleção mudou. Feche a operação e selecione os produtos novamente.' };
    }
    const result = await withTimeout(
      applyMobileProductReconciliationBatch(values),
      25_000,
      { success: false, uncertain: true, error: 'Não foi possível confirmar o lote. Confira os produtos antes de repetir.' },
      'reconciliacao:aplicar-lote'
    );
    if (result.success) {
      const appliedIds = new Set(values.productIds);
      setBatchSuccessMessage(`Correção confirmada em ${result.updated ?? 0} registro(s).`);
      setSelectedIds((current) => new Set(Array.from(current).filter((id) => !appliedIds.has(id))));
      setSelectedProductsById((current) => new Map(Array.from(current).filter(([id]) => !appliedIds.has(id))));
      setIsAllFilteredSelected(false);
      void loadData();
    }
    return result;
  };

  return (
    <View style={[styles.screen, dark && styles.screenDark, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Voltar aos produtos"
          style={styles.backButton}
        >
          <ArrowLeft size={21} color={dark ? '#e2e8f0' : '#475569'} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, textColor]}>Conciliação de Produtos</Text>
          <Text style={[styles.subtitle, mutedColor]}>Corrija campos obrigatórios e inconsistências do cadastro.</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={loading && products.length > 0} onRefresh={() => void loadData()} />
        }
      >
        <View style={styles.metrics}>
          <Metric label="produtos" value={summary.totalPendingProducts} dark={dark} />
          <Metric label="pendências" value={summary.totalPendencies} dark={dark} />
          {summary.totalCritical > 0 && (
            <Pressable
              onPress={() => updateFilters({ ...filters, onlyCritical: !filters.onlyCritical })}
              accessibilityRole="button"
              accessibilityLabel="Filtrar pendências críticas"
              style={[styles.metric, styles.criticalMetric, filters.onlyCritical && styles.criticalActive]}
            >
              <AlertTriangle size={15} color={filters.onlyCritical ? '#fff' : '#e11d48'} />
              <Text style={[styles.metricValue, filters.onlyCritical && styles.white]}>{summary.totalCritical}</Text>
              <Text style={[styles.metricLabel, filters.onlyCritical && styles.white]}>críticos</Text>
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTER_CHIPS.map((chip) => {
            const selected = activeFilter === chip.id;
            return (
              <Pressable
                key={chip.id}
                onPress={() => updateFilters({ ...filters, pendencyType: chip.id })}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.chip, surface, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, textColor, selected && styles.white]}>{chip.label}</Text>
                <Text style={[styles.chipCount, selected && styles.white]}>{summary.chipCounts[chip.countKey]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.searchBox, surface]}>
          <Search size={17} color="#94a3b8" />
          <TextInput
            value={searchDraft}
            onChangeText={setSearchDraft}
            placeholder="Nome, SKU ou código..."
            placeholderTextColor={dark ? '#64748b' : '#94a3b8'}
            accessibilityLabel="Buscar produto na conciliação"
            returnKeyType="search"
            style={[styles.searchInput, textColor]}
          />
          {searchDraft ? (
            <Pressable onPress={() => setSearchDraft('')} accessibilityRole="button" accessibilityLabel="Limpar busca">
              <X size={17} color="#94a3b8" />
            </Pressable>
          ) : null}
        </View>

        {(filters.pendencyType && filters.pendencyType !== 'all' || filters.categoryId || filters.onlyCritical || searchDraft) ? (
          <Pressable
            onPress={() => {
              setSearchDraft('');
              updateFilters({});
            }}
            accessibilityRole="button"
            style={styles.clearFiltersButton}
          >
            <Text style={styles.clearFiltersText}>Limpar filtros</Text>
          </Pressable>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          <CategoryChip label="Todas as categorias" selected={!filters.categoryId} dark={dark} onPress={() => updateFilters({ ...filters, categoryId: undefined })} />
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              label={category.name}
              selected={filters.categoryId === category.id}
              dark={dark}
              onPress={() => updateFilters({ ...filters, categoryId: category.id })}
            />
          ))}
        </ScrollView>

        <NativeProductReconciliationBatchBar
          selectedCount={selectedIds.size}
          isAllFilteredSelected={isAllFilteredSelected}
          dark={dark}
          attributeDisabled={!isAttributeBatchCompatible}
          onOpen={openBatch}
          onClear={clearSelection}
        />

        {error ? (
          <View style={[styles.errorCard, surface]}>
            <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
            <Pressable onPress={() => void loadData()} style={styles.retryButton} accessibilityRole="button">
              <Text style={styles.retryText}>Atualizar consulta</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && products.length === 0 ? (
          <View style={[styles.stateCard, surface]}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={[styles.stateText, mutedColor]}>Carregando pendências do cadastro...</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={[styles.stateCard, surface]}>
            {error ? null : <CheckCircle2 size={30} color="#16a34a" />}
            <Text style={[styles.emptyTitle, textColor]}>
              {error ? 'A consulta não foi concluída.' : 'Nenhum produto com pendências encontrado!'}
            </Text>
            {!error && <Text style={[styles.stateText, mutedColor]}>Os produtos estão em conformidade para os filtros atuais.</Text>}
          </View>
        ) : (
          <View style={styles.productList}>
            <Pressable
              onPress={() => togglePageSelection(!allOnPageSelected)}
              accessibilityRole="checkbox"
              accessibilityLabel="Selecionar todos os produtos desta página"
              accessibilityState={{ checked: allOnPageSelected }}
              style={[styles.pageSelection, surface]}
            >
              <View style={[styles.selectionBox, allOnPageSelected && styles.selectionBoxSelected]}>
                {allOnPageSelected ? <Check size={14} color="#fff" /> : null}
              </View>
              <Text style={[styles.pageSelectionText, textColor]}>
                {allOnPageSelected ? 'Desmarcar' : 'Selecionar'} todos desta página ({products.length})
              </Text>
              {selectedIds.size > 0 ? <Text style={styles.selectionCount}>{selectedIds.size}</Text> : null}
            </Pressable>
            {totalCount > PAGE_SIZE && allOnPageSelected && !isAllFilteredSelected ? (
              <Pressable
                onPress={() => void selectAllFiltered()}
                disabled={isSelectingFiltered}
                accessibilityRole="button"
                accessibilityLabel="Selecionar todos os produtos do filtro"
                style={styles.selectFilteredButton}
              >
                {isSelectingFiltered ? <ActivityIndicator size="small" color="#7c3aed" /> : null}
                <Text style={styles.selectFilteredText}>
                  {isSelectingFiltered ? 'Selecionando produtos do filtro...' : 'Selecionar todos os produtos do filtro'}
                </Text>
              </Pressable>
            ) : null}
            {selectionError ? <Text style={styles.errorText} accessibilityRole="alert">{selectionError}</Text> : null}
            {batchSuccessMessage ? <Text style={styles.successText} accessibilityRole="alert">{batchSuccessMessage}</Text> : null}
            {products.map((product) => (
              <NativeProductReconciliationCard
                key={product.id}
                product={product}
                categories={categories}
                dark={dark}
                isSelected={selectedIds.has(product.id)}
                onToggleSelect={(isSelected) => toggleProductSelection(product, isSelected)}
                onSaved={loadData}
              />
            ))}
          </View>
        )}

        {totalCount > 0 && (
          <View style={[styles.pagination, surface]}>
            <Text style={[styles.paginationText, mutedColor]}>
              Mostrando {(page - 1) * PAGE_SIZE + 1} até {Math.min(page * PAGE_SIZE, totalCount)} de {totalCount} produtos
            </Text>
            <View style={styles.pageControls}>
              {pageSlots.map((slot, index) => {
                const isCurrent = slot === safePage;
                return (
                  <View key={`page-slot-${index}`} style={styles.pageSlot}>
                    {slot !== null ? (
                      <Pressable
                        onPress={isCurrent ? undefined : () => setPage(slot)}
                        disabled={!isCurrent && loading}
                        accessibilityRole="button"
                        accessibilityLabel={`Página ${slot}${isCurrent ? ', atual' : ''}`}
                        accessibilityState={{ selected: isCurrent, disabled: !isCurrent && loading }}
                        style={[
                          styles.pageButton,
                          isCurrent ? styles.pageButtonCurrent : (dark ? styles.pageButtonDark : styles.pageButtonLight),
                          !isCurrent && loading && styles.disabled,
                        ]}
                      >
                        <Text style={[styles.pageButtonText, isCurrent ? styles.pageButtonTextCurrent : (dark ? styles.pageButtonTextDark : styles.pageButtonTextLight)]}>{slot}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
      <NativeProductReconciliationBatchModal
        visible={batchOperation !== null}
        operation={batchOperation}
        productIds={batchProductIds}
        categories={categories}
        availableAttributes={availableBatchAttributes}
        dark={dark}
        onClose={closeBatch}
        onConfirm={applyBatch}
      />
    </View>
  );
};

const Metric: React.FC<{ label: string; value: number; dark: boolean }> = ({ label, value, dark }) => (
  <View style={[styles.metric, dark ? styles.surfaceDark : styles.surface]}>
    <Text style={[styles.metricValue, dark && styles.textLight]}>{value}</Text>
    <Text style={[styles.metricLabel, dark && styles.mutedDark]}>{label}</Text>
  </View>
);

const CategoryChip: React.FC<{ label: string; selected: boolean; dark: boolean; onPress: () => void }> = ({ label, selected, dark, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.categoryChip, dark ? styles.surfaceDark : styles.surface, selected && styles.categoryChipSelected]}>
    <Text numberOfLines={1} style={[styles.categoryText, dark && styles.textLight, selected && styles.categoryTextSelected]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  screenDark: { backgroundColor: '#0f172a' },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#e2e8f0' },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  text: { color: '#0f172a' },
  textLight: { color: '#f8fafc' },
  muted: { color: '#64748b' },
  mutedDark: { color: '#94a3b8' },
  surface: { backgroundColor: '#fff', borderColor: '#e2e8f0' },
  surfaceDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderWidth: 1, borderRadius: 16 },
  metricValue: { color: '#0f172a', fontSize: 17, fontWeight: '900' },
  metricLabel: { color: '#64748b', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  criticalMetric: { borderColor: '#fecdd3', backgroundColor: '#fff1f2' },
  criticalActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  white: { color: '#fff' },
  chips: { gap: 8, paddingRight: 12 },
  chip: { minHeight: 40, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  chipSelected: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipText: { fontSize: 11, fontWeight: '800' },
  chipCount: { fontSize: 10, fontWeight: '900', color: '#7c3aed' },
  searchBox: { minHeight: 48, borderWidth: 1, borderRadius: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, minHeight: 44, fontSize: 13, fontWeight: '600' },
  clearFiltersButton: { alignSelf: 'flex-end', minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  clearFiltersText: { color: '#e11d48', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  categories: { gap: 8, paddingRight: 12 },
  categoryChip: { minHeight: 38, maxWidth: 220, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  categoryChipSelected: { borderColor: '#8b5cf6', backgroundColor: '#f5f3ff' },
  categoryText: { color: '#475569', fontSize: 10, fontWeight: '800' },
  categoryTextSelected: { color: '#6d28d9' },
  stateCard: { minHeight: 170, borderWidth: 1, borderRadius: 22, padding: 22, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
  errorCard: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 18, padding: 14, gap: 10 },
  errorText: { color: '#b91c1c', fontSize: 12, fontWeight: '700' },
  successText: { color: '#15803d', fontSize: 12, fontWeight: '800' },
  retryButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  productList: { gap: 10 },
  pageSelection: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12 },
  selectionBox: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#94a3b8', borderRadius: 6, backgroundColor: '#fff' },
  selectionBoxSelected: { borderColor: '#7c3aed', backgroundColor: '#7c3aed' },
  pageSelectionText: { flex: 1, fontSize: 11, fontWeight: '800' },
  selectionCount: { color: '#7c3aed', fontSize: 11, fontWeight: '900' },
  selectFilteredButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#c4b5fd', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#f5f3ff' },
  selectFilteredText: { color: '#6d28d9', fontSize: 11, fontWeight: '900' },
  pagination: { borderWidth: 1, borderRadius: 18, padding: 12, gap: 10 },
  paginationText: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  pageControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  pageSlot: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pageButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
  pageButtonCurrent: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  pageButtonLight: { borderColor: '#e2e8f0', backgroundColor: '#fff' },
  pageButtonDark: { borderColor: '#334155', backgroundColor: '#0f172a' },
  pageButtonText: { fontSize: 12, fontWeight: '800' },
  pageButtonTextCurrent: { color: '#fff' },
  pageButtonTextLight: { color: '#334155' },
  pageButtonTextDark: { color: '#e2e8f0' },
  disabled: { opacity: 0.4 },
});
