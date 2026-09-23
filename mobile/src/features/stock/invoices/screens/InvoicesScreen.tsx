import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Modal } from 'react-native';
import { ArrowLeft, Plus, Calendar, ChevronDown, Search } from 'lucide-react-native';
import { useInvoices } from '../hooks/useInvoices';
import { InvoiceCard } from '../components/InvoiceCard';
import { InvoiceActionModal } from '../modals/InvoiceActionModal';
import { InvoiceImportModal } from '../modals/InvoiceImportModal';
import { InboundInvoiceMappingsModal } from '../modals/InboundInvoiceMappingsModal';
import { Invoice } from '../../types/stock.types';

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const InvoicesScreen: React.FC<Props> = ({ isDarkMode, onBack, renderHeader }) => {
  const { invoices, loading, loadingMore, loadMore, reload } = useInvoices();
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [mappingInvoice, setMappingInvoice] = useState<Invoice | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Últimos 30 Dias');
  const periodOptions = ['Hoje', 'Esta Semana', 'Este Mês', 'Últimos 30 Dias', 'Este Trimestre'];

  const PageHeader = () => (
    <View style={[styles.pageHeaderWrapper, isDarkMode && styles.pageHeaderWrapperDark]}>
        <View style={styles.pageHeader}>
            <TouchableOpacity 
                style={[styles.periodBtn, isDarkMode && styles.periodBtnDark]}
                onPress={() => setShowPeriodModal(true)}
            >
                <View style={styles.periodBtnLeft}>
                    <Calendar size={18} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
                    <Text style={[styles.periodLabel, isDarkMode && styles.textMutedDark]}>Período:</Text>
                </View>
                <View style={[styles.periodValueWrapper, isDarkMode && styles.periodValueWrapperDark]}>
                    <Text style={[styles.periodValue, isDarkMode && styles.textDark]}>{selectedPeriod}</Text>
                    <ChevronDown size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.importBtn} onPress={() => setShowImportModal(true)}>
                <Plus size={20} color="#ffffff" />
                <Text style={styles.importBtnText}>Importar</Text>
            </TouchableOpacity>
        </View>
        
        <View style={styles.filtersContainer}>

            <View style={[styles.searchWrapper, isDarkMode && styles.searchWrapperDark]}>
                <Search size={18} color={isDarkMode ? '#64748b' : '#94a3b8'} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, isDarkMode && styles.textDark]}
                    placeholder="Pesquisar por fornecedor, número da NF-e ou chave..."
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                />
            </View>
        </View>
    </View>
  );

  // We build a single array to feed the FlatList so we can use stickyHeaderIndices
  // Index 0: Module Header (Estoque + Tabs)
  // Index 1: Page Header (← Notas Fiscais de Entrada [+])
  // Index 2+: The invoices
  const data: any[] = [
      { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
      { type: 'PAGE_HEADER', id: 'PAGE_HEADER' },
      ...invoices.map(inv => ({ type: 'ITEM', id: inv.id, data: inv }))
  ];

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
          data={data}
          keyExtractor={item => item.id}
          stickyHeaderIndices={[1]} // The Page Header sticks to the top!
          renderItem={({ item }) => {
              if (item.type === 'MODULE_HEADER') return renderHeader();
              if (item.type === 'PAGE_HEADER') return <PageHeader />;
              
              return (
                  <View style={styles.cardContainer}>
                      <InvoiceCard 
                          item={item.data as Invoice} 
                          isDarkMode={isDarkMode} 
                          onMenuPress={setActiveInvoice} 
                      />
                  </View>
              );
          }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
              loadingMore ? <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} /> : null
          }
      />

      <InvoiceActionModal 
          visible={!!activeInvoice}
          isDarkMode={isDarkMode}
          activeInvoice={activeInvoice}
          onClose={() => setActiveInvoice(null)}
          onDownloadXML={(invoice) => console.log('Download XML', invoice.id)}
          onViewDetails={(invoice) => console.log('View Details', invoice.id)}
          onManageMappings={setMappingInvoice}
      />

      <InboundInvoiceMappingsModal
          visible={!!mappingInvoice}
          invoice={mappingInvoice}
          isDarkMode={isDarkMode}
          onClose={() => setMappingInvoice(null)}
          onSaved={() => { void reload(); }}
      />

      <InvoiceImportModal
          visible={showImportModal}
          isDarkMode={isDarkMode}
          onClose={() => setShowImportModal(false)}
          onConsultSefaz={(key) => {
              console.log('Consult', key);
              setShowImportModal(false);
          }}
          onUploadXml={(file) => {
              console.log('Upload XML', file);
              setShowImportModal(false);
          }}
      />

      {/* Period Selector Modal */}
      <Modal visible={showPeriodModal} transparent animationType="fade" onRequestClose={() => setShowPeriodModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPeriodModal(false)}>
              <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
                  <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>Selecione o Período</Text>
                  {periodOptions.map(option => (
                      <TouchableOpacity 
                          key={option} 
                          style={styles.modalOption}
                          onPress={() => {
                              setSelectedPeriod(option);
                              setShowPeriodModal(false);
                          }}
                      >
                          <Text style={[
                              styles.modalOptionText, 
                              isDarkMode && styles.textDark,
                              selectedPeriod === option && styles.modalOptionTextSelected
                          ]}>
                              {option}
                          </Text>
                      </TouchableOpacity>
                  ))}
              </View>
          </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  pageHeaderWrapper: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pageHeaderWrapperDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 8,
    height: 36,
    gap: 8,
  },
  periodBtnDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  periodBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  periodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  periodValueWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  periodValueWrapperDark: {
    backgroundColor: '#0f172a',
  },
  periodValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
  },
  searchWrapperDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnDark: {
    backgroundColor: '#1e293b',
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  importBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  cardContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
  },
  textDark: { color: '#f8fafc' },
  textMutedDark: { color: '#94a3b8' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '80%',
    padding: 24,
  },
  modalContentDark: {
    backgroundColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
  },
  modalOptionTextSelected: {
    color: '#2563eb',
    fontWeight: '700',
  },
});
