import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useInvoices } from '../../hooks/useInvoices';
import { FixedPageSlots } from '../../../../../components/shared/FixedPageSlots';
import { InvoiceCard } from '../../components/InvoiceCard';
import { InvoiceActionModal } from '../../modals/invoice-actions/InvoiceActionModal';
import { InvoiceImportModal } from '../../modals/InvoiceImportModal';
import { InvoiceDetailsModal } from '../../modals/InvoiceDetailsModal';
import { InboundInvoiceMappingsModal } from '../../modals/InboundInvoiceMappingsModal';
import type { Invoice } from '../../../types/stock.types';
import * as stockService from '../../../../../services/stockService';
import {
  InvoicesEmptyState,
  InvoicesErrorState,
  InvoicesLoadingState,
  InvoicesPageHeader,
  InvoicePeriodFilterModal,
  periodOptions,
  styles,
  useInvoiceScreenActions,
} from '.';

const ITEMS_PER_PAGE = stockService.ITEMS_PER_PAGE;

type InvoiceListRow =
  | { type: 'module'; id: 'module-header' }
  | { type: 'page'; id: 'page-header' }
  | { type: 'invoice'; id: string; invoice: Invoice }
  | { type: 'loading'; id: 'loading' }
  | { type: 'error'; id: 'error' }
  | { type: 'empty'; id: 'empty' };

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const InvoicesScreenContent: React.FC<Props> = ({ isDarkMode, renderHeader }) => {
  const { width: viewportWidth } = useWindowDimensions();
  const isCompactViewport = viewportWidth < 540;
  const {
    invoices,
    loading,
    error,
    page,
    totalPages,
    totalCount,
    searchTerm,
    dateFilter,
    setSearchTerm,
    setDateFilter,
    goToPage,
    reload,
  } = useInvoices();

  const {
    activeInvoice,
    setActiveInvoice,
    mappingInvoice,
    setMappingInvoice,
    showImportModal,
    setShowImportModal,
    showPeriodModal,
    setShowPeriodModal,
    detailsInvoice,
    setDetailsInvoice,
    detailsLoading,
    setDetailsLoading,
    loadInvoiceDetails,
    downloadInvoiceXml,
    consultSefaz,
    importXml,
    confirmInvoiceDeletion,
  } = useInvoiceScreenActions(reload);

  const periodLabel = useMemo(
    () => periodOptions.find((option) => option.value === dateFilter.mode)?.label || 'Mês Atual',
    [dateFilter.mode]
  );

  const rows: InvoiceListRow[] = [
    { type: 'module', id: 'module-header' },
    { type: 'page', id: 'page-header' },
    ...invoices.map((invoice) => ({ type: 'invoice' as const, id: invoice.id, invoice })),
  ];
  if (invoices.length === 0) {
    rows.push(
      loading
        ? { type: 'loading', id: 'loading' }
        : error
        ? { type: 'error', id: 'error' }
        : { type: 'empty', id: 'empty' }
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList<InvoiceListRow>
        data={rows}
        keyExtractor={(item) => item.id}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          if (item.type === 'module') return renderHeader();
          if (item.type === 'page')
            return (
              <InvoicesPageHeader
                isDarkMode={isDarkMode}
                isCompactViewport={isCompactViewport}
                periodLabel={periodLabel}
                dateFilter={dateFilter}
                searchTerm={searchTerm}
                onOpenImport={() => setShowImportModal(true)}
                onOpenPeriodModal={() => setShowPeriodModal(true)}
                onSyncSuccess={reload}
                onChangeDateFilter={setDateFilter}
                onChangeSearchTerm={setSearchTerm}
                onClearSearch={() => setSearchTerm('')}
              />
            );
          if (item.type === 'loading') return <InvoicesLoadingState />;
          if (item.type === 'error')
            return <InvoicesErrorState error={error} onRetry={reload} />;
          if (item.type === 'empty') return <InvoicesEmptyState isDarkMode={isDarkMode} />;

          return (
            <View style={styles.cardContainer}>
              <InvoiceCard
                item={item.invoice}
                isDarkMode={isDarkMode}
                onMenuPress={setActiveInvoice}
                onPress={(invoice) => {
                  void loadInvoiceDetails(invoice);
                }}
              />
            </View>
          );
        }}
        ListFooterComponent={
          invoices.length > 0 ? (
            <View style={[styles.pagination, isDarkMode && styles.paginationDark]}>
              <View style={styles.paginationCopy}>
                {loading && <ActivityIndicator size="small" color="#2563eb" />}
                <Text style={[styles.paginationText, isDarkMode && styles.textMutedDark]}>
                  Exibindo {(page - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(page * ITEMS_PER_PAGE, totalCount)} de {totalCount} notas fiscais (
                  {ITEMS_PER_PAGE} por página)
                </Text>
              </View>
              <View style={styles.paginationControls}>
                <Text style={styles.pageCount}>
                  {page} / {totalPages}
                </Text>
                <FixedPageSlots
                  label="Paginação de notas fiscais de entrada"
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  loading={loading}
                  dark={isDarkMode}
                />
              </View>
            </View>
          ) : null
        }
      />

      <InvoiceActionModal
        visible={!!activeInvoice}
        isDarkMode={isDarkMode}
        activeInvoice={activeInvoice}
        onClose={() => setActiveInvoice(null)}
        onDownloadXML={(invoice) => {
          void downloadInvoiceXml(invoice);
        }}
        onManageMappings={setMappingInvoice}
        onDelete={confirmInvoiceDeletion}
      />
      <InvoiceDetailsModal
        visible={detailsLoading || !!detailsInvoice}
        isDarkMode={isDarkMode}
        invoice={detailsInvoice}
        loading={detailsLoading}
        onClose={() => {
          setDetailsInvoice(null);
          setDetailsLoading(false);
        }}
      />
      <InboundInvoiceMappingsModal
        visible={!!mappingInvoice}
        invoice={mappingInvoice}
        isDarkMode={isDarkMode}
        onClose={() => setMappingInvoice(null)}
        onSaved={reload}
      />
      <InvoiceImportModal
        visible={showImportModal}
        isDarkMode={isDarkMode}
        onClose={() => setShowImportModal(false)}
        onConsultSefaz={(key) => {
          void consultSefaz(key);
        }}
        onUploadXml={importXml}
      />

      <InvoicePeriodFilterModal
        visible={showPeriodModal}
        isDarkMode={isDarkMode}
        currentMode={dateFilter.mode}
        onClose={() => setShowPeriodModal(false)}
        onSelectMode={(mode) => {
          setDateFilter({ ...dateFilter, mode });
          setShowPeriodModal(false);
        }}
      />
    </View>
  );
};
