import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { ExternalLink, X, UploadCloud } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import type { Invoice } from '../../../types/stock.types';
import { InventoryScannerScreen } from '../../../inventory/screens/InventoryScannerScreen';
import { extractNfeAccessKey } from '../../utils/accessKey';
import { flattenFormErrors, useZodForm } from '../../../../../hooks/useZodForm';
import {
  inboundAccessKeyFormSchema,
  inboundXmlFileFormSchema,
} from '../../../../../../../shared-utils/lookupFormSchemas';
import { normalizeFiscalIdentifier } from '../../../../../../../shared-utils/fiscalIdentifiers';
import { INBOUND_SUMMARY_XML_HELP } from '../../../../../../../shared-utils/inboundSummaryHelp';
import { styles } from './invoiceImportModal.styles';
import { InvoiceImportAccessKeySection } from './InvoiceImportAccessKeySection';
import { InvoiceImportXmlUploadSection } from './InvoiceImportXmlUploadSection';

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  summaryInvoice?: Invoice | null;
  onConsultSefaz?: (accessKey: string) => void;
  onUploadXml?: (
    file: DocumentPickerAsset,
    onStatusChange: (message: string) => void,
    expectedAccessKey?: string
  ) => void | Promise<void>;
}

export const InvoiceImportModal: React.FC<Props> = ({
  visible,
  isDarkMode,
  onClose,
  summaryInvoice = null,
  onConsultSefaz,
  onUploadXml,
}) => {
  const { width } = useWindowDimensions();
  const compactLayout = width < 600;
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 24 : 0);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0);
  const [accessKey, setAccessKey] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [importError, setImportError] = useState('');
  const summaryAccessKey = normalizeFiscalIdentifier(summaryInvoice?.accessKey);
  const expectedAccessKey = summaryInvoice ? summaryAccessKey : undefined;
  const keyForm = useZodForm(inboundAccessKeyFormSchema, { accessKey });
  const fileForm = useZodForm(inboundXmlFileFormSchema, { uri: '', name: '' });

  useEffect(() => {
    setAccessKey(visible ? summaryAccessKey : '');
    if (visible) setImportError('');
  }, [visible, summaryAccessKey]);

  const withLoading = async (status: string, action: () => Promise<void>) => {
    setIsLoading(true);
    setStatusMessage(status);
    try {
      await action();
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/xml', 'text/xml'],
      });
      if (result.canceled || !result.assets?.length) return;
      if (!onUploadXml) {
        setImportError('A importação do XML não está disponível no momento. Feche e abra esta tela novamente.');
        return;
      }
      setImportError('');

      await fileForm.validateAndRun(
        { ...result.assets[0] },
        async (values) =>
          withLoading('Lendo arquivo XML...', () =>
            Promise.resolve(
              onUploadXml(values as DocumentPickerAsset, setStatusMessage, expectedAccessKey)
            )
          ),
        (errors) => setImportError(Object.values(flattenFormErrors(errors))[0] || 'Selecione um arquivo XML válido.')
      );
    } catch (err) {
      console.error(err);
      setImportError(
        err instanceof Error ? err.message : 'Não foi possível abrir o arquivo. Tente selecionar o XML novamente.'
      );
    }
  };

  const isAccessKeyValid = inboundAccessKeyFormSchema.safeParse({ accessKey }).success;

  const handleScan = (value: string) => {
    const key = extractNfeAccessKey(value);
    if (!key) {
      Alert.alert(
        'Código não reconhecido',
        'Não foi possível ler a chave no código de barras. Tente “Ler chave impressa” ou digite os 44 caracteres.'
      );
      return;
    }
    setAccessKey(key);
    setShowScanner(false);
  };

  const handleConsultPortal = () => {
    const keyToConsult = summaryInvoice ? summaryAccessKey : accessKey;
    keyForm.validateAndRun(
      { accessKey: keyToConsult },
      (values) => onConsultSefaz?.(values.accessKey),
      (errors) => Alert.alert('Chave inválida', Object.values(flattenFormErrors(errors))[0])
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="fade"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => {
          if (!isLoading) onClose();
        }}
      >
        <View
          style={[
            styles.modalBackdrop,
            compactLayout && styles.modalBackdropCompact,
            {
              paddingTop: compactLayout ? 0 : topInset,
              paddingBottom: compactLayout ? 0 : bottomInset,
            },
          ]}
        >
          <KeyboardAvoidingView
            style={[styles.modalCentering, compactLayout && styles.modalCenteringCompact]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View
              style={[
                styles.modalCard,
                compactLayout && styles.modalCardCompact,
                isDarkMode && styles.modalCardDark,
              ]}
            >
              <View
                style={[
                  styles.header,
                  compactLayout && { paddingTop: 20 + topInset },
                  isDarkMode && styles.headerDark,
                ]}
              >
                <View style={styles.headerLeft}>
                  <View style={[styles.iconBox, isDarkMode && styles.iconBoxDark]}>
                    <UploadCloud size={20} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
                  </View>
                  <View style={styles.headerCopy}>
                    <Text style={[styles.title, isDarkMode && styles.textDark]}>
                      {summaryInvoice
                        ? 'Obter XML da nota fiscal'
                        : 'Importar XML da NF de entrada'}
                    </Text>
                    <Text style={[styles.subtitle, isDarkMode && styles.textMutedDark]}>
                      {summaryInvoice
                        ? 'Baixe o XML completo atualizado no Portal da NF-e e importe-o para atualizar os itens.'
                        : 'Importe o arquivo XML da nota fiscal para conferência e entrada no estoque.'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar modal"
                >
                  <X size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.contentScroll}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
              >
                {isLoading && (
                  <View style={[styles.loadingCard, isDarkMode && styles.sectionCardDark]}>
                    <ActivityIndicator size="small" color={isDarkMode ? '#60a5fa' : '#2563eb'} />
                    <View style={styles.loadingCopy}>
                      <Text style={[styles.loadingTitle, isDarkMode && styles.textDark]}>
                        {statusMessage || 'Importando nota fiscal...'}
                      </Text>
                      <Text style={[styles.loadingSubtitle, isDarkMode && styles.textMutedDark]}>
                        Lendo o XML, verificando duplicidade e salvando a nota e os itens.
                      </Text>
                    </View>
                  </View>
                )}

                {importError ? (
                  <View
                    style={[styles.importErrorCard, isDarkMode && styles.importErrorCardDark]}
                    accessibilityRole="alert"
                  >
                    <Text style={[styles.importErrorTitle, isDarkMode && styles.importErrorTitleDark]}>
                      Não foi possível importar o XML
                    </Text>
                    <Text style={[styles.importErrorText, isDarkMode && styles.textMutedDark]}>
                      {importError}
                    </Text>
                  </View>
                ) : null}

                {summaryInvoice ? (
                  <View style={[styles.summaryNotice, isDarkMode && styles.summaryNoticeDark]}>
                    <Text style={[styles.summaryNoticeTitle, isDarkMode && styles.textDark]}>
                      Nota fiscal incompleta
                    </Text>
                    <Text style={[styles.summaryNoticeText, isDarkMode && styles.textMutedDark]}>
                      {INBOUND_SUMMARY_XML_HELP}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.summaryNoticeButton,
                        isDarkMode && styles.summaryNoticeButtonDark,
                        (summaryAccessKey.length !== 44 || isLoading) && styles.portalBtnDisabled,
                      ]}
                      onPress={handleConsultPortal}
                      disabled={summaryAccessKey.length !== 44 || isLoading}
                      accessibilityRole="button"
                      accessibilityLabel="Consultar esta NF-e no Portal Nacional"
                    >
                      <ExternalLink size={16} color={isDarkMode ? '#fde68a' : '#92400e'} />
                      <Text style={[styles.summaryNoticeButtonText, isDarkMode && styles.textDark]}>
                        Consultar no Portal
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <InvoiceImportAccessKeySection
                    accessKey={accessKey}
                    setAccessKey={setAccessKey}
                    isAccessKeyValid={isAccessKeyValid}
                    isLoading={isLoading}
                    isDarkMode={isDarkMode}
                    onOpenScanner={() => setShowScanner(true)}
                    onConsultPortal={handleConsultPortal}
                  />
                )}

                <InvoiceImportXmlUploadSection
                  isLoading={isLoading}
                  isDarkMode={isDarkMode}
                  onPickDocument={handlePickDocument}
                />
              </ScrollView>

              <View
                style={[
                  styles.footer,
                  compactLayout && { paddingBottom: 20 + bottomInset },
                  isDarkMode && styles.footerDark,
                ]}
              >
                <TouchableOpacity
                  style={[styles.cancelBtn, isDarkMode && styles.cancelBtnDark]}
                  onPress={onClose}
                  disabled={isLoading}
                >
                  <Text style={[styles.cancelBtnText, isDarkMode && styles.textDark]}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <InventoryScannerScreen
          isDarkMode={isDarkMode}
          title="Escanear chave da NF de entrada"
          description="Leia o código de barras da chave no DANFE. Se ele não estiver legível, use “Ler chave impressa” para reconhecer o texto de 44 caracteres."
          accessKeyMode
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      </Modal>
    </>
  );
};
