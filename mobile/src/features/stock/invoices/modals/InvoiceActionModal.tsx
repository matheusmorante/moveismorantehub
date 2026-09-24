import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { Download, Link2, Trash2, CloudDownload } from 'lucide-react-native';
import { Invoice } from '../../types/stock.types';

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  activeInvoice: Invoice | null;
  onClose: () => void;
  onDownloadXML?: (invoice: Invoice) => void;
  onManageMappings?: (invoice: Invoice) => void;
  onFetchXml?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
}

export const InvoiceActionModal: React.FC<Props> = ({ visible, isDarkMode, activeInvoice, onClose, onDownloadXML, onManageMappings, onFetchXml, onDelete }) => {
  if (!activeInvoice) return null;
  const isSummaryOnly = activeInvoice.itemsCount === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.bottomSheet, isDarkMode && styles.bottomSheetDark]}>
              <View style={styles.bsHandle} />
              <Text style={[styles.bsTitle, isDarkMode && styles.textDark]} numberOfLines={1}>
                NF-e {activeInvoice.number}
              </Text>

              {isSummaryOnly ? (
                <TouchableOpacity style={styles.bsActionBtn} onPress={() => { onFetchXml?.(activeInvoice); onClose(); }}>
                  <CloudDownload size={20} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
                  <Text style={[styles.bsActionText, { color: isDarkMode ? '#60a5fa' : '#3b82f6' }]}>Obter XML da SEFAZ</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.bsActionBtn} onPress={() => { onManageMappings?.(activeInvoice); onClose(); }}>
                  <Link2 size={20} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
                  <Text style={[styles.bsActionText, { color: isDarkMode ? '#60a5fa' : '#3b82f6' }]}>Gerenciar vínculos</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity style={styles.bsActionBtn} onPress={() => { onDownloadXML?.(activeInvoice); onClose(); }}>
                <Download size={20} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
                <Text style={[styles.bsActionText, { color: isDarkMode ? '#60a5fa' : '#3b82f6' }]}>Baixar XML</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bsActionBtn} onPress={() => { onDelete?.(activeInvoice); onClose(); }} accessibilityRole="button">
                <Trash2 size={20} color="#dc2626" />
                <Text style={[styles.bsActionText, styles.deleteText]}>Remover nota fiscal</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12 },
  bottomSheetDark: { backgroundColor: '#1e293b' },
  bsHandle: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  bsTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  bsActionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  bsActionText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  textDark: { color: '#f8fafc' },
  deleteText: { color: '#dc2626' }
});
