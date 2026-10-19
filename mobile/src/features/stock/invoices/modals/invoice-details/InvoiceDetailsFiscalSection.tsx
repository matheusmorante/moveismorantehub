import React from 'react';
import { Text, View } from 'react-native';
import type { InvoiceDetail } from '../../../types/stock.types';
import { fiscalDate, money } from './invoiceDetailsFormatters';
import { styles } from './invoiceDetailsModal.styles';

interface InvoiceDetailsFiscalSectionProps {
  invoice: InvoiceDetail;
  isDarkMode: boolean;
  compactLayout: boolean;
}

export const InvoiceDetailsFiscalSection: React.FC<InvoiceDetailsFiscalSectionProps> = ({
  invoice,
  isDarkMode,
  compactLayout,
}) => {
  return (
    <>
      <View style={[styles.parties, isDarkMode && styles.sectionDark]}>
        <View style={styles.party}>
          <Text style={styles.sectionLabel}>Fornecedor / Emitente</Text>
          <Text style={[styles.partyName, isDarkMode && styles.textDark]}>
            {invoice.supplierName}
          </Text>
          <Text style={styles.metaText}>CNPJ: {invoice.supplierCnpj || '—'}</Text>
        </View>
        <View style={styles.party}>
          <Text style={styles.sectionLabel}>Destinatário</Text>
          <Text style={[styles.partyName, isDarkMode && styles.textDark]}>
            {invoice.recipientName || '—'}
          </Text>
          <Text style={styles.metaText}>CNPJ: {invoice.recipientCnpj || '—'}</Text>
        </View>
      </View>

      <View style={[styles.fiscalSection, isDarkMode && styles.sectionDark]}>
        <Text style={styles.sectionLabel}>Dados fiscais extraídos</Text>
        <View style={styles.fiscalGrid}>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            Número / série: {invoice.number || '—'} / {invoice.series || '—'}
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            Modelo: {invoice.model || '—'}
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            Protocolo: {invoice.protocol || '—'}
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            IE: {invoice.emitterIe || '—'}
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            Natureza: {invoice.operationNature || '—'}
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            Emissão: {fiscalDate(invoice.issueDate)}
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            Saída/entrada: {fiscalDate(invoice.entryExitAt)}
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            Produtos: {money(invoice.totalProducts)}
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            Frete: {money(invoice.totalFreight)} · {invoice.freightPercent.toFixed(2)}%
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            IPI: {money(invoice.totalIpi)} · {invoice.ipiPercent.toFixed(2)}%
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            ICMS: {money(invoice.totalIcms)}
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            ICMS ST: {money(invoice.totalIcmsSt)}
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            Desconto: {money(invoice.totalDiscount)}
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            Seguro: {money(invoice.totalInsurance)}
          </Text>
          <Text
            style={[
              styles.fiscalText,
              compactLayout && styles.fiscalTextCompact,
              isDarkMode && styles.textDark,
            ]}
          >
            Outras despesas: {money(invoice.totalOtherExpenses)}
          </Text>
        </View>
        {invoice.additionalInfo ? (
          <Text style={styles.additionalInfo}>
            Observações: {invoice.additionalInfo}
          </Text>
        ) : null}
      </View>
    </>
  );
};
