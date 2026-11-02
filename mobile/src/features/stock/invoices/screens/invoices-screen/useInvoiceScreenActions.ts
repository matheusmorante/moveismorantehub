import { useState } from 'react';
import { Alert, Platform, Share } from 'react-native';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import type { DocumentPickerAsset } from 'expo-document-picker';
import type { Invoice, InvoiceDetail } from '../../../types/stock.types';
import * as stockService from '../../../../../services/stockService';
import { normalizeFiscalIdentifier } from '../../../../../../../shared-utils/fiscalIdentifiers';
import { extractNfeAccessKey } from '../../utils/accessKey';

const showInvoiceImportAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
};

const readInvoiceXml = async (file: DocumentPickerAsset) => {
  if (Platform.OS !== 'web') {
    return FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
  }
  if (file.file) return file.file.text();
  const response = await fetch(file.uri);
  if (!response.ok) throw new Error('Não foi possível ler o arquivo XML selecionado.');
  return response.text();
};

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
    const accessKey = normalizeFiscalIdentifier(key);
    if (accessKey.length !== 44) return;
    const url = `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&nfe=${accessKey}`;
    try {
      await Linking.openURL(url);
    } catch (openError) {
      console.error('Failed to open SEFAZ consultation:', openError);
      Alert.alert('Não foi possível abrir o Portal Nacional da NF-e', 'Tente novamente em instantes.');
    }
  };

  const importXml = async (
    file: DocumentPickerAsset,
    onStatusChange: (message: string) => void,
    expectedAccessKey?: string
  ) => {
    try {
      onStatusChange('Lendo o arquivo XML...');
      const xmlText = await readInvoiceXml(file);

      if (expectedAccessKey !== undefined) {
        const expectedKey = normalizeFiscalIdentifier(expectedAccessKey);
        if (expectedKey.length !== 44 || extractNfeAccessKey(xmlText) !== expectedKey) {
          throw new Error('O XML selecionado não corresponde à chave desta nota fiscal incompleta.');
        }
      }

      const result = await stockService.importInboundInvoiceXml(xmlText, onStatusChange);
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
        status: result.status,
        hasPendingBindings: Boolean(result.hasPendingBindings),
        sefazStatus: 'pending',
      };
      setShowImportModal(false);
      reload();
      if (result.outcome === 'unchanged') {
        showInvoiceImportAlert(
          'NF-e já cadastrada',
          'Esta nota fiscal já está cadastrada com os mesmos dados. Nenhuma alteração foi feita.'
        );
        return;
      }
      const title = result.outcome === 'updated' ? 'Nota fiscal atualizada' : 'Nota Fiscal Adicionada!';
      const message = `${result.outcome === 'updated' ? `A NF-e já estava cadastrada; o XML trouxe dados novos e ela foi atualizada.${result.hasConflicts ? ' Campos com valores divergentes foram preservados.' : ''}\n\n` : ''}NF-e #${result.number} · Série ${result.series}\nFornecedor: ${result.supplierName}\nTotal: R$ ${result.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nItens: ${result.itemsCount}`;
      if (Platform.OS === 'web') {
        if (result.hasPendingBindings) {
          if (window.confirm(`${title}\n\n${message}\n\nDeseja gerenciar os vínculos dos produtos desta nota agora?`)) {
            setMappingInvoice(importedInvoice);
          }
        } else {
          showInvoiceImportAlert(title, message);
        }
      } else {
        Alert.alert(title, message, [
          ...(result.hasPendingBindings
            ? [{ text: 'Gerenciar vínculos', onPress: () => setMappingInvoice(importedInvoice) }]
            : []),
          { text: 'Fechar', style: 'cancel' as const },
        ]);
      }
    } catch (importError) {
      console.error('Failed to import invoice XML:', importError);
      throw importError;
    }
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
  };
};
