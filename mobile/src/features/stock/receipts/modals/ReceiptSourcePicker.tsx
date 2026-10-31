import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatPurchaseNumber } from '../../../../../../shared-utils/purchaseNumber';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pencil,
  ShoppingCart,
} from 'lucide-react-native';
import { receiptSourceSearchSchema } from '../../../../../../shared-utils/receiptFormSchemas';
import { invoiceListFormSchema } from '../../../../../../shared-utils/listingFormSchemas';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { fetchReceiptInvoiceSources } from '../../../../services/stock/stockReceiptsService';
import type { Invoice, InvoiceDateFilter, InvoiceDateFilterMode } from '../../types/stock.types';
import { fetchMobilePurchases, type MobilePurchase } from '../../purchases/mobilePurchaseService';
import { getDefaultInvoiceDateFilter } from '../../invoices/utils/invoiceList';
import {
  InvoicePeriodFilterModal,
  periodOptions,
} from '../../invoices/screens/invoices-screen/InvoicePeriodFilterModal';

type SourceKind = 'manual' | 'invoice' | 'purchase';
interface Colors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

export const ReceiptSourceOptions: React.FC<{
  colors: Colors;
  onSelect: (source: SourceKind) => void;
}> = ({ colors, onSelect }) => {
  const options = [
    {
      kind: 'manual' as const,
      title: 'Sem nota fiscal',
      description: 'Registrar recebimento sem nota fiscal',
      Icon: Pencil,
    },
    {
      kind: 'invoice' as const,
      title: 'Com nota fiscal de entrada',
      description: 'Preencher a partir da NF-e',
      Icon: FileText,
    },
    {
      kind: 'purchase' as const,
      title: 'Com pedido de compra',
      description: 'Receber itens de um pedido existente',
      Icon: ShoppingCart,
    },
  ];
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.intro, { color: colors.muted }]}>
        Escolha como deseja iniciar o recebimento.
      </Text>
      {options.map(({ kind, title, description, Icon }) => (
        <TouchableOpacity
          key={kind}
          onPress={() => onSelect(kind)}
          accessibilityRole="button"
          style={[styles.option, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.optionIcon}>
            <Icon size={20} color="#059669" />
          </View>
          <View style={styles.grow}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
          </View>
          <ChevronRight size={18} color={colors.muted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

type SourceRow = { kind: 'invoice'; value: Invoice } | { kind: 'purchase'; value: MobilePurchase };

function invoiceReason(invoice: Invoice): string | null {
  if (invoice.status === 'received') return 'Já recebida';
  if (!Array.isArray(invoice.supplierStockOrigins) || !invoice.supplierStockOrigins.includes('normal'))
    return 'Fornecedor sem estoque normal';
  if (invoice.isSummaryOnly || /<(?:[\w.-]+:)?resNFe\b/i.test(invoice.rawXml || ''))
    return 'NF incompleta: obtenha o XML';
  return null;
}

interface PickerProps {
  kind: 'invoice' | 'purchase';
  isDarkMode: boolean;
  colors: Colors;
  onBack: () => void;
  onSelectInvoice: (invoice: Invoice) => Promise<void>;
  onSelectPurchase: (purchase: MobilePurchase) => void | Promise<void>;
}

export const ReceiptSourcePicker: React.FC<PickerProps> = ({
  kind,
  isDarkMode,
  colors,
  onBack,
  onSelectInvoice,
  onSelectPurchase,
}) => {
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [count, setCount] = useState(0);
  const [dateFilter, setDateFilter] = useState<InvoiceDateFilter>(() =>
    getDefaultInvoiceDateFilter(),
  );
  const [isPeriodModalVisible, setIsPeriodModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const { validateValues } = useZodForm(receiptSourceSearchSchema, {
    page,
    search: submittedSearch,
  });
  const { validateValues: validateInvoiceFilters } = useZodForm(invoiceListFormSchema, {
    page,
    searchTerm: submittedSearch,
    dateFilter,
  });

  const load = useCallback(
    async (requestedPage: number, term: string) => {
      const current = ++requestId.current;
      setLoading(true);
      setError('');
      try {
        const values = await validateValues({ page: requestedPage, search: term }, (errors) => {
          if (current === requestId.current)
            setError(Object.values(flattenFormErrors(errors))[0] || 'Confira a busca.');
        });
        if (!values) return;
        if (kind === 'invoice') {
          const invoiceFilters = await validateInvoiceFilters(
            { page: values.page, searchTerm: values.search, dateFilter },
            (errors) => {
              if (current === requestId.current) {
                setError(Object.values(flattenFormErrors(errors))[0] || 'Confira o período.');
              }
            },
          );
          if (!invoiceFilters) return;
          const result = await fetchReceiptInvoiceSources(
            invoiceFilters.page,
            invoiceFilters.searchTerm,
            invoiceFilters.dateFilter,
          );
          if (current !== requestId.current) return;
          setRows(
            result.data
              .filter(
                (value: Invoice) =>
                  Array.isArray(value.supplierStockOrigins) &&
                  value.supplierStockOrigins.includes('normal'),
              )
              .map((value: Invoice) => ({ kind: 'invoice', value })),
          );
          setCount(result.count);
        } else {
          const result = await withTimeout(
            fetchMobilePurchases(values.page, { search: values.search }),
            12_000,
            null,
            'mobile:receipt-purchase-sources',
          );
          if (!result) throw new Error('A busca de pedidos demorou. Tente novamente.');
          if (current !== requestId.current) return;
          setRows(result.data.map((value) => ({ kind: 'purchase', value })));
          setCount(result.count);
        }
      } catch (cause) {
        if (current === requestId.current) {
          setRows([]);
          setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as opções.');
        }
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    },
    [dateFilter, kind, validateInvoiceFilters, validateValues],
  );

  useEffect(() => {
    void load(page, submittedSearch);
    return () => {
      requestId.current += 1;
    };
  }, [load, page, submittedSearch]);

  const choose = async (row: SourceRow) => {
    if (opening) return;
    if (row.kind === 'purchase') {
      if (row.value.status === 'cancelled') return;
      setOpening(row.value.id);
      try {
        await onSelectPurchase(row.value);
      } finally {
        setOpening(null);
      }
      return;
    }
    const reason = invoiceReason(row.value);
    if (reason) return;
    setOpening(row.value.id);
    try {
      await onSelectInvoice(row.value);
    } catch (cause) {
      Alert.alert(
        'Não foi possível usar a nota',
        cause instanceof Error ? cause.message : 'Confira a nota e tente novamente.',
      );
    } finally {
      setOpening(null);
    }
  };

  return (
    <View style={styles.grow}>
      <View style={styles.searchRow}>
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar às opções de recebimento"
        >
          <ChevronLeft size={23} color={colors.text} />
        </TouchableOpacity>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={
            kind === 'invoice' ? 'Fornecedor, número ou chave' : 'Fornecedor ou número do pedido'
          }
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          accessibilityLabel={
            kind === 'invoice' ? 'Pesquisar notas fiscais' : 'Pesquisar pedidos de compra'
          }
          onSubmitEditing={() => {
            setPage(0);
            setSubmittedSearch(search);
          }}
          style={[
            styles.searchInput,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        />
        <TouchableOpacity
          onPress={() => {
            setPage(0);
            setSubmittedSearch(search);
          }}
          accessibilityRole="button"
          style={styles.searchButton}
        >
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>
      {kind === 'invoice' && (
        <View style={styles.dateFilterContainer}>
          <TouchableOpacity
            style={[styles.dateFilterButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setIsPeriodModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Período: ${periodOptions.find((option) => option.value === dateFilter.mode)?.label || 'Mês Atual'}`}
          >
            <Calendar size={16} color="#2563eb" />
            <Text style={[styles.dateFilterText, { color: colors.text }]}>Período:</Text>
            <Text style={[styles.dateFilterValue, { color: colors.text }]}>
              {periodOptions.find((option) => option.value === dateFilter.mode)?.label || 'Mês Atual'}
            </Text>
            <ChevronDown size={15} color={colors.muted} />
          </TouchableOpacity>
          {dateFilter.mode === 'custom_month' && (
            <TextInput
              value={dateFilter.customMonth}
              onChangeText={(customMonth) => {
                setPage(0);
                setDateFilter((current) => ({ ...current, customMonth }));
              }}
              placeholder="AAAA-MM"
              maxLength={7}
              accessibilityLabel="Mês da nota fiscal"
              style={[styles.dateInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
            />
          )}
          {dateFilter.mode === 'custom_range' && (
            <View style={styles.dateRange}>
              <Text style={[styles.dateRangeLabel, { color: colors.muted }]}>De:</Text>
              <TextInput
                value={dateFilter.startMonth}
                onChangeText={(startMonth) => {
                  setPage(0);
                  setDateFilter((current) => ({ ...current, startMonth }));
                }}
                placeholder="AAAA-MM"
                maxLength={7}
                accessibilityLabel="Mês inicial das notas fiscais"
                style={[styles.dateInput, styles.dateRangeInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
              />
              <Text style={[styles.dateRangeLabel, { color: colors.muted }]}>Até:</Text>
              <TextInput
                value={dateFilter.endMonth}
                onChangeText={(endMonth) => {
                  setPage(0);
                  setDateFilter((current) => ({ ...current, endMonth }));
                }}
                placeholder="AAAA-MM"
                maxLength={7}
                accessibilityLabel="Mês final das notas fiscais"
                style={[styles.dateInput, styles.dateRangeInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
              />
            </View>
          )}
        </View>
      )}
      {loading ? (
        <ActivityIndicator color="#059669" style={styles.loading} />
      ) : error ? (
        <View style={styles.message}>
          <Text style={{ color: '#dc2626', textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity
            onPress={() => void load(page, submittedSearch)}
            accessibilityRole="button"
          >
            <Text style={styles.retry}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {rows.length === 0 && (
            <Text style={[styles.intro, { color: colors.muted }]}>
              Nenhuma {kind === 'invoice' ? 'nota' : 'compra'} encontrada.
            </Text>
          )}
          {rows.map((row) => {
            const value = row.value;
            const reason =
              row.kind === 'invoice'
                ? invoiceReason(row.value)
                : row.value.status === 'cancelled'
                  ? 'Pedido cancelado'
                  : null;
            const hint =
              reason ||
              (row.kind === 'invoice' && row.value.hasPendingBindings
                ? 'Vínculos a conferir'
                : null);
            const title =
              row.kind === 'invoice'
                ? `NF-e #${row.value.number}`
                : `Pedido #${formatPurchaseNumber(row.value.purchaseNumber) || row.value.id.slice(-6)}`;
            return (
              <TouchableOpacity
                key={value.id}
                onPress={() => void choose(row)}
                disabled={Boolean(reason || opening)}
                accessibilityRole="button"
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  reason && styles.disabled,
                ]}
              >
                <View style={styles.grow}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
                  <Text style={[styles.description, { color: colors.muted }]}>
                    {value.supplierName}
                  </Text>
                  {hint && <Text style={styles.reason}>{hint}</Text>}
                </View>
                {opening === value.id ? (
                  <ActivityIndicator color="#059669" />
                ) : (
                  <ChevronRight size={18} color={colors.muted} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <View style={styles.pagination}>
        <TouchableOpacity
          disabled={page === 0 || loading}
          onPress={() => setPage((value) => value - 1)}
          accessibilityRole="button"
        >
          <Text style={[styles.pageAction, (page === 0 || loading) && styles.disabled]}>
            Anterior
          </Text>
        </TouchableOpacity>
        <Text style={{ color: colors.muted }}>Página {page + 1}</Text>
        <TouchableOpacity
          disabled={(page + 1) * 15 >= count || loading}
          onPress={() => setPage((value) => value + 1)}
          accessibilityRole="button"
        >
          <Text
            style={[styles.pageAction, ((page + 1) * 15 >= count || loading) && styles.disabled]}
          >
            Próxima
          </Text>
        </TouchableOpacity>
      </View>
      <InvoicePeriodFilterModal
        visible={isPeriodModalVisible}
        isDarkMode={isDarkMode}
        currentMode={dateFilter.mode}
        onClose={() => setIsPeriodModalVisible(false)}
        onSelectMode={(mode: InvoiceDateFilterMode) => {
          setPage(0);
          setDateFilter((current) => ({ ...current, mode }));
          setIsPeriodModalVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  grow: { flex: 1 },
  content: { padding: 16, gap: 10 },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
  },
  optionTitle: { fontSize: 14, fontWeight: '800' },
  description: { fontSize: 12, marginTop: 3 },
  reason: { color: '#d97706', fontSize: 11, fontWeight: '700', marginTop: 4 },
  disabled: { opacity: 0.5 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchButton: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  dateFilterContainer: { gap: 8, paddingHorizontal: 12, paddingBottom: 4 },
  dateFilterButton: {
    minHeight: 42,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  dateFilterText: { fontSize: 11, fontWeight: '600' },
  dateFilterValue: { fontSize: 12, fontWeight: '800' },
  dateInput: { minWidth: 118, minHeight: 40, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, fontSize: 12 },
  dateRange: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateRangeLabel: { fontSize: 11, fontWeight: '700' },
  dateRangeInput: { flex: 1, minWidth: 0 },
  loading: { margin: 24 },
  message: { padding: 24, alignItems: 'center', gap: 12 },
  retry: { color: '#2563eb', fontWeight: '800' },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  pageAction: { color: '#2563eb', fontWeight: '800' },
});
