import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal, TouchableWithoutFeedback } from 'react-native';
import { FileText, Camera, Upload, ArrowLeft, MoreVertical, Download, Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

interface Invoice {
  id: string;
  number: string;
  series: string;
  accessKey: string;
  supplierName: string;
  issueDate: string;
  totalValue: number;
  sefazStatus: 'authorized' | 'cancelled' | 'denied' | 'pending';
}

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
}

export const InvoicesScreen: React.FC<Props> = ({ isDarkMode, onBack }) => {
  const [accessKey, setAccessKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadInvoices = async (isRefresh = false, pageNum = 0) => {
    if (isRefresh) {
        setPage(0);
        setHasMore(true);
        // Do not set loading(true) if it's a pull-to-refresh
    } else if (pageNum > 0) {
        setLoadingMore(true);
    } else {
        setLoading(true);
    }

    try {
        const { fetchInboundInvoices, ITEMS_PER_PAGE } = await import('../../../services/stockService');
        const data = await fetchInboundInvoices(pageNum);
        
        const formattedData = (data || []).map((inv: any) => ({
            id: inv.id,
            number: inv.number,
            series: inv.series,
            accessKey: inv.access_key,
            supplierName: inv.people?.name || 'Fornecedor Desconhecido',
            issueDate: inv.issue_date || inv.created_at,
            totalValue: inv.total_value || 0,
            sefazStatus: inv.sefaz_status || 'pending'
        }));

        if (isRefresh || pageNum === 0) {
            setInvoices(formattedData);
        } else {
            setInvoices(prev => [...prev, ...formattedData]);
        }
        
        if (data && data.length < ITEMS_PER_PAGE) {
            setHasMore(false);
        }
    } catch (err) {
        console.error('Failed to fetch invoices:', err);
        setHasMore(false);
    } finally {
        setLoading(false);
        setLoadingMore(false);
    }
  };

  const loadMore = () => {
      if (!loadingMore && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          void loadInvoices(false, nextPage);
      }
  };

  useEffect(() => {
    void loadInvoices();
  }, []);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/xml', 'text/xml'],
      });
      console.log(result);
      // TODO: process XML and open preview modal
    } catch (err) {
      console.error(err);
    }
  };

  const handleConsultSEFAZ = () => {
    if (accessKey.length === 44) {
      // TODO: Fetch from SEFAZ and open preview modal
    }
  };

  const getSefazStatusConfig = (status: Invoice['sefazStatus'], isDark: boolean) => {
      switch (status) {
          case 'authorized': 
              return { label: 'Autorizada', icon: CheckCircle2, color: isDark ? '#34d399' : '#059669', bg: isDark ? '#064e3b' : '#d1fae5' };
          case 'cancelled': 
              return { label: 'Cancelada', icon: XCircle, color: isDark ? '#fb7185' : '#e11d48', bg: isDark ? '#4c0519' : '#ffe4e6' };
          case 'denied': 
              return { label: 'Denegada', icon: XCircle, color: isDark ? '#fbbf24' : '#d97706', bg: isDark ? '#451a03' : '#fef3c7' };
          case 'pending':
              return { label: 'Pendente', icon: AlertCircle, color: isDark ? '#94a3b8' : '#64748b', bg: isDark ? '#1e293b' : '#f1f5f9' };
      }
  };

  const renderInvoice = ({ item }: { item: Invoice }) => {
      const statusConfig = getSefazStatusConfig(item.sefazStatus, isDarkMode);
      const StatusIcon = statusConfig.icon;

      return (
          <View style={[styles.card, isDarkMode && styles.cardDark]}>
              <View style={styles.cardHeader}>
                  <View style={styles.numberGroup}>
                      <FileText size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                      <Text style={[styles.invoiceNumber, isDarkMode && styles.textDark]}>
                          NF-e {item.number}
                      </Text>
                      <Text style={[styles.invoiceSeries, isDarkMode && styles.textMutedDark]}>
                          Série {item.series}
                      </Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveInvoice(item)} style={styles.menuBtn}>
                      <MoreVertical size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                  </TouchableOpacity>
              </View>

              <View style={styles.supplierRow}>
                  <Text style={[styles.supplierName, isDarkMode && styles.textDark]} numberOfLines={1}>
                      {item.supplierName}
                  </Text>
              </View>
              
              <Text style={[styles.accessKey, isDarkMode && styles.textMutedDark]}>
                  {item.accessKey.replace(/(\d{4})(?=\d)/g, '$1 ')}
              </Text>

              <View style={styles.cardFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                      <StatusIcon size={12} color={statusConfig.color} />
                      <Text style={[styles.statusText, { color: statusConfig.color }]}>
                          {statusConfig.label}
                      </Text>
                  </View>

                  <View style={styles.valueGroup}>
                      <Text style={[styles.dateText, isDarkMode && styles.textMutedDark]}>
                          {new Date(item.issueDate).toLocaleDateString('pt-BR')}
                      </Text>
                      <Text style={[styles.valueText, isDarkMode && styles.textDark]}>
                          R$ {item.totalValue.toFixed(2).replace('.', ',')}
                      </Text>
                  </View>
              </View>
          </View>
      );
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Importers Section */}
      <View style={[styles.importersSection, isDarkMode && styles.importersSectionDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Nova Importação</Text>
          
          <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, isDarkMode && styles.actionBtnDark]} onPress={handlePickDocument}>
                  <View style={[styles.iconWrapper, { backgroundColor: '#ecfdf5' }, isDarkMode && { backgroundColor: '#064e3b' }]}>
                      <Upload size={20} color={isDarkMode ? '#34d399' : '#10b981'} />
                  </View>
                  <Text style={[styles.actionBtnText, isDarkMode && styles.textDark]}>Upload XML</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionBtn, isDarkMode && styles.actionBtnDark]}>
                  <View style={[styles.iconWrapper, { backgroundColor: '#eff6ff' }, isDarkMode && { backgroundColor: '#1e3a8a' }]}>
                      <Camera size={20} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
                  </View>
                  <Text style={[styles.actionBtnText, isDarkMode && styles.textDark]}>Ler DANFE</Text>
              </TouchableOpacity>
          </View>

          <View style={[styles.inputWrapper, isDarkMode && styles.inputWrapperDark]}>
            <TextInput
              style={[styles.input, isDarkMode && styles.textDark]}
              placeholder="Ou digite os 44 números da chave..."
              placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
              keyboardType="numeric"
              maxLength={44}
              value={accessKey}
              onChangeText={setAccessKey}
            />
            {accessKey.length === 44 && (
                <TouchableOpacity style={styles.consultBtn} onPress={handleConsultSEFAZ}>
                    <Search size={18} color="#ffffff" />
                </TouchableOpacity>
            )}
          </View>
      </View>

      {/* List Section */}
      <FlatList
          data={invoices}
          keyExtractor={item => item.id}
          renderItem={renderInvoice}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
              loadingMore ? <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} /> : null
          }
          ListHeaderComponent={
              <Text style={[styles.listTitle, isDarkMode && styles.textDark]}>Notas Recentes</Text>
          }
      />

      {/* BottomSheet Modal para Ações */}
      <Modal
        visible={!!activeInvoice}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveInvoice(null)}
      >
          <TouchableWithoutFeedback onPress={() => setActiveInvoice(null)}>
              <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                      <View style={[styles.bottomSheet, isDarkMode && styles.bottomSheetDark]}>
                          <View style={styles.bsHandle} />
                          <Text style={[styles.bsTitle, isDarkMode && styles.textDark]} numberOfLines={1}>
                              NF-e {activeInvoice?.number}
                          </Text>
                          
                          <TouchableOpacity style={styles.bsActionBtn} onPress={() => setActiveInvoice(null)}>
                              <Download size={20} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
                              <Text style={[styles.bsActionText, { color: isDarkMode ? '#60a5fa' : '#3b82f6' }]}>Download XML</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.bsActionBtn} onPress={() => setActiveInvoice(null)}>
                              <FileText size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                              <Text style={[styles.bsActionText, isDarkMode && styles.textDark]}>Ver Detalhes completos</Text>
                          </TouchableOpacity>
                      </View>
                  </TouchableWithoutFeedback>
              </View>
          </TouchableWithoutFeedback>
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
  textDark: {
    color: '#f8fafc',
  },
  textMutedDark: {
    color: '#94a3b8',
  },
  
  importersSection: {
      backgroundColor: '#ffffff',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
  },
  importersSectionDark: {
      backgroundColor: '#0f172a',
      borderBottomColor: '#1e293b',
  },
  sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#0f172a',
      marginBottom: 12,
  },
  actionsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
  },
  actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: 12,
      gap: 12,
  },
  actionBtnDark: {
      backgroundColor: '#1e293b',
      borderColor: '#334155',
  },
  iconWrapper: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
  },
  actionBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0f172a',
  },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    height: 48,
  },
  inputWrapperDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingHorizontal: 16,
  },
  consultBtn: {
      width: 48,
      height: 48,
      backgroundColor: '#2563eb',
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
  },

  listTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#0f172a',
      marginBottom: 12,
  },
  list: {
      padding: 16,
      gap: 12,
  },
  
  card: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#e2e8f0',
  },
  cardDark: {
      backgroundColor: '#1e293b',
      borderColor: '#334155',
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
  },
  numberGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  invoiceNumber: {
      fontSize: 16,
      fontWeight: '800',
      color: '#0f172a',
  },
  invoiceSeries: {
      fontSize: 13,
      color: '#64748b',
  },
  menuBtn: {
      padding: 4,
      marginRight: -4,
      marginTop: -4,
  },
  supplierRow: {
      marginBottom: 4,
  },
  supplierName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#334155',
  },
  accessKey: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: '#64748b',
      marginBottom: 16,
  },
  
  cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderTopWidth: 1,
      borderTopColor: '#f1f5f9',
      paddingTop: 12,
  },
  statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
  },
  statusText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
  },
  
  valueGroup: {
      alignItems: 'flex-end',
  },
  dateText: {
      fontSize: 12,
      color: '#64748b',
      marginBottom: 2,
  },
  valueText: {
      fontSize: 16,
      fontWeight: '900',
      color: '#0f172a',
  },
  
  // BottomSheet Styles
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
  },
  bottomSheet: {
      backgroundColor: '#ffffff',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingTop: 12,
  },
  bottomSheetDark: {
      backgroundColor: '#1e293b',
  },
  bsHandle: {
      width: 40,
      height: 4,
      backgroundColor: '#cbd5e1',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
  },
  bsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 16,
  },
  bsActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 12,
  },
  bsActionText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#334155',
  }
});
