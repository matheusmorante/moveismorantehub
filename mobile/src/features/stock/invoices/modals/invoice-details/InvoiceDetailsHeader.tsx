import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import type { InvoiceDetail } from '../../../types/stock.types';
import { formatInvoiceDate } from '../../utils/invoiceList';
import { styles } from './invoiceDetailsModal.styles';

interface InvoiceDetailsHeaderProps {
  invoice: InvoiceDetail | null;
  isDarkMode: boolean;
  onClose: () => void;
}

export const InvoiceDetailsHeader: React.FC<InvoiceDetailsHeaderProps> = ({
  invoice,
  isDarkMode,
  onClose,
}) => {
  return (
    <View style={[styles.header, isDarkMode && styles.headerDark]}>
      <View style={styles.headerCopy}>
        <View style={styles.titleLine}>
          <Text style={[styles.title, isDarkMode && styles.textDark]}>
            {invoice
              ? `NF-e #${invoice.number} - Série ${invoice.series}`
              : 'Detalhes da NF-e'}
          </Text>
          {invoice && (
            <View
              style={[
                styles.statusBadge,
                invoice.status === 'received'
                  ? styles.statusReceived
                  : invoice.status === 'manifested'
                    ? styles.statusManifested
                    : styles.statusPending,
                isDarkMode &&
                  (invoice.status === 'received'
                    ? styles.statusReceivedDark
                    : invoice.status === 'manifested'
                      ? styles.statusManifestedDark
                      : styles.statusPendingDark),
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  invoice.status === 'received'
                    ? styles.statusTextReceived
                    : invoice.status === 'manifested'
                      ? styles.statusTextManifested
                      : styles.statusTextPending,
                  isDarkMode &&
                    (invoice.status === 'received'
                      ? styles.statusTextReceivedDark
                      : invoice.status === 'manifested'
                        ? styles.statusTextManifestedDark
                        : styles.statusTextPendingDark),
                ]}
              >
                {invoice.status === 'received'
                  ? 'Recebida'
                  : invoice.status === 'manifested'
                    ? 'Manifestada'
                    : 'Pendente'}
              </Text>
            </View>
          )}
        </View>
        {invoice && (
          <Text style={styles.keyText}>
            {invoice.accessKey || 'Chave de acesso não informada'}
          </Text>
        )}
        {invoice && (
          <Text style={styles.metaText}>
            Emissão: {formatInvoiceDate(invoice.issueDate)} · Recebida em:{' '}
            {formatInvoiceDate(invoice.receivedAt)}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar detalhes"
        style={styles.closeBtn}
      >
        <X size={22} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
      </TouchableOpacity>
    </View>
  );
};
