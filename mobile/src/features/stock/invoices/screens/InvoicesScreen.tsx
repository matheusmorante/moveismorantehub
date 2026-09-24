import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Modal, ScrollView, Alert, Platform, Share, useWindowDimensions } from 'react-native';
import { ArrowLeft, Calendar, ChevronDown, FilePlus2, ReceiptText, Search, X } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import { useInvoices } from '../hooks/useInvoices';
import { InvoiceCard } from '../components/InvoiceCard';
import { InvoiceActionModal } from '../modals/InvoiceActionModal';
import { InvoiceImportModal } from '../modals/InvoiceImportModal';
import { InvoiceDetailsModal } from '../modals/InvoiceDetailsModal';
import { InboundInvoiceMappingsModal } from '../modals/InboundInvoiceMappingsModal';
import type { Invoice, InvoiceDetail } from '../../types/stock.types';
import type { InvoiceDateFilterMode } from '../../types/stock.types';
import * as stockService from '../../../../services/stockService';

const ITEMS_PER_PAGE = stockService.ITEMS_PER_PAGE;

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

type InvoiceListRow = { type: 'module' | 'page' | 'invoice' | 'loading' | 'empty' | 'error'; id: string; invoice?: Invoice };

const periodOptions: Array<{ value: InvoiceDateFilterMode; label: string }> = [
  { value: 'current_month', label: 'Mês Atual' },
  { value: 'previous_month', label: 'Mês Anterior' },
  { value: 'current_year', label: 'Este Ano' },
  { value: 'previous_year', label: 'Ano Passado' },
  { value: 'custom_month', label: 'Outro Mês' },
  { value: 'custom_range', label: 'Intervalo Personalizado' },
];

export const InvoicesScreen: React.FC<Props> = ({ isDarkMode, onBack, renderHeader }) => {
  const { width: viewportWidth } = useWindowDimensions();
  const isCompactViewport = viewportWidth < 540;
  const {
    invoices, loading, error, page, totalPages, totalCount, searchTerm, dateFilter,
    setSearchTerm, setDateFilter, goToPage, reload,
  } = useInvoices();
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [mappingInvoice, setMappingInvoice] = useState<Invoice | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [detailsInvoice, setDetailsInvoice] = useState<InvoiceDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const periodLabel = useMemo(() => periodOptions.find((option) => option.value === dateFilter.mode)?.label || 'Mês Atual', [dateFilter.mode]);

  const loadInvoiceDetails = async (invoice: Invoice) => {
    setActiveInvoice(null);
    setDetailsInvoice(null);
    setDetailsLoading(true);
    try {
      const details = await stockService.fetchInboundInvoiceDetails(invoice.id);
      setDetailsInvoice(details);
    } catch (loadError) {
      console.error('Failed to load invoice details:', loadError);
      Alert.alert('Não foi possível abrir a nota', 'Tente novamente em instantes.');
      setDetailsInvoice(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const downloadInvoiceXml = async (invoice: Invoice) => {
    setActiveInvoice(null);
    try {
      const details = await stockService.fetchInboundInvoiceDetails(invoice.id);
      if (!details.rawXml) {
        Alert.alert('XML indisponível', 'O XML completo não está armazenado para esta nota.');
        return;
      }
      const fileName = `NFe_${(details.accessKey || details.number).replace(/[^\d]/g, '')}.xml`;
      if (Platform.OS === 'web') {
        const fileUrl = URL.createObjectURL(new Blob([details.rawXml], { type: 'application/xml' }));
        const anchor = document.createElement('a');
        anchor.href = fileUrl;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(fileUrl);
      } else if (Platform.OS === 'android') {
        const directory = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!directory.granted) return;
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(directory.directoryUri, fileName, 'application/xml');
        await FileSystem.writeAsStringAsync(fileUri, details.rawXml, { encoding: FileSystem.EncodingType.UTF8 });
        Alert.alert('XML salvo', `Arquivo salvo como ${fileName}.`);
      } else if (FileSystem.documentDirectory) {
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, details.rawXml, { encoding: FileSystem.EncodingType.UTF8 });
        await Share.share({ title: fileName, url: fileUri });
      } else {
        await Share.share({ title: fileName, message: details.rawXml });
      }
    } catch (downloadError) {
      console.error('Failed to load invoice XML:', downloadError);
      Alert.alert('Não foi possível obter o XML', 'Tente novamente em instantes.');
    }
  };

  const consultSefaz = async (key: string) => {
    const accessKey = key.replace(/\D/g, '');
    if (accessKey.length !== 44) return;
    const url = `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&nfe=${accessKey}`;
    try {
      await Linking.openURL(url);
    } catch (openError) {
      console.error('Failed to open SEFAZ consultation:', openError);
      Alert.alert('Não foi possível abrir o SEFAZ', 'Tente novamente em instantes.');
    }
  };

  const importXml = async (file: { uri: string; name?: string }) => {
    try {
      const response = await fetch(file.uri);
      if (!response.ok) throw new Error('Não foi possível ler o arquivo XML selecionado.');
      const result = await stockService.importInboundInvoiceXml(await response.text());
      const importedInvoice: Invoice = {
        id: result.id,
        number: result.number,
        series: result.series,
        accessKey: result.accessKey,
        supplierName: result.supplierName,
        supplierCnpj: result.supplierCnpj,
        issueDate: result.issueDate,
        totalValue: result.totalValue,
        itemsCount: result.itemsCount,
        status: 'pending',
        hasPendingBindings: result.itemsCount > 0,
        sefazStatus: 'pending',
      };
      setShowImportModal(false);
      reload();
      Alert.alert(
        'Nota Fiscal Adicionada!',
        `NF-e #${result.number} · Série ${result.series}\nFornecedor: ${result.supplierName}\nTotal: R$ ${result.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nItens: ${result.itemsCount}\n\nDeseja gerenciar os vínculos dos produtos desta nota agora?`,
        [
          { text: 'Gerenciar vínculos', onPress: () => setMappingInvoice(importedInvoice) },
          { text: 'Só fechar', style: 'cancel' },
        ],
      );
    } catch (importError) {
      console.error('Failed to import invoice XML:', importError);
      const message = importError instanceof Error ? importError.message : 'Verifique se selecionou um XML válido de NF-e.';
      const isDuplicate = message.startsWith('Nota Fiscal Já Cadastrada:');
      Alert.alert(isDuplicate ? 'Nota Fiscal Já Cadastrada' : 'Não foi possível importar o XML', isDuplicate ? message.slice('Nota Fiscal Já Cadastrada:'.length).trim() : message);
    }
  };

  const confirmInvoiceDeletion = (invoice: Invoice) => {
    Alert.alert(
      'Remover nota fiscal?',
      'Recebimentos e vínculos não são afetados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            void stockService.deleteInboundInvoice(invoice.id)
              .then(reload)
              .catch((deleteError: unknown) => {
                console.error('Failed to delete invoice:', deleteError);
                Alert.alert('Não foi possível remover a nota', 'Tente novamente em instantes.');
              });
          },
        },
      ],
      { cancelable: true },
    );
  };

  const PageHeader = () => (
    <View style={[styles.pageHeaderWrapper, isDarkMode && styles.pageHeaderWrapperDark]}>
      <View style={[styles.titleRow, isCompactViewport && styles.titleRowCompact]}>
        <View style={styles.titleGroup}>
          <View style={styles.titleIcon}>
            <ReceiptText size={20} color="#ffffff" />
          </View>
          <View style={styles.titleCopy}>
            <Text style={[styles.pageTitle, isDarkMode && styles.textDark]}>Notas Fiscais de Entrada</Text>
            <Text style={styles.subtitle}>Gestão e importação de notas fiscais de entrada dos fornecedores</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.importBtn, isCompactViewport && styles.importBtnCompact]} onPress={() => setShowImportModal(true)} accessibilityRole="button">
          <FilePlus2 size={17} color="#ffffff" />
          <Text style={styles.importBtnText}>Importar XML da NF-e</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.periodBtn, isDarkMode && styles.periodBtnDark]}
          onPress={() => setShowPeriodModal(true)}
          accessibilityRole="button"
          accessibilityLabel={`Período: ${periodLabel}`}
        >
          <Calendar size={17} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
          <Text style={[styles.periodLabel, isDarkMode && styles.textMutedDark]}>Período:</Text>
          <View style={[styles.periodValueWrapper, isDarkMode && styles.periodValueWrapperDark]}>
            <Text style={[styles.periodValue, isDarkMode && styles.textDark]}>{periodLabel}</Text>
            <ChevronDown size={15} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </View>
        </TouchableOpacity>

        {dateFilter.mode === 'custom_month' && (
          <TextInput
            value={dateFilter.customMonth}
            onChangeText={(customMonth) => setDateFilter({ ...dateFilter, customMonth })}
            placeholder="AAAA-MM"
            accessibilityLabel="Mês personalizado"
            maxLength={7}
            style={[styles.monthInput, isDarkMode && styles.monthInputDark]}
          />
        )}
        {dateFilter.mode === 'custom_range' && (
          <View style={styles.customRange}>
            <Text style={styles.rangeLabel}>De:</Text>
            <TextInput value={dateFilter.startMonth} onChangeText={(startMonth) => setDateFilter({ ...dateFilter, startMonth })} placeholder="AAAA-MM" accessibilityLabel="Mês inicial" maxLength={7} style={[styles.monthInput, isDarkMode && styles.monthInputDark]} />
            <Text style={styles.rangeLabel}>Até:</Text>
            <TextInput value={dateFilter.endMonth} onChangeText={(endMonth) => setDateFilter({ ...dateFilter, endMonth })} placeholder="AAAA-MM" accessibilityLabel="Mês final" maxLength={7} style={[styles.monthInput, isDarkMode && styles.monthInputDark]} />
          </View>
        )}

        <View style={[styles.searchWrapper, isDarkMode && styles.searchWrapperDark]}>
          <Search size={18} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.textDark]}
            placeholder="Pesquisar por fornecedor, número da NF-e ou chave de acesso de 44 dígitos..."
            placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            accessibilityLabel="Pesquisar notas fiscais"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')} accessibilityRole="button" accessibilityLabel="Limpar busca" hitSlop={8}>
              <X size={17} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const rows: InvoiceListRow[] = [
    { type: 'module', id: 'module-header' },
    { type: 'page', id: 'page-header' },
    ...invoices.map((invoice) => ({ type: 'invoice' as const, id: invoice.id, invoice })),
  ];
  if (invoices.length === 0) {
    rows.push(loading
      ? { type: 'loading', id: 'loading' }
      : error
        ? { type: 'error', id: 'error' }
        : { type: 'empty', id: 'empty' });
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          if (item.type === 'module') return renderHeader();
          if (item.type === 'page') return <PageHeader />;
          if (item.type === 'loading') return <View style={styles.stateBox}><ActivityIndicator color="#2563eb" /><Text style={styles.stateText}>Carregando notas fiscais...</Text></View>;
          if (item.type === 'error') return <View style={styles.stateBox}><Text style={[styles.stateText, styles.errorText]}>{error}</Text><TouchableOpacity style={styles.retryBtn} onPress={reload}><Text style={styles.retryText}>Tentar novamente</Text></TouchableOpacity></View>;
          if (item.type === 'empty') return <View style={[styles.emptyCard, isDarkMode && styles.emptyCardDark]}><ReceiptText size={30} color={isDarkMode ? '#475569' : '#cbd5e1'} /><Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>Nenhuma nota fiscal de entrada encontrada</Text><Text style={styles.emptyText}>Você pode adicionar novas notas fiscais ou importar XMLs recebidos de fornecedores.</Text></View>;

          return (
            <View style={styles.cardContainer}>
              <InvoiceCard item={item.invoice!} isDarkMode={isDarkMode} onMenuPress={setActiveInvoice} onPress={(invoice) => { void loadInvoiceDetails(invoice); }} />
            </View>
          );
        }}
        ListFooterComponent={invoices.length > 0 ? (
          <View style={[styles.pagination, isDarkMode && styles.paginationDark]}>
            <View style={styles.paginationCopy}>
              {loading && <ActivityIndicator size="small" color="#2563eb" />}
              <Text style={[styles.paginationText, isDarkMode && styles.textMutedDark]}>
                Exibindo {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, totalCount)} de {totalCount} notas fiscais ({ITEMS_PER_PAGE} por página)
              </Text>
            </View>
            <View style={styles.paginationControls}>
              <TouchableOpacity style={[styles.pageButton, isDarkMode && styles.pageButtonDark]} disabled={page <= 1 || loading} onPress={() => goToPage(page - 1)} accessibilityRole="button" accessibilityLabel="Página anterior">
                <ArrowLeft size={16} color={page <= 1 ? '#cbd5e1' : '#475569'} />
              </TouchableOpacity>
              <Text style={styles.pageCount}>{page} / {totalPages}</Text>
              <TouchableOpacity style={[styles.pageButton, isDarkMode && styles.pageButtonDark]} disabled={page >= totalPages || loading} onPress={() => goToPage(page + 1)} accessibilityRole="button" accessibilityLabel="Próxima página">
                <ChevronDown size={16} color={page >= totalPages ? '#cbd5e1' : '#475569'} style={{ transform: [{ rotate: '-90deg' }] }} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      />

      <InvoiceActionModal
        visible={!!activeInvoice}
        isDarkMode={isDarkMode}
        activeInvoice={activeInvoice}
        onClose={() => setActiveInvoice(null)}
        onDownloadXML={(invoice) => { void downloadInvoiceXml(invoice); }}
        onViewDetails={(invoice) => { void loadInvoiceDetails(invoice); }}
        onManageMappings={setMappingInvoice}
        onDelete={confirmInvoiceDeletion}
      />
      <InvoiceDetailsModal
        visible={detailsLoading || !!detailsInvoice}
        isDarkMode={isDarkMode}
        invoice={detailsInvoice}
        loading={detailsLoading}
        onClose={() => { setDetailsInvoice(null); setDetailsLoading(false); }}
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
        onConsultSefaz={(key) => { void consultSefaz(key); }}
        onUploadXml={importXml}
      />

      <Modal visible={showPeriodModal} transparent animationType="fade" onRequestClose={() => setShowPeriodModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPeriodModal(false)}>
          <View style={[styles.periodModal, isDarkMode && styles.periodModalDark]}>
            <View style={styles.periodModalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>Selecione o Período</Text>
              <TouchableOpacity onPress={() => setShowPeriodModal(false)} accessibilityRole="button" accessibilityLabel="Fechar períodos"><X size={20} color={isDarkMode ? '#cbd5e1' : '#64748b'} /></TouchableOpacity>
            </View>
            <ScrollView>
              {periodOptions.map((option) => (
                <TouchableOpacity key={option.value} style={[styles.periodOption, dateFilter.mode === option.value && styles.periodOptionSelected]} onPress={() => { setDateFilter({ ...dateFilter, mode: option.value }); setShowPeriodModal(false); }} accessibilityRole="button">
                  <Text style={[styles.periodOptionText, isDarkMode && styles.textDark, dateFilter.mode === option.value && styles.periodOptionTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  pageHeaderWrapper: { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingHorizontal: 16, paddingTop: 8 },
  pageHeaderWrapperDark: { backgroundColor: '#0f172a', borderBottomColor: '#1e293b' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10 },
  titleRowCompact: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  titleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  titleIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: '#3157df', alignItems: 'center', justifyContent: 'center' },
  titleCopy: { flex: 1, minWidth: 0 },
  pageTitle: { fontSize: 17, fontWeight: '900', color: '#1e293b' },
  subtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  importBtn: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 12, gap: 7 },
  importBtnCompact: { alignSelf: 'stretch' },
  importBtnText: { color: '#fff', fontWeight: '800', fontSize: 11, flexShrink: 1 },
  filtersContainer: { gap: 10, paddingBottom: 12 },
  periodBtn: { minHeight: 42, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  periodBtnDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  periodLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  periodValueWrapper: { backgroundColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8 },
  periodValueWrapperDark: { backgroundColor: '#0f172a' },
  periodValue: { color: '#1e293b', fontSize: 12, fontWeight: '800' },
  customRange: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  rangeLabel: { color: '#94a3b8', fontSize: 11 },
  monthInput: { minWidth: 100, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 9, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8, color: '#0f172a' },
  monthInputDark: { backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' },
  searchWrapper: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 11 },
  searchWrapperDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  searchInput: { flex: 1, minWidth: 0, minHeight: 42, fontSize: 12, color: '#0f172a' },
  cardContainer: { paddingHorizontal: 16, paddingTop: 12 },
  emptyCard: { margin: 16, padding: 24, minHeight: 150, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  emptyCardDark: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  emptyTitle: { color: '#64748b', fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  emptyText: { color: '#94a3b8', fontSize: 11, textAlign: 'center', marginTop: 5 },
  stateBox: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  stateText: { color: '#64748b', fontSize: 12, textAlign: 'center' },
  errorText: { color: '#dc2626' },
  retryBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#2563eb' },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  pagination: { marginHorizontal: 16, marginTop: 4, marginBottom: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', gap: 10 },
  paginationDark: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  paginationCopy: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paginationText: { color: '#64748b', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  paginationControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 13 },
  pageButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 11, backgroundColor: '#fff' },
  pageButtonDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  pageCount: { minWidth: 56, textAlign: 'center', color: '#2563eb', fontWeight: '900', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  periodModal: { width: '100%', maxWidth: 420, maxHeight: '80%', backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  periodModalDark: { backgroundColor: '#1e293b' },
  periodModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800' },
  periodOption: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  periodOptionSelected: { backgroundColor: '#eff6ff', borderRadius: 9 },
  periodOptionText: { color: '#334155', fontSize: 14, fontWeight: '600' },
  periodOptionTextSelected: { color: '#2563eb', fontWeight: '800' },
  textDark: { color: '#f8fafc' },
  textMutedDark: { color: '#94a3b8' },
});
