import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import type { InvoiceDetail } from '../../../types/stock.types';
import {
  InvoiceDetailsFiscalSection,
  InvoiceDetailsHeader,
  InvoiceDetailsItemsSection,
  money,
  styles,
} from '.';

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  invoice: InvoiceDetail | null;
  loading: boolean;
  onClose: () => void;
  onFetchXml?: (invoice: InvoiceDetail) => void;
}

export const InvoiceDetailsModal: React.FC<Props> = ({
  visible,
  isDarkMode,
  invoice,
  loading,
  onClose,
  onFetchXml,
}) => {
  const { width } = useWindowDimensions();
  const compactLayout = width < 600;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modal, isDarkMode && styles.modalDark]}>
              <InvoiceDetailsHeader
                invoice={invoice}
                isDarkMode={isDarkMode}
                onClose={onClose}
              />

              {loading || !invoice ? (
                <View style={styles.loadingBox}>
                  <Text style={styles.metaText}>
                    {loading ? 'Carregando detalhes...' : 'Detalhes indisponíveis.'}
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                  <InvoiceDetailsFiscalSection
                    invoice={invoice}
                    isDarkMode={isDarkMode}
                    compactLayout={compactLayout}
                  />

                  <InvoiceDetailsItemsSection
                    invoice={invoice}
                    isDarkMode={isDarkMode}
                    onFetchXml={onFetchXml}
                    onClose={onClose}
                  />

                  <View style={styles.totalBox}>
                    <View style={styles.totalCopy}>
                      <Text style={styles.totalLabel}>Total da Nota Fiscal</Text>
                      <Text style={styles.metaText}>
                        Produtos: {money(invoice.totalProducts)} · Frete:{' '}
                        {money(invoice.totalFreight)}
                      </Text>
                    </View>
                    <Text style={styles.totalValue}>{money(invoice.totalValue)}</Text>
                  </View>
                </ScrollView>
              )}

              <View style={[styles.footer, isDarkMode && styles.headerDark]}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.footerBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.footerBtnText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
