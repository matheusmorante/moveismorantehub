import { FormTextInput } from '../../../../components/shared/FormTextInput';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatPurchaseNumber } from '../../../../../../shared-utils/purchaseNumber';
import { normalizeFiscalIdentifier } from '../../../../../../shared-utils/fiscalIdentifiers';
import {
  Calendar,
  ChevronDown,
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
import { InboundInvoiceMappingsModal } from '../../invoices/modals/InboundInvoiceMappingsModal';
import { InvoiceImportModal } from '../../invoices/modals/invoice-import/InvoiceImportModal';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { extractNfeAccessKey } from '../../invoices/utils/accessKey';
import * as stockService from '../../../../services/stockService';
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
          disabled={kind === 'purchase'}
          accessibilityRole="button"
          accessibilityState={{ disabled: kind === 'purchase' }}
          style={[
            styles.option,
            { backgroundColor: colors.surface, borderColor: colors.border },
            kind === 'purchase' && styles.disabled,
          ]}
        >
          <View style={styles.optionIcon}>
            <Icon size={20} color="#059669" />
          </View>
          <View style={styles.grow}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
          </View>
          {kind === 'purchase' ? (
            <View style={styles.betaBadge}>
              <Text style={styles.betaBadgeText}>Beta</Text>
            </View>
          ) : (
            <ChevronRight size={18} color={colors.muted} />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

type SourceRow = { kind: 'invoice'; value: Invoice } | { kind: 'purchase'; value: MobilePurchase };

function invoiceReason(invoice: Invoice): string | null {
  if (!invoice.accessKey?.trim()) return 'Chave de acesso indisponível';
  if (!Array.isArray(invoice.supplierStockOrigins) || !invoice.supplierStockOrigins.includes('normal'))
    return 'Fornecedor sem estoque normal';
  return null;
}

function isInvoiceXmlIncomplete(invoice: Invoice): boolean {
  return Boolean(
    invoice.isSummaryOnly ||
      invoice.itemsCount === 0 ||
      /<(?:[\w.-]+:)?resNFe\b/i.test(invoice.rawXml || ''),
  );
}

interface PickerProps {
  kind: 'invoice' | 'purchase';
  isDarkMode: boolean;
  colors: Colors;
  onSelectInvoice: (invoice: Invoice) => Promise<void>;
  onSelectPurchase: (purchase: MobilePurchase) => void | Promise<void>;
  onManageInUseInvoice: (fiscalKey: string) => void | Promise<void>;
}

export const ReceiptSourcePicker: React.FC<PickerProps> = ({
  kind,
  isDarkMode,
  colors,
  onSelectInvoice,
  onSelectPurchase,
  onManageInUseInvoice,
}) => {
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [debouncedInvoiceSearch, setDebouncedInvoiceSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [count, setCount] = useState(0);
  const [mappingInvoice, setMappingInvoice] = useState<Invoice | null>(null);
  const [summaryInvoiceForXmlImport, setSummaryInvoiceForXmlImport] = useState<Invoice | null>(null);
  const [dateFilter, setDateFilter] = useState<InvoiceDateFilter>(() =>
    getDefaultInvoiceDateFilter(),
  );
  const [isPeriodModalVisible, setIsPeriodModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const appliedSearch = kind === 'invoice' ? debouncedInvoiceSearch : submittedSearch;
  const { validateValues } = useZodForm(receiptSourceSearchSchema, {
    page,
    search: appliedSearch,
  });
  const { validateValues: validateInvoiceFilters } = useZodForm(invoiceListFormSchema, {
    page,
    searchTerm: appliedSearch,
    dateFilter,
  });

  useEffect(() => {
    if (kind !== 'invoice') return;
    const timeout = setTimeout(() => {
      const term = search.trim();
      setDebouncedInvoiceSearch(term.length >= 3 ? term : '');
      setPage(0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [kind, search]);

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
        if (current !== requestId.current || !values) return;
        if (kind === 'invoice') {
          const invoiceFilters = await validateInvoiceFilters(
            { page: values.page, searchTerm: values.search, dateFilter },
            (errors) => {
              if (current === requestId.current) {
                setError(Object.values(flattenFormErrors(errors))[0] || 'Confira o período.');
              }
            },
          );
          if (current !== requestId.current || !invoiceFilters) return;
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
    void load(page, appliedSearch);
    return () => {
      requestId.current += 1;
    };
  }, [appliedSearch, load, page]);

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
    if (row.value.isInUse) return;
    if (isInvoiceXmlIncomplete(row.value)) {
      setSummaryInvoiceForXmlImport(row.value);
      return;
    }
    if (row.value.hasPendingBindings) {
      setMappingInvoice(row.value);
      return;
    }
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

  const uploadSummaryInvoiceXml = async (
    file: DocumentPickerAsset,
    onStatusChange: (message: string) => void,
    expectedAccessKey?: string,
  ) => {
    try {
      onStatusChange('Lendo o arquivo XML...');
      const response = await fetch(file.uri);
      if (!response.ok) throw new Error('Não foi possível ler o XML selecionado.');
      const xmlText = await response.text();
      if (expectedAccessKey !== undefined) {
        const expectedKey = normalizeFiscalIdentifier(expectedAccessKey);
        if (expectedKey.length !== 44 || extractNfeAccessKey(xmlText) !== expectedKey) {
          throw new Error('O XML selecionado não corresponde à chave desta nota fiscal incompleta.');
        }
      }
      await stockService.importInboundInvoiceXml(xmlText, onStatusChange);
      setSummaryInvoiceForXmlImport(null);
      await load(page, appliedSearch);
    } catch (cause) {
      Alert.alert(
        'Não foi possível importar o XML',
        cause instanceof Error ? cause.message : 'Confira o arquivo e tente novamente.',
      );
    }
  };

  const consultSummaryInvoice = async (key: string) => {
    const accessKey = normalizeFiscalIdentifier(key);
    if (accessKey.length !== 44) return;
    try {
      await Linking.openURL(
        `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&nfe=${accessKey}`,
      );
    } catch {
      Alert.alert('Não foi possível abrir o Portal Nacional da NF-e', 'Tente novamente em instantes.');
    }
  };

  return (
    <View style={styles.grow}>
      <View style={styles.searchRow}>
        <FormTextInput
          value={search}
          onChangeText={setSearch}
          placeholder={
            kind === 'invoice' ? 'Fornecedor, número ou chave' : 'Fornecedor ou número do pedido'
          }
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          accessibilityLabel={
            kind === 'invoice' ? 'Filtrar notas fiscais' : 'Pesquisar pedidos de compra'
          }
          accessibilityHint={
            kind === 'invoice' ? 'Digite ao menos três caracteres para filtrar automaticamente.' : undefined
          }
          onSubmitEditing={() => {
            setPage(0);
            if (kind === 'invoice') {
              const term = search.trim();
              setDebouncedInvoiceSearch(term.length >= 3 ? term : '');
              return;
            }
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
        {kind === 'purchase' && (
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
        )}
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
            <FormTextInput
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
              <FormTextInput
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
              <FormTextInput
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
            onPress={() => void load(page, appliedSearch)}
            accessibilityRole="button"
          >
            <Text style={styles.retry}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.grow}
          contentContainerStyle={[
            styles.content,
            rows.length === 0 && styles.emptyContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {rows.length === 0 && (
            <Text style={[styles.intro, styles.emptyText, { color: colors.muted }]}>
              {kind === 'invoice'
                ? appliedSearch
                  ? 'Nenhuma nota fiscal encontrada para a busca e o período selecionados.'
                  : 'Nenhuma nota fiscal neste período. A busca é opcional; altere o período para consultar outras notas.'
                : 'Nenhuma compra encontrada.'}
            </Text>
          )}
          {rows.map((row) => {
            const value = row.value;
            const invoice = row.kind === 'invoice' ? row.value : null;
            const reason =
              row.kind === 'invoice'
                ? invoiceReason(row.value)
                : row.value.status === 'cancelled'
                  ? 'Pedido cancelado'
                  : null;
            const inUse = Boolean(!reason && invoice?.isInUse);
            const xmlIncomplete = Boolean(
              !reason && !inUse && invoice && isInvoiceXmlIncomplete(invoice),
            );
            const bindingsIncomplete = Boolean(
              !reason && !inUse && invoice && !xmlIncomplete && invoice.hasPendingBindings,
            );
            const hint = reason || (xmlIncomplete ? 'NF incompleta' : bindingsIncomplete ? 'Vínculos incompletos' : null);
            const isUnavailableInvoice = Boolean(
              row.kind === 'invoice' && (reason || inUse || xmlIncomplete || bindingsIncomplete),
            );
            const title =
              row.kind === 'invoice'
                ? `NF-e #${row.value.number}`
                : `Pedido #${formatPurchaseNumber(row.value.purchaseNumber) || row.value.id.slice(-6)}`;
            return (
              <View
                key={value.id}
                testID={row.kind === 'invoice' ? 'receipt-source-invoice-row' : 'receipt-source-purchase-row'}
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  isUnavailableInvoice &&
                    (isDarkMode ? styles.unavailableDark : styles.unavailable),
                  row.kind !== 'invoice' && reason ? styles.disabled : undefined,
                ]}
              >
                <TouchableOpacity
                  onPress={() => void choose(row)}
                  disabled={Boolean(reason || inUse || xmlIncomplete || bindingsIncomplete || opening)}
                  accessibilityRole="button"
                  style={styles.optionBody}
                >
                  <View style={styles.grow}>
                    <View style={isUnavailableInvoice ? styles.dimmedContent : undefined}>
                      <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
                      <Text style={[styles.description, { color: colors.muted }]}>
                        {value.supplierName}
                      </Text>
                    </View>
                    {hint && !xmlIncomplete && <Text style={styles.reason}>{hint}</Text>}
                  </View>
                  {opening === value.id ? (
                    <ActivityIndicator color="#059669" />
                  ) : !inUse && !xmlIncomplete && !bindingsIncomplete ? (
                    <ChevronRight size={18} color={colors.muted} />
                  ) : null}
                </TouchableOpacity>
                {inUse && invoice ? (
                  <View style={styles.actionColumn}>
                    <Text style={[styles.inUseText, isDarkMode && styles.inUseTextDark]}>Em uso</Text>
                    <TouchableOpacity
                      onPress={() => void onManageInUseInvoice(invoice.accessKey)}
                      accessibilityRole="button"
                      accessibilityLabel={`Gerenciar recebimento vinculado à NF-e ${invoice.number}`}
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionButtonText}>Gerenciar</Text>
                    </TouchableOpacity>
                  </View>
                ) : xmlIncomplete && invoice ? (
                  <View style={styles.actionRow}>
                    <Text style={[styles.reason, styles.actionReason]} numberOfLines={1}>NF incompleta</Text>
                    <TouchableOpacity
                      onPress={() => setSummaryInvoiceForXmlImport(invoice)}
                      accessibilityRole="button"
                      accessibilityLabel={`Obtenha o XML da NF-e ${invoice.number}`}
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionButtonText}>Obtenha o XML</Text>
                    </TouchableOpacity>
                  </View>
                ) : bindingsIncomplete && invoice ? (
                  <TouchableOpacity
                    onPress={() => setMappingInvoice(invoice)}
                    accessibilityRole="button"
                    accessibilityLabel={`Gerenciar vínculos da NF-e ${invoice.number}`}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionButtonText}>Gerenciar vínculos</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
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
      <InboundInvoiceMappingsModal
        visible={Boolean(mappingInvoice)}
        invoice={mappingInvoice}
        isDarkMode={isDarkMode}
        onClose={() => {
          setMappingInvoice(null);
          void load(page, appliedSearch);
        }}
        onSaved={() => void load(page, appliedSearch)}
      />
      <InvoiceImportModal
        visible={Boolean(summaryInvoiceForXmlImport)}
        isDarkMode={isDarkMode}
        summaryInvoice={summaryInvoiceForXmlImport}
        onClose={() => setSummaryInvoiceForXmlImport(null)}
        onConsultSefaz={(key) => void consultSummaryInvoice(key)}
        onUploadXml={uploadSummaryInvoiceXml}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  grow: { flex: 1 },
  content: { padding: 16, gap: 10 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  emptyText: { textAlign: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  betaBadge: {
    borderRadius: 7,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  betaBadgeText: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  unavailable: {
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
    borderColor: '#cbd5e1',
  },
  unavailableDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.46)',
    borderColor: '#475569',
  },
  dimmedContent: { opacity: 0.4 },
  optionBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionColumn: { alignItems: 'flex-end', gap: 6 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  actionReason: { marginTop: 0, textAlign: 'right' },
  actionButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
  },
  actionButtonText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  inUseText: { color: '#047857', fontSize: 12, fontWeight: '900' },
  inUseTextDark: { color: '#34d399' },
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
    alignSelf: 'flex-end',
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
