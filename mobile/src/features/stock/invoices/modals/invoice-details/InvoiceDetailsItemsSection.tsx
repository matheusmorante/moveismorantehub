import React from 'react';
import { Text, View } from 'react-native';
import type { InvoiceDetail } from '../../../types/stock.types';
import { money } from './invoiceDetailsFormatters';
import { styles } from './invoiceDetailsModal.styles';
import { hasInboundItemCommercialData } from '../../../../../../../shared-utils/inboundInvoiceCompleteness';

interface InvoiceDetailsItemsSectionProps {
  invoice: InvoiceDetail;
  isDarkMode: boolean;
  compactLayout: boolean;
}

export const InvoiceDetailsItemsSection: React.FC<InvoiceDetailsItemsSectionProps> = ({
  invoice,
  isDarkMode,
  compactLayout,
}) => {
  return (
    <View style={[styles.itemSection, isDarkMode && styles.itemSectionDark]}>
      <Text style={[styles.itemsHeader, isDarkMode && styles.textDark]}>
        Itens da Nota Fiscal ({invoice.items.length})
      </Text>
      {!hasInboundItemCommercialData(invoice.items) ? (
        <View style={styles.emptyItemsBox}>
          <Text style={[styles.emptyText, isDarkMode && styles.textMutedDark]}>
            A sincronização automática não carrega itens e também pode chegar com valores zerados. Para conferir esta nota, baixe o XML completo atualizado no Portal da NF-e e importe-o pelo botão Obter XML.
          </Text>
        </View>
      ) : (
        invoice.items.map((item, index) => (
          <View
            key={`${item.productCode}-${index}`}
            style={[styles.item, compactLayout && styles.itemCompact, isDarkMode && styles.itemDark]}
          >
            <View style={styles.itemDescription}>
              <Text style={[styles.itemTitle, isDarkMode && styles.textDark]}>
                {item.description}
              </Text>
              <Text style={styles.itemMeta}>
                Cód: {item.productCode || 'S/C'} · EAN: {item.ean || '—'}
              </Text>
              <Text style={styles.itemMeta}>
                NCM: {item.ncm || '—'} · CEST: {item.cest || '—'} · CFOP:{' '}
                {item.cfop || '—'}
              </Text>
            </View>
            <View style={[styles.itemValue, compactLayout && styles.itemValueCompact]}>
              <Text style={[styles.itemTitle, isDarkMode && styles.textDark]}>
                {item.quantity} {item.unit} × {money(item.unitCost)}
              </Text>
              <Text style={styles.totalItem}>{money(item.totalCost)}</Text>
              <Text style={styles.itemMeta}>
                Frete {money(item.freightValue)} · IPI {money(item.ipiValue)} (
                {item.ipiPercent.toFixed(2)}%)
              </Text>
              <Text style={styles.itemMeta}>
                ICMS {money(item.icmsValue)} ({item.icmsPercent.toFixed(2)}%) · ST{' '}
                {money(item.icmsStValue)}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
};
