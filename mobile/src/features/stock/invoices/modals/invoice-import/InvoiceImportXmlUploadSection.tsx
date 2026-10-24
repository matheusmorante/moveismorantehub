import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { UploadCloud } from 'lucide-react-native';
import { styles } from './invoiceImportModal.styles';

interface InvoiceImportXmlUploadSectionProps {
  isLoading: boolean;
  isDarkMode: boolean;
  onPickDocument: () => void;
}

export const InvoiceImportXmlUploadSection: React.FC<InvoiceImportXmlUploadSectionProps> = ({
  isLoading,
  isDarkMode,
  onPickDocument,
}) => {
  return (
    <>
      <View style={styles.sectionHeaderSpacing}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
          Arquivo XML da NF de entrada
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.uploadArea, isDarkMode && styles.uploadAreaDark]}
        onPress={onPickDocument}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={[styles.uploadIconCircle, isDarkMode && styles.uploadIconCircleDark]}>
          <UploadCloud size={28} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
        </View>
        <Text style={[styles.uploadTitle, isDarkMode && styles.textDark]}>
          Toque para escolher o arquivo
        </Text>
        <Text style={[styles.uploadSubtitle, isDarkMode && styles.textMutedDark]}>
          Formato aceito: XML oficial da nota fiscal eletrônica, modelo 55
        </Text>
      </TouchableOpacity>

    </>
  );
};
