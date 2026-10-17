import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  Share,
  useWindowDimensions,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import { useInvoices } from '../hooks/useInvoices';
import { FixedPageSlots } from '../../../../components/shared/FixedPageSlots';
import { InvoiceCard } from '../components/InvoiceCard';
import { InvoiceActionModal } from '../modals/InvoiceActionModal';
import { InvoiceImportModal } from '../modals/InvoiceImportModal';
import { InvoiceDetailsModal } from '../modals/InvoiceDetailsModal';
import { InboundInvoiceMappingsModal } from '../modals/InboundInvoiceMappingsModal';
import type { Invoice, InvoiceDetail } from '../../types/stock.types';
import * as stockService from '../../../../services/stockService';
import {
  InvoicesEmptyState,
  InvoicesErrorState,
  InvoicesLoadingState,
  InvoicesPageHeader,
  InvoicePeriodFilterModal,
  periodOptions,
  styles,
} from './invoices-screen';

const ITEMS_PER_PAGE = stockService.ITEMS_PER_PAGE;

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

type InvoiceListRow = {
  type: 'module' | 'page' | 'invoice' | 'loading' | 'empty' | 'error';
  id: string;
  invoice?: Invoice;
};

export const InvoicesScreen: React.FC<Props> = ({ isDarkMode, renderHeader }) => {
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
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [mappingInvoice, setMappingInvoice] = useState<Invoice | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [detailsInvoice, setDetailsInvoice] = useState<InvoiceDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const periodLabel = useMemo(
    () => periodOptions.find((option) => option.value === dateFilter.mode)?.label || 'Mês Atual',
    [dateFilter.mode]
  );

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
        const fileUrl = URL.createObjectURL(
          new Blob([details.rawXml], { type: 'application/xml' })
        );
        const anchor = document.createElement('a');
        anchor.href = fileUrl;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(fileUrl);
      } else if (Platform.OS === 'android') {
        const directory =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!directory.granted) return;
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          directory.directoryUri,
          fileName,
          'application/xml'
        );
        await FileSystem.writeAsStringAsync(fileUri, details.rawXml, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        Alert.alert('XML salvo', `Arquivo salvo como ${fileName}.`);
      } else if (FileSystem.documentDirectory) {
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, details.rawXml, {
          encoding: FileSystem.EncodingType.UTF8,
        });
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
        ]
      );
    } catch (importError) {
      console.error('Failed to import invoice XML:', importError);
      const message =
        importError instanceof Error
          ? importError.message
          : 'Verifique se selecionou um XML válido de NF-e.';
      const isDuplicate = message.startsWith('Nota Fiscal Já Cadastrada:');
      Alert.alert(
        isDuplicate ? 'Nota Fiscal Já Cadastrada' : 'Não foi possível importar o XML',
        isDuplicate ? message.slice('Nota Fiscal Já Cadastrada:'.length).trim() : message
      );
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
            void stockService
              .deleteInboundInvoice(invoice.id)
              .then(reload)
              .catch((deleteError: unknown) => {
                console.error('Failed to delete invoice:', deleteError);
                Alert.alert('Não foi possível remover a nota', 'Tente novamente em instantes.');
              });
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleFetchXml = async (invoice: Invoice) => {
    if (!invoice.accessKey) {
      Alert.alert('Chave indisponível', 'Esta nota não possui chave de acesso válida cadastrada.');
      return;
    }
    try {
      const res = await stockService.consultSefazByAccessKey(invoice.accessKey);
      const data = res?.data;
      if (data?.success && data?.document?.xml) {
        Alert.alert('Sucesso', 'XML completo obtido com sucesso da SEFAZ!');
        reload();
      } else if (data?.success) {
        Alert.alert(
          'Consulta Realizada',
          'A SEFAZ ainda disponibiliza apenas o resumo para este documento. Se necessário, importe o XML oficial do fornecedor manualmente.'
        );
        reload();
      } else {
        Alert.alert(
          'Consulta SEFAZ',
          data?.message ||
            res?.error?.message ||
            'Não foi possível obter o XML completo neste momento.'
        );
      }
    } catch (err: any) {
      console.error('Falha ao obter XML da SEFAZ:', err);
      Alert.alert(
        'Erro ao consultar SEFAZ',
        err?.message || 'Falha ao comunicar com o servidor da SEFAZ.'
      );
    }
  };

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
      <FlatList
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
                item={item.invoice!}
                isDarkMode={isDarkMode}
                onMenuPress={setActiveInvoice}
                onPress={(invoice) => {
                  void loadInvoiceDetails(invoice);
                }}
                onFetchXml={(invoice) => {
                  void handleFetchXml(invoice);
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
        onFetchXml={(invoice) => {
          void handleFetchXml(invoice);
        }}
        onDelete={confirmInvoiceDeletion}
      />
      <InvoiceDetailsModal
        visible={detailsLoading || !!detailsInvoice}
        isDarkMode={isDarkMode}
        invoice={detailsInvoice}
        loading={detailsLoading}
        onFetchXml={(invoice) => {
          void handleFetchXml(invoice);
        }}
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
        onDirectSyncSuccess={reload}
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
