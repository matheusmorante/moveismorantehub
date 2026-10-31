import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { ClipboardList, FileText, Package, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  INBOUND_INVOICE_DETAIL_TABS,
  type InboundInvoiceDetailTab,
} from '../../../../../../../shared-utils/inboundInvoiceDetailTabs';
import type { InvoiceDetail } from '../../../types/stock.types';
import { InvoiceDetailsFiscalSection } from './InvoiceDetailsFiscalSection';
import { InvoiceDetailsHeader } from './InvoiceDetailsHeader';
import { InvoiceDetailsItemsSection } from './InvoiceDetailsItemsSection';
import { InvoiceDetailsPartiesSection } from './InvoiceDetailsPartiesSection';
import { InvoiceDetailsSummarySection } from './InvoiceDetailsSummarySection';
import { styles } from './invoiceDetailsModal.styles';

const TAB_ICONS = { summary: FileText, parties: Users, items: Package, fiscal: ClipboardList };

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  invoice: InvoiceDetail | null;
  loading: boolean;
  onClose: () => void;
}

export const InvoiceDetailsModal: React.FC<Props> = ({
  visible,
  isDarkMode,
  invoice,
  loading,
  onClose,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compactLayout = width < 600;
  const fullScreen = compactLayout || height < 500;
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 24 : 0);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0);
  const [activeTab, setActiveTab] = useState<InboundInvoiceDetailTab>('summary');

  useEffect(() => {
    if (visible) setActiveTab('summary');
  }, [visible, invoice?.id]);

  return (
    <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[
          styles.overlay,
          fullScreen && styles.overlayCompact,
          !fullScreen && { paddingTop: topInset + 12, paddingBottom: bottomInset + 12, paddingLeft: Math.max(insets.left, 12), paddingRight: Math.max(insets.right, 12) },
        ]}>
          <TouchableWithoutFeedback>
            <View
              accessibilityViewIsModal
              style={[
                styles.modal,
                fullScreen && styles.modalCompact,
                fullScreen && { paddingTop: topInset, paddingBottom: bottomInset, paddingLeft: insets.left, paddingRight: insets.right },
                isDarkMode && styles.modalDark,
              ]}
            >
              <InvoiceDetailsHeader
                invoice={invoice}
                isDarkMode={isDarkMode}
                onClose={onClose}
              />

              <ScrollView
                horizontal
                accessibilityRole="tablist"
                accessibilityLabel="Abas dos detalhes da NF de entrada"
                showsHorizontalScrollIndicator={false}
                style={[styles.tabsScroll, isDarkMode && styles.tabsScrollDark]}
                contentContainerStyle={styles.tabsContent}
              >
                {INBOUND_INVOICE_DETAIL_TABS.map((tab) => {
                  const selected = activeTab === tab.id;
                  const Icon = TAB_ICONS[tab.id];
                  const color = selected ? (isDarkMode ? '#93c5fd' : '#1d4ed8') : (isDarkMode ? '#94a3b8' : '#64748b');
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => setActiveTab(tab.id)}
                      style={[styles.tab, width < 420 && styles.tabCompact, selected && styles.tabActive]}
                    >
                      <Icon size={16} color={color} />
                      <Text style={[styles.tabText, width < 420 && styles.tabTextCompact, isDarkMode && styles.tabTextDark, selected && styles.tabTextActive, selected && isDarkMode && styles.tabTextActiveDark]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {loading || !invoice ? (
                <View style={styles.loadingBox}>
                  <Text style={styles.metaText}>
                    {loading ? 'Carregando detalhes...' : 'Detalhes indisponíveis.'}
                  </Text>
                </View>
              ) : (
                <ScrollView key={activeTab} style={styles.body} contentContainerStyle={styles.bodyContent}>
                  {activeTab === 'summary' && <InvoiceDetailsSummarySection invoice={invoice} isDarkMode={isDarkMode} />}
                  {activeTab === 'parties' && <InvoiceDetailsPartiesSection invoice={invoice} isDarkMode={isDarkMode} compactLayout={compactLayout} />}
                  {activeTab === 'items' && <InvoiceDetailsItemsSection invoice={invoice} isDarkMode={isDarkMode} compactLayout={width < 420} />}
                  {activeTab === 'fiscal' && <InvoiceDetailsFiscalSection invoice={invoice} isDarkMode={isDarkMode} compactLayout={compactLayout} />}
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
