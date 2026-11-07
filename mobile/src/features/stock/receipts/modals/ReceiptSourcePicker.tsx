import { FormTextInput } from '../../../../components/shared/FormTextInput';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatPurchaseNumber } from '../../../../../../shared-utils/purchaseNumber';
import { normalizeFiscalIdentifier } from '../../../../../../shared-utils/fiscalIdentifiers';
import { ChevronRight } from 'lucide-react-native';
import { receiptSourceSearchSchema } from '../../../../../../shared-utils/receiptFormSchemas';
import { invoiceListFormSchema } from '../../../../../../shared-utils/listingFormSchemas';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { fetchReceiptInvoiceSources } from '../../../../services/stock/stockReceiptsService';
import type { Invoice, InvoiceDateFilter, InvoiceDateFilterMode } from '../../types/stock.types';
import { fetchMobilePurchases, type MobilePurchase } from '../../purchases/mobilePurchaseService';
import { InboundInvoiceMappingsModal } from '../../invoices/modals/InboundInvoiceMappingsModal';
import { InvoiceImportModal } from '../../invoices/modals/invoice-import/InvoiceImportModal';
import { invoiceReason, isInvoiceXmlIncomplete } from './receiptInvoiceEligibility';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { extractNfeAccessKey } from '../../invoices/utils/accessKey';
import * as stockService from '../../../../services/stockService';
import { getDefaultInvoiceDateFilter } from '../../invoices/utils/invoiceList';
import { MonthYearPickerModal } from './MonthYearPickerModal';
import { InvoicePeriodFilterModal } from '../../invoices/screens/invoices-screen/InvoicePeriodFilterModal';
import { ReceiptSourceOptions, type ReceiptSourceColors } from './ReceiptSourceOptions';
import { ReceiptSourceDateFilterControls } from './ReceiptSourceDateFilterControls';
import { styles } from './receiptSourcePicker.styles';

export { ReceiptSourceOptions };

type SourceRow = { kind: 'invoice'; value: Invoice } | { kind: 'purchase'; value: MobilePurchase };

interface PickerProps {
  kind: 'invoice' | 'purchase';
  isDarkMode: boolean;
  colors: ReceiptSourceColors;
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
  const [isCustomMonthModalVisible, setIsCustomMonthModalVisible] = useState(false);
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
        <ReceiptSourceDateFilterControls
          dateFilter={dateFilter}
          colors={colors}
          onOpenPeriodPicker={() => setIsPeriodModalVisible(true)}
          onOpenMonthPicker={() => setIsCustomMonthModalVisible(true)}
          onChangeStartMonth={(startMonth) => {
            setPage(0);
            setDateFilter((current) => ({ ...current, startMonth }));
          }}
          onChangeEndMonth={(endMonth) => {
            setPage(0);
            setDateFilter((current) => ({ ...current, endMonth }));
          }}
        />
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
      <MonthYearPickerModal
        visible={isCustomMonthModalVisible}
        isDarkMode={isDarkMode}
        value={dateFilter.customMonth}
        onClose={() => setIsCustomMonthModalVisible(false)}
        onSelect={(customMonth) => {
          setPage(0);
          setDateFilter((current) => ({ ...current, customMonth }));
          setIsCustomMonthModalVisible(false);
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
