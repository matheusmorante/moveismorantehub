import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { ScanBarcode, ExternalLink } from 'lucide-react-native';
import { styles } from './invoiceImportModal.styles';

interface InvoiceImportAccessKeySectionProps {
  accessKey: string;
  setAccessKey: (key: string) => void;
  isAccessKeyValid: boolean;
  isLoading: boolean;
  isDarkMode: boolean;
  onOpenScanner: () => void;
  onConsultPortal: () => void;
}

export const InvoiceImportAccessKeySection: React.FC<InvoiceImportAccessKeySectionProps> = ({
  accessKey,
  setAccessKey,
  isAccessKeyValid,
  isLoading,
  isDarkMode,
  onOpenScanner,
  onConsultPortal,
}) => {
  return (
    <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
      <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
        Chave de acesso da NF de entrada
      </Text>
      {accessKey && !isAccessKeyValid ? (
        <Text style={{ color: '#dc2626', marginTop: 8 }}>
          Informe uma chave válida da NF de entrada com 44 caracteres, incluindo o dígito verificador.
        </Text>
      ) : null}

      <View style={styles.inputRow}>
        <View style={[styles.inputWrapper, isDarkMode && styles.inputWrapperDark]}>
          <TextInput
            editable={!isLoading}
            style={[styles.input, isDarkMode && styles.textDark]}
            placeholder="Digite os 44 caracteres..."
            placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
            keyboardType="default"
            autoCapitalize="characters"
            maxLength={44}
            value={accessKey}
            onChangeText={(text) => setAccessKey(text.toUpperCase().replace(/[.\-/\s]/g, ''))}
          />
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={onOpenScanner}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Escanear chave da NF de entrada"
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <ScanBarcode size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={[
            styles.portalBtn,
            isDarkMode && styles.portalBtnDark,
            !isAccessKeyValid && styles.portalBtnDisabled,
          ]}
          disabled={!isAccessKeyValid || isLoading}
          onPress={onConsultPortal}
          accessibilityRole="button"
          accessibilityLabel="Consultar NF-e no Portal Nacional"
        >
          <ExternalLink
            size={15}
            color={isAccessKeyValid ? (isDarkMode ? '#cbd5e1' : '#475569') : (isDarkMode ? '#64748b' : '#94a3b8')}
          />
          <Text
            style={[
              styles.portalBtnText,
              isDarkMode && styles.textDark,
              !isAccessKeyValid && styles.portalBtnTextDisabled,
            ]}
          >
            Consultar no Portal
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
