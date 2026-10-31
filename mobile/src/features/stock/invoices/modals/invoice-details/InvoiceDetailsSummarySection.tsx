import React from 'react';
import { Text, View } from 'react-native';
import type { InvoiceDetail } from '../../../types/stock.types';
import { formatInvoiceDate } from '../../utils/invoiceList';
import { money } from './invoiceDetailsFormatters';
import { styles } from './invoiceDetailsModal.styles';

export const InvoiceDetailsSummarySection: React.FC<{
  invoice: InvoiceDetail;
  isDarkMode: boolean;
}> = ({ invoice, isDarkMode }) => (
  <View style={[styles.summaryCard, isDarkMode && styles.sectionDark]}>
    <View style={styles.summaryHeading}>
      <View style={styles.summaryCopy}>
        <Text style={styles.sectionLabel}>NF-e de entrada</Text>
        <Text style={[styles.summaryNumber, isDarkMode && styles.textDark]}>
          Nº {invoice.number || '—'} · Série {invoice.series || '—'}
        </Text>
        <Text style={[styles.metaText, isDarkMode && styles.textMutedDark]}>
          Emissão: {formatInvoiceDate(invoice.issueDate)}
          {invoice.receivedAt ? ` · Recebida em: ${formatInvoiceDate(invoice.receivedAt)}` : ''}
        </Text>
      </View>
      <View style={[styles.summaryTotal, isDarkMode && styles.summaryTotalDark]}>
        <Text style={[styles.totalLabel, isDarkMode && styles.totalLabelDark]}>Valor total da nota</Text>
        <Text style={[styles.totalValue, isDarkMode && styles.textDark]}>{money(invoice.totalValue)}</Text>
        <Text style={[styles.metaText, isDarkMode && styles.textMutedDark]}>
          Produtos: {money(invoice.totalProducts)} · Frete: {money(invoice.totalFreight)}
        </Text>
      </View>
    </View>
    <View style={[styles.accessKeySection, isDarkMode && styles.accessKeySectionDark]}>
      <Text style={styles.sectionLabel}>Chave de acesso</Text>
      <Text selectable style={[styles.keyText, isDarkMode && styles.textMutedDark]}>
        {invoice.accessKey || 'Chave de acesso não informada'}
      </Text>
    </View>
  </View>
);
