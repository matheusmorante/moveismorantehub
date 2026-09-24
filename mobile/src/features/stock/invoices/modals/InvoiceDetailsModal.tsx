import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions } from 'react-native';
import { X, CloudDownload } from 'lucide-react-native';
import type { InvoiceDetail } from '../../types/stock.types';
import { formatInvoiceDate } from '../utils/invoiceList';

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  invoice: InvoiceDetail | null;
  loading: boolean;
  onClose: () => void;
  onFetchXml?: (invoice: InvoiceDetail) => void;
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const fiscalDate = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return value.includes('T') ? parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : parsed.toLocaleDateString('pt-BR');
};

export const InvoiceDetailsModal: React.FC<Props> = ({ visible, isDarkMode, invoice, loading, onClose, onFetchXml }) => {
  const { width } = useWindowDimensions();
  const compactLayout = width < 600;

  return (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback>
          <View style={[styles.modal, isDarkMode && styles.modalDark]}>
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
              <View style={styles.headerCopy}>
                <View style={styles.titleLine}>
                  <Text style={[styles.title, isDarkMode && styles.textDark]}>
                    {invoice ? `NF-e #${invoice.number} - Série ${invoice.series}` : 'Detalhes da NF-e'}
                  </Text>
                  {invoice && (
                    <View style={[styles.statusBadge, invoice.status === 'received' ? styles.statusReceived : invoice.status === 'manifested' ? styles.statusManifested : styles.statusPending, isDarkMode && (invoice.status === 'received' ? styles.statusReceivedDark : invoice.status === 'manifested' ? styles.statusManifestedDark : styles.statusPendingDark)]}>
                      <Text style={[styles.statusText, invoice.status === 'received' ? styles.statusTextReceived : invoice.status === 'manifested' ? styles.statusTextManifested : styles.statusTextPending, isDarkMode && (invoice.status === 'received' ? styles.statusTextReceivedDark : invoice.status === 'manifested' ? styles.statusTextManifestedDark : styles.statusTextPendingDark)]}>
                        {invoice.status === 'received' ? 'Recebida' : invoice.status === 'manifested' ? 'Manifestada' : 'Pendente'}
                      </Text>
                    </View>
                  )}
                </View>
                {invoice && <Text style={styles.keyText}>{invoice.accessKey || 'Chave de acesso não informada'}</Text>}
                {invoice && <Text style={styles.metaText}>Emissão: {formatInvoiceDate(invoice.issueDate)} · Recebida em: {formatInvoiceDate(invoice.receivedAt)}</Text>}
              </View>
              <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar detalhes" style={styles.closeBtn}><X size={22} color={isDarkMode ? '#cbd5e1' : '#64748b'} /></TouchableOpacity>
            </View>

            {loading || !invoice ? (
              <View style={styles.loadingBox}><Text style={styles.metaText}>{loading ? 'Carregando detalhes...' : 'Detalhes indisponíveis.'}</Text></View>
            ) : (
              <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                <View style={[styles.parties, isDarkMode && styles.sectionDark]}>
                  <View style={styles.party}>
                    <Text style={styles.sectionLabel}>Fornecedor / Emitente</Text>
                    <Text style={[styles.partyName, isDarkMode && styles.textDark]}>{invoice.supplierName}</Text>
                    <Text style={styles.metaText}>CNPJ: {invoice.supplierCnpj || '—'}</Text>
                  </View>
                  <View style={styles.party}>
                    <Text style={styles.sectionLabel}>Destinatário</Text>
                    <Text style={[styles.partyName, isDarkMode && styles.textDark]}>{invoice.recipientName || '—'}</Text>
                    <Text style={styles.metaText}>CNPJ: {invoice.recipientCnpj || '—'}</Text>
                  </View>
                </View>

                <View style={[styles.fiscalSection, isDarkMode && styles.sectionDark]}>
                  <Text style={styles.sectionLabel}>Dados fiscais extraídos</Text>
                  <View style={styles.fiscalGrid}>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>Número / série: {invoice.number || '—'} / {invoice.series || '—'}</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>Modelo: {invoice.model || '—'}</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>Protocolo: {invoice.protocol || '—'}</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>IE: {invoice.emitterIe || '—'}</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>Natureza: {invoice.operationNature || '—'}</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>Emissão: {fiscalDate(invoice.issueDate)}</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>Saída/entrada: {fiscalDate(invoice.entryExitAt)}</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>Produtos: {money(invoice.totalProducts)}</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>Frete: {money(invoice.totalFreight)} · {invoice.freightPercent.toFixed(2)}%</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>IPI: {money(invoice.totalIpi)} · {invoice.ipiPercent.toFixed(2)}%</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>ICMS: {money(invoice.totalIcms)}</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>ICMS ST: {money(invoice.totalIcmsSt)}</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>Desconto: {money(invoice.totalDiscount)}</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>Seguro: {money(invoice.totalInsurance)}</Text>
                    <Text style={[styles.fiscalText, compactLayout && styles.fiscalTextCompact, isDarkMode && styles.textDark]}>Outras despesas: {money(invoice.totalOtherExpenses)}</Text>
                  </View>
                  {invoice.additionalInfo ? <Text style={styles.additionalInfo}>Observações: {invoice.additionalInfo}</Text> : null}
                </View>

                <View style={[styles.itemSection, isDarkMode && styles.itemSectionDark]}>
                  <Text style={[styles.itemsHeader, isDarkMode && styles.textDark]}>Itens da Nota Fiscal ({invoice.items.length})</Text>
                  {invoice.items.length === 0 ? (
                    <View style={styles.emptyItemsBox}>
                      <Text style={[styles.emptyText, isDarkMode && styles.textMutedDark]}>
                        Nota recebida via SEFAZ em formato de resumo (resNFe). Os itens completos ficam disponíveis após a obtenção do XML completo.
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
                          <Text style={styles.fetchXmlDetailBtnText}>Obter XML Completo da SEFAZ</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : invoice.items.map((item, index) => (
                    <View key={`${item.productCode}-${index}`} style={[styles.item, isDarkMode && styles.itemDark]}>
                      <View style={styles.itemDescription}>
                        <Text style={[styles.itemTitle, isDarkMode && styles.textDark]} numberOfLines={2}>{item.description}</Text>
                        <Text style={styles.itemMeta}>Cód: {item.productCode || 'S/C'} · EAN: {item.ean || '—'}</Text>
                        <Text style={styles.itemMeta}>NCM: {item.ncm || '—'} · CEST: {item.cest || '—'} · CFOP: {item.cfop || '—'}</Text>
                      </View>
                      <View style={styles.itemValue}>
                        <Text style={[styles.itemTitle, isDarkMode && styles.textDark]}>{item.quantity} {item.unit} × {money(item.unitCost)}</Text>
                        <Text style={styles.totalItem}>{money(item.totalCost)}</Text>
                        <Text style={styles.itemMeta}>Frete {money(item.freightValue)} · IPI {money(item.ipiValue)} ({item.ipiPercent.toFixed(2)}%)</Text>
                        <Text style={styles.itemMeta}>ICMS {money(item.icmsValue)} ({item.icmsPercent.toFixed(2)}%) · ST {money(item.icmsStValue)}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.totalBox}>
                  <View style={styles.totalCopy}>
                    <Text style={styles.totalLabel}>Total da Nota Fiscal</Text>
                    <Text style={styles.metaText}>Produtos: {money(invoice.totalProducts)} · Frete: {money(invoice.totalFreight)}</Text>
                  </View>
                  <Text style={styles.totalValue}>{money(invoice.totalValue)}</Text>
                </View>
              </ScrollView>
            )}

            <View style={[styles.footer, isDarkMode && styles.headerDark]}>
              <TouchableOpacity onPress={onClose} style={styles.footerBtn} accessibilityRole="button"><Text style={styles.footerBtnText}>Fechar</Text></TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.6)', padding: 12 },
  modal: { width: '100%', maxWidth: 860, maxHeight: '92%', borderRadius: 24, overflow: 'hidden', backgroundColor: '#fff' },
  modalDark: { backgroundColor: '#0f172a' },
  header: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  headerDark: { backgroundColor: '#020617', borderBottomColor: '#1e293b' },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 10 },
  titleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  title: { color: '#1e293b', fontSize: 15, fontWeight: '900' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusReceived: { backgroundColor: '#d1fae5' },
  statusManifested: { backgroundColor: '#dbeafe' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusReceivedDark: { backgroundColor: '#064e3b' },
  statusManifestedDark: { backgroundColor: '#1e3a8a' },
  statusPendingDark: { backgroundColor: '#451a03' },
  statusText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  statusTextReceived: { color: '#047857' },
  statusTextManifested: { color: '#1d4ed8' },
  statusTextPending: { color: '#b45309' },
  statusTextReceivedDark: { color: '#6ee7b7' },
  statusTextManifestedDark: { color: '#93c5fd' },
  statusTextPendingDark: { color: '#fcd34d' },
  keyText: { color: '#94a3b8', fontFamily: 'monospace', fontSize: 10, marginTop: 4 },
  metaText: { color: '#64748b', fontSize: 11, marginTop: 3 },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0 },
  bodyContent: { padding: 16, gap: 14 },
  parties: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, borderRadius: 16, padding: 14, backgroundColor: '#f8fafc' },
  fiscalSection: { gap: 10, borderRadius: 16, padding: 14, backgroundColor: '#f8fafc' },
  fiscalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fiscalText: { color: '#64748b', fontSize: 11, width: '48%' },
  fiscalTextCompact: { width: '100%' },
  additionalInfo: { color: '#64748b', fontSize: 11, lineHeight: 17 },
  sectionDark: { backgroundColor: '#1e293b' },
  party: { flex: 1, minWidth: 220 },
  sectionLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  partyName: { color: '#1e293b', fontSize: 14, fontWeight: '800', marginTop: 4 },
  itemSection: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, overflow: 'hidden' },
  itemSectionDark: { borderColor: '#1e293b' },
  itemsHeader: { backgroundColor: '#f1f5f9', color: '#475569', paddingHorizontal: 14, paddingVertical: 11, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  item: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  itemDark: { borderTopColor: '#1e293b' },
  itemDescription: { flex: 1, minWidth: 150 },
  itemValue: { flex: 1, minWidth: 180, alignItems: 'flex-end' },
  itemTitle: { color: '#1e293b', fontSize: 12, fontWeight: '800' },
  itemMeta: { color: '#94a3b8', fontSize: 10, marginTop: 3 },
  totalItem: { color: '#059669', fontSize: 11, fontWeight: '900', marginTop: 3 },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 11, padding: 18 },
  emptyItemsBox: { padding: 20, alignItems: 'center', gap: 12 },
  fetchXmlDetailBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  fetchXmlDetailBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  totalBox: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' },
  totalCopy: { flex: 1, minWidth: 160 },
  totalLabel: { color: '#059669', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  totalValue: { color: '#059669', fontSize: 20, fontWeight: '900' },
  loadingBox: { minHeight: 150, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  footerBtn: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 10 },
  footerBtnText: { color: '#64748b', fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  textDark: { color: '#f8fafc' },
  textMutedDark: { color: '#94a3b8' },
});
