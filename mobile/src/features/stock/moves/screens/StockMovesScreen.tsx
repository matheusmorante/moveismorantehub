import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, Search } from 'lucide-react-native';
import { useStockMoves } from '../hooks/useStockMoves';
import { StockMoveCard } from '../components/StockMoveCard';
import { StockMove } from '../../types/stock.types';
import { searchProducts } from '../../../../services/stockService';

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const StockMovesScreen: React.FC<Props> = ({ isDarkMode, onBack, renderHeader }) => {
  const { moves, loading, page, totalPages, goToPage, setProductId } = useStockMoves();
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Últimos 30 Dias');
  const periodOptions = ['Hoje', 'Esta Semana', 'Este Mês', 'Últimos 30 Dias', 'Este Trimestre'];

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState('');

  React.useEffect(() => {
      if (searchQuery.length < 2) {
          setSuggestions([]);
          setIsSearching(false);
          return;
      }

      const timer = setTimeout(async () => {
          setIsSearching(true);
          try {
              const results = await searchProducts(searchQuery);
              setSuggestions(results);
          } catch (e) {
              console.error('Error fetching suggestions', e);
          } finally {
              setIsSearching(false);
          }
      }, 500);

      return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectProduct = (product: any) => {
      setProductId(product.id);
      setSelectedProductName(product.name);
      setSearchQuery('');
      setShowSuggestions(false);
  };

  const handleClearProduct = () => {
      setProductId(undefined);
      setSelectedProductName('');
      setSearchQuery('');
      setShowSuggestions(false);
  };

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
        </View>
        
        <View style={styles.filtersContainer}>
            {selectedProductName ? (
                <View style={[styles.selectedProductWrapper, isDarkMode && styles.selectedProductWrapperDark]}>
                    <Text style={[styles.selectedProductText, isDarkMode && styles.textDark]}>Produto: {selectedProductName}</Text>
                    <TouchableOpacity onPress={handleClearProduct} style={styles.clearProductBtn}>
                        <Text style={styles.clearProductText}>X</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={[styles.searchWrapper, isDarkMode && styles.searchWrapperDark]}>
                    <Search size={18} color={isDarkMode ? '#64748b' : '#94a3b8'} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, isDarkMode && styles.textDark]}
                        placeholder="Pesquisar produto..."
                        placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            setShowSuggestions(text.length >= 2);
                        }}
                        onFocus={() => {
                            if (searchQuery.length >= 2) setShowSuggestions(true);
                        }}
                    />
                </View>
            )}

            {/* Suggestions Dropdown (inside the flow) */}
            {showSuggestions && !selectedProductName && (
                <View style={[styles.suggestionsContainer, isDarkMode && styles.suggestionsContainerDark]}>
                    {isSearching ? (
                        <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} />
                    ) : suggestions.length > 0 ? (
                        suggestions.map(item => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.suggestionItem}
                                onPress={() => handleSelectProduct(item)}
                            >
                                <Text style={[styles.suggestionName, isDarkMode && styles.textDark]}>{item.name}</Text>
                                {!!item.sku && <Text style={styles.suggestionSku}>SKU: {item.sku}</Text>}
                            </TouchableOpacity>
                        ))
                    ) : searchQuery.length >= 2 ? (
                        <Text style={[styles.noSuggestionsText, isDarkMode && styles.textMutedDark]}>Nenhum produto encontrado</Text>
                    ) : null}
                </View>
            )}
        </View>
    </View>
  );

  const data: any[] = [
      { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
      { type: 'PAGE_HEADER', id: 'PAGE_HEADER' },
      ...moves.map(m => ({ type: 'ITEM', id: m.id, data: m }))
  ];

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        stickyHeaderIndices={[0]}
        renderItem={({ item }) => {
            if (item.type === 'MODULE_HEADER') return renderHeader();
            if (item.type === 'PAGE_HEADER') return <PageHeader />;
            return (
                <View style={styles.cardContainer}>
                    <StockMoveCard move={item.data as StockMove} isDarkMode={isDarkMode} />
                </View>
            );
        }}
        ListFooterComponent={
            <View style={[styles.paginationContainer, isDarkMode && styles.paginationContainerDark]}>
                {loading ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                    <View style={styles.paginationRow}>
                        <TouchableOpacity 
                            style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled, isDarkMode && styles.pageBtnDark]}
                            disabled={page === 0}
                            onPress={() => goToPage(page - 1)}
                        >
                            <ChevronLeft size={20} color={page === 0 ? (isDarkMode ? '#475569' : '#94a3b8') : (isDarkMode ? '#cbd5e1' : '#334155')} />
                        </TouchableOpacity>
                        
                        <Text style={[styles.pageText, isDarkMode && styles.textDark]}>
                            Página {page + 1} de {Math.max(1, totalPages)}
                        </Text>
                        
                        <TouchableOpacity 
                            style={[styles.pageBtn, page >= totalPages - 1 && styles.pageBtnDisabled, isDarkMode && styles.pageBtnDark]}
                            disabled={page >= totalPages - 1}
                            onPress={() => goToPage(page + 1)}
                        >
                            <ChevronRight size={20} color={page >= totalPages - 1 ? (isDarkMode ? '#475569' : '#94a3b8') : (isDarkMode ? '#cbd5e1' : '#334155')} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        }
      />

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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  textDark: { color: '#f8fafc' },
  cardContainer: { paddingHorizontal: 16, paddingTop: 12 },
  pageHeaderWrapper: { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  pageHeaderWrapperDark: { backgroundColor: '#0f172a', borderBottomColor: '#1e293b' },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  periodBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingLeft: 12, paddingRight: 8, height: 36, gap: 8, flex: 1 },
  periodBtnDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  periodBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  periodLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  periodValueWrapper: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flex: 1, justifyContent: 'flex-end' },
  periodValueWrapperDark: { backgroundColor: '#0f172a' },
  periodValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  filtersContainer: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, height: 48, paddingHorizontal: 12 },
  searchWrapperDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  textMutedDark: { color: '#94a3b8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, width: '80%', padding: 24 },
  modalContentDark: { backgroundColor: '#1e293b' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16, textAlign: 'center' },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalOptionText: { fontSize: 16, color: '#334155', textAlign: 'center' },
  modalOptionTextSelected: { color: '#2563eb', fontWeight: '700' },
  paginationContainer: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  paginationContainerDark: { backgroundColor: '#0f172a' },
  paginationRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pageBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  pageBtnDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  pageBtnDisabled: { opacity: 0.5, backgroundColor: '#f1f5f9' },
  pageText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  suggestionsContainer: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  suggestionsContainerDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  suggestionName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  suggestionSku: { fontSize: 12, color: '#64748b', marginTop: 2 },
  noSuggestionsText: { padding: 16, textAlign: 'center', fontSize: 14, color: '#64748b' },
  selectedProductWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, justifyContent: 'space-between' },
  selectedProductWrapperDark: { backgroundColor: 'rgba(56, 189, 248, 0.2)' },
  selectedProductText: { fontSize: 14, fontWeight: '600', color: '#0369a1', flex: 1 },
  clearProductBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(3, 105, 161, 0.2)', alignItems: 'center', justifyContent: 'center' },
  clearProductText: { fontSize: 12, fontWeight: '800', color: '#0369a1' }
});
