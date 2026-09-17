import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Linking } from 'react-native';
import { ArrowLeft, Search, Plus, Phone, Mail, MapPin, Building2, User } from 'lucide-react-native';

interface Supplier {
  id: string;
  name: string;
  corporateName: string;
  cnpj: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  status: 'active' | 'inactive';
}

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
}

export const SuppliersScreen: React.FC<Props> = ({ isDarkMode, onBack }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadSuppliers = async (isRefresh = false, pageNum = 0, query = searchQuery) => {
    if (isRefresh) {
        setPage(0);
        setHasMore(true);
        setLoading(true); // Treat refresh as initial load for now
    } else if (pageNum > 0) {
        setLoadingMore(true);
    } else {
        setLoading(true);
    }

    try {
        const { fetchSuppliers, ITEMS_PER_PAGE } = await import('../../../services/stockService');
        const data = await fetchSuppliers(pageNum, query);
        
        const formattedData = (data || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            corporateName: s.corporate_name,
            cnpj: s.cnpj_cpf,
            phone: s.primary_phone || '',
            email: s.email || '',
            city: s.city || '',
            state: s.state || '',
            status: s.is_active ? 'active' : 'inactive'
        }));

        if (isRefresh || pageNum === 0) {
            setSuppliers(formattedData);
        } else {
            setSuppliers(prev => [...prev, ...formattedData]);
        }
        
        if (data && data.length < ITEMS_PER_PAGE) {
            setHasMore(false);
        }
    } catch (err) {
        console.error('Failed to fetch suppliers:', err);
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
          void loadSuppliers(false, nextPage, searchQuery);
      }
  };

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
        void loadSuppliers(true, 0, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCall = (phone: string) => {
      // Clean phone number and open dialer
      const cleaned = phone.replace(/\D/g, '');
      Linking.openURL(`tel:${cleaned}`);
  };

  const handleEmail = (email: string) => {
      Linking.openURL(`mailto:${email}`);
  };

  const renderSupplier = ({ item }: { item: Supplier }) => (
    <View style={[styles.card, isDarkMode && styles.cardDark, item.status === 'inactive' && { opacity: 0.75 }]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleGroup}>
          <Building2 size={20} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
          <View>
              <Text style={[styles.title, isDarkMode && styles.textDark]}>{item.name}</Text>
              <Text style={[styles.subtitle, isDarkMode && styles.textMutedDark]}>{item.cnpj}</Text>
          </View>
        </View>
        
        <View style={[
            styles.statusBadge, 
            item.status === 'active' ? styles.statusActive : styles.statusInactive,
            isDarkMode && (item.status === 'active' ? styles.statusActiveDark : styles.statusInactiveDark)
        ]}>
            <Text style={[
                styles.statusText,
                item.status === 'active' ? styles.statusTextActive : styles.statusTextInactive,
                isDarkMode && (item.status === 'active' ? styles.statusTextActiveDark : styles.statusTextInactiveDark)
            ]}>
                {item.status === 'active' ? 'Ativo' : 'Inativo'}
            </Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <TouchableOpacity style={styles.infoRow} onPress={() => handleCall(item.phone)}>
          <Phone size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text style={[styles.infoText, styles.linkText, isDarkMode && styles.linkTextDark]}>
            {item.phone}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.infoRow} onPress={() => handleEmail(item.email)}>
          <Mail size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text style={[styles.infoText, styles.linkText, isDarkMode && styles.linkTextDark]}>
            {item.email}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoRow}>
          <MapPin size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text style={[styles.infoText, isDarkMode && styles.textMutedDark]}>
            {item.city} - {item.state}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
          <Search size={20} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.textDark]}
            placeholder="Buscar por nome ou CNPJ..."
            placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={item => item.id}
          renderItem={renderSupplier}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
              loadingMore ? <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} /> : null
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, isDarkMode && styles.fabDark]}>
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>
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
  
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  searchBoxDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  textDark: {
    color: '#f8fafc',
  },
  textMutedDark: {
    color: '#94a3b8',
  },
  
  statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
  },
  statusActive: { backgroundColor: '#d1fae5' }, // emerald-100
  statusActiveDark: { backgroundColor: '#064e3b' },
  statusInactive: { backgroundColor: '#f1f5f9' }, // slate-100
  statusInactiveDark: { backgroundColor: '#334155' },
  
  statusText: {
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
  },
  statusTextActive: { color: '#047857' },
  statusTextActiveDark: { color: '#34d399' },
  statusTextInactive: { color: '#64748b' },
  statusTextInactiveDark: { color: '#94a3b8' },

  infoGrid: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
  },
  linkText: {
      color: '#2563eb',
      fontWeight: '500',
  },
  linkTextDark: {
      color: '#60a5fa',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabDark: {
    backgroundColor: '#3b82f6',
  },
});
