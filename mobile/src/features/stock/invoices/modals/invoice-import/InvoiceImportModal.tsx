import React, { useState } from 'react';
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
} from 'react-native';
import { X, UploadCloud } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { InventoryScannerScreen } from '../../../inventory/screens/InventoryScannerScreen';
import { extractNfeAccessKey } from '../../utils/accessKey';
import { flattenFormErrors, useZodForm } from '../../../../../hooks/useZodForm';
import {
  inboundAccessKeyFormSchema,
  inboundXmlFileFormSchema,
} from '../../../../../../../shared-utils/lookupFormSchemas';
import { styles } from './invoiceImportModal.styles';
import { InvoiceImportAccessKeySection } from './InvoiceImportAccessKeySection';
import { InvoiceImportXmlUploadSection } from './InvoiceImportXmlUploadSection';

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  onConsultSefaz?: (accessKey: string) => void;
  onUploadXml?: (file: DocumentPickerAsset) => void | Promise<void>;
}

export const InvoiceImportModal: React.FC<Props> = ({
  visible,
  isDarkMode,
  onClose,
  onConsultSefaz,
  onUploadXml,
}) => {
  const [accessKey, setAccessKey] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const keyForm = useZodForm(inboundAccessKeyFormSchema, { accessKey });
  const fileForm = useZodForm(inboundXmlFileFormSchema, { uri: '', name: '' });

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/xml', 'text/xml'],
      });
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        if (onUploadXml) {
          setIsLoading(true);
          try {
            await fileForm.validateAndRun(
              { ...result.assets[0] },
              (values) => onUploadXml(values as DocumentPickerAsset),
              (errors) => Alert.alert('Arquivo inválido', Object.values(flattenFormErrors(errors))[0])
            );
          } finally {
            setIsLoading(false);
          }
        }
      }
    } catch (err) {
      console.error(err);
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
    keyForm.validateAndRun(
      { accessKey },
      (values) => onConsultSefaz?.(values.accessKey),
      (errors) => Alert.alert('Chave inválida', Object.values(flattenFormErrors(errors))[0])
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!isLoading) onClose();
        }}
      >
        <KeyboardAvoidingView
          style={[styles.container, isDarkMode && styles.containerDark]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.header, isDarkMode && styles.headerDark]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBox, isDarkMode && styles.iconBoxDark]}>
                <UploadCloud size={20} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
              </View>
              <View style={styles.headerCopy}>
                <Text style={[styles.title, isDarkMode && styles.textDark]}>
                  Importar XML da NF de entrada
                </Text>
                <Text style={[styles.subtitle, isDarkMode && styles.textMutedDark]}>
                  Importe o arquivo XML da nota fiscal para conferência e entrada no estoque.
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isLoading}>
              <X size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {isLoading && (
              <View style={[styles.loadingCard, isDarkMode && styles.sectionCardDark]}>
                <ActivityIndicator size="small" color={isDarkMode ? '#60a5fa' : '#2563eb'} />
                <View style={styles.loadingCopy}>
                  <Text style={[styles.loadingTitle, isDarkMode && styles.textDark]}>
                    Importando nota fiscal...
                  </Text>
                  <Text style={[styles.loadingSubtitle, isDarkMode && styles.textMutedDark]}>
                    Lendo o XML, verificando duplicidade e salvando a nota e os itens.
                  </Text>
                </View>
              </View>
            )}

            <InvoiceImportAccessKeySection
              accessKey={accessKey}
              setAccessKey={setAccessKey}
              isAccessKeyValid={isAccessKeyValid}
              isLoading={isLoading}
              isDarkMode={isDarkMode}
              onOpenScanner={() => setShowScanner(true)}
              onConsultPortal={handleConsultPortal}
            />

            <InvoiceImportXmlUploadSection
              isLoading={isLoading}
              isDarkMode={isDarkMode}
              onPickDocument={handlePickDocument}
            />
          </ScrollView>

          <View style={[styles.footer, isDarkMode && styles.footerDark]}>
            <TouchableOpacity
              style={[styles.cancelBtn, isDarkMode && styles.cancelBtnDark]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={[styles.cancelBtnText, isDarkMode && styles.textDark]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
