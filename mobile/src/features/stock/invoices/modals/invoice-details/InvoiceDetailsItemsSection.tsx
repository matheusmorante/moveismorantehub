import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { CloudDownload } from 'lucide-react-native';
import type { InvoiceDetail } from '../../types/stock.types';
import { money } from './invoiceDetailsFormatters';
import { styles } from './invoiceDetailsModal.styles';

interface InvoiceDetailsItemsSectionProps {
  invoice: InvoiceDetail;
  isDarkMode: boolean;
  onFetchXml?: (invoice: InvoiceDetail) => void;
  onClose: () => void;
}

export const InvoiceDetailsItemsSection: React.FC<InvoiceDetailsItemsSectionProps> = ({
  invoice,
  isDarkMode,
  onFetchXml,
  onClose,
}) => {
  return (
    <View style={[styles.itemSection, isDarkMode && styles.itemSectionDark]}>
      <Text style={[styles.itemsHeader, isDarkMode && styles.textDark]}>
        Itens da Nota Fiscal ({invoice.items.length})
      </Text>
      {invoice.items.length === 0 ? (
        <View style={styles.emptyItemsBox}>
          <Text style={[styles.emptyText, isDarkMode && styles.textMutedDark]}>
            Nota recebida via SEFAZ em formato de resumo (resNFe). Os itens completos
            ficam disponíveis após a obtenção do XML completo.
          </Text>
          {onFetchXml && (
            <TouchableOpacity
              style={styles.fetchXmlDetailBtn}
              onPress={() => {
                onFetchXml(invoice);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Obter XML completo da SEFAZ"
            >
              <CloudDownload size={15} color="#ffffff" />
              <Text style={styles.fetchXmlDetailBtnText}>
                Obter XML Completo da SEFAZ
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        invoice.items.map((item, index) => (
          <View
            key={`${item.productCode}-${index}`}
            style={[styles.item, isDarkMode && styles.itemDark]}
          >
            <View style={styles.itemDescription}>
              <Text
                style={[styles.itemTitle, isDarkMode && styles.textDark]}
                numberOfLines={2}
              >
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
            <View style={styles.itemValue}>
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
