import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { FileText, MessageSquareText, Package, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../../invoices/modals/invoice-details/invoiceDetailsModal.styles';

type ReceiptTab = 'summary' | 'items' | 'notes';
const TABS: Array<{ id: ReceiptTab; label: string; icon: typeof FileText }> = [
  { id: 'summary', label: 'Resumo', icon: FileText },
  { id: 'items', label: 'Itens', icon: Package },
  { id: 'notes', label: 'Observações', icon: MessageSquareText },
];

const money = (value: unknown) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);

const date = (value: unknown) => {
  if (!value) return '—';
  const raw = String(value).trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('pt-BR');
};

const read = (record: any, camel: string, snake: string, fallback?: unknown) =>
  record?.[camel] ?? record?.[snake] ?? fallback;

const expenseValue = (value: unknown, mode: unknown) =>
  mode === 'percent' ? `${Number(value) || 0}%` : money(value);

const ReceiptField: React.FC<{
  label: string;
  value: string;
  isDarkMode: boolean;
  wide?: boolean;
}> = ({ label, value, isDarkMode, wide }) => (
  <View style={[styles.party, wide && { flexBasis: '100%' }]}>
    <Text style={styles.sectionLabel}>{label}</Text>
    <Text style={[styles.partyName, isDarkMode && styles.textDark]}>{value || '—'}</Text>
  </View>
);

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  receipt: any | null;
  onClose: () => void;
}

export const ReceiptDetailsModal: React.FC<Props> = ({ visible, isDarkMode, receipt, onClose }) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 600 || height < 500;
  const [activeTab, setActiveTab] = useState<ReceiptTab>('summary');

  useEffect(() => {
    if (visible) setActiveTab('summary');
  }, [visible, receipt?.id]);

  if (!receipt) return null;

  const receiptCode = read(receipt, 'receiptIndex', 'receipt_index');
  const displayReceiptCode = receiptCode
    ? String(receiptCode).padStart(6, '0')
    : receipt.id ? receipt.id.split('-')[0].toUpperCase() : '—';
  const supplierName = read(receipt, 'supplierName', 'supplier_name', 'Fornecedor');
  const receivedAt = read(receipt, 'receivedAt', 'received_at');
  const invoiceNumber = read(receipt, 'invoiceNumber', 'invoice_number');
  const invoiceDate = read(receipt, 'invoiceDate', 'invoice_date');
  const fiscalKey = read(receipt, 'fiscalKey', 'fiscal_key');
  const totalValue = read(receipt, 'totalValue', 'total_value', 0);
  const observation = String(receipt.observation || '').trim();
  const attachments = Array.isArray(receipt.attachments) ? receipt.attachments : [];
  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const isDraft = receipt.is_draft === true || receipt.isDraft === true || receipt.status === 'draft';
  const statusLabel = isDraft ? 'Rascunho' : receipt.status === 'estornado' ? 'Estornado' : 'Recebido';
  const statusStyle = receipt.status === 'estornado'
    ? { backgroundColor: isDarkMode ? '#450a0a' : '#fee2e2' }
    : isDarkMode
      ? isDraft ? styles.statusPendingDark : styles.statusReceivedDark
      : isDraft ? styles.statusPending : styles.statusReceived;
  const statusTextStyle = receipt.status === 'estornado'
    ? { color: isDarkMode ? '#fca5a5' : '#b91c1c' }
    : isDarkMode
      ? isDraft ? styles.statusTextPendingDark : styles.statusTextReceivedDark
      : isDraft ? styles.statusTextPending : styles.statusTextReceived;
  const nonFiscalFreightValue = read(receipt, 'nonFiscalFreightValue', 'non_fiscal_freight_value', null);
  const freightMode = read(receipt, 'nonFiscalFreightMode', 'non_fiscal_freight_mode');
  const otherExpensesValue = read(receipt, 'nonFiscalOtherExpensesValue', 'non_fiscal_other_expenses_value', null);
  const otherExpensesMode = read(receipt, 'nonFiscalOtherExpensesMode', 'non_fiscal_other_expenses_mode');
  const isInvoiceLinked = Boolean(invoiceNumber || fiscalKey);
  const fiscalFreight = read(receipt, 'fiscalFreight', 'fiscal_freight', null);
  const fiscalIpi = read(receipt, 'fiscalIpi', 'fiscal_ipi', null);
  const legacyFreightPercent = Number(read(receipt, 'freightPercent', 'freight_percent', 0)) || 0;
  const hasExpenses = nonFiscalFreightValue != null || otherExpensesValue != null ||
    Number(fiscalFreight) > 0 || Number(fiscalIpi) > 0 || legacyFreightPercent > 0;
  const invoiceLabel = invoiceNumber
    ? `NF-e ${invoiceNumber}`
    : fiscalKey ? 'NF-e identificada' : 'Sem nota fiscal';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[
          styles.overlay,
          compact && styles.overlayCompact,
          !compact && {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 0) + 12,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0) + 12,
            paddingLeft: Math.max(insets.left, 12),
            paddingRight: Math.max(insets.right, 12),
          },
        ]}>
          <TouchableWithoutFeedback>
            <View
              accessibilityViewIsModal
              style={[
                styles.modal,
                compact && styles.modalCompact,
                compact && { paddingTop: insets.top, paddingBottom: insets.bottom },
                isDarkMode && styles.modalDark,
              ]}
            >
              <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <View style={styles.headerCopy}>
                  <View style={styles.titleLine}>
                    <Text style={[styles.title, isDarkMode && styles.textDark]}>Detalhes do recebimento</Text>
                    <View style={[styles.statusBadge, statusStyle]}>
                      <Text style={[styles.statusText, statusTextStyle]}>{statusLabel}</Text>
                    </View>
                  </View>
                  <Text style={[styles.metaText, isDarkMode && styles.textMutedDark]}>
                    Rec. #{displayReceiptCode} · {supplierName}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar detalhes do recebimento"
                  style={styles.closeBtn}
                >
                  <X size={22} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                accessibilityRole="tablist"
                accessibilityLabel="Abas dos detalhes do recebimento"
                showsHorizontalScrollIndicator={false}
                style={[styles.tabsScroll, isDarkMode && styles.tabsScrollDark]}
                contentContainerStyle={styles.tabsContent}
              >
                {TABS.map((tab) => {
                  const selected = activeTab === tab.id;
                  const Icon = tab.icon;
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
                      <Text style={[
                        styles.tabText,
                        width < 420 && styles.tabTextCompact,
                        isDarkMode && styles.tabTextDark,
                        selected && styles.tabTextActive,
                        selected && isDarkMode && styles.tabTextActiveDark,
                      ]}>{tab.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <ScrollView key={activeTab} style={styles.body} contentContainerStyle={styles.bodyContent}>
                {activeTab === 'summary' ? (
                  <>
                    <View style={[styles.parties, isDarkMode && styles.sectionDark]}>
                      <ReceiptField label="Fornecedor" value={String(supplierName)} isDarkMode={isDarkMode} />
                      <ReceiptField label="Data do recebimento" value={date(receivedAt)} isDarkMode={isDarkMode} />
                      <ReceiptField label="Nota fiscal" value={invoiceLabel} isDarkMode={isDarkMode} />
                      {invoiceDate ? <ReceiptField label="Data de emissão" value={date(invoiceDate)} isDarkMode={isDarkMode} /> : null}
                      {fiscalKey ? <ReceiptField label="Chave de acesso" value={String(fiscalKey)} isDarkMode={isDarkMode} wide /> : null}
                    </View>

                    <View style={[styles.summaryTotal, isDarkMode && styles.summaryTotalDark]}>
                      <Text style={[styles.totalLabel, isDarkMode && styles.totalLabelDark]}>
                        Valor total do recebimento
                      </Text>
                      <Text style={[styles.totalValue, isDarkMode && styles.textDark]}>{money(totalValue)}</Text>
                    </View>

                    <View style={[styles.fiscalSection, isDarkMode && styles.sectionDark]}>
                      <Text style={[styles.sectionLabel, isDarkMode && styles.textMutedDark]}>
                        {isInvoiceLinked ? 'Despesas não fiscais' : 'Despesas'}
                      </Text>
                      <View style={styles.fiscalGrid}>
                        {nonFiscalFreightValue != null ? (
                          <Text style={[styles.fiscalText, isDarkMode && styles.textMutedDark]}>
                            {isInvoiceLinked ? 'Frete não fiscal' : 'Frete'}: {expenseValue(nonFiscalFreightValue, freightMode)}
                          </Text>
                        ) : legacyFreightPercent > 0 ? (
                          <Text style={[styles.fiscalText, isDarkMode && styles.textMutedDark]}>
                            Frete: {legacyFreightPercent}%
                          </Text>
                        ) : null}
                        {otherExpensesValue != null ? (
                          <Text style={[styles.fiscalText, isDarkMode && styles.textMutedDark]}>
                            {isInvoiceLinked ? 'Outras despesas não fiscais' : 'Outras despesas'}: {expenseValue(otherExpensesValue, otherExpensesMode)}
                          </Text>
                        ) : null}
                        {Number(fiscalFreight) > 0 ? (
                          <Text style={[styles.fiscalText, isDarkMode && styles.textMutedDark]}>
                            Frete da nota: {money(fiscalFreight)}
                          </Text>
                        ) : null}
                        {Number(fiscalIpi) > 0 ? (
                          <Text style={[styles.fiscalText, isDarkMode && styles.textMutedDark]}>
                            IPI: {money(fiscalIpi)}
                          </Text>
                        ) : null}
                        {!hasExpenses ? (
                          <Text style={[styles.fiscalText, isDarkMode && styles.textMutedDark, { width: '100%' }]}>
                            Nenhuma despesa informada.
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </>
                ) : null}

                {activeTab === 'items' ? (
                  <View style={[styles.itemSection, isDarkMode && styles.itemSectionDark]}>
                    <Text style={[styles.itemsHeader, isDarkMode && styles.textDark]}>
                      Itens recebidos ({items.length})
                    </Text>
                    {items.length === 0 ? (
                      <Text style={[styles.emptyText, isDarkMode && styles.textMutedDark]}>
                        Nenhum item informado neste recebimento.
                      </Text>
                    ) : items.map((item: any, index: number) => {
                      const quantity = Number(read(item, 'quantity', 'quantity', 0)) || 0;
                      const unitCost = Number(read(item, 'unitCost', 'unit_cost', 0)) || 0;
                      const baseCost = Number(read(item, 'baseCost', 'base_cost', unitCost)) || 0;
                      const freight = Number(read(item, 'freightNonFiscalUnit', 'freight_non_fiscal_unit', 0)) +
                        Number(read(item, 'freightFiscalUnit', 'freight_fiscal_unit', 0));
                      const other = Number(read(item, 'otherExpensesNonFiscalUnit', 'other_expenses_non_fiscal_unit', 0)) +
                        Number(read(item, 'otherExpensesFiscalUnit', 'other_expenses_fiscal_unit', 0));
                      const discount = Number(read(item, 'discountUnit', 'discount_unit', 0)) || 0;
                      return (
                        <View key={String(item.id || item.receiptItemId || index)} style={[styles.item, styles.itemCompact, isDarkMode && styles.itemDark]}>
                          <View style={styles.itemDescription}>
                            <Text style={[styles.itemTitle, isDarkMode && styles.textDark]}>
                              {item.description || item.item_snapshot?.description || item.name || 'Produto'}
                            </Text>
                            {item.sku ? <Text style={styles.itemMeta}>SKU: {item.sku}</Text> : null}
                            <Text style={[styles.itemMeta, isDarkMode && styles.textMutedDark]}>
                              Quantidade: {quantity} un · Custo unitário: {money(baseCost)}
                            </Text>
                            <Text style={[styles.itemMeta, isDarkMode && styles.textMutedDark]}>
                              Frete: {money(freight)} · Outras despesas: {money(other)}
                              {discount > 0 ? ` · Desconto: ${money(discount)}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.totalItem}>{money(Number(read(item, 'totalCost', 'total_cost', unitCost * quantity)) || unitCost * quantity)}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {activeTab === 'notes' ? (
                  <View style={[styles.fiscalSection, isDarkMode && styles.sectionDark]}>
                    <Text style={styles.sectionLabel}>Observações</Text>
                    <Text style={[styles.fiscalText, { width: '100%' }, isDarkMode && styles.textMutedDark]}>
                      {observation || 'Nenhuma observação informada.'}
                    </Text>
                    {attachments.length > 0 ? (
                      <View style={{ gap: 10, marginTop: 10 }}>
                        <Text style={styles.sectionLabel}>Documentos anexados</Text>
                        {attachments.map((url: string, index: number) => (
                          <TouchableOpacity
                            key={`${url}-${index}`}
                            onPress={() => void Linking.openURL(url).catch(() => Alert.alert('Não foi possível abrir o documento.'))}
                            accessibilityRole="link"
                            style={[styles.item, isDarkMode && styles.itemDark]}
                          >
                            <Text style={[styles.itemTitle, styles.tabTextActive]}>
                              Documento {index + 1}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </ScrollView>

              <View style={[styles.footer, isDarkMode && styles.headerDark]}>
                <TouchableOpacity onPress={onClose} style={styles.footerBtn} accessibilityRole="button">
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
