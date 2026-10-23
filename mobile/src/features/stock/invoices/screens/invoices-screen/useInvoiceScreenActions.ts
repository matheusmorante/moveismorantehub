import { useState } from 'react';
import { Alert, Platform, Share } from 'react-native';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import type { Invoice, InvoiceDetail } from '../../../types/stock.types';
import * as stockService from '../../../../../services/stockService';

export const useInvoiceScreenActions = (reload: () => void) => {
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [mappingInvoice, setMappingInvoice] = useState<Invoice | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [detailsInvoice, setDetailsInvoice] = useState<InvoiceDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

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
      Alert.alert('Não foi possível abrir o Portal Nacional da NF-e', 'Tente novamente em instantes.');
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

  return {
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
  };
};
