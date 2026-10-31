import React from 'react';
import { Text, View } from 'react-native';
import type { InvoiceDetail } from '../../../types/stock.types';
import { styles } from './invoiceDetailsModal.styles';

export const InvoiceDetailsPartiesSection: React.FC<{
  invoice: InvoiceDetail;
  isDarkMode: boolean;
  compactLayout: boolean;
}> = ({ invoice, isDarkMode, compactLayout }) => (
  <View style={[styles.parties, isDarkMode && styles.sectionDark]}>
    <View style={[styles.party, compactLayout && styles.partyCompact]}>
      <Text style={styles.sectionLabel}>Fornecedor / Emitente</Text>
      <Text style={[styles.partyName, isDarkMode && styles.textDark]}>{invoice.supplierName || '—'}</Text>
      <Text style={[styles.metaText, isDarkMode && styles.textMutedDark]}>CNPJ: {invoice.supplierCnpj || '—'}</Text>
    </View>
    <View style={[styles.party, compactLayout && styles.partyCompact]}>
      <Text style={styles.sectionLabel}>Destinatário</Text>
      <Text style={[styles.partyName, isDarkMode && styles.textDark]}>{invoice.recipientName || '—'}</Text>
      <Text style={[styles.metaText, isDarkMode && styles.textMutedDark]}>CNPJ: {invoice.recipientCnpj || '—'}</Text>
    </View>
  </View>
);
